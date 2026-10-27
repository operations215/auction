import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  Eye,
  Flag,
  Gavel,
  MapPin,
  MessagesSquare,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Trophy,
  Truck,
  Wallet,
} from "lucide-react";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  REPORT_REASONS,
  bidIncrement,
  formatMoney,
  getBidHistory,
  getImages,
  getListing,
  imageUrl,
  lotNumber,
  maskName,
  minimumBid,
  reserveMet,
  searchListings,
  sellerStats,
  watchedIds,
} from "@/lib/auctions";
import { cancelListing, reportListing } from "@/app/actions";
import { BidBox } from "@/components/BidBox";
import { Countdown } from "@/components/Countdown";
import { Gallery } from "@/components/Gallery";
import { ListingCard } from "@/components/ListingCard";
import { LocalTime } from "@/components/LocalTime";
import { Stars } from "@/components/Stars";
import { WatchButton } from "@/components/WatchButton";
import { SubmitButton } from "@/components/SubmitButton";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ flash?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const l = getListing(Number((await params).id));
  return { title: l ? l.title : "Listing not found" };
}

const FLASH: Record<string, [string, string]> = {
  listed: ["alert-ok", "Your auction is live. Share the link and watch the bids roll in."],
  cancelled: ["alert-warn", "This listing was cancelled and is no longer visible in search."],
  reported: ["alert-ok", "Thanks. Our team reviews every report, usually within a day."],
  "report-invalid": ["alert-error", "Please choose a reason for the report."],
};

export default async function ListingPage({ params, searchParams }: Params) {
  const id = Number((await params).id);
  const { flash } = await searchParams;
  const l = getListing(id);
  if (!l) notFound();
  const user = await currentUser();
  const isSeller = user?.id === l.seller_id;
  if (l.status === "cancelled" && !isSeller && !user?.is_admin) notFound();

  const images = getImages(l.id).map(imageUrl);
  if (images.length === 0) images.push(imageUrl(null));
  const bids = getBidHistory(l.id);
  const stats = sellerStats(l.seller_id);
  const watching = watchedIds(user?.id).has(l.id);
  const watchers = (db().prepare("SELECT COUNT(*) AS n FROM watchlist WHERE listing_id = ?").get(l.id) as { n: number }).n;
  const bidders = new Set(bids.map((b) => b.bidder_id)).size;
  const active = l.status === "active";
  const leading = user && l.high_bidder_id === user.id;
  const userBid = user ? bids.some((b) => b.bidder_id === user.id) : false;
  const isWinner = user && l.winner_id === user.id;
  const more = searchListings({ category: l.category_slug, limit: 5 }).filter((x) => x.id !== l.id).slice(0, 4);
  const sellerActive = (db().prepare("SELECT COUNT(*) AS n FROM listings WHERE seller_id = ? AND status = 'active'").get(l.seller_id) as { n: number }).n;
  const reserve = l.reserve_price_cents == null ? "none" : reserveMet(l) ? "met" : "not-met";
  const flashMsg = flash ? FLASH[flash] : undefined;

  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> <ChevronRight size={14} />
        <Link href={`/search?category=${l.category_slug}`}>{l.category_name}</Link> <ChevronRight size={14} />
        <span className="mono">{lotNumber(l.id)}</span>
      </nav>

      {flashMsg && <div className={`alert ${flashMsg[0]}`} style={{ marginBottom: 18 }}>{flashMsg[1]}</div>}

      <div className="listing-layout">
        <div className="l-gallery">
          <Gallery images={images} alt={l.title} lot={lotNumber(l.id)} />
        </div>
        <div className="l-details stack" style={{ gap: 22 }}>

          <section className="card card-pad">
            <h2 style={{ textTransform: "uppercase", fontSize: 22 }}>About this item</h2>
            <div className="description">{l.description}</div>
          </section>

          <section className="card card-pad">
            <h2 style={{ textTransform: "uppercase", fontSize: 22 }}>Item specifics</h2>
            <table className="specs">
              <tbody>
                <tr><th>Condition</th><td>{l.condition}</td></tr>
                <tr><th>Category</th><td><Link className="link" href={`/search?category=${l.category_slug}`}>{l.category_name}</Link></td></tr>
                {l.era && <tr><th>Era / conflict</th><td>{l.era}</td></tr>}
                {l.origin_country && <tr><th>Country of origin</th><td>{l.origin_country}</td></tr>}
                {l.markings && <tr><th>Markings & stamps</th><td>{l.markings}</td></tr>}
                {l.provenance && <tr><th>Provenance</th><td style={{ whiteSpace: "pre-wrap" }}>{l.provenance}</td></tr>}
                <tr><th>Authenticity</th><td>{l.authenticity_guarantee ? <span className="chip chip-go"><BadgeCheck /> Seller guarantees original issue</span> : "Not guaranteed by seller"}</td></tr>
                <tr><th>Returns</th><td>{l.returns_accepted ? "14-day returns accepted" : "No returns, unless not as described"}</td></tr>
                <tr><th>Lot number</th><td className="mono">{lotNumber(l.id)}</td></tr>
                <tr><th>Listed</th><td><LocalTime value={l.created_at} /></td></tr>
              </tbody>
            </table>
          </section>

          <section className="card card-pad" id="bids">
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
              <h2 style={{ textTransform: "uppercase", fontSize: 22, margin: 0 }}>Bid history</h2>
              <span className="muted small">{l.bid_count} bids · {bidders} bidders</span>
            </div>
            {bids.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Bidder</th><th className="num">Price after bid</th><th className="num">When</th></tr></thead>
                  <tbody>
                    {bids.map((b, k) => (
                      <tr key={b.id}>
                        <td>
                          <span className="mono">{user?.id === b.bidder_id ? "You" : maskName(b.bidder_name)}</span>
                          {k === 0 && <span className="chip chip-brass" style={{ marginLeft: 8 }}>Latest</span>}
                        </td>
                        <td className="num"><b>{formatMoney(b.price_after_cents)}</b></td>
                        <td className="num muted"><LocalTime value={b.created_at} /></td>
                      </tr>
                    ))}
                    <tr>
                      <td className="muted">Starting bid</td>
                      <td className="num">{formatMoney(l.starting_price_cents)}</td>
                      <td className="num muted"><LocalTime value={l.created_at} /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted" style={{ margin: 0 }}>No bids yet. Be the first. The starting bid is {formatMoney(l.starting_price_cents)}.</p>
            )}
            <p className="small muted" style={{ margin: "12px 0 0" }}>
              Bidder names are partly hidden for privacy. Maximum bids are never shown to anyone.
            </p>
          </section>

          {!isSeller && user && (
            <details className="card card-pad">
              <summary style={{ cursor: "pointer", fontWeight: 600, display: "flex", gap: 8, alignItems: "center" }}>
                <Flag size={16} /> Report this listing
              </summary>
              <form action={reportListing} style={{ marginTop: 16 }}>
                <input type="hidden" name="listingId" value={l.id} />
                <div className="field">
                  <label htmlFor="reason">What&apos;s wrong?</label>
                  <select id="reason" name="reason" className="select" required defaultValue="">
                    <option value="" disabled>Choose a reason</option>
                    {REPORT_REASONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="details">Details (optional)</label>
                  <textarea id="details" name="details" className="textarea" style={{ minHeight: 90 }} placeholder="Tell us what you noticed" />
                </div>
                <SubmitButton className="btn btn-danger">Send report</SubmitButton>
              </form>
            </details>
          )}
        </div>

        <aside className="l-aside stack" style={{ gap: 18 }}>
          <div>
            <div className="row" style={{ gap: 6 }}>
              <span className="chip">{l.condition}</span>
              {l.era && <span className="chip">{l.era}</span>}
              {l.origin_country && <span className="chip"><MapPin /> {l.origin_country}</span>}
              {l.authenticity_guarantee ? <span className="chip chip-go"><BadgeCheck /> Authenticity guaranteed</span> : null}
            </div>
            <h1 className="listing-title">{l.title}</h1>
            <div className="row small muted" style={{ gap: 14 }}>
              <span><Eye size={14} style={{ verticalAlign: -2 }} /> {watchers} watching</span>
              <span><Gavel size={14} style={{ verticalAlign: -2 }} /> {l.bid_count} bids</span>
            </div>
          </div>

          <div className="card bidbox">
            <div className="bidbox-head">
              {active ? (
                <>
                  <div>
                    <div className="label">Time left</div>
                    <Countdown endsAt={l.ends_at} variant="big" refreshOnEnd />
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="label">Ends</div>
                    <div className="small" style={{ color: "#e6e1cc" }}><LocalTime value={l.ends_at} /></div>
                  </div>
                </>
              ) : (
                <div>
                  <div className="label">{l.status === "cancelled" ? "Cancelled" : "Auction ended"}</div>
                  <div className="countdown"><LocalTime value={l.ends_at} /></div>
                </div>
              )}
            </div>
            <div className="bidbox-body">
              <div className="muted small" style={{ fontWeight: 600 }}>
                {active ? (l.bid_count ? "Current bid" : "Starting bid") : l.winner_id ? "Sold for" : "Final bid"}
              </div>
              <div className="price-big">{formatMoney(l.current_price_cents)}</div>
              <div className="price-sub">
                <span>
                  <a href="#bids" className="link">{l.bid_count} {l.bid_count === 1 ? "bid" : "bids"}</a>
                </span>
                <span>+ {l.shipping_cents ? `${formatMoney(l.shipping_cents)} shipping` : "free shipping"}</span>
                {reserve === "met" && <span className="chip chip-go">Reserve met</span>}
                {reserve === "not-met" && <span className="chip chip-warn">Reserve not met</span>}
                {reserve === "none" && <span className="chip">No reserve</span>}
              </div>

              <div style={{ marginTop: 18 }}>
                {active && isSeller && (
                  <div className="stack" style={{ gap: 10 }}>
                    <div className="alert alert-info">This is your listing. You can&apos;t bid on it, but you can watch it here.</div>
                    {l.bid_count === 0 && (
                      <form action={cancelListing}>
                        <input type="hidden" name="listingId" value={l.id} />
                        <SubmitButton className="btn btn-danger btn-block" pendingText="Cancelling…">Cancel listing (no bids yet)</SubmitButton>
                      </form>
                    )}
                  </div>
                )}
                {active && !isSeller && (
                  <BidBox
                    listingId={l.id}
                    minBidCents={minimumBid(l)}
                    incrementCents={bidIncrement(l.current_price_cents)}
                    shippingCents={l.shipping_cents}
                    loggedIn={!!user}
                    leadingMaxCents={leading ? l.high_max_cents : null}
                    outbid={!!user && userBid && !leading}
                  />
                )}
                {!active && l.status === "ended" && (
                  isWinner ? (
                    <div className="stack" style={{ gap: 10 }}>
                      <div className="alert alert-ok"><Trophy /> <span><b>You won this auction!</b> {l.paid_at ? "Payment received. Thank you." : "Pay the seller with PayPal to complete your purchase."}</span></div>
                      <Link href="/account?tab=won" className="btn btn-brass btn-lg btn-block"><Wallet /> {l.paid_at ? "Track your order" : "Pay now"}</Link>
                    </div>
                  ) : (
                    <div className="alert alert-info">
                      {l.winner_id ? "This auction has ended and the item has sold." : l.bid_count ? "This auction ended without meeting the reserve price." : "This auction ended with no bids."}
                    </div>
                  )
                )}
              </div>

              {active && !isSeller && (
                <div style={{ marginTop: 10 }}>
                  <WatchButton listingId={l.id} watched={watching} />
                </div>
              )}

              <ul className="facts">
                <li><Truck /><span><b>Shipping:</b> {l.shipping_cents ? formatMoney(l.shipping_cents) : "Free"}{l.ships_from ? ` from ${l.ships_from}` : ""}</span></li>
                <li><RotateCcw /><span><b>Returns:</b> {l.returns_accepted ? "14 days, buyer pays return shipping" : "Not accepted, unless the item isn't as described"}</span></li>
                <li><Wallet /><span><b>Payment:</b> PayPal, paid straight to the seller</span></li>
                <li><CalendarClock /><span><b>Anti-sniping:</b> bids in the final 2 minutes extend the auction</span></li>
              </ul>
            </div>
          </div>

          <div className="card seller-card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>About the seller</div>
            <div className="seller-top">
              <span className="avatar">{l.seller_name[0]?.toUpperCase()}</span>
              <div>
                <Link href={`/users/${l.seller_id}`} className="seller-name">
                  {l.seller_name}
                  {stats.rating_count >= 3 && (stats.positive_pct ?? 0) >= 95 && <BadgeCheck size={17} color="var(--go)" aria-label="Top rated" />}
                </Link>
                <div className="small muted">
                  {stats.rating_avg ? <><Stars value={stats.rating_avg} size={13} /> {stats.rating_avg.toFixed(1)} ({stats.rating_count})</> : "No ratings yet"}
                </div>
                <div className="small muted">{l.seller_location || "Location not given"} · Member since <LocalTime value={l.seller_since} withTime={false} /></div>
              </div>
            </div>
            <div className="seller-stats">
              <div className="stat-box"><b>{stats.positive_pct != null ? `${stats.positive_pct}%` : "–"}</b><span>Positive</span></div>
              <div className="stat-box"><b>{stats.sold_count}</b><span>Items sold</span></div>
              <div className="stat-box"><b>{sellerActive}</b><span>Live lots</span></div>
            </div>
            <div className="row" style={{ marginTop: 16, gap: 8 }}>
              <Link href={`/users/${l.seller_id}`} className="btn btn-sm" style={{ flex: 1 }}>View profile</Link>
              {!isSeller && (
                <Link href={user ? `/messages/${l.seller_id}?listing=${l.id}` : `/login?next=/listings/${l.id}`} className="btn btn-sm btn-olive" style={{ flex: 1 }}>
                  <MessagesSquare /> Ask a question
                </Link>
              )}
            </div>
          </div>

          <div className="card card-pad" style={{ padding: 20 }}>
            <div className="row" style={{ gap: 10, marginBottom: 8 }}>
              <ShieldCheck color="var(--olive-500)" />
              <b>Buy with confidence</b>
            </div>
            <ul className="small" style={{ margin: 0, paddingLeft: 18, color: "var(--ink-2)", display: "grid", gap: 6 }}>
              <li>Always pay through the PayPal button on Quartermaster, never by bank transfer or gift card.</li>
              <li>Ask the seller for extra photos of markings or labels before you bid.</li>
              <li>Items not as described? PayPal buyer protection may cover you.</li>
            </ul>
            <Link href="/how-it-works#buyer-protection" className="link small" style={{ display: "inline-block", marginTop: 10 }}>How buyer protection works</Link>
          </div>
        </aside>
      </div>

      {more.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <div className="eyebrow"><PackageCheck size={12} style={{ verticalAlign: -1 }} /> Same category</div>
              <h2>More {l.category_name}</h2>
            </div>
            <Link href={`/search?category=${l.category_slug}`}>See all <ChevronRight size={15} /></Link>
          </div>
          <div className="grid-cards">
            {more.map((x) => <ListingCard key={x.id} l={x} />)}
          </div>
        </section>
      )}
      {flash === "listed" && (
        <div className="flash alert alert-ok"><CircleCheck /> Listing published</div>
      )}
    </div>
  );
}
