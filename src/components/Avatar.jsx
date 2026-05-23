import { useState } from "react";

/**
 * Универсальный аватар: рендерит <img>, если есть avatarUrl, иначе
 * градиентный круг с первой буквой имени. С автофоллбэком на инициалы
 * при ошибке загрузки картинки.
 *
 * Размеры стандартизованы Tailwind-классами, чтобы не плодить произвольные:
 *   sm  →  h-9  w-9 / text-sm
 *   md  →  h-12 w-12 / text-lg  (default)
 *   lg  →  h-16 w-16 / text-2xl
 *   xl  →  h-24 w-24 / text-4xl
 *   2xl →  h-32 w-32 / text-5xl
 */
const SIZES = {
  sm: { box: "h-9 w-9", text: "text-sm" },
  md: { box: "h-12 w-12", text: "text-lg" },
  lg: { box: "h-16 w-16", text: "text-2xl" },
  xl: { box: "h-24 w-24", text: "text-4xl" },
  "2xl": { box: "h-32 w-32", text: "text-5xl" },
};

const Avatar = ({
  url,
  displayName = "",
  size = "md",
  online = null, // true / false / null (скрыть индикатор)
  pulse = false,
  className = "",
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const { box, text } = SIZES[size] || SIZES.md;
  const initial = displayName.charAt(0).toUpperCase() || "U";
  const showImage = url && !imgFailed;

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`${box} rounded-full overflow-hidden flex items-center justify-center font-bold shadow-sm ${
          showImage
            ? "bg-gray-200 dark:bg-gray-800"
            : "bg-linear-to-br from-blue-400 to-blue-600 text-white"
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
          className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-900 ${
            online ? "bg-green-500" : "bg-gray-400"
          }`}
        />
      )}
    </div>
  );
};

export default Avatar;
