"use client";

import { useEffect, useState } from "react";

/** Renders a UTC database timestamp in the viewer's own time zone. */
export function LocalTime({ value, withTime = true, short = false }: { value: string; withTime?: boolean; short?: boolean }) {
  const d = new Date(value.includes("T") ? value : value.replace(" ", "T") + "Z");
  const opts: Intl.DateTimeFormatOptions = {
    weekday: withTime ? "short" : undefined,
    month: "short",
    day: "numeric",
    year: withTime || short ? undefined : "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit", timeZoneName: "short" } : {}),
  };
  const [text, setText] = useState(() => d.toLocaleString("en-US", { ...opts, timeZone: "UTC" }));
  useEffect(() => setText(d.toLocaleString("en-US", opts)), [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return <time dateTime={d.toISOString()} suppressHydrationWarning>{text}</time>;
}
