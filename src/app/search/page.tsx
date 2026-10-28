import type { Metadata } from "next";
import Link from "next/link";
import { PackageOpen, SearchX } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { CONDITIONS, categoryCounts, parseMoney, searchListings, watchedIds, type SearchOpts } from "@/lib/auctions";
import { ListingCard } from "@/components/ListingCard";
import { SortSelect } from "@/components/SortSelect";

type SP = Record<string, string | undefined>;

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  return { title: sp.q ? `“${sp.q}” auctions` : "Browse auctions" };
}

const SORTS: [NonNullable<SearchOpts["sort"]>, string][] = [
  ["ending", "Ending soonest"],
  ["newest", "Newly listed"],
  ["bids", "Most bids"],
  ["price_low", "Price: low to high"],
  ["price_high", "Price: high to low"],
];

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await currentUser();
  const watched = watchedIds(user?.id);
  const sort = (SORTS.find(([k]) => k === sp.sort)?.[0] ?? "ending") as SearchOpts["sort"];
  const sold = sp.status === "sold";
  const min = parseMoney(sp.min ?? null);
  const max = parseMoney(sp.max ?? null);
  const opts: SearchOpts = {
    q: sp.q,
    category: sp.category || undefined,
    sort,
    status: sold ? "ended" : "active",
    condition: sp.condition || undefined,
    minCents: min != null && !Number.isNaN(min) ? min : undefined,
    maxCents: max != null && !Number.isNaN(max) ? max : undefined,
    endingHours: sp.ending === "24" ? 24 : sp.ending === "1" ? 1 : undefined,
    noReserve: sp.noreserve === "1",
    limit: 96,
  };
  // Up to four featured lots that match go first, then everything else in the chosen order.
  const pinned = sold ? [] : searchListings({ ...opts, featuredOnly: true, sort: "ending", limit: 4 });
  const pinnedIds = new Set(pinned.map((l) => l.id));
  const results = [...pinned, ...searchListings(opts).filter((l) => !pinnedIds.has(l.id))];
  const cats = categoryCounts();
  const cat = cats.find((c) => c.slug === sp.category);

  const href = (patch: SP) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return `/search${s ? `?${s}` : ""}`;
  };

  const filtered = [sp.q, sp.category, sp.condition, sp.min, sp.max, sp.ending, sp.noreserve].some(Boolean);
  const heading = sp.q ?`Results for “${sp.q}”` : cat ? cat.name : sold ? "Recently sold" : "All auctions";

  return (
    <div className="wrap">
      <div className="search-layout">
        <aside className="filters" aria-label="Filters">
          <h4>Show</h4>
          <ul className="filter-list">
            <li><Link href={href({ status: undefined })} className={!sold ? "active" : ""}>Live auctions</Link></li>
            <li><Link href={href({ status: "sold", ending: undefined })} className={sold ? "active" : ""}>Sold items <span>price guide</span></Link></li>
          </ul>

          <h4>Category</h4>
          <ul className="filter-list">
            <li><Link href={href({ category: undefined })} className={!sp.category ? "active" : ""}>All categories</Link></li>
            {cats.map((c) => (
              <li key={c.slug}>
                <Link href={href({ category: c.slug })} className={sp.category === c.slug ? "active" : ""}>
                  {c.name} <span>{c.n}</span>
                </Link>
              </li>
            ))}
          </ul>

          <h4>Condition</h4>
          <ul className="filter-list">
            <li><Link href={href({ condition: undefined })} className={!sp.condition ? "active" : ""}>Any condition</Link></li>
            {CONDITIONS.map((c) => (
              <li key={c}><Link href={href({ condition: c })} className={sp.condition === c ? "active" : ""}>{c}</Link></li>
            ))}
          </ul>

          {!sold && (
            <>
              <h4>Ending</h4>
              <ul className="filter-list">
                <li><Link href={href({ ending: undefined })} className={!sp.ending ? "active" : ""}>Any time</Link></li>
                <li><Link href={href({ ending: "24" })} className={sp.ending === "24" ? "active" : ""}>Within 24 hours</Link></li>
                <li><Link href={href({ ending: "1" })} className={sp.ending === "1" ? "active" : ""}>Within the hour</Link></li>
              </ul>
            </>
          )}

          <h4>Price</h4>
          <form action="/search" className="stack" style={{ gap: 8 }}>
            {Object.entries(sp).filter(([k]) => !["min", "max", "noreserve"].includes(k)).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v ?? ""} />
            ))}
            <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
              <div className="input-money"><input name="min" className="input" placeholder="Min" defaultValue={sp.min} inputMode="decimal" aria-label="Minimum price" /></div>
              <div className="input-money"><input name="max" className="input" placeholder="Max" defaultValue={sp.max} inputMode="decimal" aria-label="Maximum price" /></div>
            </div>
            <label className="check"><input type="checkbox" name="noreserve" value="1" defaultChecked={sp.noreserve === "1"} /> No reserve price only</label>
            <button className="btn btn-sm btn-olive">Apply</button>
          </form>
        </aside>

        <section>
          <div className="results-bar">
            <div>
              <div className="eyebrow">{results.length} {results.length === 1 ? "lot" : "lots"}{results.length >= 96 ? "+" : ""}</div>
              <h1>{heading}</h1>
            </div>
            <form action="/search" className="row" style={{ gap: 8 }}>
              {Object.entries(sp).filter(([k]) => k !== "sort").map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v ?? ""} />
              ))}
              <label htmlFor="sort" className="small muted">Sort</label>
              <SortSelect value={sort ?? "ending"} options={SORTS} />
            </form>
          </div>

          {(sp.q || sp.category || sp.condition || sp.min || sp.max || sp.ending || sp.noreserve) && (
            <div className="row" style={{ marginBottom: 16, gap: 8 }}>
              {sp.q && <Link className="chip" href={href({ q: undefined })}>“{sp.q}” ✕</Link>}
              {cat && <Link className="chip" href={href({ category: undefined })}>{cat.name} ✕</Link>}
              {sp.condition && <Link className="chip" href={href({ condition: undefined })}>{sp.condition} ✕</Link>}
              {(sp.min || sp.max) && <Link className="chip" href={href({ min: undefined, max: undefined })}>${sp.min || "0"} to {sp.max ? `$${sp.max}` : "any"} ✕</Link>}
              {sp.ending && <Link className="chip" href={href({ ending: undefined })}>Ending within {sp.ending === "1" ? "the hour" : "24h"} ✕</Link>}
              {sp.noreserve && <Link className="chip" href={href({ noreserve: undefined })}>No reserve ✕</Link>}
              <Link className="small link" href="/search">Clear all</Link>
            </div>
          )}

          {results.length ? (
            <div className="grid-cards">
              {results.map((l) => <ListingCard key={l.id} l={l} watched={user && !sold ? watched.has(l.id) : undefined} />)}
            </div>
          ) : (
            filtered ? (
              <div className="empty">
                <SearchX />
                <h3>No lots match that search</h3>
                <p>Try fewer words, a different category, or check the sold items to see what things go for.</p>
                <Link href="/search" className="btn">Browse all auctions</Link>
              </div>
            ) : sold ? (
              <div className="empty">
                <PackageOpen />
                <h3>Nothing has sold yet</h3>
                <p>Finished auctions show up here with their final prices, so you can see what things go for.</p>
                <Link href="/search" className="btn">Browse live auctions</Link>
              </div>
            ) : (
              <div className="empty">
                <PackageOpen />
                <h3>No auctions are live right now</h3>
                <p>Got kit in the attic? List it and yours will be the first lot collectors see here.</p>
                <Link href="/sell" className="btn btn-brass">List an item</Link>
              </div>
            )
          )}
        </section>
      </div>
    </div>
  );
}
