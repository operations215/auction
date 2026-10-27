import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MessagesSquare, Settings } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { db, parseDbDate, systemUserId } from "@/lib/db";
import { formatDate, searchListings, sellerStats, watchedIds } from "@/lib/auctions";
import { HERO_CAMO } from "@/lib/camo";
import { ListingCard } from "@/components/ListingCard";
import { Stars } from "@/components/Stars";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

type Profile = { id: number; display_name: string; location: string; bio: string; created_at: string };

function getProfile(id: number) {
  // The automated notices account isn't a member, so it has no public profile.
  if (id === systemUserId()) return undefined;
  return db().prepare("SELECT id, display_name, location, bio, created_at FROM users WHERE id = ?").get(id) as Profile | undefined;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = getProfile(Number((await params).id));
  return { title: p ? `${p.display_name}'s profile` : "Member not found" };
}

export default async function ProfilePage({ params, searchParams }: Params) {
  const id = Number((await params).id);
  const { tab = "listings" } = await searchParams;
  const p = getProfile(id);
  if (!p) notFound();
  const me = await currentUser();
  const watched = watchedIds(me?.id);
  const stats = sellerStats(id);
  const live = searchListings({ sellerId: id, sort: "ending" });
  const sold = searchListings({ sellerId: id, status: "ended", sort: "ending", limit: 48 });
  const reviews = db()
    .prepare(
      `SELECT r.*, u.display_name AS reviewer, l.title AS listing_title
       FROM reviews r JOIN users u ON u.id = r.reviewer_id JOIN listings l ON l.id = r.listing_id
       WHERE r.seller_id = ? ORDER BY r.id DESC LIMIT 100`
    )
    .all(id) as { id: number; rating: number; comment: string; created_at: string; reviewer: string; listing_title: string; listing_id: number }[];
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.rating === s).length }));
  const purchases = (db().prepare("SELECT COUNT(*) AS n FROM listings WHERE winner_id = ?").get(id) as { n: number }).n;
  const topRated = stats.rating_count >= 3 && (stats.positive_pct ?? 0) >= 95;

  return (
    <>
      <section className="profile-hero" style={{ backgroundImage: HERO_CAMO }}>
        <div className="wrap">
          <div className="dogtag" aria-label="Member details">
            <b>{p.display_name}</b>
            SVC NO. {String(p.id).padStart(6, "0")}
            <br />
            ENLISTED {formatDate(p.created_at).toUpperCase()}
            <br />
            {p.location ? p.location.toUpperCase() : "LOCATION CLASSIFIED"}
          </div>
          <div className="stack" style={{ gap: 18, flex: 1, minWidth: 260 }}>
            <div className="row" style={{ gap: 10 }}>
              {topRated && <span className="chip chip-brass"><BadgeCheck /> Top-rated seller</span>}
              {stats.sold_count >= 10 && <span className="chip chip-dark">Veteran seller · {stats.sold_count}+ sales</span>}
              {Date.now() - parseDbDate(p.created_at).getTime() < 30 * 864e5 && <span className="chip chip-dark">New member</span>}
              {stats.rating_count === 0 && <span className="chip chip-dark">No ratings yet</span>}
            </div>
            <div className="profile-stats">
              <div><div className="n">{stats.rating_avg ? stats.rating_avg.toFixed(1) : "–"}</div><div className="l">Avg rating</div></div>
              <div><div className="n">{stats.positive_pct != null ? `${stats.positive_pct}%` : "–"}</div><div className="l">Positive</div></div>
              <div><div className="n">{stats.sold_count}</div><div className="l">Items sold</div></div>
              <div><div className="n">{purchases}</div><div className="l">Items bought</div></div>
              <div><div className="n">{live.length}</div><div className="l">Live lots</div></div>
            </div>
            {p.bio && <p style={{ margin: 0, maxWidth: 640, color: "#d8d3bc" }}>{p.bio}</p>}
            <div className="row">
              {me?.id === p.id ? (
                <Link href="/account?tab=settings" className="btn btn-brass"><Settings /> Edit profile</Link>
              ) : (
                <Link href={me ? `/messages/${p.id}` : `/login?next=/users/${p.id}`} className="btn btn-brass"><MessagesSquare /> Message {p.display_name}</Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="wrap" style={{ paddingTop: 28 }}>
        <nav className="tabs">
          <Link href={`/users/${id}`} className={tab === "listings" ? "active" : ""}>Live lots <span className="count">{live.length}</span></Link>
          <Link href={`/users/${id}?tab=sold`} className={tab === "sold" ? "active" : ""}>Sold <span className="count">{sold.length}</span></Link>
          <Link href={`/users/${id}?tab=feedback`} className={tab === "feedback" ? "active" : ""}>Feedback <span className="count">{reviews.length}</span></Link>
        </nav>

        {tab === "listings" && (live.length ? (
          <div className="grid-cards">{live.map((l) => <ListingCard key={l.id} l={l} watched={me && me.id !== id ? watched.has(l.id) : undefined} />)}</div>
        ) : <div className="empty"><h3>No live auctions right now</h3><p>Check back soon, or look through what they&apos;ve sold.</p></div>)}

        {tab === "sold" && (sold.length ? (
          <div className="grid-cards">{sold.map((l) => <ListingCard key={l.id} l={l} />)}</div>
        ) : <div className="empty"><h3>No completed sales yet</h3></div>)}

        {tab === "feedback" && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 280px) minmax(0, 1fr)", gap: 28 }} className="feedback-grid">
            <div className="card card-pad" style={{ alignSelf: "start" }}>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 48, fontWeight: 800, lineHeight: 1 }}>{stats.rating_avg ? stats.rating_avg.toFixed(1) : "–"}</div>
              {stats.rating_avg && <Stars value={stats.rating_avg} size={18} />}
              <p className="small muted">{stats.rating_count} ratings from verified buyers</p>
              <div className="rating-bars">
                {dist.map((d) => (
                  <div className="bar" key={d.s}>
                    <span>{d.s} ★</span>
                    <span className="track"><span className="fill" style={{ display: "block", width: `${reviews.length ? (d.n / reviews.length) * 100 : 0}%` }} /></span>
                    <span className="muted">{d.n}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card card-pad">
              {reviews.length ? reviews.map((r) => (
                <div className="review" key={r.id}>
                  <div className="review-head">
                    <Stars value={r.rating} />
                    <b>{r.reviewer}</b>
                    <span className="muted">· {formatDate(r.created_at)}</span>
                    <span className="chip chip-go" style={{ marginLeft: "auto" }}><BadgeCheck /> Verified purchase</span>
                  </div>
                  {r.comment && <p style={{ margin: "8px 0 4px" }}>{r.comment}</p>}
                  <Link href={`/listings/${r.listing_id}`} className="small muted">{r.listing_title}</Link>
                </div>
              )) : <p className="muted" style={{ margin: 0 }}>No feedback yet. Feedback can only be left by buyers who won and paid for an item.</p>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
