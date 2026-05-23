import { useCallback, useEffect, useRef, useState } from "react";

const PREFERRED_MIME = "audio/webm;codecs=opus";

/**
 * Обёртка над MediaRecorder API.
 *  - start()   запросить микрофон и начать запись
 *  - stop()    остановить и вернуть { blob, duration } через Promise
 *  - cancel()  прервать без отправки
 *  - duration  длительность в секундах (тикает, пока запись идёт)
 *  - isRecording / error
 */
const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const stopResolveRef = useRef(null);
  const canceledRef = useRef(false);
  const durationRef = useRef(0);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
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

      return true;
    } catch (err) {
      cleanupStream();
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
    },
    [],
  );

  return { isRecording, duration, error, start, stop, cancel };
};

export default useVoiceRecorder;
