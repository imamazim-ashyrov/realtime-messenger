import { useCallback, useEffect, useRef, useState } from "react";

const PREFERRED_MIME = "audio/webm;codecs=opus";
const LEVEL_BARS = 32;
const LEVEL_UPDATE_MS = 70;

/**
 * Обёртка над MediaRecorder API + Web Audio AnalyserNode для индикации
 * громкости (плавающее окно из LEVEL_BARS значений 0..1).
 *  - start()   запросить микрофон и начать запись
 *  - stop()    остановить и вернуть { blob, duration } через Promise
 *  - cancel()  прервать без отправки
 *  - duration  длительность в секундах
 *  - levels    массив последних уровней громкости (для отрисовки волны)
 */
const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [levels, setLevels] = useState(() => new Array(LEVEL_BARS).fill(0));

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const stopResolveRef = useRef(null);
  const canceledRef = useRef(false);
  const durationRef = useRef(0);

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const levelsBufferRef = useRef(new Array(LEVEL_BARS).fill(0));
  const lastLevelUpdateRef = useRef(0);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const cleanupAudio = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    levelsBufferRef.current = new Array(LEVEL_BARS).fill(0);
    setLevels(new Array(LEVEL_BARS).fill(0));
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const start = useCallback(async () => {
    setError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices) {
      setError("Запись звука не поддерживается этим браузером.");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported(PREFERRED_MIME)
        ? PREFERRED_MIME
        : "";
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      chunksRef.current = [];
      canceledRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        clearTimer();
        cleanupStream();
        cleanupAudio();
        const resolve = stopResolveRef.current;
        stopResolveRef.current = null;

        if (canceledRef.current || chunksRef.current.length === 0) {
          resolve?.(null);
          return;
        }

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || PREFERRED_MIME,
        });
        resolve?.({
          blob,
          duration: Math.max(1, Math.round(durationRef.current)),
        });
      };

      recorder.start();
      recorderRef.current = recorder;

      durationRef.current = 0;
      setDuration(0);
      setIsRecording(true);

      const startedAt = Date.now();
      timerRef.current = setInterval(() => {
        const next = (Date.now() - startedAt) / 1000;
        durationRef.current = next;
        setDuration(next);
      }, 200);

      // AnalyserNode для индикации громкости
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        audioCtxRef.current = audioCtx;
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const loop = (t) => {
          const node = analyserRef.current;
          if (!node) return;
          node.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
          const rms = Math.sqrt(sum / data.length) / 255;
          const level = Math.min(1, rms * 2.2);
          const next = levelsBufferRef.current.slice(1);
          next.push(level);
          levelsBufferRef.current = next;
          if (t - lastLevelUpdateRef.current > LEVEL_UPDATE_MS) {
            lastLevelUpdateRef.current = t;
            setLevels(next);
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      }

      return true;
    } catch (err) {
      cleanupStream();
      cleanupAudio();
      setError(
        err?.name === "NotAllowedError"
          ? "Доступ к микрофону запрещён."
          : "Не удалось начать запись.",
      );
      return false;
    }
  }, []);

  const stop = useCallback(
    () =>
      new Promise((resolve) => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === "inactive") {
          resolve(null);
          return;
        }
        stopResolveRef.current = resolve;
        setIsRecording(false);
        recorder.stop();
        recorderRef.current = null;
      }),
    [],
  );

  const cancel = useCallback(() => {
    canceledRef.current = true;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      clearTimer();
      cleanupStream();
      cleanupAudio();
    }
    setIsRecording(false);
    setDuration(0);
    durationRef.current = 0;
    recorderRef.current = null;
  }, []);

  useEffect(
    () => () => {
      clearTimer();
      cleanupStream();
      cleanupAudio();
    },
    [],
  );

  return { isRecording, duration, levels, error, start, stop, cancel };
};

export default useVoiceRecorder;
