/**
 * Лого мессенджера: чат-пузырь с тремя точками. Два варианта:
 *  - "brand"  — на градиентной плашке (для светлой шапки/sidebar)
 *  - "mark"   — белый пузырь без фона (для тёмного hero-блока login)
 */
const Logo = ({ variant = "brand", className = "" }) => {
  if (variant === "mark") {
    return (
      <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M14 22a8 8 0 0 1 8-8h20a8 8 0 0 1 8 8v14a8 8 0 0 1-8 8H28l-8 6v-6h2a8 8 0 0 1-8-8z"
          fill="currentColor"
        />
        <circle cx="25" cy="29" r="2.4" fill="#6366f1" />
        <circle cx="32" cy="29" r="2.4" fill="#6366f1" />
        <circle cx="39" cy="29" r="2.4" fill="#6366f1" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="0.55" stopColor="#6366f1" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#logo-bg)" />
      <path
        d="M14 22a8 8 0 0 1 8-8h20a8 8 0 0 1 8 8v14a8 8 0 0 1-8 8H28l-8 6v-6h2a8 8 0 0 1-8-8z"
        fill="#ffffff"
      />
      <circle cx="25" cy="29" r="2.4" fill="#6366f1" />
      <circle cx="32" cy="29" r="2.4" fill="#6366f1" />
      <circle cx="39" cy="29" r="2.4" fill="#6366f1" />
    </svg>
  );
};

export default Logo;
