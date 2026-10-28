"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, currentUser, destroySession, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { db, systemUserId, toDbDate } from "@/lib/db";
import {
  CONDITIONS,
  formatMoney,
  getListing,
  parseMoney,
  placeBid,
  REPORT_REASONS,
  sendSystemMessage,
  type ListingRow,
} from "@/lib/auctions";
import { readPhotos, writePhoto } from "@/lib/uploads";
import { demoPaymentsEnabled } from "@/lib/paypal";
import {
  chargeSaleFee,
  featureListing,
  FEE_DUE_DAYS,
  feeBalance,
  feeNotice,
  MAX_FEATURE_CENTS,
  MAX_RATE_BP,
  openFeePayment,
  saveFeeSettings,
  settleFeePayment,
  waiveFee,
} from "@/lib/fees";

export type FormState = { error?: string; ok?: string; fields?: Record<string, string> } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function refreshAll() {
  revalidatePath("/", "layout");
}

/** Accounts listed in ADMIN_EMAILS (comma-separated) get the moderation tools when they sign up or log in. */
function grantAdminIfListed(userId: number, email: string) {
  const admins = (process.env.ADMIN_EMAILS ?? "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  if (admins.includes(email)) db().prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(userId);
}

/* ---------------------------------------------------------------- accounts */

export async function signup(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const name = str(fd, "display_name");
  const password = String(fd.get("password") ?? "");
  const location = str(fd, "location").slice(0, 80);
  const fields = { email, display_name: name, location };

  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address.", fields };
  if (!/^[A-Za-z0-9_.-]{3,24}$/.test(name))
    return { error: "Usernames are 3 to 24 characters: letters, numbers, dots, dashes or underscores.", fields };
  if (/quartermaster|musterbid|admin|support|staff|moderator|official/i.test(name))
    return { error: "Usernames can't suggest you work for MusterBid. Please choose another.", fields };
  if (password.length < 8) return { error: "Use a password of at least 8 characters.", fields };
  if (!fd.get("agree")) return { error: "Please agree to the listing rules and buyer protection terms.", fields };

  const d = db();
  if (d.prepare("SELECT 1 FROM users WHERE email = ?").get(email))
    return { error: "An account with that email already exists. Try logging in.", fields };
  if (d.prepare("SELECT 1 FROM users WHERE display_name = ? COLLATE NOCASE").get(name))
    return { error: "That username is taken.", fields };

  const res = d
    .prepare("INSERT INTO users (email, password_hash, display_name, location) VALUES (?, ?, ?, ?)")
    .run(email, hashPassword(password), name, location);
  grantAdminIfListed(Number(res.lastInsertRowid), email);
  await createSession(Number(res.lastInsertRowid));
  redirect(safeNext(str(fd, "next") || "/"));
}

// Simple in-memory brute-force protection: 5 failures per email per 15 minutes.
const failures = new Map<string, { n: number; until: number }>();

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const f = failures.get(email);
  if (f && f.n >= 5 && f.until > Date.now())
    return { error: "Too many attempts. Please wait 15 minutes and try again.", fields: { email } };

  const user = db().prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email) as
    | { id: number; password_hash: string }
    | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    const cur = f && f.until > Date.now() ? f : { n: 0, until: Date.now() + 15 * 60_000 };
    failures.set(email, { n: cur.n + 1, until: cur.until });
    return { error: "That email and password don't match.", fields: { email } };
  }
  failures.delete(email);
  grantAdminIfListed(user.id, email);
  await createSession(user.id);
  redirect(safeNext(str(fd, "next") || "/"));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/account?tab=settings");
  const location = str(fd, "location").slice(0, 80);
  const bio = str(fd, "bio").slice(0, 1000);
  const paypal = str(fd, "paypal_email").toLowerCase();
  if (paypal && !EMAIL_RE.test(paypal)) return { error: "That PayPal email doesn't look right." };
  db().prepare("UPDATE users SET location = ?, bio = ?, paypal_email = ? WHERE id = ?").run(location, bio, paypal, user.id);
  refreshAll();
  return { ok: "Profile saved." };
}

/* ---------------------------------------------------------------- listings */

const DURATIONS = [1, 3, 5, 7, 10];

export async function createListing(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/sell");
  const fields: Record<string, string> = {};
  for (const k of [
    "title", "category", "condition", "era", "origin_country", "markings", "provenance", "description",
    "starting_price", "reserve_price", "shipping", "ships_from", "duration", "paypal_email",
  ])
    fields[k] = str(fd, k);
  const fail = (error: string): FormState => ({ error, fields });
  if (feeBalance(user.id).overdue)
    return fail(`You have seller fees that are more than ${FEE_DUE_DAYS} days old. Pay them from My MusterBid › Fees, then publish your listing.`);

  const title = fields.title;
  if (title.length < 8 || title.length > 90) return fail("Give your item a title of 8 to 90 characters.");
  const cat = db().prepare("SELECT id FROM categories WHERE slug = ?").get(fields.category) as { id: number } | undefined;
  if (!cat) return fail("Choose a category.");
  if (!(CONDITIONS as readonly string[]).includes(fields.condition)) return fail("Choose the item's condition.");
  if (fields.description.length < 30)
    return fail("Write a description of at least 30 characters. Mention size, markings, wear and any flaws.");
  if (fields.description.length > 6000) return fail("Keep the description under 6,000 characters.");

  const start = parseMoney(fields.starting_price);
  if (start == null || Number.isNaN(start) || start < 99) return fail("Starting bid must be at least $0.99.");
  if (start > 10_000_000) return fail("Starting bid is too high.");
  const reserve = parseMoney(fields.reserve_price);
  if (reserve != null && (Number.isNaN(reserve) || reserve <= start))
    return fail("A reserve price must be higher than the starting bid (or leave it blank).");
  const shipping = parseMoney(fields.shipping) ?? 0;
  if (Number.isNaN(shipping) || shipping < 0 || shipping > 100_000) return fail("Enter a valid shipping cost.");
  const days = Number(fields.duration);
  if (!DURATIONS.includes(days)) return fail("Choose an auction length.");

  const paypal = (fields.paypal_email || user.paypal_email).toLowerCase();
  if (!EMAIL_RE.test(paypal)) return fail("Add the PayPal email where you'd like to be paid.");

  if (!fd.get("confirm_rules"))
    return fail("Please confirm the item is allowed under the listing rules and described honestly.");

  const photos = await readPhotos(fd.getAll("photos"));
  if (!photos.ok) return fail(photos.error);

  const d = db();
  const id = d.transaction(() => {
    if (paypal !== user.paypal_email) d.prepare("UPDATE users SET paypal_email = ? WHERE id = ?").run(paypal, user.id);
    const res = d
      .prepare(
        `INSERT INTO listings (seller_id, category_id, title, description, condition, era, origin_country, markings,
           provenance, authenticity_guarantee, returns_accepted, starting_price_cents, reserve_price_cents, shipping_cents,
           ships_from, current_price_cents, ends_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        user.id, cat.id, title, fields.description, fields.condition, fields.era.slice(0, 60),
        fields.origin_country.slice(0, 60), fields.markings.slice(0, 300), fields.provenance.slice(0, 1000),
        fd.get("authenticity_guarantee") ? 1 : 0, fd.get("returns_accepted") ? 1 : 0, start, reserve, shipping,
        (fields.ships_from || user.location).slice(0, 80), start, toDbDate(new Date(Date.now() + days * 864e5))
      );
    const listingId = Number(res.lastInsertRowid);
    const ins = d.prepare("INSERT INTO listing_images (listing_id, filename, position) VALUES (?, ?, ?)");
    photos.files.forEach((p, i) => ins.run(listingId, writePhoto(p.buf, p.ext), i));
    return listingId;
  })();
  const featured = fd.get("feature") ? featureListing(id, user.id).ok : false;

  refreshAll();
  redirect(`/listings/${id}?flash=${featured ? "listed-featured" : "listed"}`);
}

/** Features one of the seller's live lots. `next` is where to go back to (the listing or the dashboard). */
export async function featureLot(fd: FormData) {
  const id = Number(fd.get("listingId"));
  const back = safeNext(str(fd, "next") || `/listings/${id}`);
  const user = await requireUser(back);
  const flash = (key: string) => `${back}${back.includes("?") ? "&" : "?"}flash=${key}`;
  if (feeBalance(user.id).overdue) redirect(flash("fees-overdue"));
  const r = featureListing(id, user.id);
  refreshAll();
  redirect(flash(r.ok ? "featured" : "feature-failed"));
}

export async function cancelListing(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("listingId"));
  const res = db()
    .prepare("UPDATE listings SET status = 'cancelled' WHERE id = ? AND seller_id = ? AND status = 'active' AND bid_count = 0")
    .run(id, user.id);
  refreshAll();
  redirect(res.changes ? `/listings/${id}?flash=cancelled` : `/listings/${id}`);
}

export async function toggleWatch(fd: FormData) {
  const id = Number(fd.get("listingId"));
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/listings/${id}`)}`);
  const d = db();
  if (!d.prepare("SELECT 1 FROM listings WHERE id = ?").get(id)) redirect("/");
  const res = d.prepare("DELETE FROM watchlist WHERE user_id = ? AND listing_id = ?").run(user.id, id);
  if (res.changes === 0) d.prepare("INSERT OR IGNORE INTO watchlist (user_id, listing_id) VALUES (?, ?)").run(user.id, id);
  refreshAll();
}

/* ---------------------------------------------------------------- bidding */

export type BidState =
  | { ok: true; message: string; leading: boolean; extended: boolean; at: number }
  | { ok: false; error: string; at: number }
  | undefined;

export async function bidAction(_: BidState, fd: FormData): Promise<BidState> {
  const id = Number(fd.get("listingId"));
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/listings/${id}`)}`);
  const amount = parseMoney(fd.get("amount"));
  if (amount == null || Number.isNaN(amount)) return { ok: false, error: "Enter a bid amount, like 45.00.", at: Date.now() };

  const prev = db().prepare("SELECT high_bidder_id, title FROM listings WHERE id = ?").get(id) as
    | { high_bidder_id: number | null; title: string }
    | undefined;
  const r = placeBid(id, user.id, amount);
  if (!r.ok) return { ok: false, error: r.error, at: Date.now() };

  // Let the previous leader know they've been outbid.
  if (prev?.high_bidder_id && prev.high_bidder_id !== user.id && r.leading)
    sendSystemMessage(prev.high_bidder_id, id,
      `You've been outbid on "${prev.title}". The current bid is ${formatMoney(r.price)}. Bid again before the auction ends.`);

  refreshAll();
  return r.leading
    ? {
        ok: true,
        leading: true,
        extended: r.extended,
        message: `You're the high bidder at ${formatMoney(r.price)}. We'll bid for you up to ${formatMoney(amount)}.`,
        at: Date.now(),
      }
    : {
        ok: true,
        leading: false,
        extended: r.extended,
        message: `Another bidder's maximum is higher. The current bid is now ${formatMoney(r.price)}. Try a higher maximum.`,
        at: Date.now(),
      };
}

/* ---------------------------------------------------------------- messages */

export async function sendMessage(fd: FormData) {
  const user = await requireUser("/messages");
  const to = Number(fd.get("recipientId"));
  const requested = Number(fd.get("listingId")) || null;
  const listingId = requested && db().prepare("SELECT 1 FROM listings WHERE id = ?").get(requested) ? requested : null;
  const body = str(fd, "body").slice(0, 3000);
  if (!body || to === user.id || to === systemUserId()) redirect(`/messages/${to}`);
  if (!db().prepare("SELECT 1 FROM users WHERE id = ?").get(to)) redirect("/messages");
  db().prepare("INSERT INTO messages (sender_id, recipient_id, listing_id, body) VALUES (?, ?, ?, ?)").run(user.id, to, listingId, body);
  refreshAll();
  redirect(`/messages/${to}${listingId ? `?listing=${listingId}` : ""}`);
}

/* ---------------------------------------------------------------- after the sale */

function wonListing(id: number, userId: number): ListingRow | null {
  const l = getListing(id);
  return l && l.status === "ended" && l.winner_id === userId ? l : null;
}

export async function simulatePayment(fd: FormData) {
  const user = await requireUser("/account?tab=won");
  const id = Number(fd.get("listingId"));
  if (!demoPaymentsEnabled()) redirect(`/account?tab=won`);
  const l = wonListing(id, user.id);
  if (l && !l.paid_at) {
    db()
      .prepare("UPDATE listings SET paid_at = datetime('now'), payment_ref = ?, ship_to = ? WHERE id = ? AND paid_at IS NULL")
      .run(`DEMO-${Date.now().toString(36).toUpperCase()}`, `${user.display_name}\n(Demo payment: the buyer's PayPal shipping address appears here)\n${user.location}`, id);
    const fee = chargeSaleFee(l);
    sendSystemMessage(l.seller_id, id,
      `Payment received for "${l.title}" (demo payment). Please ship the item and add tracking from your seller dashboard.${feeNotice(fee)}`);
  }
  refreshAll();
  redirect(`/account?tab=won&flash=paid`);
}

export async function simulateFeePayment() {
  const user = await requireUser("/account?tab=fees");
  if (!demoPaymentsEnabled()) redirect("/account?tab=fees");
  const p = openFeePayment(user.id);
  if (p) settleFeePayment(p.id, `DEMO-${Date.now().toString(36).toUpperCase()}`);
  refreshAll();
  redirect("/account?tab=fees&flash=fees");
}

export async function markShipped(fd: FormData) {
  const user = await requireUser("/account?tab=selling");
  const id = Number(fd.get("listingId"));
  const carrier = str(fd, "carrier").slice(0, 40);
  const tracking = str(fd, "tracking").slice(0, 60);
  const l = getListing(id);
  if (l && l.seller_id === user.id && l.paid_at && !l.shipped_at && l.winner_id) {
    db()
      .prepare("UPDATE listings SET shipped_at = datetime('now'), tracking_carrier = ?, tracking_number = ? WHERE id = ?")
      .run(carrier || null, tracking || null, id);
    sendSystemMessage(l.winner_id, id,
      `"${l.title}" has shipped${carrier ? ` via ${carrier}` : ""}${tracking ? `, tracking number ${tracking}` : ""}. Confirm delivery from My bids › Won once it arrives.`);
  }
  refreshAll();
  redirect(`/account?tab=selling&flash=shipped`);
}

export async function confirmReceived(fd: FormData) {
  const user = await requireUser("/account?tab=won");
  const id = Number(fd.get("listingId"));
  const l = wonListing(id, user.id);
  if (l && l.shipped_at && !l.received_at) {
    db().prepare("UPDATE listings SET received_at = datetime('now') WHERE id = ?").run(id);
    sendSystemMessage(l.seller_id, id, `The buyer confirmed "${l.title}" arrived. Thanks for a smooth sale!`);
  }
  refreshAll();
  redirect(`/account?tab=won&flash=received`);
}

export async function leaveReview(fd: FormData) {
  const user = await requireUser("/account?tab=won");
  const id = Number(fd.get("listingId"));
  const rating = Number(fd.get("rating"));
  const comment = str(fd, "comment").slice(0, 1000);
  const l = wonListing(id, user.id);
  if (l && l.paid_at && rating >= 1 && rating <= 5) {
    db()
      .prepare("INSERT OR IGNORE INTO reviews (listing_id, reviewer_id, seller_id, rating, comment) VALUES (?, ?, ?, ?, ?)")
      .run(id, user.id, l.seller_id, Math.round(rating), comment);
  }
  refreshAll();
  redirect(`/account?tab=won&flash=reviewed`);
}

/* ---------------------------------------------------------------- trust & safety */

export async function reportListing(fd: FormData) {
  const id = Number(fd.get("listingId"));
  const user = await requireUser(`/listings/${id}`);
  const reason = str(fd, "reason");
  if (!REPORT_REASONS.includes(reason)) redirect(`/listings/${id}?flash=report-invalid`);
  const d = db();
  if (!d.prepare("SELECT 1 FROM listings WHERE id = ?").get(id)) redirect("/");
  if (!d.prepare("SELECT 1 FROM reports WHERE listing_id = ? AND reporter_id = ? AND status = 'open'").get(id, user.id))
    d.prepare("INSERT INTO reports (listing_id, reporter_id, reason, details) VALUES (?, ?, ?, ?)")
      .run(id, user.id, reason, str(fd, "details").slice(0, 2000));
  redirect(`/listings/${id}?flash=reported`);
}

export async function resolveReport(fd: FormData) {
  const user = await requireUser("/admin");
  if (!user.is_admin) redirect("/");
  const id = Number(fd.get("reportId"));
  const action = str(fd, "action");
  const d = db();
  const r = d.prepare("SELECT listing_id FROM reports WHERE id = ?").get(id) as { listing_id: number } | undefined;
  if (r) {
    d.prepare("UPDATE reports SET status = ? WHERE id = ?").run(action === "remove" ? "removed" : "dismissed", id);
    if (action === "remove") {
      d.prepare("UPDATE listings SET status = 'cancelled' WHERE id = ? AND status = 'active'").run(r.listing_id);
      d.prepare("UPDATE reports SET status = 'removed' WHERE listing_id = ? AND status = 'open'").run(r.listing_id);
    }
  }
  refreshAll();
  redirect("/admin");
}

/* ---------------------------------------------------------------- seller fees (staff) */

export async function updateFeeSettings(fd: FormData) {
  const user = await requireUser("/admin");
  if (!user.is_admin) redirect("/");
  const rate = str(fd, "rate").replace("%", "");
  const start = str(fd, "start");
  const rateBp = Math.round(Number(rate) * 100);
  const featureCents = parseMoney(str(fd, "feature_price"));
  const startDay = new Date(`${start}T00:00:00Z`);
  const validStart = !start || (/^\d{4}-\d{2}-\d{2}$/.test(start) && !Number.isNaN(startDay.getTime()) && startDay.toISOString().startsWith(start));
  const validFeature = featureCents != null && !Number.isNaN(featureCents) && featureCents <= MAX_FEATURE_CENTS;
  if (rate === "" || !Number.isFinite(rateBp) || rateBp < 0 || rateBp > MAX_RATE_BP || !validStart || !validFeature)
    redirect("/admin?fees=invalid#fees");
  saveFeeSettings({ rateBp, start, featureCents: featureCents! });
  refreshAll();
  redirect("/admin?fees=saved#fees");
}

export async function waiveSellerFee(fd: FormData) {
  const user = await requireUser("/admin");
  if (!user.is_admin) redirect("/");
  const id = Number(fd.get("feeId"));
  const fee = db().prepare("SELECT seller_id, listing_id, amount_cents FROM fees WHERE id = ?").get(id) as
    | { seller_id: number; listing_id: number; amount_cents: number }
    | undefined;
  if (fee && waiveFee(id))
    sendSystemMessage(fee.seller_id, fee.listing_id, `The ${formatMoney(fee.amount_cents)} seller fee for this sale has been waived. You don't owe anything for it.`);
  refreshAll();
  redirect("/admin?fees=waived#fees");
}
