import { useState } from "react";

/**
 * Универсальный аватар. Если url задан — <img>, иначе круг с инициалами на
 * градиенте из палитры, выбранной хешем от ключа (uid → стабильный цвет
 * для конкретного пользователя).
 */
const SIZES = {
  sm: { box: "h-9 w-9", text: "text-sm" },
  md: { box: "h-12 w-12", text: "text-lg" },
  lg: { box: "h-16 w-16", text: "text-2xl" },
  xl: { box: "h-24 w-24", text: "text-4xl" },
  "2xl": { box: "h-32 w-32", text: "text-5xl" },
};

// 8 спокойных пар градиентов; индекс выбирается хешем uid/displayName.
const COLOR_GRADIENTS = [
  "from-rose-400 to-rose-600",
  "from-amber-400 to-orange-600",
  "from-emerald-400 to-emerald-600",
  "from-sky-400 to-blue-600",
  "from-indigo-400 to-indigo-600",
  "from-violet-400 to-purple-600",
  "from-pink-400 to-fuchsia-600",
  "from-teal-400 to-cyan-600",
];

const hashIndex = (key, modulo) => {
  if (!key) return 0;
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % modulo;
};

const Avatar = ({
  url,
  displayName = "",
  colorKey,
  size = "md",
  online = null,
  pulse = false,
  className = "",
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const { box, text } = SIZES[size] || SIZES.md;
  const initial = displayName.charAt(0).toUpperCase() || "U";
  const showImage = url && !imgFailed;
  const gradient = COLOR_GRADIENTS[hashIndex(colorKey || displayName, COLOR_GRADIENTS.length)];

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`${box} rounded-full overflow-hidden flex items-center justify-center font-bold shadow-sm ${
          showImage
            ? "bg-slate-200 dark:bg-slate-800"
            : `bg-linear-to-br ${gradient} text-white`
        } ${pulse ? "animate-pulse" : ""}`}
      >
        {showImage ? (
          <img
            src={url}
            alt={displayName || "avatar"}
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className={text}>{initial}</span>
        )}
      </div>

      {online !== null && (
        <div
          className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
            online ? "bg-emerald-500" : "bg-slate-400"
          }`}
        />
      )}
    </div>
  );
};

export default Avatar;
