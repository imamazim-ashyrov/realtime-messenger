import { useEffect, useRef, useState } from "react";

const formatTime = (sec) => {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

/**
 * Компактный плеер голосового сообщения: play/pause, прогресс-бар, время.
 * Стилизуется в зависимости от того, своё это сообщение (синий пузырь) или нет.
 */
const VoiceMessage = ({ audioUrl, durationHint = 0, isCurrentUser }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationHint);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onLoaded = () => {
      // У webm-блобов из MediaRecorder реальная длительность может быть Infinity,
      // пока не дойдём до конца — поэтому используем подсказку из Firestore.
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnd = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = Math.max(0, Math.min(1, ratio)) * duration;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayTime = isPlaying || currentTime > 0 ? currentTime : duration;

  const btnColor = isCurrentUser
    ? "bg-white/20 text-white hover:bg-white/30"
    : "bg-blue-500 text-white hover:bg-blue-600";
  const barBg = isCurrentUser ? "bg-white/30" : "bg-gray-200";
  const barFill = isCurrentUser ? "bg-white" : "bg-blue-500";
  const timeColor = isCurrentUser ? "text-blue-50" : "text-gray-500";

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <button
        type="button"
        onClick={toggle}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${btnColor}`}
        aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
      >
        {isPlaying ? (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg className="h-4 w-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div
          onClick={handleSeek}
          className={`relative h-1.5 cursor-pointer rounded-full ${barBg}`}
        >
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-[width] ${barFill}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className={`mt-1 text-[10px] ${timeColor}`}>{formatTime(displayTime)}</p>
      </div>

      <audio ref={audioRef} src={audioUrl} preload="metadata" />
    </div>
  );
};

export default VoiceMessage;
