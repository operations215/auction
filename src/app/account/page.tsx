import type { Metadata } from "next";
import Link from "next/link";
import {
  CircleAlert,
  CircleCheck,
  Gavel,
  Heart,
  LogOut,
  MessagesSquare,
  PackageCheck,
  Plus,
  Receipt,
  Star,
  Store,
  Trophy,
  Truck,
  Wallet,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cardsWhere, formatMoney, imageUrl, lotNumber, type ListingCard as Card } from "@/lib/auctions";
import { demoPaymentsEnabled, paypalClientId, paypalConfigured } from "@/lib/paypal";
import { dueDate, FEE_DUE_DAYS, feeBalance, feePolicy, featurePrice, feeSettings, formatRate, sellerFees } from "@/lib/fees";
import { confirmReceived, featureLot, leaveReview, logout, markShipped, simulateFeePayment, simulatePayment } from "@/app/actions";
import { Countdown } from "@/components/Countdown";
import { ListingCard } from "@/components/ListingCard";
import { LocalTime } from "@/components/LocalTime";
import { OrderTimeline } from "@/components/OrderTimeline";
import { PayPalCheckout } from "@/components/PayPalCheckout";
import { ProfileForm } from "@/components/ProfileForm";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata: Metadata = { title: "My MusterBid" };

const TABS = [
  ["bidding", "Bidding", Gavel],
  ["won", "Won", Trophy],
  ["selling", "Selling", Store],
  ["watching", "Watching", Heart],
  ["fees", "Fees", Receipt],
  ["settings", "Settings", Star],
] as const;

const FLASH: Record<string, string> = {
  paid: "Payment recorded. The seller has been told to ship your item.",
  shipped: "Marked as shipped. The buyer has been sent the tracking details.",
  received: "Thanks for confirming delivery. Don't forget to rate the seller.",
  reviewed: "Thanks for your feedback. It helps every collector on MusterBid.",
  fees: "Fees paid. Thanks for supporting MusterBid.",
  featured: "Your lot is featured. It's on the home page and at the top of matching searches until it ends.",
};

const FLASH_ERROR: Record<string, string> = {
  "fees-overdue": "Pay your overdue seller fees before featuring a lot.",
  "feature-failed": "Only your own live auctions can be featured.",
};

function Thumb({ l }: { l: Card }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={imageUrl(l.image)} alt="" />;
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string; flash?: string }> }) {
  const user = await requireUser("/account");
  const { tab = "bidding", flash } = await searchParams;
  const uid = user.id;
  const d = db();

  const bidding = cardsWhere("l.status = 'active' AND l.id IN (SELECT listing_id FROM bids WHERE bidder_id = ?)", [uid]);
  const won = cardsWhere("l.status = 'ended' AND l.winner_id = ?", [uid], "l.ends_at DESC");
  const lost = cardsWhere(
    "l.status = 'ended' AND (l.winner_id IS NULL OR l.winner_id != ?) AND l.id IN (SELECT listing_id FROM bids WHERE bidder_id = ?)",
    [uid, uid],
    "l.ends_at DESC LIMIT 20"
  );
  const sellingLive = cardsWhere("l.status = 'active' AND l.seller_id = ?", [uid]);
  const sellingDone = cardsWhere("l.status IN ('ended', 'cancelled') AND l.seller_id = ?", [uid], "l.ends_at DESC");
  const watching = cardsWhere("l.id IN (SELECT listing_id FROM watchlist WHERE user_id = ?)", [uid]);
  const reviewed = new Set((d.prepare("SELECT listing_id FROM reviews WHERE reviewer_id = ?").all(uid) as { listing_id: number }[]).map((r) => r.listing_id));
  const names = new Map((d.prepare("SELECT id, display_name FROM users").all() as { id: number; display_name: string }[]).map((u) => [u.id, u.display_name]));
  const sellerPaypal = new Map((d.prepare("SELECT id, paypal_email FROM users").all() as { id: number; paypal_email: string }[]).map((u) => [u.id, !!u.paypal_email]));
  const watcherCount = (id: number) => (d.prepare("SELECT COUNT(*) AS n FROM watchlist WHERE listing_id = ?").get(id) as { n: number }).n;
  const fees = sellerFees(uid);
  const balance = feeBalance(uid);
  const feeByListing = new Map(fees.filter((f) => f.kind === "sale").map((f) => [f.listing_id, f]));
  const showFees = fees.length > 0 || sellingLive.length + sellingDone.length > 0;

  const winningCount = bidding.filter((l) => l.high_bidder_id === uid).length;
  const toPay = won.filter((l) => !l.paid_at).length;
  const toShip = sellingDone.filter((l) => l.winner_id && l.paid_at && !l.shipped_at).length;
  const counts: Record<string, number> = {
    bidding: bidding.length,
    won: won.length,
    selling: sellingLive.length + sellingDone.length,
    watching: watching.length,
    ...(balance.count ? { fees: balance.count } : {}),
  };
  const demo = demoPaymentsEnabled();
  const paypalOn = paypalConfigured();

  return (
    <div className="wrap">
      <div className="page-head">
        <div>
          <div className="eyebrow">Command post</div>
          <h1>My MusterBid</h1>
          <p className="muted" style={{ margin: 0 }}>Signed in as <b>{user.display_name}</b></p>
        </div>
        <div className="row">
          <Link href="/sell" className="btn btn-brass"><Plus /> List an item</Link>
          <form action={logout}><button className="btn btn-ghost"><LogOut /> Log out</button></form>
        </div>
      </div>

      {flash && FLASH[flash] && <div className="alert alert-ok" style={{ marginBottom: 18 }}><CircleCheck /> {FLASH[flash]}</div>}
      {flash && FLASH_ERROR[flash] && <div className="alert alert-error" style={{ marginBottom: 18 }}><CircleAlert /> {FLASH_ERROR[flash]}</div>}
      {toPay > 0 && tab !== "won" && (
        <div className="alert alert-warn" style={{ marginBottom: 18 }}>
          <Wallet /> <span>You have {toPay} won {toPay === 1 ? "item" : "items"} waiting for payment. <Link className="link" href="/account?tab=won">Pay now</Link></span>
        </div>
      )}
      {balance.overdue && tab !== "fees" && (
        <div className="alert alert-error" style={{ marginBottom: 18 }}>
          <CircleAlert /> <span>Your seller fees are overdue. New listings are paused until you pay {formatMoney(balance.owedCents)}. <Link className="link" href="/account?tab=fees">Pay fees</Link></span>
        </div>
      )}
      {toShip > 0 && tab !== "selling" && (
        <div className="alert alert-info" style={{ marginBottom: 18 }}>
          <Truck /> <span>{toShip} sold {toShip === 1 ? "item is" : "items are"} paid and ready to ship. <Link className="link" href="/account?tab=selling">Add tracking</Link></span>
        </div>
      )}

      <div className="kpis">
        <div className="card kpi"><span>Active bids</span><b>{bidding.length}</b></div>
        <div className="card kpi"><span>Currently winning</span><b style={{ color: "var(--go)" }}>{winningCount}</b></div>
        <div className="card kpi"><span>Won, awaiting payment</span><b style={{ color: toPay ? "var(--warn)" : undefined }}>{toPay}</b></div>
        <div className="card kpi"><span>Live listings</span><b>{sellingLive.length}</b></div>
      </div>

      <nav className="tabs">
        {TABS.filter(([k]) => k !== "fees" || showFees).map(([k, label, Icon]) => (
          <Link key={k} href={`/account?tab=${k}`} className={tab === k ? "active" : ""}>
            <Icon size={16} /> {label} {counts[k] != null && <span className="count">{counts[k]}</span>}
          </Link>
        ))}
      </nav>

      {tab === "bidding" && (
        <>
          {bidding.length ? (
            <div className="card">
              {bidding.map((l) => {
                const winning = l.high_bidder_id === uid;
                return (
                  <div className="list-item" key={l.id}>
                    <Link href={`/listings/${l.id}`}><Thumb l={l} /></Link>
                    <div>
                      <Link href={`/listings/${l.id}`} className="t">{l.title}</Link>
                      <div className="row small muted" style={{ gap: 8, marginTop: 4 }}>
                        {winning ? <span className="chip chip-go"><CircleCheck /> Winning</span> : <span className="chip chip-signal"><CircleAlert /> Outbid</span>}
                        <span>{l.bid_count} {l.bid_count === 1 ? "bid" : "bids"}</span>
                        {winning && l.high_max_cents && <span>Your max {formatMoney(l.high_max_cents)}</span>}
                      </div>
                    </div>
                    <div className="right">
                      <div style={{ fontFamily: "var(--font-head)", fontSize: 24, fontWeight: 800 }}>{formatMoney(l.current_price_cents)}</div>
                      <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
                        <Countdown endsAt={l.ends_at} />
                        {!winning && <Link href={`/listings/${l.id}`} className="btn btn-sm btn-brass">Bid again</Link>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty"><Gavel /><h3>No active bids</h3><p>Find something worth fighting for.</p><Link href="/search?sort=ending" className="btn btn-brass">Browse ending soon</Link></div>
          )}
          {lost.length > 0 && (
            <>
              <h3 style={{ marginTop: 32, textTransform: "uppercase" }}>Recently ended, not won</h3>
              <div className="card">
                {lost.map((l) => (
                  <div className="list-item" key={l.id}>
                    <Link href={`/listings/${l.id}`}><Thumb l={l} /></Link>
                    <div><Link href={`/listings/${l.id}`} className="t">{l.title}</Link><div className="small muted">Ended <LocalTime value={l.ends_at} /></div></div>
                    <div className="right"><b>{formatMoney(l.current_price_cents)}</b><div className="small muted">{l.winner_id ? "Sold" : "Not sold"}</div></div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {tab === "won" && (won.length ? (
        <div className="stack" style={{ gap: 16 }}>
          {!paypalOn && demo && (
            <div className="alert alert-info"><Wallet /> <span><b>Demo payments are on.</b> PayPal keys haven&apos;t been added yet, so you can simulate a payment to try the full flow. Real PayPal buttons appear here once keys are configured.</span></div>
          )}
          {won.map((l) => (
            <div className="card order-card" key={l.id}>
              <Link href={`/listings/${l.id}`}><Thumb l={l} /></Link>
              <div>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <span className="mono small muted">{lotNumber(l.id)}</span>
                    <Link href={`/listings/${l.id}`} className="t" style={{ display: "block", fontWeight: 700, fontSize: 16 }}>{l.title}</Link>
                    <div className="small muted">Won <LocalTime value={l.ends_at} /> from <Link className="link" href={`/users/${l.seller_id}`}>{l.seller_name}</Link></div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-head)", fontSize: 26, fontWeight: 800 }}>{formatMoney(l.current_price_cents + l.shipping_cents)}</div>
                    <div className="small muted">{formatMoney(l.current_price_cents)} + {formatMoney(l.shipping_cents)} shipping</div>
                  </div>
                </div>
                <OrderTimeline l={l} />
                <div className="stack" style={{ gap: 10, marginTop: 12 }}>
                  {!l.paid_at && (
                    paypalOn ? (
                      sellerPaypal.get(l.seller_id) ? <PayPalCheckout clientId={paypalClientId()} payload={{ listingId: l.id }} /> : <div className="alert alert-warn">The seller hasn&apos;t connected PayPal yet. We&apos;ve let them know; message them if it takes long.</div>
                    ) : demo ? (
                      <form action={simulatePayment}>
                        <input type="hidden" name="listingId" value={l.id} />
                        <SubmitButton className="btn btn-brass" pendingText="Processing…"><Wallet /> Simulate PayPal payment (demo)</SubmitButton>
                      </form>
                    ) : (
                      <div className="alert alert-warn">Online payment isn&apos;t available yet. Message the seller to arrange payment.</div>
                    )
                  )}
                  {l.paid_at && <div className="small"><CircleCheck size={15} color="var(--go)" style={{ verticalAlign: -3 }} /> Paid <LocalTime value={l.paid_at} /> · ref <span className="mono">{l.payment_ref}</span></div>}
                  {l.shipped_at && (
                    <div className="small"><Truck size={15} style={{ verticalAlign: -3 }} /> Shipped <LocalTime value={l.shipped_at} />{l.tracking_carrier && ` via ${l.tracking_carrier}`}{l.tracking_number && <> · tracking <span className="mono">{l.tracking_number}</span></>}</div>
                  )}
                  {l.shipped_at && !l.received_at && (
                    <form action={confirmReceived}>
                      <input type="hidden" name="listingId" value={l.id} />
                      <SubmitButton className="btn btn-olive btn-sm"><PackageCheck /> It arrived, confirm delivery</SubmitButton>
                    </form>
                  )}
                  {l.paid_at && !reviewed.has(l.id) && (
                    <details>
                      <summary className="link small" style={{ cursor: "pointer" }}>Rate the seller</summary>
                      <form action={leaveReview} className="stack" style={{ gap: 10, marginTop: 10, maxWidth: 520 }}>
                        <input type="hidden" name="listingId" value={l.id} />
                        <div className="row" style={{ gap: 6 }}>
                          {[5, 4, 3, 2, 1].map((s) => (
                            <label key={s} className="chip" style={{ cursor: "pointer", height: 32 }}>
                              <input type="radio" name="rating" value={s} required defaultChecked={s === 5} /> {s} ★
                            </label>
                          ))}
                        </div>
                        <textarea name="comment" className="textarea" style={{ minHeight: 80 }} placeholder="How was the item, the packing and the communication?" />
                        <SubmitButton className="btn btn-brass btn-sm">Post feedback</SubmitButton>
                      </form>
                    </details>
                  )}
                  {reviewed.has(l.id) && <div className="small muted"><Star size={14} style={{ verticalAlign: -2 }} /> You&apos;ve rated this seller. Thank you.</div>}
                  <div><Link href={`/messages/${l.seller_id}?listing=${l.id}`} className="btn btn-sm"><MessagesSquare /> Message seller</Link></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : <div className="empty"><Trophy /><h3>No wins yet</h3><p>When you win an auction it lands here, ready to pay and track.</p></div>)}

      {tab === "selling" && (
        <div className="stack" style={{ gap: 28 }}>
          <div>
            <h3 style={{ textTransform: "uppercase" }}>Live listings</h3>
            {sellingLive.length ? (
              <div className="card">
                {sellingLive.map((l) => (
                  <div className="list-item" key={l.id}>
                    <Link href={`/listings/${l.id}`}><Thumb l={l} /></Link>
                    <div>
                      <Link href={`/listings/${l.id}`} className="t">{l.title}</Link>
                      <div className="row small muted" style={{ gap: 10, marginTop: 4 }}>
                        <span><Gavel size={13} style={{ verticalAlign: -2 }} /> {l.bid_count} {l.bid_count === 1 ? "bid" : "bids"}</span>
                        <span><Heart size={13} style={{ verticalAlign: -2 }} /> {watcherCount(l.id)} watching</span>
                        {l.reserve_price_cents != null && <span>Reserve {formatMoney(l.reserve_price_cents)}</span>}
                        {l.featured_at && <span className="chip chip-brass"><Star /> Featured</span>}
                      </div>
                      {!l.featured_at && (
                        <form action={featureLot} style={{ marginTop: 8 }}>
                          <input type="hidden" name="listingId" value={l.id} />
                          <input type="hidden" name="next" value="/account?tab=selling" />
                          <SubmitButton className="btn btn-sm" pendingText="Featuring…"><Star /> Feature it ({featurePrice()})</SubmitButton>
                        </form>
                      )}
                    </div>
                    <div className="right">
                      <div style={{ fontFamily: "var(--font-head)", fontSize: 24, fontWeight: 800 }}>{formatMoney(l.current_price_cents)}</div>
                      <Countdown endsAt={l.ends_at} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="empty"><Store /><h3>Nothing listed right now</h3><Link href="/sell" className="btn btn-brass">List your first item</Link></div>}
          </div>
          {sellingDone.length > 0 && (
            <div>
              <h3 style={{ textTransform: "uppercase" }}>Ended</h3>
              <div className="stack" style={{ gap: 14 }}>
                {sellingDone.map((l) => (
                  <div className="card order-card" key={l.id}>
                    <Link href={`/listings/${l.id}`}><Thumb l={l} /></Link>
                    <div>
                      <div className="row" style={{ justifyContent: "space-between" }}>
                        <div>
                          <Link href={`/listings/${l.id}`} style={{ fontWeight: 700 }}>{l.title}</Link>
                          <div className="small muted">
                            {l.status === "cancelled" ? "Cancelled" : l.winner_id ? <>Sold to <b>{names.get(l.winner_id)}</b> · <LocalTime value={l.ends_at} /></> : l.bid_count ? "Reserve not met" : "No bids"}
                          </div>
                        </div>
                        <b style={{ fontFamily: "var(--font-head)", fontSize: 24 }}>{formatMoney(l.current_price_cents)}</b>
                      </div>
                      {l.winner_id && (
                        <>
                          <OrderTimeline l={l} />
                          {!l.paid_at && <p className="small muted" style={{ margin: "10px 0 0" }}>Waiting for the buyer to pay. Buyers are asked to pay within 3 days.</p>}
                          {feeByListing.has(l.id) && (() => {
                            const f = feeByListing.get(l.id)!;
                            return (
                              <p className="small muted" style={{ margin: "10px 0 0" }}>
                                <Receipt size={14} style={{ verticalAlign: -2 }} /> Seller fee {formatMoney(f.amount_cents)} ({formatRate(f.rate_bp)}) ·{" "}
                                {f.status === "owed" ? <Link className="link" href="/account?tab=fees">owed</Link> : f.status}
                              </p>
                            );
                          })()}
                          {l.paid_at && l.ship_to && (
                            <div className="small" style={{ marginTop: 10 }}>
                              <b>Ship to:</b>
                              <div style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)", fontSize: 12.5, background: "var(--surface-2)", padding: "8px 10px", borderRadius: 8, marginTop: 4 }}>{l.ship_to}</div>
                            </div>
                          )}
                          {l.paid_at && !l.shipped_at && (
                            <form action={markShipped} className="row" style={{ gap: 8, marginTop: 12, alignItems: "flex-end" }}>
                              <input type="hidden" name="listingId" value={l.id} />
                              <div style={{ minWidth: 140 }}>
                                <label className="label small" htmlFor={`c${l.id}`}>Carrier</label>
                                <select id={`c${l.id}`} name="carrier" className="select" style={{ height: 38 }}>
                                  {["USPS", "UPS", "FedEx", "DHL", "Royal Mail", "Canada Post", "Other"].map((c) => <option key={c}>{c}</option>)}
                                </select>
                              </div>
                              <div style={{ flex: 1, minWidth: 180 }}>
                                <label className="label small" htmlFor={`t${l.id}`}>Tracking number</label>
                                <input id={`t${l.id}`} name="tracking" className="input" style={{ height: 38 }} placeholder="Optional but recommended" />
                              </div>
                              <SubmitButton className="btn btn-olive btn-sm" style={{ height: 38 }}><Truck /> Mark shipped</SubmitButton>
                            </form>
                          )}
                          <div style={{ marginTop: 10 }}><Link href={`/messages/${l.winner_id}?listing=${l.id}`} className="btn btn-sm"><MessagesSquare /> Message buyer</Link></div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "watching" && (watching.length ? (
        <div className="grid-cards">{watching.map((l) => <ListingCard key={l.id} l={l} watched />)}</div>
      ) : <div className="empty"><Heart /><h3>Your watchlist is empty</h3><p>Tap the heart on any lot to keep an eye on it.</p></div>)}

      {tab === "fees" && (
        <div className="stack" style={{ gap: 18 }}>
          <div className={`card fee-summary${balance.overdue ? " overdue" : ""}`}>
            <div>
              <div className="eyebrow">Fee balance</div>
              <div className="fee-big">{formatMoney(balance.owedCents)}</div>
              <div className="small">
                {balance.count === 0 ? (
                  <span className="muted">You&apos;re all square. Nothing to pay.</span>
                ) : balance.overdue ? (
                  <b style={{ color: "var(--signal)" }}>Overdue. New listings are paused until you pay.</b>
                ) : (
                  <span className="muted">From {balance.count} {balance.count === 1 ? "charge" : "charges"}. Due by <b><LocalTime value={balance.dueBy!.toISOString()} withTime={false} /></b>.</span>
                )}
              </div>
            </div>
            {balance.owedCents > 0 && (
              <div className="fee-pay">
                {paypalOn ? (
                  <PayPalCheckout clientId={paypalClientId()} endpoint="/api/paypal/fees" doneText="Fees paid. Thanks for supporting MusterBid." />
                ) : demo ? (
                  <form action={simulateFeePayment}>
                    <SubmitButton className="btn btn-brass btn-lg" pendingText="Processing…"><Wallet /> Pay {formatMoney(balance.owedCents)} (demo)</SubmitButton>
                  </form>
                ) : (
                  <div className="alert alert-warn">Online fee payment opens once PayPal is connected.</div>
                )}
              </div>
            )}
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            <Receipt size={14} style={{ verticalAlign: -2 }} /> {feePolicy()}
            {(fees.length > 0 || feeSettings().rateBp > 0) && ` Each fee is due within ${FEE_DUE_DAYS} days.`}{" "}
            <Link className="link" href="/how-it-works#fees">How fees work</Link>
          </p>
          {fees.length ? (
            <div className="card table-wrap">
              <table className="table">
                <thead><tr><th>Item</th><th>For</th><th className="num">Fee</th><th>Charged</th><th>Status</th></tr></thead>
                <tbody>
                  {fees.map((f) => {
                    const late = f.status === "owed" && dueDate(f.created_at).getTime() < Date.now();
                    return (
                      <tr key={f.id}>
                        <td><Link className="link mono small" href={`/listings/${f.listing_id}`}>{lotNumber(f.listing_id)}</Link><div>{f.title}</div></td>
                        <td className="small">{f.kind === "feature" ? "Featuring the lot" : <>Sale at {formatMoney(f.sale_cents)}</>}</td>
                        <td className="num"><b>{formatMoney(f.amount_cents)}</b>{f.kind === "sale" && <div className="small muted">{formatRate(f.rate_bp)}</div>}</td>
                        <td className="small"><LocalTime value={f.created_at} withTime={false} /></td>
                        <td>
                          <span className={`chip ${late ? "chip-signal" : f.status === "owed" ? "chip-warn" : f.status === "paid" ? "chip-go" : ""}`}>
                            {late ? "Overdue" : f.status === "owed" ? "Owed" : f.status === "paid" ? "Paid" : "Waived"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty"><Receipt /><h3>No fees yet</h3><p>When one of your items sells and the buyer pays, or you feature a lot, its fee shows up here.</p></div>
          )}
        </div>
      )}

      {tab === "settings" && <ProfileForm user={user} />}
    </div>
  );
}
