import { db, parseDbDate } from "./db";
import { formatMoney, type ListingRow } from "./auctions";

/**
 * Seller fees. When a buyer pays for an item, the seller owes the site a percentage of the winning bid
 * (shipping isn't included). Fees build up on the seller's account and they pay them with PayPal into the
 * site's own PayPal account. A seller whose oldest unpaid fee is more than FEE_DUE_DAYS old can't list
 * new items until they pay.
 *
 * Staff set the rate and the date fees start from on the moderation page. Each fee keeps the rate it was
 * charged at, so changing the rate only affects sales paid afterwards.
 */

export const FEE_DUE_DAYS = 30;
export const MAX_RATE_BP = 3000;

export type FeeSettings = { rateBp: number; start: string }; // start: "YYYY-MM-DD" (UTC) or "" for now

export type FeeLine = {
  id: number;
  listing_id: number;
  seller_id: number;
  title: string;
  sale_cents: number;
  rate_bp: number;
  amount_cents: number;
  status: "owed" | "paid" | "waived";
  created_at: string;
  settled_at: string | null;
};

export type FeePayment = {
  id: number;
  seller_id: number;
  amount_cents: number;
  fee_ids: string;
  paypal_order_id: string | null;
  payment_ref: string | null;
  created_at: string;
  paid_at: string | null;
};

export function feeSettings(): FeeSettings {
  const rows = db().prepare("SELECT key, value FROM settings WHERE key IN ('fee_rate_bp', 'fees_start')").all() as { key: string; value: string }[];
  const get = (k: string) => rows.find((r) => r.key === k)?.value ?? "";
  const rate = Number.parseInt(get("fee_rate_bp"), 10);
  return { rateBp: Number.isFinite(rate) ? Math.min(Math.max(rate, 0), MAX_RATE_BP) : 0, start: get("fees_start") };
}

export function saveFeeSettings(s: FeeSettings) {
  const put = db().prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  put.run("fee_rate_bp", String(s.rateBp));
  put.run("fees_start", s.start);
}

/** 500 -> "5%", 650 -> "6.5%" */
export function formatRate(bp: number) {
  return `${(bp / 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

/** "2026-12-26" -> "December 26, 2026" */
export function formatDay(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function startDate(s: FeeSettings) {
  return s.start ? new Date(`${s.start}T00:00:00Z`) : null;
}

/** The fee start date, if it's still in the future. */
export function freeUntil(s = feeSettings()): string | null {
  const start = startDate(s);
  return start && start.getTime() > Date.now() ? s.start : null;
}

export function feeAmount(saleCents: number, rateBp: number) {
  return Math.round((saleCents * rateBp) / 10_000);
}

/** One sentence for sellers on what selling costs, under the current settings. */
export function feePolicy(s = feeSettings()) {
  if (s.rateBp <= 0) return "Listing and selling are free.";
  const rate = formatRate(s.rateBp);
  const until = freeUntil(s);
  if (until)
    return `Listing is free, and so is selling until ${formatDay(until)}. Sales after that pay a ${rate} fee on the winning bid, only once your buyer has paid.`;
  return `Listing is free. When your item sells and the buyer pays, you owe a ${rate} fee on the winning bid (not shipping).`;
}

/**
 * Called once a buyer's payment is recorded. Adds the seller's fee for that sale, if one applies.
 * Sales that ended before the fee start date are free. Safe to call twice: each sale has at most one fee.
 */
export function chargeSaleFee(l: Pick<ListingRow, "id" | "seller_id" | "current_price_cents" | "ends_at">) {
  const s = feeSettings();
  if (s.rateBp <= 0) return null;
  const start = startDate(s);
  if (start && parseDbDate(l.ends_at) < start) return null;
  const amount = feeAmount(l.current_price_cents, s.rateBp);
  if (amount <= 0) return null;
  const r = db()
    .prepare("INSERT OR IGNORE INTO fees (listing_id, seller_id, sale_cents, rate_bp, amount_cents) VALUES (?, ?, ?, ?, ?)")
    .run(l.id, l.seller_id, l.current_price_cents, s.rateBp, amount);
  return r.changes ? { amountCents: amount, rateBp: s.rateBp } : null;
}

/** The sentence added to the seller's "payment received" notice when a fee was charged. */
export function feeNotice(fee: { amountCents: number; rateBp: number } | null) {
  if (!fee) return "";
  return ` A ${formatRate(fee.rateBp)} seller fee of ${formatMoney(fee.amountCents)} has been added to your account. Pay it from My Quartermaster › Fees within ${FEE_DUE_DAYS} days.`;
}

export function dueDate(createdAt: string) {
  return new Date(parseDbDate(createdAt).getTime() + FEE_DUE_DAYS * 86_400_000);
}

export type FeeBalance = { owedCents: number; count: number; dueBy: Date | null; overdue: boolean };

export function feeBalance(sellerId: number): FeeBalance {
  const r = db()
    .prepare("SELECT COALESCE(SUM(amount_cents), 0) AS owed, COUNT(*) AS n, MIN(created_at) AS oldest FROM fees WHERE seller_id = ? AND status = 'owed'")
    .get(sellerId) as { owed: number; n: number; oldest: string | null };
  const dueBy = r.oldest ? dueDate(r.oldest) : null;
  return { owedCents: r.owed, count: r.n, dueBy, overdue: !!dueBy && dueBy.getTime() < Date.now() };
}

export function sellerFees(sellerId: number, limit = 200): FeeLine[] {
  return db()
    .prepare(
      `SELECT f.*, l.title FROM fees f JOIN listings l ON l.id = f.listing_id
       WHERE f.seller_id = ? ORDER BY (f.status = 'owed') DESC, f.id DESC LIMIT ?`
    )
    .all(sellerId, limit) as FeeLine[];
}

/** Starts a payment covering everything the seller owes right now. */
export function openFeePayment(sellerId: number) {
  const owed = db().prepare("SELECT id, amount_cents FROM fees WHERE seller_id = ? AND status = 'owed' ORDER BY id").all(sellerId) as {
    id: number;
    amount_cents: number;
  }[];
  if (!owed.length) return null;
  const amountCents = owed.reduce((sum, f) => sum + f.amount_cents, 0);
  const r = db()
    .prepare("INSERT INTO fee_payments (seller_id, amount_cents, fee_ids) VALUES (?, ?, ?)")
    .run(sellerId, amountCents, JSON.stringify(owed.map((f) => f.id)));
  return { id: Number(r.lastInsertRowid), amountCents, count: owed.length };
}

export function getFeePayment(id: number) {
  return db().prepare("SELECT * FROM fee_payments WHERE id = ?").get(id) as FeePayment | undefined;
}

/** Records a completed fee payment and marks the fees it covered as paid. */
export function settleFeePayment(id: number, ref: string) {
  const d = db();
  d.transaction(() => {
    const p = getFeePayment(id);
    if (!p || p.paid_at) return;
    d.prepare("UPDATE fee_payments SET paid_at = datetime('now'), payment_ref = ? WHERE id = ?").run(ref, id);
    const settle = d.prepare("UPDATE fees SET status = 'paid', payment_id = ?, settled_at = datetime('now') WHERE id = ? AND seller_id = ? AND status = 'owed'");
    for (const feeId of JSON.parse(p.fee_ids) as number[]) settle.run(id, feeId, p.seller_id);
  })();
}

export function waiveFee(feeId: number) {
  return db().prepare("UPDATE fees SET status = 'waived', settled_at = datetime('now') WHERE id = ? AND status = 'owed'").run(feeId).changes > 0;
}

/* ---------------------------------------------------------------- staff overview */

export function feeTotals() {
  return db()
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'owed' THEN amount_cents END), 0) AS owed,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_cents END), 0) AS collected,
         COALESCE(SUM(CASE WHEN status = 'paid' AND settled_at >= datetime('now', 'start of month') THEN amount_cents END), 0) AS collected_month,
         COALESCE(SUM(CASE WHEN status = 'waived' THEN amount_cents END), 0) AS waived
       FROM fees`
    )
    .get() as { owed: number; collected: number; collected_month: number; waived: number };
}

export function feeBalances() {
  return db()
    .prepare(
      `SELECT f.seller_id, u.display_name AS seller, SUM(f.amount_cents) AS owed, COUNT(*) AS n, MIN(f.created_at) AS oldest
       FROM fees f JOIN users u ON u.id = f.seller_id
       WHERE f.status = 'owed' GROUP BY f.seller_id ORDER BY oldest LIMIT 200`
    )
    .all() as { seller_id: number; seller: string; owed: number; n: number; oldest: string }[];
}

export function recentFees(limit = 50) {
  return db()
    .prepare(
      `SELECT f.*, l.title, u.display_name AS seller FROM fees f
       JOIN listings l ON l.id = f.listing_id JOIN users u ON u.id = f.seller_id
       ORDER BY f.id DESC LIMIT ?`
    )
    .all(limit) as (FeeLine & { seller: string })[];
}
