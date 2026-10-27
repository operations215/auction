export function LogoMark({ className = "logo-mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="qm-brass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0c162" />
          <stop offset="0.55" stopColor="#c38b22" />
          <stop offset="1" stopColor="#8f6413" />
        </linearGradient>
      </defs>
      <path d="M24 2 44 10v13c0 12-8.5 20.5-20 23C12.5 43.5 4 35 4 23V10Z" fill="url(#qm-brass)" />
      <path d="M24 6.5 40 13v10c0 9.8-6.8 16.9-16 19.2C14.8 39.9 8 32.8 8 23V13Z" fill="#263019" />
      <path d="m24 13 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L24 27.8l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8Z" fill="url(#qm-brass)" />
      <path d="M13 34.5 24 29l11 5.5M15.5 38.5 24 34l8.5 4.5" stroke="url(#qm-brass)" strokeWidth="2.4" fill="none" strokeLinejoin="round" />
    </svg>
  );
}
