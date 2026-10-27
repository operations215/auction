import { db, parseDbDate, systemUserId, toDbDate } from "./db";

/** Bids in the last SNIPE_WINDOW extend the auction so it ends SNIPE_WINDOW after the bid. */
export const SNIPE_WINDOW_MS = 2 * 60 * 1000;

export type ListingRow = {
  id: number;
  seller_id: number;
  category_id: number;
  title: string;
  description: string;
  condition: string;
  era: string;
  origin_country: string;
  markings: string;
  provenance: string;
  authenticity_guarantee: number;
  returns_accepted: number;
  starting_price_cents: number;
  reserve_price_cents: number | null;
  shipping_cents: number;
  ships_from: string;
  current_price_cents: number;
  high_bidder_id: number | null;
  high_max_cents: number | null;
  bid_count: number;
  status: "active" | "ended" | "cancelled";
  winner_id: number | null;
  ends_at: string;
  created_at: string;
  paypal_order_id: string | null;
  payment_ref: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  tracking_carrier: string | null;
  tracking_number: string | null;
  received_at: string | null;
  ship_to: string | null;
};

export type ListingCard = ListingRow & {
  image: string | null;
  seller_name: string;
  category_name: string;
  category_slug: string;
};

export const REPORT_REASONS = [
  "Prohibited item (weapon, ammunition, explosive, etc.)",
  "Suspected fake or reproduction sold as original",
  "Misleading description or photos",
  "Stolen photos or item",
  "Offensive content",
  "Other",
];

export const CONDITIONS = [
  "New / Unissued",
  "Excellent",
  "Good",
  "Fair",
  "Poor / For parts",
] as const;

/** eBay-style bid increment table, in cents. */
export function bidIncrement(priceCents: number): number {
  if (priceCents < 100) return 5;
  if (priceCents < 500) return 25;
  if (priceCents < 2500) return 50;
  if (priceCents < 10000) return 100;
  if (priceCents < 25000) return 250;
  if (priceCents < 50000) return 500;
  if (priceCents < 100000) return 1000;
  if (priceCents < 250000) return 2500;
  return 5000;
}

export function minimumBid(l: Pick<ListingRow, "bid_count" | "current_price_cents" | "starting_price_cents">) {
  return l.bid_count === 0
    ? l.starting_price_cents
    : l.current_price_cents + bidIncrement(l.current_price_cents);
}

export function reserveMet(l: Pick<ListingRow, "reserve_price_cents" | "high_max_cents" | "bid_count">) {
  if (l.reserve_price_cents == null) return true;
  return l.bid_count > 0 && (l.high_max_cents ?? 0) >= l.reserve_price_cents;
}

export function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function parseMoney(input: FormDataEntryValue | null): number | null {
  if (input == null) return null;
  const s = String(input).replace(/[$,\s]/g, "");
  if (s === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return Math.round(parseFloat(s) * 100);
}

/**
 * Close any auctions whose end time has passed. Cheap enough to call on every page
 * load at this scale; at larger scale move it to a scheduled job.
 */
export function finalizeEndedAuctions() {
  const d = db();
  const due = d
    .prepare("SELECT * FROM listings WHERE status = 'active' AND ends_at <= datetime('now')")
    .all() as ListingRow[];
  if (due.length === 0) return;
  const close = d.prepare("UPDATE listings SET status = 'ended', winner_id = ? WHERE id = ? AND status = 'active'");
  const notify = d.prepare(
    "INSERT INTO messages (sender_id, recipient_id, listing_id, body, is_system) VALUES (?, ?, ?, ?, 1)"
  );
  d.transaction(() => {
    for (const l of due) {
      const winner = l.high_bidder_id && reserveMet(l) ? l.high_bidder_id : null;
      const res = close.run(winner, l.id);
      if (res.changes === 0) continue;
      if (winner) {
        notify.run(
          systemUserId(),
          winner,
          l.id,
          `You won "${l.title}" for ${formatMoney(l.current_price_cents)} plus ${formatMoney(l.shipping_cents)} shipping. Pay with PayPal from My bids › Won, and message the seller here with any questions.`
        );
        notify.run(
          systemUserId(),
          l.seller_id,
          l.id,
          `Your item "${l.title}" sold for ${formatMoney(l.current_price_cents)}. We'll let you know as soon as the buyer pays, then you can add tracking from your seller dashboard.`
        );
      }
    }
  })();
}

export type BidResult =
  | { ok: true; leading: boolean; price: number; extended: boolean }
  | { ok: false; error: string };

/**
 * Proxy bidding: the bidder enters the most they are willing to pay. The system bids
 * for them only as much as needed to stay ahead, up to that maximum.
 */
export function placeBid(listingId: number, bidderId: number, maxCents: number): BidResult {
  const d = db();
  return d.transaction((): BidResult => {
    const l = d.prepare("SELECT * FROM listings WHERE id = ?").get(listingId) as ListingRow | undefined;
    if (!l) return { ok: false, error: "Listing not found." };
    if (l.status !== "active" || parseDbDate(l.ends_at).getTime() <= Date.now())
      return { ok: false, error: "This auction has ended." };
    if (l.seller_id === bidderId) return { ok: false, error: "You can't bid on your own listing." };
    if (!Number.isInteger(maxCents) || maxCents <= 0) return { ok: false, error: "Enter a valid amount." };

    let price: number;
    let leader: number;
    let leaderMax: number;

    if (l.high_bidder_id === bidderId) {
      // Current leader raising their own maximum. Price does not move, unless that unlocks the reserve.
      if (maxCents <= (l.high_max_cents ?? 0))
        return { ok: false, error: `Your maximum is already ${formatMoney(l.high_max_cents ?? 0)}. Enter a higher amount to raise it.` };
      leader = bidderId;
      leaderMax = maxCents;
      price = l.current_price_cents;
      if (l.reserve_price_cents != null && price < l.reserve_price_cents && maxCents >= l.reserve_price_cents)
        price = l.reserve_price_cents;
    } else {
      const min = minimumBid(l);
      if (maxCents < min) return { ok: false, error: `Your bid must be at least ${formatMoney(min)}.` };
      if (l.high_bidder_id == null) {
        leader = bidderId;
        leaderMax = maxCents;
        price = l.starting_price_cents;
        if (l.reserve_price_cents != null && maxCents >= l.reserve_price_cents)
          price = Math.max(price, l.reserve_price_cents);
      } else {
        const curMax = l.high_max_cents ?? l.current_price_cents;
        if (maxCents > curMax) {
          leader = bidderId;
          leaderMax = maxCents;
          price = Math.min(maxCents, curMax + bidIncrement(curMax));
          if (l.reserve_price_cents != null && maxCents >= l.reserve_price_cents)
            price = Math.max(price, l.reserve_price_cents);
        } else {
          // Existing leader's proxy outbids the newcomer. Ties go to the earlier bidder.
          leader = l.high_bidder_id;
          leaderMax = curMax;
          price = Math.min(curMax, maxCents + bidIncrement(maxCents));
        }
      }
    }

    let endsAt = parseDbDate(l.ends_at);
    let extended = false;
    if (endsAt.getTime() - Date.now() < SNIPE_WINDOW_MS) {
      endsAt = new Date(Date.now() + SNIPE_WINDOW_MS);
      extended = true;
    }

    d.prepare(
      `UPDATE listings SET current_price_cents = ?, high_bidder_id = ?, high_max_cents = ?,
         bid_count = bid_count + 1, ends_at = ? WHERE id = ?`
    ).run(price, leader, leaderMax, toDbDate(endsAt), l.id);
    d.prepare(
      "INSERT INTO bids (listing_id, bidder_id, max_cents, price_after_cents) VALUES (?, ?, ?, ?)"
    ).run(l.id, bidderId, maxCents, price);

    return { ok: true, leading: leader === bidderId, price, extended };
  })();
}

const CARD_SELECT = `
  SELECT l.*, u.display_name AS seller_name, c.name AS category_name, c.slug AS category_slug,
    (SELECT filename FROM listing_images i WHERE i.listing_id = l.id ORDER BY position LIMIT 1) AS image
  FROM listings l
  JOIN users u ON u.id = l.seller_id
  JOIN categories c ON c.id = l.category_id
`;

export type SearchOpts = {
  q?: string;
  category?: string;
  sort?: "ending" | "newest" | "price_low" | "price_high" | "bids";
  status?: "active" | "ended";
  sellerId?: number;
  condition?: string;
  minCents?: number;
  maxCents?: number;
  endingHours?: number;
  noReserve?: boolean;
  limit?: number;
};

export function searchListings(opts: SearchOpts = {}): ListingCard[] {
  finalizeEndedAuctions();
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (opts.status === "ended") where.push("l.status = 'ended' AND l.winner_id IS NOT NULL");
  else where.push("l.status = 'active'");
  if (opts.q) {
    for (const term of opts.q.trim().split(/\s+/).slice(0, 8)) {
      where.push("(l.title LIKE ? OR l.description LIKE ? OR l.era LIKE ? OR l.origin_country LIKE ?)");
      const t = `%${term.replace(/[%_]/g, "")}%`;
      args.push(t, t, t, t);
    }
  }
  if (opts.category) {
    where.push("c.slug = ?");
    args.push(opts.category);
  }
  if (opts.condition) {
    where.push("l.condition = ?");
    args.push(opts.condition);
  }
  if (opts.minCents != null) {
    where.push("l.current_price_cents >= ?");
    args.push(opts.minCents);
  }
  if (opts.maxCents != null) {
    where.push("l.current_price_cents <= ?");
    args.push(opts.maxCents);
  }
  if (opts.endingHours) {
    where.push("l.ends_at <= datetime('now', ?)");
    args.push(`+${Math.floor(opts.endingHours)} hours`);
  }
  if (opts.noReserve) where.push("l.reserve_price_cents IS NULL");
  if (opts.sellerId) {
    where.push("l.seller_id = ?");
    args.push(opts.sellerId);
  }
  const order = {
    ending: opts.status === "ended" ? "l.ends_at DESC" : "l.ends_at ASC",
    newest: "l.created_at DESC, l.id DESC",
    price_low: "l.current_price_cents ASC",
    price_high: "l.current_price_cents DESC",
    bids: "l.bid_count DESC, l.ends_at ASC",
  }[opts.sort ?? "ending"];
  const sql = `${CARD_SELECT} WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT ?`;
  args.push(opts.limit ?? 60);
  return db().prepare(sql).all(...args) as ListingCard[];
}

export function cardsWhere(whereSql: string, args: (string | number)[], order = "l.ends_at ASC"): ListingCard[] {
  finalizeEndedAuctions();
  return db().prepare(`${CARD_SELECT} WHERE ${whereSql} ORDER BY ${order}`).all(...args) as ListingCard[];
}

export type SellerStats = {
  rating_avg: number | null;
  rating_count: number;
  sold_count: number;
  positive_pct: number | null;
};

export function sellerStats(userId: number): SellerStats {
  const d = db();
  const r = d
    .prepare(
      `SELECT AVG(rating) AS avg, COUNT(*) AS n, SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) AS pos
       FROM reviews WHERE seller_id = ?`
    )
    .get(userId) as { avg: number | null; n: number; pos: number | null };
  const sold = d
    .prepare("SELECT COUNT(*) AS n FROM listings WHERE seller_id = ? AND status = 'ended' AND winner_id IS NOT NULL")
    .get(userId) as { n: number };
  return {
    rating_avg: r.avg,
    rating_count: r.n,
    sold_count: sold.n,
    positive_pct: r.n ? Math.round(((r.pos ?? 0) / r.n) * 100) : null,
  };
}

export function timeLeft(endsAt: string): string {
  const ms = parseDbDate(endsAt).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${mm}m`;
  if (m > 0) return `${mm}m`;
  return `${Math.ceil(ms / 1000)}s`;
}

export type ListingDetail = ListingRow & {
  seller_name: string;
  seller_location: string;
  seller_since: string;
  seller_paypal_email: string;
  category_name: string;
  category_slug: string;
};

export function getListing(id: number): ListingDetail | null {
  finalizeEndedAuctions();
  const row = db()
    .prepare(
      `SELECT l.*, u.display_name AS seller_name, u.location AS seller_location, u.created_at AS seller_since,
         u.paypal_email AS seller_paypal_email, c.name AS category_name, c.slug AS category_slug
       FROM listings l JOIN users u ON u.id = l.seller_id JOIN categories c ON c.id = l.category_id
       WHERE l.id = ?`
    )
    .get(id) as ListingDetail | undefined;
  return row ?? null;
}

export function getImages(listingId: number): string[] {
  return (
    db().prepare("SELECT filename FROM listing_images WHERE listing_id = ? ORDER BY position").all(listingId) as {
      filename: string;
    }[]
  ).map((r) => r.filename);
}

export type BidHistoryRow = { id: number; bidder_id: number; bidder_name: string; price_after_cents: number; created_at: string };

export function getBidHistory(listingId: number): BidHistoryRow[] {
  return db()
    .prepare(
      `SELECT b.id, b.bidder_id, u.display_name AS bidder_name, b.price_after_cents, b.created_at
       FROM bids b JOIN users u ON u.id = b.bidder_id WHERE b.listing_id = ? ORDER BY b.id DESC`
    )
    .all(listingId) as BidHistoryRow[];
}

/** eBay-style anonymised bidder name, e.g. "r***n". */
export function maskName(name: string) {
  if (name.length <= 2) return `${name[0] ?? "?"}***`;
  return `${name[0]}***${name[name.length - 1]}`.toLowerCase();
}

export function unreadCount(userId: number): number {
  return (
    db().prepare("SELECT COUNT(*) AS n FROM messages WHERE recipient_id = ? AND read_at IS NULL").get(userId) as {
      n: number;
    }
  ).n;
}

export function siteStats() {
  finalizeEndedAuctions();
  const d = db();
  const one = (sql: string) => (d.prepare(sql).get() as { n: number }).n;
  return {
    live: one("SELECT COUNT(*) AS n FROM listings WHERE status = 'active'"),
    endingHour: one(
      "SELECT COUNT(*) AS n FROM listings WHERE status = 'active' AND ends_at <= datetime('now', '+1 hour')"
    ),
    endingDay: one(
      "SELECT COUNT(*) AS n FROM listings WHERE status = 'active' AND ends_at <= datetime('now', '+1 day')"
    ),
    sellers: one("SELECT COUNT(DISTINCT seller_id) AS n FROM listings"),
    bids: one("SELECT COUNT(*) AS n FROM bids"),
    sold: one("SELECT COUNT(*) AS n FROM listings WHERE status = 'ended' AND winner_id IS NOT NULL"),
  };
}

export function categoryCounts(): { slug: string; name: string; description: string; n: number }[] {
  return db()
    .prepare(
      `SELECT c.slug, c.name, c.description,
         (SELECT COUNT(*) FROM listings l WHERE l.category_id = c.id AND l.status = 'active') AS n
       FROM categories c ORDER BY c.id`
    )
    .all() as { slug: string; name: string; description: string; n: number }[];
}

export function imageUrl(filename: string | null | undefined) {
  return filename ? `/api/images/${filename}` : "/placeholder.svg";
}

export function lotNumber(id: number) {
  return `LOT ${String(id).padStart(5, "0")}`;
}

export type OrderStage = "won" | "paid" | "shipped" | "received";

export function orderStage(l: Pick<ListingRow, "paid_at" | "shipped_at" | "received_at">): OrderStage {
  if (l.received_at) return "received";
  if (l.shipped_at) return "shipped";
  if (l.paid_at) return "paid";
  return "won";
}

export function formatDate(s: string, withTime = false) {
  const d = parseDbDate(s);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit", timeZoneName: "short" } : {}),
  });
}

/** An automated notice, delivered to the recipient's inbox from the Quartermaster account. */
export function sendSystemMessage(toId: number, listingId: number | null, body: string) {
  db()
    .prepare("INSERT INTO messages (sender_id, recipient_id, listing_id, body, is_system) VALUES (?, ?, ?, ?, 1)")
    .run(systemUserId(), toId, listingId, body);
}

export function watchedIds(userId: number | undefined): Set<number> {
  if (!userId) return new Set();
  return new Set(
    (db().prepare("SELECT listing_id FROM watchlist WHERE user_id = ?").all(userId) as { listing_id: number }[]).map(
      (r) => r.listing_id
    )
  );
}
