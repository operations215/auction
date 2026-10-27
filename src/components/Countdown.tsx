"use client";

import { useEffect, useState } from "react";

function parse(s: string) {
  return new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z").getTime();
}

function fmt(ms: number, long: boolean) {
  if (ms <= 0) return "Ended";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return long ? `${d}d ${h}h ${pad(m)}m` : `${d}d ${h}h`;
  if (h > 0) return `${h}h ${pad(m)}m${long ? ` ${pad(sec)}s` : ""}`;
  return `${m}m ${pad(sec)}s`;
}

/**
 * Live countdown. `variant="chip"` renders a pill for cards; `variant="big"` the bid box timer.
 * Refreshes the page once when the auction ends so the server can show the result.
 */
export function Countdown({
  endsAt,
  variant = "chip",
  refreshOnEnd = false,
}: {
  endsAt: string;
  variant?: "chip" | "big" | "text";
  refreshOnEnd?: boolean;
}) {
  const end = parse(endsAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = end - now;
  useEffect(() => {
    if (refreshOnEnd && left <= 0 && left > -1500) {
      const t = setTimeout(() => window.location.reload(), 1200);
      return () => clearTimeout(t);
    }
  }, [refreshOnEnd, left]);

  const urgent = left > 0 && left < 3600_000;
  const soon = left >= 3600_000 && left < 86400_000;
  const text = fmt(left, variant === "big");

  if (variant === "big")
    return (
      <span className={`countdown${urgent ? " urgent" : ""}`} suppressHydrationWarning>
        {text}
      </span>
    );
  if (variant === "text") return <span suppressHydrationWarning>{text}</span>;
  return (
    <span
      className={`chip chip-dark timeleft${urgent ? " urgent" : soon ? " soon" : ""}${left <= 0 ? " ended" : ""}`}
      suppressHydrationWarning
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2M9 2h6" strokeLinecap="round" />
      </svg>
      {text}
    </span>
  );
}
