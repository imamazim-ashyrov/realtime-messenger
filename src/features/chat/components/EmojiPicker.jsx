import { useState } from "react";

const CATEGORIES = [
  {
    id: "smiley",
    icon: "😊",
    label: "Смайлы",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂",
      "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩",
      "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜",
      "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐",
      "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "😪",
      "😴", "😌", "😔", "🤕", "🤢", "😎", "🥸", "🤓",
      "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "🥵",
    ],
  },
  {
    id: "hearts",
    icon: "❤️",
    label: "Сердца",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤",
      "🤍", "❣️", "💕", "💞", "💓", "💗", "💖", "💘",
      "💝", "💟", "♥️", "💔", "❤️‍🔥", "❤️‍🩹", "💌", "💋",
    ],
  },
  {
    id: "hands",
    icon: "👍",
    label: "Жесты",
    emojis: [
      "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙",
      "👈", "👉", "👆", "🖕", "👇", "☝️", "👋", "🤚",
      "🖐️", "✋", "🖖", "👏", "🙌", "🤝", "🙏", "💪",
      "🤲", "✊", "👊", "🤛", "🤜", "💅", "🤳",
    ],
  },
  {
    id: "animals",
    icon: "🐶",
    label: "Животные",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼",
      "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔",
      "🐧", "🐦", "🐤", "🦄", "🐝", "🦋", "🐌", "🐞",
      "🐢", "🐍", "🦖", "🐙", "🦑", "🦐", "🐠", "🐬",
      "🐳", "🦈", "🦓", "🦒", "🐘", "🦏", "🐪", "🦘",
    ],
  },
  {
    id: "food",
    icon: "🍕",
    label: "Еда",
    emojis: [
      "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓",
      "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝",
      "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🌽",
      "🥕", "🍞", "🥐", "🥖", "🧀", "🥚", "🍳", "🥞",
      "🥓", "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯",
      "🍣", "🍜", "🍝", "🍦", "🍰", "🍪", "🍩", "🍫",
      "☕", "🍵", "🧃", "🥤", "🍺", "🍷", "🍸", "🍹",
    ],
  },
  {
    id: "objects",
    icon: "🎉",
    label: "Прочее",
    emojis: [
      "🎉", "🎊", "🎈", "🎁", "🎂", "🎄", "🎃", "🎆",
      "🔥", "💯", "✨", "⭐", "🌟", "💫", "⚡", "💥",
      "💢", "💦", "💨", "🌈", "☀️", "🌙", "⛅", "❄️",
      "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🎱", "🎯",
      "🚀", "✈️", "🚗", "🏠", "📱", "💻", "🎵", "🎮",
    ],
  },
];

const EmojiPicker = ({ onSelect, onClose }) => {
  const [activeCat, setActiveCat] = useState(CATEGORIES[0].id);
  const category = CATEGORIES.find((c) => c.id === activeCat) || CATEGORIES[0];

  return (
    <div
      data-emoji-picker
      className="w-72 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl animate-modal-in"
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-2 py-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCat(cat.id)}
            className={`flex h-8 w-8 items-center justify-center rounded-md text-lg transition ${
              activeCat === cat.id
                ? "bg-blue-100 dark:bg-blue-900/40"
                : "hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
            title={cat.label}
            aria-label={cat.label}
          >
            {cat.icon}
          </button>
        ))}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600"
            aria-label="Закрыть"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-8 gap-0.5 max-h-56 overflow-y-auto p-2">
        {category.emojis.map((emoji, i) => (
          <button
            key={`${category.id}-${i}`}
            type="button"
            onClick={() => onSelect(emoji)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-xl transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-110"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
