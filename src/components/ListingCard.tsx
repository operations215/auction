import Link from "next/link";
import { Gavel } from "lucide-react";
import { formatMoney, imageUrl, lotNumber, type ListingCard as Card } from "@/lib/auctions";
import { Countdown } from "./Countdown";
import { WatchButton } from "./WatchButton";

export function ListingCard({ l, watched }: { l: Card; watched?: boolean }) {
  const ended = l.status !== "active";
  return (
    <article className="lcard">
      <div className="lcard-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl(l.image)} alt="" loading="lazy" />
        <span className="lot lot-tag">{lotNumber(l.id)}</span>
        <span className="tl">
          {ended ? (
            <span className="chip chip-dark">{l.winner_id ? "Sold" : "Ended"}</span>
          ) : (
            <Countdown endsAt={l.ends_at} />
          )}
        </span>
      </div>
      {watched !== undefined && !ended && (
        <div className="watch-form">
          <WatchButton listingId={l.id} watched={watched} compact />
        </div>
      )}
      <div className="lcard-body">
        <h3 className="lcard-title" style={{ fontFamily: "var(--font-body)", margin: 0 }}>
          <Link href={`/listings/${l.id}`} className="cover" aria-label={l.title} />
          {l.title}
        </h3>
        <div className="lcard-meta">
          <span className="chip">{l.condition}</span>
          {l.era && <span className="chip">{l.era}</span>}
        </div>
        <div className="lcard-foot">
          <div className="lcard-price">
            <small>{ended ? (l.winner_id ? "Sold for" : "Final bid") : l.bid_count ? "Current bid" : "Starting bid"}</small>
            {formatMoney(l.current_price_cents)}
          </div>
          <div className="lcard-bids">
            <Gavel size={13} style={{ verticalAlign: -2 }} /> {l.bid_count} {l.bid_count === 1 ? "bid" : "bids"}
            <br />
            {l.shipping_cents ? `+${formatMoney(l.shipping_cents)} ship` : "Free shipping"}
          </div>
        </div>
        <div className="lcard-seller">
          <span>Sold by</span> <b>{l.seller_name}</b>
        </div>
      </div>
    </article>
  );
}
