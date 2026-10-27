import { Star } from "lucide-react";

export function Stars({ value, size = 15 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="stars" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= full ? "" : "off"} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  );
}
