import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Flame,
  Hourglass,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  Wallet,
} from "lucide-react";
import { currentUser } from "@/lib/auth";
import { categoryCounts, searchListings, siteStats, watchedIds } from "@/lib/auctions";
import { HERO_CAMO } from "@/lib/camo";
import { ListingCard } from "@/components/ListingCard";
import { CategoryIcon } from "@/components/CategoryIcon";

const POPULAR = ["M65 field jacket", "M1 helmet", "ALICE pack", "Bundeswehr", "Swiss", "Compass", "Patches"];

export default async function Home() {
  const user = await currentUser();
  const watched = watchedIds(user?.id);
  const stats = siteStats();
  const ending = searchListings({ sort: "ending", limit: 8 });
  const hot = searchListings({ sort: "bids", limit: 4 });
  const fresh = searchListings({ sort: "newest", limit: 8 });
  const cats = categoryCounts();
  const featured = hot[0];
  const w = (id: number) => (user ? watched.has(id) : undefined);

  return (
    <>
      <section className="hero" style={{ backgroundImage: HERO_CAMO }}>
        <div className="wrap">
          <div>
            <div className="eyebrow" style={{ color: "var(--brass-hi)", marginBottom: 14 }}>
              ★ The collector&apos;s auction house
            </div>
            <h1>
              Genuine surplus.
              <br />
              <em>Honest</em> sellers.
              <br />
              Real auctions.
            </h1>
            <p className="lede">
              Bid on field gear, uniforms, helmets, insignia and militaria from rated sellers. Every auction is
              protected against last-second sniping, and every payment runs through PayPal.
            </p>
            <form action="/search" className="hero-search" role="search">
              <label htmlFor="hero-q" className="sr-only">Search</label>
              <input id="hero-q" name="q" className="input" placeholder="What are you hunting for?" />
              <button className="btn btn-brass btn-lg">
                <Search /> Search
              </button>
            </form>
            <div className="hero-tags">
              <span>Popular:</span>
              {POPULAR.map((p) => (
                <Link key={p} href={`/search?q=${encodeURIComponent(p)}`}>{p}</Link>
              ))}
            </div>
            <div className="hero-stats">
              <div>
                <div className="n">{stats.live}</div>
                <div className="l">Live auctions</div>
              </div>
              <div>
                <div className="n">{stats.endingDay}</div>
                <div className="l">Ending in 24h</div>
              </div>
              <div>
                <div className="n">{stats.bids}</div>
                <div className="l">Bids placed</div>
              </div>
              <div>
                <div className="n">{stats.sellers}</div>
                <div className="l">Sellers</div>
              </div>
            </div>
          </div>
          {featured && (
            <div className="hero-feature">
              <span className="feature-tag chip chip-brass" style={{ height: 30, padding: "0 14px", fontSize: 13 }}>
                <Flame /> Most-bid lot right now
              </span>
              <div className="card">
                <ListingCard l={featured} />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="trust-strip" aria-label="Why Quartermaster">
        <div className="wrap">
          <div className="trust-item">
            <span className="ico"><Wallet /></span>
            <div><b>PayPal checkout</b><span>Pay the seller securely, with PayPal buyer protection</span></div>
          </div>
          <div className="trust-item">
            <span className="ico"><Timer /></span>
            <div><b>Anti-sniping</b><span>Late bids add 2 minutes so everyone gets a fair shot</span></div>
          </div>
          <div className="trust-item">
            <span className="ico"><Star /></span>
            <div><b>Rated sellers</b><span>Only verified buyers can leave feedback</span></div>
          </div>
          <div className="trust-item">
            <span className="ico"><BadgeCheck /></span>
            <div><b>Authenticity pledge</b><span>Sellers can guarantee items are original issue</span></div>
          </div>
          <div className="trust-item">
            <span className="ico"><ShieldCheck /></span>
            <div><b>Strict listing rules</b><span>No weapons, ammo or explosives. Reports reviewed fast</span></div>
          </div>
        </div>
      </section>

      <div className="wrap">
        {ending.length > 0 && (
          <section className="section">
            <div className="section-head">
              <div>
                <div className="eyebrow"><Hourglass size={12} style={{ verticalAlign: -1 }} /> Last call</div>
                <h2>Ending soon</h2>
              </div>
              <Link href="/search?sort=ending">See all ending soon <ArrowRight size={15} /></Link>
            </div>
            <div className="grid-cards">
              {ending.map((l) => <ListingCard key={l.id} l={l} watched={w(l.id)} />)}
            </div>
          </section>
        )}

        <section className="section">
          <div className="section-head">
            <div>
              <div className="eyebrow">Browse the stores</div>
              <h2>Shop by category</h2>
            </div>
            <Link href="/search">All auctions <ArrowRight size={15} /></Link>
          </div>
          <div className="cat-grid">
            {cats.map((c) => (
              <Link key={c.slug} href={`/search?category=${c.slug}`} className="cat-tile" data-count={`${c.n} live`}>
                <span className="ico"><CategoryIcon slug={c.slug} /></span>
                <b>{c.name}</b>
                <span>{c.description}</span>
              </Link>
            ))}
          </div>
        </section>

        {hot.length > 0 && (
          <section className="section">
            <div className="section-head">
              <div>
                <div className="eyebrow"><Flame size={12} style={{ verticalAlign: -1 }} /> Bidding wars</div>
                <h2>Hot right now</h2>
              </div>
              <Link href="/search?sort=bids">Most bids <ArrowRight size={15} /></Link>
            </div>
            <div className="grid-cards">
              {hot.map((l) => <ListingCard key={l.id} l={l} watched={w(l.id)} />)}
            </div>
          </section>
        )}

        {fresh.length > 0 && (
          <section className="section">
            <div className="section-head">
              <div>
                <div className="eyebrow"><Sparkles size={12} style={{ verticalAlign: -1 }} /> Fresh in the depot</div>
                <h2>Just listed</h2>
              </div>
              <Link href="/search?sort=newest">See newest <ArrowRight size={15} /></Link>
            </div>
            <div className="grid-cards">
              {fresh.map((l) => <ListingCard key={l.id} l={l} watched={w(l.id)} />)}
            </div>
          </section>
        )}

        <section className="section" id="how">
          <div className="section-head">
            <div>
              <div className="eyebrow">Standard operating procedure</div>
              <h2>How Quartermaster works</h2>
            </div>
            <Link href="/how-it-works">Full guide <ArrowRight size={15} /></Link>
          </div>
          <div className="steps">
            <div className="card">
              <h3>Find your piece</h3>
              <p>Search by era, country, markings or category. Every listing shows condition, provenance and the seller&apos;s record.</p>
            </div>
            <div className="card">
              <h3>Set your max bid</h3>
              <p>Enter the most you&apos;d pay. We bid for you, only as much as needed to keep you in the lead.</p>
            </div>
            <div className="card">
              <h3>Win and pay</h3>
              <p>When the hammer falls, pay the seller with PayPal in one click. No wiring money to strangers.</p>
            </div>
            <div className="card">
              <h3>Track and rate</h3>
              <p>Follow your parcel, confirm delivery, and rate the seller so the next collector knows who to trust.</p>
            </div>
          </div>
        </section>

        <section className="banner-cta" style={{ backgroundImage: HERO_CAMO }}>
          <div className="inner">
            <div>
              <h2>Got kit in the attic?</h2>
              <p>
                List it in a few minutes. Add photos, set a starting bid and let collectors compete. Payment lands in
                your PayPal account.
              </p>
            </div>
            <Link href="/sell" className="btn btn-brass btn-lg">
              Start selling <ArrowRight />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
