import { useCallback, useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";
import { useCallStore } from "../store/callStore";
import {
  newCallId,
  createCallDoc,
  acceptCallDoc,
  rejectCallDoc,
  endCallDoc,
  addIceCandidate,
  subscribeRemoteCandidates,
  subscribeCallDoc,
  subscribeIncomingCalls,
} from "../services/callService";

// Бесплатные публичные STUN-серверы Google. TURN-сервера сюда не подключаем —
// это платная инфраструктура (или собственный coturn). В типичных домашних
// сетях звонок проходит и без TURN.
const ICE_SERVERS = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

/**
 * Единый менеджер звонков:
 *   - подписывается на входящие звонки и кладёт их в callStore (incomingCall),
 *   - предоставляет startCall / acceptCall / rejectCall / endCall / toggleMute,
 *   - управляет всем жизненным циклом RTCPeerConnection и подписок Firestore.
 *
 * Монтируется один раз в ChatPage (после авторизации).
 */
const useCallManager = () => {
  const currentUser = useAuthStore((s) => s.user);
  const incomingCall = useCallStore((s) => s.incomingCall);
  const activeCall = useCallStore((s) => s.activeCall);
  const isMuted = useCallStore((s) => s.isMuted);
  const setIncomingCall = useCallStore((s) => s.setIncomingCall);
  const setActiveCall = useCallStore((s) => s.setActiveCall);
  const patchActiveCall = useCallStore((s) => s.patchActiveCall);
  const setMuted = useCallStore((s) => s.setMuted);
  const reset = useCallStore((s) => s.reset);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const unsubsRef = useRef([]);

  // -------- Сброс ресурсов после конца звонка --------
  const teardown = useCallback(() => {
    unsubsRef.current.forEach((u) => {
      try {
        u();
      } catch {
        /* noop */
      }
    });
    unsubsRef.current = [];

    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        /* noop */
      }
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }
  }, []);

  // -------- Подписка на входящие звонки --------
  useEffect(() => {
    if (!currentUser?.uid) return undefined;
    const startedAt = Date.now();
    const unsub = subscribeIncomingCalls(currentUser.uid, (call) => {
      // Игнорируем звонки, созданные ДО монтирования слушателя (бэкфилл снапшота)
      const ts = call.createdAt?.toMillis?.() ?? 0;
      if (ts && ts < startedAt) return;

      // Если уже в активном или у нас уже стоит incoming — авто-отклоняем «занято»
      if (activeCall || incomingCall) {
        rejectCallDoc(call.id).catch(() => {});
        return;
      }
      setIncomingCall(call);
    });
    return () => unsub();
  }, [currentUser?.uid, activeCall, incomingCall, setIncomingCall]);

  // -------- Подготовка PeerConnection (общий код для caller/callee) --------
  const buildPeerConnection = useCallback(
    async (callId, role) => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Удалённый аудиопоток — играем через тег <audio>, который создаём
      // динамически и держим живым на время звонка
      pc.ontrack = (event) => {
        if (!remoteAudioRef.current) {
          const audio = document.createElement("audio");
          audio.autoplay = true;
          document.body.appendChild(audio);
          remoteAudioRef.current = audio;
        }
        remoteAudioRef.current.srcObject = event.streams[0];
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addIceCandidate(callId, role, event.candidate.toJSON()).catch(() => {});
        }
      };

      // ICE-кандидаты другой стороны
      unsubsRef.current.push(
        subscribeRemoteCandidates(callId, role, (cand) => {
          pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }),
      );

      // Документ звонка: ждём answer (для caller) и реагируем на end/reject
      unsubsRef.current.push(
        subscribeCallDoc(callId, async (call) => {
          if (!call || call.status === "ended" || call.status === "rejected") {
            teardown();
            reset();
            return;
          }
          if (role === "caller" && call.answer && !pc.currentRemoteDescription) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(call.answer));
              patchActiveCall({ status: "active" });
            } catch {
              /* noop */
            }
          }
          if (role === "callee" && call.status === "active") {
            patchActiveCall({ status: "active" });
          }
        }),
      );

      return pc;
    },
    [patchActiveCall, reset, teardown],
  );

  // -------- Инициировать исходящий звонок --------
  const startCall = useCallback(
    async (peer) => {
      if (!currentUser || !peer || activeCall) return;

      const callId = newCallId();
      setActiveCall({
        id: callId,
        role: "caller",
        peer: {
          uid: peer.uid,
          displayName: peer.displayName,
          avatarUrl: peer.avatarUrl || null,
        },
        status: "ringing",
        startedAt: Date.now(),
      });

      try {
        const pc = await buildPeerConnection(callId, "caller");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await createCallDoc({
          callId,
          caller: currentUser,
          callee: peer,
          offer: { type: offer.type, sdp: offer.sdp },
        });
      } catch (err) {
        console.error("Не удалось начать звонок:", err);
        teardown();
        reset();
        alert("Не удалось начать звонок: " + (err?.message || "ошибка"));
      }
    },
    [activeCall, buildPeerConnection, currentUser, reset, setActiveCall, teardown],
  );

  // -------- Принять входящий звонок --------
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    try {
      setActiveCall({
        id: incomingCall.id,
        role: "callee",
        peer: incomingCall.callerInfo,
        status: "active",
        startedAt: Date.now(),
      });
      setIncomingCall(null);

      const pc = await buildPeerConnection(incomingCall.id, "callee");
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await acceptCallDoc(incomingCall.id, { type: answer.type, sdp: answer.sdp });
    } catch (err) {
      console.error("Не удалось принять звонок:", err);
      teardown();
      reset();
      alert("Не удалось принять звонок: " + (err?.message || "ошибка"));
    }
  }, [buildPeerConnection, incomingCall, reset, setActiveCall, setIncomingCall, teardown]);

  // -------- Отклонить входящий --------
  const rejectCall = useCallback(async () => {
    if (!incomingCall) return;
    await rejectCallDoc(incomingCall.id).catch(() => {});
    setIncomingCall(null);
  }, [incomingCall, setIncomingCall]);

  // -------- Завершить активный --------
  const endCall = useCallback(async () => {
    if (activeCall) await endCallDoc(activeCall.id).catch(() => {});
    teardown();
    reset();
  }, [activeCall, reset, teardown]);

  // -------- Мьют/размьют микрофона --------
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }, [isMuted, setMuted]);

  // -------- Очистка при размонтировании --------
  useEffect(() => {
    return () => teardown();
  }, [teardown]);

  return { startCall, acceptCall, rejectCall, endCall, toggleMute };
};

export default useCallManager;
