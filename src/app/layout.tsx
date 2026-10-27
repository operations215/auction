import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Barlow_Condensed, IBM_Plex_Mono, Inter, Saira_Stencil_One } from "next/font/google";
import { Gavel, Heart, LogIn, MessagesSquare, Plus, Search, UserRound } from "lucide-react";
import "./globals.css";
import { currentUser } from "@/lib/auth";
import { CATEGORIES } from "@/lib/db";
import { siteStats, unreadCount } from "@/lib/auctions";
import { HEADER_CAMO } from "@/lib/camo";
import { LogoMark } from "@/components/Logo";
import { CatBar } from "@/components/CatBar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-barlow",
  display: "swap",
});
const stencil = Saira_Stencil_One({ subsets: ["latin"], weight: "400", variable: "--font-stencil-face", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Quartermaster: Militaria & Army Surplus Auctions", template: "%s · Quartermaster" },
  description:
    "Buy and sell genuine military surplus and militaria at auction. Rated sellers, proxy bidding, anti-sniping protection and PayPal checkout.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const unread = user ? unreadCount(user.id) : 0;
  const stats = siteStats();

  return (
    <html lang="en" className={`${inter.variable} ${barlow.variable} ${stencil.variable} ${mono.variable}`}>
      <body>
        <div className="topbar">
          <div className="wrap">
            <div className="ticker">
              <span className="dot" />
              <span>
                {stats.live > 0 ? (
                  <><b style={{ color: "#fff" }}>{stats.live}</b> {stats.live === 1 ? "auction" : "auctions"} live</>
                ) : (
                  <>
                    <b style={{ color: "#fff" }}>{stats.sellers === 0 ? "Now open" : "No live auctions"}</b>
                    {" · "}
                    <Link href="/sell" style={{ color: "var(--brass-hi)" }}>{stats.sellers === 0 ? "list the first lots" : "list an item"}</Link>
                  </>
                )}
                {stats.endingHour > 0 && (
                  <>
                    {" · "}
                    <Link href="/search?sort=ending" style={{ color: "#ffb4a8" }}>
                      {stats.endingHour} ending within the hour
                    </Link>
                  </>
                )}
              </span>
            </div>
            <span className="spacer" />
            {user?.is_admin ? <Link href="/admin" style={{ color: "var(--brass-hi)" }}>Moderation</Link> : null}
            <Link href="/how-it-works" className="hide-sm">How it works</Link>
            <Link href="/how-it-works#buyer-protection" className="hide-sm">Buyer protection</Link>
            <Link href="/rules" className="hide-sm">Listing rules</Link>
          </div>
        </div>

        <header className="header" style={{ backgroundImage: HEADER_CAMO }}>
          <div className="wrap">
            <Link href="/" className="logo" aria-label="Quartermaster home">
              <LogoMark />
              <span>
                <span className="logo-word">QUARTERMASTER</span>
                <span className="logo-sub">MILITARIA · SURPLUS · AUCTIONS</span>
              </span>
            </Link>

            <form className="header-search" action="/search" role="search">
              <label htmlFor="hq" className="sr-only">Search auctions</label>
              <input id="hq" name="q" className="input" placeholder="Search helmets, M65 jackets, insignia…" />
              <button className="btn btn-brass" aria-label="Search">
                <Search />
              </button>
            </form>

            <nav className="nav" aria-label="Main">
              {user ? (
                <>
                  <Link href="/account?tab=watching" title="Watchlist" aria-label="Watchlist">
                    <Heart />
                  </Link>
                  <Link href="/messages" title="Messages">
                    <MessagesSquare /> <span className="label-text">Messages</span>
                    {unread > 0 && <span className="badge">{unread > 99 ? "99+" : unread}</span>}
                  </Link>
                  <Link href="/account" title="My Quartermaster">
                    <Gavel /> <span className="label-text">My bids</span>
                  </Link>
                  <Link href={`/users/${user.id}`} title={`${user.display_name}: my profile`} aria-label="My profile">
                    <span className="avatar avatar-sm" style={{ boxShadow: "none" }}>{user.display_name[0]?.toUpperCase()}</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <LogIn /> <span className="label-text">Log in</span>
                  </Link>
                  <Link href="/signup">
                    <UserRound /> <span className="label-text">Join</span>
                  </Link>
                </>
              )}
              <Link href="/sell" className="btn btn-brass">
                <Plus /> Sell
              </Link>
            </nav>
          </div>
        </header>
        <Suspense fallback={<div className="catbar" style={{ height: 45 }} />}>
          <CatBar categories={CATEGORIES.map((c) => ({ slug: c.slug, name: c.name }))} />
        </Suspense>

        <main>{children}</main>

        <footer className="footer">
          <div className="wrap">
            <div className="footer-grid">
              <div>
                <Link href="/" className="logo" style={{ marginBottom: 14 }}>
                  <LogoMark />
                  <span className="logo-word" style={{ fontSize: 21 }}>QUARTERMASTER</span>
                </Link>
                <p style={{ maxWidth: 320 }}>
                  The collector&apos;s marketplace for genuine military surplus and militaria. Every seller is rated,
                  every bid is protected, and every listing follows our rules.
                </p>
              </div>
              <div>
                <h4>Buy</h4>
                <ul>
                  <li><Link href="/search?sort=ending">Ending soon</Link></li>
                  <li><Link href="/search?sort=newest">Just listed</Link></li>
                  <li><Link href="/search?sort=bids">Most bids</Link></li>
                  <li><Link href="/how-it-works#bidding">How bidding works</Link></li>
                </ul>
              </div>
              <div>
                <h4>Sell</h4>
                <ul>
                  <li><Link href="/sell">List an item</Link></li>
                  <li><Link href="/rules">Listing rules</Link></li>
                  <li><Link href="/how-it-works#selling">Seller guide</Link></li>
                  <li><Link href="/account?tab=selling">Seller dashboard</Link></li>
                </ul>
              </div>
              <div>
                <h4>Trust & safety</h4>
                <ul>
                  <li><Link href="/how-it-works#buyer-protection">Buyer protection</Link></li>
                  <li><Link href="/how-it-works#ratings">Seller ratings</Link></li>
                  <li><Link href="/rules#prohibited">Prohibited items</Link></li>
                  <li><Link href="/rules#reporting">Report a listing</Link></li>
                </ul>
              </div>
            </div>
            <div className="footer-bottom">
              <span>© {new Date().getFullYear()} Quartermaster. Payments processed by PayPal.</span>
              <span className="mono">EST. 2026 · SERVING COLLECTORS WORLDWIDE</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
