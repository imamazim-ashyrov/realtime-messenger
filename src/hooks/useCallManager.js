import { useCallback, useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";
import { useCallStore } from "../store/callStore";
import { getPrivateChatId } from "../utils/chat";
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
import { sendCallSummary } from "../services/chatService";

// Бесплатные публичные STUN-серверы Google. TURN-сервера сюда не подключаем —
// это платная инфраструктура (или собственный coturn).
const ICE_SERVERS = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

// Если абонент не принял за 30 секунд — авто-завершаем как «не дозвонился».
const RING_TIMEOUT_MS = 30_000;

const useCallManager = () => {
  const currentUser = useAuthStore((s) => s.user);
  const setIncomingCall = useCallStore((s) => s.setIncomingCall);
  const setActiveCall = useCallStore((s) => s.setActiveCall);
  const patchActiveCall = useCallStore((s) => s.patchActiveCall);
  const setMuted = useCallStore((s) => s.setMuted);
  const reset = useCallStore((s) => s.reset);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const unsubsRef = useRef([]);
  const ringTimeoutRef = useRef(null);
  const summaryWrittenRef = useRef(false);
  // Контекст текущего звонка для записи summary (callee для caller'а)
  const callContextRef = useRef(null);

  // -------- Очистка ресурсов --------
  const teardown = useCallback(() => {
    unsubsRef.current.forEach((u) => {
      try {
        u();
      } catch {
        /* noop */
      }
    });
    unsubsRef.current = [];

    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }

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
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }
    summaryWrittenRef.current = false;
    callContextRef.current = null;
  }, []);

  // -------- Запись summary (только caller, ровно один раз) --------
  const writeSummaryIfNeeded = useCallback(async (call) => {
    if (summaryWrittenRef.current) return;
    const ctx = callContextRef.current;
    if (!ctx || ctx.role !== "caller") return;

    summaryWrittenRef.current = true;

    let status;
    if (call?.status === "rejected") status = "rejected";
    else if (call?.acceptedAt) status = "completed";
    else status = "missed";

    let durationSeconds = 0;
    if (status === "completed" && call?.acceptedAt && call?.endedAt) {
      try {
        durationSeconds = Math.max(
          0,
          Math.round(
            (call.endedAt.toMillis() - call.acceptedAt.toMillis()) / 1000,
          ),
        );
      } catch {
        /* noop */
      }
    }

    try {
      await sendCallSummary({
        chatId: getPrivateChatId(ctx.caller.uid, ctx.peer.uid),
        caller: ctx.caller,
        peer: ctx.peer,
        status,
        durationSeconds,
      });
    } catch (err) {
      console.error("[useCallManager] sendCallSummary failed:", err);
    }
  }, []);

  // -------- Подписка на входящие --------
  useEffect(() => {
    if (!currentUser?.uid) return undefined;
    const startedAt = Date.now();

    const unsub = subscribeIncomingCalls(currentUser.uid, (calls) => {
      // Игнорируем «застрявшие» ringing-документы, созданные ДО монтирования
      const fresh = calls.filter(
        (c) => (c.createdAt?.toMillis?.() ?? 0) >= startedAt,
      );
      const state = useCallStore.getState();

      if (fresh.length === 0) {
        // Звонящий отменил, либо принят/отклонён — закрываем модалку
        if (state.incomingCall) state.setIncomingCall(null);
        return;
      }

      const first = fresh[0];

      // Если уже в активном — авто-отклоняем «занято»
      if (state.activeCall) {
        rejectCallDoc(first.id).catch(() => {});
        return;
      }

      if (!state.incomingCall || state.incomingCall.id !== first.id) {
        state.setIncomingCall(first);
      }
    });

    return () => unsub();
  }, [currentUser?.uid]);

  // -------- Подготовка PeerConnection (общий код для caller/callee) --------
  const buildPeerConnection = useCallback(
    async (callId, role) => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

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

      unsubsRef.current.push(
        subscribeRemoteCandidates(callId, role, (cand) => {
          pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }),
      );

      unsubsRef.current.push(
        subscribeCallDoc(callId, async (call) => {
          if (!call || call.status === "ended" || call.status === "rejected") {
            await writeSummaryIfNeeded(call);
            teardown();
            reset();
            return;
          }
          if (call.status === "active") {
            // Сохраняем acceptedAt в контексте — пригодится для длительности
            if (call.acceptedAt && callContextRef.current) {
              callContextRef.current.acceptedAtMs = call.acceptedAt.toMillis();
            }
            patchActiveCall({ status: "active" });
            // Принят → таймаут не нужен
            if (ringTimeoutRef.current) {
              clearTimeout(ringTimeoutRef.current);
              ringTimeoutRef.current = null;
            }
          }
          if (role === "caller" && call.answer && !pc.currentRemoteDescription) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(call.answer));
            } catch {
              /* noop */
            }
          }
        }),
      );

      return pc;
    },
    [patchActiveCall, reset, teardown, writeSummaryIfNeeded],
  );

  // -------- Исходящий звонок --------
  const startCall = useCallback(
    async (peer) => {
      const state = useCallStore.getState();
      if (!currentUser || !peer || state.activeCall) return;

      const callId = newCallId();
      callContextRef.current = {
        role: "caller",
        caller: currentUser,
        peer,
      };
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

        // Таймаут «не отвечает» — завершаем как missed, если за 30 сек не приняли
        ringTimeoutRef.current = setTimeout(() => {
          ringTimeoutRef.current = null;
          endCallDoc(callId).catch(() => {});
        }, RING_TIMEOUT_MS);
      } catch (err) {
        console.error("Не удалось начать звонок:", err);
        teardown();
        reset();
        alert("Не удалось начать звонок: " + (err?.message || "ошибка"));
      }
    },
    [buildPeerConnection, currentUser, reset, setActiveCall, teardown],
  );

  // -------- Принять входящий --------
  const acceptCall = useCallback(async () => {
    const state = useCallStore.getState();
    const incoming = state.incomingCall;
    if (!incoming) return;

    callContextRef.current = {
      role: "callee",
      // Для callee summary не пишем, но контекст всё равно держим
      caller: incoming.callerInfo,
      peer: state.incomingCall.calleeInfo,
    };
    setActiveCall({
      id: incoming.id,
      role: "callee",
      peer: incoming.callerInfo,
      status: "active",
      startedAt: Date.now(),
    });
    setIncomingCall(null);

    try {
      const pc = await buildPeerConnection(incoming.id, "callee");
      await pc.setRemoteDescription(new RTCSessionDescription(incoming.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await acceptCallDoc(incoming.id, { type: answer.type, sdp: answer.sdp });
    } catch (err) {
      console.error("Не удалось принять звонок:", err);
      teardown();
      reset();
      alert("Не удалось принять звонок: " + (err?.message || "ошибка"));
    }
  }, [buildPeerConnection, reset, setActiveCall, setIncomingCall, teardown]);

  // -------- Отклонить --------
  const rejectCall = useCallback(async () => {
    const incoming = useCallStore.getState().incomingCall;
    if (!incoming) return;
    await rejectCallDoc(incoming.id).catch(() => {});
    setIncomingCall(null);
  }, [setIncomingCall]);

  // -------- Завершить активный --------
  const endCall = useCallback(async () => {
    const active = useCallStore.getState().activeCall;
    if (active) await endCallDoc(active.id).catch(() => {});
    // teardown/reset вызовет subscribeCallDoc-листенер по статусу "ended"
  }, []);

  // -------- Мьют --------
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const state = useCallStore.getState();
    const next = !state.isMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }, [setMuted]);

  // -------- Cleanup при размонтировании --------
  useEffect(() => {
    return () => teardown();
  }, [teardown]);

  return { startCall, acceptCall, rejectCall, endCall, toggleMute };
};

export default useCallManager;
