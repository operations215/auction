import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  paypal_email TEXT NOT NULL DEFAULT '',
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id INTEGER NOT NULL REFERENCES users(id),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  condition TEXT NOT NULL,
  era TEXT NOT NULL DEFAULT '',
  origin_country TEXT NOT NULL DEFAULT '',
  markings TEXT NOT NULL DEFAULT '',
  provenance TEXT NOT NULL DEFAULT '',
  authenticity_guarantee INTEGER NOT NULL DEFAULT 0,
  returns_accepted INTEGER NOT NULL DEFAULT 0,
  starting_price_cents INTEGER NOT NULL,
  reserve_price_cents INTEGER,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  ships_from TEXT NOT NULL DEFAULT '',
  current_price_cents INTEGER NOT NULL,
  high_bidder_id INTEGER REFERENCES users(id),
  high_max_cents INTEGER,
  bid_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active | ended | cancelled
  winner_id INTEGER REFERENCES users(id),
  ends_at TEXT NOT NULL,
  -- fulfilment, after the auction ends with a winner
  paypal_order_id TEXT,
  payment_ref TEXT,
  paid_at TEXT,
  shipped_at TEXT,
  tracking_carrier TEXT,
  tracking_number TEXT,
  received_at TEXT,
  ship_to TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS listings_status_ends ON listings(status, ends_at);
CREATE INDEX IF NOT EXISTS listings_category ON listings(category_id);
CREATE INDEX IF NOT EXISTS listings_seller ON listings(seller_id);

CREATE TABLE IF NOT EXISTS listing_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  bidder_id INTEGER NOT NULL REFERENCES users(id),
  max_cents INTEGER NOT NULL,
  price_after_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS bids_listing ON bids(listing_id);
CREATE INDEX IF NOT EXISTS bids_bidder ON bids(bidder_id);

CREATE TABLE IF NOT EXISTS watchlist (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, listing_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  recipient_id INTEGER NOT NULL REFERENCES users(id),
  listing_id INTEGER REFERENCES listings(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS messages_pair ON messages(sender_id, recipient_id);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL UNIQUE REFERENCES listings(id),
  reviewer_id INTEGER NOT NULL REFERENCES users(id),
  seller_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id INTEGER NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Seller fees: one per paid sale, owed to the site until the seller pays it (or staff waive it).
CREATE TABLE IF NOT EXISTS fee_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id INTEGER NOT NULL REFERENCES users(id),
  amount_cents INTEGER NOT NULL,
  fee_ids TEXT NOT NULL, -- JSON array of the fees this payment covers
  paypal_order_id TEXT,
  payment_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);
CREATE INDEX IF NOT EXISTS fee_payments_order ON fee_payments(paypal_order_id);

CREATE TABLE IF NOT EXISTS fees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL UNIQUE REFERENCES listings(id),
  seller_id INTEGER NOT NULL REFERENCES users(id),
  sale_cents INTEGER NOT NULL,
  rate_bp INTEGER NOT NULL, -- basis points: 500 = 5%
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'owed', -- owed | paid | waived
  payment_id INTEGER REFERENCES fee_payments(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  settled_at TEXT
);
CREATE INDEX IF NOT EXISTS fees_seller ON fees(seller_id, status);
`;

export const CATEGORIES: { slug: string; name: string; description: string }[] = [
  { slug: "uniforms", name: "Uniforms & Clothing", description: "Tunics, trousers, BDUs, camouflage, dress uniforms" },
  { slug: "headgear", name: "Helmets & Headgear", description: "Steel helmets, berets, caps, covers" },
  { slug: "field-gear", name: "Field Gear & Webbing", description: "Load-bearing equipment, pouches, belts, canteens" },
  { slug: "bags-packs", name: "Bags & Rucksacks", description: "Rucksacks, duffels, map cases, haversacks" },
  { slug: "insignia", name: "Insignia, Patches & Badges", description: "Rank, unit patches, cap badges, qualification badges" },
  { slug: "medals", name: "Medals & Awards", description: "Decorations, ribbons, citations" },
  { slug: "optics-comms", name: "Optics, Radios & Electronics", description: "Binoculars, compasses, field radios, telephones" },
  { slug: "knives-tools", name: "Knives, Bayonets & Tools", description: "Issued knives, bayonets, entrenching tools" },
  { slug: "camping", name: "Tents, Bedding & Camp Kit", description: "Shelters, sleeping bags, cookware, ponchos" },
  { slug: "documents", name: "Documents, Books & Photos", description: "Manuals, maps, paperwork, period photographs" },
  { slug: "other", name: "Other Surplus", description: "Everything else" },
];

declare global {
  // eslint-disable-next-line no-var
  var __qmDb: Database.Database | undefined;
}

function open(): Database.Database {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "quartermaster.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  const insert = db.prepare(
    "INSERT OR IGNORE INTO categories (slug, name, description) VALUES (?, ?, ?)"
  );
  for (const c of CATEGORIES) insert.run(c.slug, c.name, c.description);
  // The account automated notices are sent from. It has no usable password, so nobody can log in as it.
  db.prepare(
    "INSERT OR IGNORE INTO users (email, password_hash, display_name, bio) VALUES (?, '!', 'Quartermaster', ?)"
  ).run(SYSTEM_EMAIL, "Automated notices about your bids, sales and orders.");
  // Default seller fee: 5%, starting 60 days after the site first runs so early sellers sell free.
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('fee_rate_bp', '500')").run();
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('fees_start', date('now', '+60 days'))").run();
  return db;
}

export const SYSTEM_EMAIL = "notices@quartermaster.invalid";

let systemId: number | undefined;
export function systemUserId(): number {
  systemId ??= (db().prepare("SELECT id FROM users WHERE email = ?").get(SYSTEM_EMAIL) as { id: number }).id;
  return systemId;
}

export function db(): Database.Database {
  if (!globalThis.__qmDb) globalThis.__qmDb = open();
  return globalThis.__qmDb;
}

/** SQLite datetime text (UTC) -> Date */
export function parseDbDate(s: string): Date {
  return new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z");
}

/** Date -> SQLite datetime text (UTC) */
export function toDbDate(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}
