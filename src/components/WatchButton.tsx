import { Heart } from "lucide-react";
import { toggleWatch } from "@/app/actions";

export function WatchButton({ listingId, watched, compact }: { listingId: number; watched: boolean; compact?: boolean }) {
  return (
    <form action={toggleWatch}>
      <input type="hidden" name="listingId" value={listingId} />
      {compact ? (
        <button
          className={`icon-btn${watched ? " on" : ""}`}
          aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
          aria-pressed={watched}
          title={watched ? "Watching" : "Watch this item"}
        >
          <Heart />
        </button>
      ) : (
        <button className="btn btn-block" aria-pressed={watched}>
          <Heart fill={watched ? "#d0342c" : "none"} color={watched ? "#d0342c" : "currentColor"} />
          {watched ? "Watching" : "Add to watchlist"}
        </button>
      )}
    </form>
  );
}
