/**
 * Fills the database with demo members, auctions, bids, sales, feedback and messages.
 *   npm run seed            (wipes data/ first)
 * Every demo account uses the password "surplus123".
 */
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { DATA_DIR, UPLOAD_DIR, db, parseDbDate, systemUserId, toDbDate } from "../src/lib/db";
import { finalizeEndedAuctions, placeBid } from "../src/lib/auctions";
import { chargeSaleFee, featureListing, saveFeeSettings } from "../src/lib/fees";
import { art, type ArtOpts, type Kind } from "./art";

const PASSWORD = "surplus123";

fs.rmSync(DATA_DIR, { recursive: true, force: true });
const d = db();
const hash = bcrypt.hashSync(PASSWORD, 10);

/* ------------------------------------------------------------------ members */

type U = { name: string; email: string; location: string; bio: string; admin?: boolean; days: number; paypal?: boolean };
const USERS: U[] = [
  { name: "demo_collector", email: "demo@musterbid.test", location: "Austin, TX", bio: "Cold War US and West German field gear. Always hunting for M-1965 jackets in large sizes.", days: 140, paypal: true },
  { name: "MB-Staff", email: "staff@musterbid.test", location: "HQ", bio: "MusterBid moderation team.", admin: true, days: 400 },
  { name: "DepotDan", email: "dan@example.com", location: "Fayetteville, NC", bio: "Retired supply sergeant. Vietnam and Cold War US issue, honestly graded, shipped fast in double boxes.", days: 900, paypal: true },
  { name: "Bundeswehr_Bernd", email: "bernd@example.com", location: "Koblenz, Germany", bio: "West German Bundeswehr and NVA surplus. I speak English and Deutsch. Combined shipping on request.", days: 610, paypal: true },
  { name: "Tommy_Atkins_Kit", email: "tommy@example.com", location: "Aldershot, UK", bio: "British Army kit from WW1 to the Falklands. Every item comes with my written description of markings.", days: 780, paypal: true },
  { name: "Swiss_Surplus_Co", email: "swiss@example.com", location: "Thun, Switzerland", bio: "Swiss Army surplus, mostly unissued depot stock. Bags, salt-and-pepper denim, tools and blankets.", days: 300, paypal: true },
  { name: "GI_Joan", email: "joan@example.com", location: "San Diego, CA", bio: "Navy and Marine Corps uniforms and paperwork. Collecting for 25 years, selling duplicates.", days: 520, paypal: true },
  { name: "PatchWorks_Pete", email: "pete@example.com", location: "Columbus, GA", bio: "Insignia only: patches, tabs, DIs and wings. Originals only, never reproductions.", days: 410, paypal: true },
  { name: "NorthwoodsSurplus", email: "north@example.com", location: "Duluth, MN", bio: "Small family surplus store. Tents, sleeping bags, packs and cold weather gear.", days: 220, paypal: true },
  { name: "hammer_time", email: "hammer@example.com", location: "Denver, CO", bio: "", days: 330 },
  { name: "kilo_two_six", email: "kilo@example.com", location: "Tacoma, WA", bio: "Reenactor, 101st Airborne impression.", days: 260 },
  { name: "brass_hunter", email: "brass@example.com", location: "Richmond, VA", bio: "Medals and documents.", days: 180 },
  { name: "mudlark_mike", email: "mike@example.com", location: "Leeds, UK", bio: "", days: 95 },
  { name: "fieldgrey_fan", email: "fg@example.com", location: "Milwaukee, WI", bio: "German helmets and field gear.", days: 450 },
  { name: "rucksack_ray", email: "ray@example.com", location: "Boise, ID", bio: "Backpacker who prefers mil-spec.", days: 60 },
  { name: "mapcase_marta", email: "marta@example.com", location: "Toronto, ON", bio: "Maps, manuals and navigation kit.", days: 75 },
];
const ID: Record<string, number> = {};
const insUser = d.prepare(
  "INSERT INTO users (email, password_hash, display_name, location, bio, paypal_email, is_admin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
);
for (const u of USERS) {
  ID[u.name] = Number(
    insUser.run(u.email, hash, u.name, u.location, u.bio, u.paypal ? u.email : "", u.admin ? 1 : 0, toDbDate(new Date(Date.now() - u.days * 864e5))).lastInsertRowid
  );
}

/* ------------------------------------------------------------------ listings */

type L = {
  seller: string;
  title: string;
  cat: string;
  cond: string;
  era?: string;
  country?: string;
  markings?: string;
  provenance?: string;
  desc: string;
  start: number;
  reserve?: number;
  ship: number;
  /** Minutes until the auction ends. Negative means it already ended that long ago. */
  ends: number;
  days?: number;
  bids?: [string, number][];
  auth?: boolean;
  returns?: boolean;
  kind: Kind;
  art: Omit<ArtOpts, "label">;
  label: string[];
  after?: { paid?: boolean; shipped?: [string, string]; received?: boolean; review?: [number, string] };
};

const OD = "#55603a";
const WOODLAND = ["#6b6b3c", "#3f4a2a", "#7a5a36", "#1f2017"];
const FLECK = ["#7b7a52", "#4a5a33", "#2f3a22", "#6a4a2e"];
const ERDL = ["#7d8a4a", "#3e5a2c", "#8a6a3a", "#1f2a17"];

const LISTINGS: L[] = [
  {
    seller: "DepotDan", title: "US Army M-1965 Field Jacket, Medium-Regular, 1972 Contract", cat: "uniforms", cond: "Excellent",
    era: "Vietnam War", country: "United States", markings: "DSA 100-72-C-0876, Medium-Regular label intact, brass Scovill zipper",
    provenance: "From a Fort Bragg veteran's estate, stored in a cedar closet since 1975.",
    desc: "Classic OG-107 M-65 field jacket with the brass zipper, Velcro cuff tabs and hidden hood in the collar. Bright, even OG-107 colour with very light fading on the shoulders.\n\nMeasurements (flat): pit to pit 23\", length 30\", sleeve from shoulder seam 25\".\n\nNo holes, no stains, no repairs. All snaps work. The drawcord at the waist is original. A great wearer or a strong collection piece.",
    start: 4500, reserve: 7500, ship: 1295, ends: 6, bids: [["hammer_time", 6200], ["kilo_two_six", 8800], ["demo_collector", 9400]], auth: true, returns: true,
    kind: "jacket", art: { color: OD, variant: "rank", text: "U.S. ARMY" }, label: ["COAT, COLD WEATHER", "FIELD, M-1965", "MEDIUM-REGULAR", "DSA 100-72-C-0876"],
  },
  {
    seller: "fieldgrey_fan", title: "West German Bundeswehr Flecktarn Field Jacket, Size 6, 1991", cat: "uniforms", cond: "Good",
    era: "Cold War", country: "West Germany", markings: "Size 6 (Gr. 6), maker label 'Bundeswehr 1991', BW flags on both sleeves",
    desc: "Five-colour Flecktarn Feldbluse with both German flags still sewn on. Light honest wear, one small repaired snag on the back panel (photographed). Big pockets, roll-up sleeves, still very sturdy.\n\nGr. 6 fits roughly a US Medium / 40 chest.",
    start: 1999, ship: 995, ends: 24, bids: [["rucksack_ray", 2400], ["mudlark_mike", 2900]], auth: true,
    kind: "jacket", art: { camo: FLECK, text: "BUNDESWEHR", variant: "flag-de", seed: 9 }, label: ["FELDBLUSE", "FLECKTARN", "GR. 6", "BUNDESWEHR 1991"],
  },
  {
    seller: "DepotDan", title: "Vietnam M1 Helmet, Rear Seam Swivel Bails with Westinghouse Liner", cat: "headgear", cond: "Good",
    era: "Vietnam War", country: "United States", markings: "Heat stamp 1966 lot under brim, Westinghouse W liner",
    desc: "Rear seam swivel bail M1 steel pot with roughly 80% original cork-grain paint. Matched with a Westinghouse liner with complete suspension and nape strap. Chinstraps present and supple.\n\nSurface rust on the brim edge only, no dents, no cracks. Displays beautifully.",
    start: 6000, reserve: 9000, ship: 1595, ends: 52, bids: [["fieldgrey_fan", 9600], ["hammer_time", 10500]], auth: true,
    kind: "helmet", art: { color: "#4f5a32" }, label: ["HELMET, STEEL M1", "LOT 1966", "LINER: WESTINGHOUSE"],
  },
  {
    seller: "Tommy_Atkins_Kit", title: "British Mk II Brodie Helmet, 1940 Dated, Original Paint", cat: "headgear", cond: "Fair",
    era: "World War II", country: "United Kingdom", markings: "Maker 'BMB' and '1940' stamped under brim, liner dated 1940",
    provenance: "Found in a Hampshire farmhouse attic with a Home Guard armband (sold separately).",
    desc: "Early war Mk II with the rimless brim and original sand-textured khaki paint, about 65% coverage. Liner is complete but the leather is dry, so I'd recommend displaying rather than wearing. Chinstrap is a replacement, which I've noted in the photos.",
    start: 8500, ship: 2400, ends: 140, bids: [["kilo_two_six", 9500], ["mudlark_mike", 11000], ["fieldgrey_fan", 12500]], auth: true,
    kind: "helmet", art: { color: "#7a6b45", variant: "brodie", bg: "slate" }, label: ["BMB 1940", "SHELL MK II", "LINER 1940"],
  },
  {
    seller: "Bundeswehr_Bernd", title: "German M56 Style Steel Helmet Shell, Ex-Bundesgrenzschutz", cat: "headgear", cond: "Good",
    era: "Cold War", country: "West Germany", markings: "Size 66 stamped inside, 'BGS' painted inside the crown",
    desc: "Post-war Bundesgrenzschutz steel helmet with the flared skirt profile. Original field grey paint with light scratches. Complete leather liner, size 66 (fits 58 cm heads). Chinstrap present.\n\nPlease note: this is a post-war helmet, not WWII.",
    start: 4900, ship: 2800, ends: 330, bids: [["fieldgrey_fan", 5400]], auth: true,
    kind: "helmet", art: { color: "#6f6a55", variant: "stahlhelm", bg: "slate" }, label: ["STAHLHELM", "GR. 66", "BGS"],
  },
  {
    seller: "PatchWorks_Pete", title: "101st Airborne Screaming Eagle Patch with Tab, Vietnam Era, Cut Edge", cat: "insignia", cond: "Excellent",
    era: "Vietnam War", country: "United States", markings: "Cut edge, full colour, cotton twill, glow under UV: no",
    desc: "Full colour 101st patch with attached AIRBORNE tab, cut edge, unsewn. Crisp embroidery, tongue present. Comes in an acid-free sleeve with my certificate of originality.",
    start: 1500, ship: 450, ends: 600, bids: [["kilo_two_six", 2600], ["brass_hunter", 2200]], auth: true,
    kind: "patch", art: { color: "#2b3a5c", accent: "#e8d27a", text: "AIRBORNE", bg: "paper" }, label: ["SSI 101ST ABN", "CUT EDGE", "UNSEWN"],
  },
  {
    seller: "PatchWorks_Pete", title: "Lot of 6 Subdued Cold War Unit Patches, OD Green", cat: "insignia", cond: "Good",
    era: "Cold War", country: "United States", markings: "Merrowed edges, mixed makers, some with glue residue",
    desc: "Six subdued OD green patches from the late 1970s to 1980s: a mix of divisions and corps. Two show light glue residue on the back. Great starter lot for a new collector.",
    start: 999, ship: 350, ends: 1300, bids: [], auth: true,
    kind: "patch", art: { color: "#3d4a2c", accent: "#e9e1c4", variant: "circle", bg: "paper" }, label: ["LOT OF 6", "SUBDUED", "OD GREEN"],
  },
  {
    seller: "brass_hunter", title: "Bronze Star Medal in Coffin Case with Ribbon Bar and Lapel Pin", cat: "medals", cond: "Excellent",
    era: "Vietnam War", country: "United States", markings: "Unnamed, slot brooch, coffin case marked 'Medal, Bronze Star'",
    desc: "Bronze Star Medal in its original hard case with matching ribbon bar and lapel pin. Unnamed, which is typical for the period. Bright bronze with clean ribbon.\n\nSold as a collectible. No paperwork.",
    start: 4500, ship: 800, ends: 2900, bids: [["GI_Joan", 4800]], auth: true,
    kind: "medal", art: { variant: "bronze", camo: ["#7a1420", "#ffffff", "#1d3a6e", "#ffffff", "#7a1420"], bg: "slate" }, label: ["MEDAL, BRONZE STAR", "WITH CASE", "RIBBON & PIN"],
  },
  {
    seller: "Tommy_Atkins_Kit", title: "WW2 Defence Medal and War Medal Pair, Original Ribbons", cat: "medals", cond: "Good",
    era: "World War II", country: "United Kingdom", markings: "Unnamed as issued, cupro-nickel and silver alloy",
    desc: "The classic home front pair: Defence Medal and War Medal 1939-45, both on their original ribbons, unmounted. Light toning. Comes in a small card box.",
    start: 2200, ship: 650, ends: 4000, bids: [["brass_hunter", 2600], ["mudlark_mike", 3100]], auth: true,
    kind: "medal", art: { variant: "silver", camo: ["#c96a2a", "#2a6a2a", "#f2d04a", "#2a6a2a", "#c96a2a"], text: "cross", bg: "slate" }, label: ["DEFENCE MEDAL", "WAR MEDAL 39-45", "PAIR"],
  },
  {
    seller: "NorthwoodsSurplus", title: "ALICE Pack, Medium, with Frame and Shoulder Straps", cat: "bags-packs", cond: "Good",
    era: "Cold War", country: "United States", markings: "LC-1, 1985 contract stamp inside flap",
    desc: "Medium ALICE pack with the LC-1 frame, padded shoulder straps and kidney pad. All buckles and quick releases work. Some fading and a couple of marker marks inside. A legend for a reason: load it up and it'll outlast you.",
    start: 3500, ship: 1800, ends: 200, bids: [["rucksack_ray", 4200], ["hammer_time", 3900]], returns: true, auth: true,
    kind: "rucksack", art: { color: "#4d5734", bg: "slate" }, label: ["PACK, FIELD, CARGO", "COMBAT, MEDIUM, LC-1", "1985"],
  },
  {
    seller: "Swiss_Surplus_Co", title: "Swiss Army Salt and Pepper Denim Work Jacket, Unissued", cat: "uniforms", cond: "New / Unissued",
    era: "Cold War", country: "Switzerland", markings: "Swiss cross stamp inside, size 48",
    desc: "Unissued Swiss Army 'salt and pepper' denim work jacket from depot stock, folded since the 1970s. Size 48 (about a US 38). Thick cotton, metal buttons, inner pocket. Still has the depot fold lines.",
    start: 2500, ship: 1500, ends: 1700, bids: [["mudlark_mike", 2750]], auth: true,
    kind: "jacket", art: { color: "#8a8a80", text: "SWISS ARMY", bg: "slate" }, label: ["ARBEITSKITTEL", "GR. 48", "UNISSUED"],
  },
  {
    seller: "Swiss_Surplus_Co", title: "Swiss Army Leather and Canvas Bread Bag, 1968", cat: "bags-packs", cond: "Excellent",
    era: "Cold War", country: "Switzerland", markings: "Maker and 1968 stamped on the flap",
    desc: "Heavy waxed canvas with leather trim and a long leather strap. Perfect everyday bag. Lightly used, the leather has been cleaned and conditioned.",
    start: 2900, ship: 1500, ends: 5200, bids: [], auth: true,
    kind: "duffel", art: { color: "#6b6e55", text: "1968" }, label: ["BROTSACK", "1968", "SCHWEIZER ARMEE"],
  },
  {
    seller: "NorthwoodsSurplus", title: "US Army Canvas Duffel Bag, Stenciled Name, Korea Era", cat: "bags-packs", cond: "Fair",
    era: "Korean War", country: "United States", markings: "Stenciled 'SMITH J 4417', 1952 date stamp near the bottom",
    desc: "Heavy cotton duck duffel with the original soldier's stencil. Some staining and two small repaired holes. Hardware works. Great display piece or prop.",
    start: 1500, ship: 1400, ends: 820, bids: [["hammer_time", 1600]],
    kind: "duffel", art: { color: "#5e6440" }, label: ["BAG, BARRACK", "1952", "SMITH J 4417"],
  },
  {
    seller: "DepotDan", title: "M-1956 Load Bearing Equipment Set: Belt, Suspenders, Two Pouches", cat: "field-gear", cond: "Good",
    era: "Vietnam War", country: "United States", markings: "Belt dated 1966, pouches 1968, suspenders unmarked",
    desc: "A matched-looking M-56 set: pistol belt, H suspenders and two universal ammo pouches. Webbing is supple and the hardware is all present. Ready to wear for a Vietnam impression.\n\nPouches are empty, as you'd expect.",
    start: 5500, ship: 1395, ends: 60 * 26, bids: [["kilo_two_six", 6000], ["hammer_time", 6600]], auth: true, returns: true,
    kind: "webbing", art: { color: "#5a5f3b" }, label: ["BELT, INDIVIDUAL", "EQUIPMENT M-1956", "1966"],
  },
  {
    seller: "GI_Joan", title: "USMC M-1910 Pattern Canteen with Cover and Cup, 1944", cat: "field-gear", cond: "Good",
    era: "World War II", country: "United States", markings: "Canteen 'US 1944', cover with 'USMC' stamp, cup dated 1943",
    desc: "Corrosion-resistant steel canteen with matching cup and the Marine Corps cover. Cover is faded but strong, both snaps work. Cap is the black plastic type.",
    start: 3200, ship: 995, ends: 2000, bids: [["kilo_two_six", 3400]], auth: true,
    kind: "canteen", art: { color: "#59603c", text: "USMC" }, label: ["CANTEEN, M-1910", "US 1944", "COVER: USMC"],
  },
  {
    seller: "Tommy_Atkins_Kit", title: "British Army Prismatic Compass Mk III, 1943, Working", cat: "optics-comms", cond: "Excellent",
    era: "World War II", country: "United Kingdom", markings: "Broad arrow, 'Mk III', serial number, dated 1943",
    desc: "Prismatic compass with luminous dial (no longer glowing), smooth bezel and working needle lock. Lens and prism clear. Leather case included, with a period name scratched inside the lid.",
    start: 9000, reserve: 12500, ship: 1800, ends: 3300, bids: [["mapcase_marta", 9800]], auth: true,
    kind: "compass", art: { bg: "wood" }, label: ["COMPASS, PRISMATIC", "MK III", "1943 ↑"],
  },
  {
    seller: "Bundeswehr_Bernd", title: "Bundeswehr Hensoldt 8x30 Binoculars with Case", cat: "optics-comms", cond: "Excellent",
    era: "Cold War", country: "West Germany", markings: "Hensoldt Wetzlar, Bundeswehr property mark, reticle in left eyepiece",
    desc: "The classic Dienstglas. Clear, bright optics with the military rangefinding reticle. Rubber eyecups are soft. Comes in the original leather case with strap.",
    start: 12000, ship: 2400, ends: 60 * 40, bids: [["demo_collector", 12500], ["mapcase_marta", 13500], ["hammer_time", 14000]], auth: true,
    kind: "binoculars", art: { color: "#3d4430", text: "8x30" }, label: ["FERNGLAS 8X30", "HENSOLDT WETZLAR", "BUNDESWEHR"],
  },
  {
    seller: "NorthwoodsSurplus", title: "US Army AN/PRC-77 Radio, Display Only, with Handset", cat: "optics-comms", cond: "Poor / For parts",
    era: "Vietnam War", country: "United States", markings: "Data plate present, 1970 contract",
    desc: "Untested, sold for display. Case is solid with original paint wear. Comes with an H-189 style handset and a short antenna. Battery box empty and clean.",
    start: 8000, ship: 3500, ends: 60 * 60, bids: [], returns: false,
    kind: "radio", art: { color: "#4a5233", bg: "slate", text: "47.50" }, label: ["RADIO SET", "AN/PRC-77", "1970"],
  },
  {
    seller: "DepotDan", title: "USMC KA-BAR Fighting Knife with Leather Sheath, 1944", cat: "knives-tools", cond: "Good",
    era: "World War II", country: "United States", markings: "USMC on the blade, KA-BAR on the guard, sheath marked 'USMC'",
    desc: "Iconic fighting knife with a stacked leather handle in good shape and a clean, sharp blade. Sheath is complete with all rivets. Sold to adults only; buyer confirms knives are legal to own where they live.",
    start: 12500, reserve: 17500, ship: 1500, ends: 60 * 70, bids: [["GI_Joan", 15000], ["fieldgrey_fan", 16000]], auth: true,
    kind: "knife", art: { color: "#4d5235", bg: "wood" }, label: ["USMC", "KA-BAR", "SHEATH: USMC"],
  },
  {
    seller: "NorthwoodsSurplus", title: "US Army Folding Entrenching Tool with Carrier, 1969", cat: "knives-tools", cond: "Good",
    era: "Vietnam War", country: "United States", markings: "Ames 1969 on the blade, carrier stamped 1968",
    desc: "Tri-fold E-tool with the screw collar lock. Locks solid in all positions. Light surface rust on the edge, cleaned and oiled. Canvas carrier included.",
    start: 2200, ship: 1295, ends: 60 * 90, bids: [["rucksack_ray", 2300]],
    kind: "shovel", art: { color: "#4d5235" }, label: ["ENTRENCHING TOOL", "AMES 1969"],
  },
  {
    seller: "NorthwoodsSurplus", title: "Two-Person Pup Tent Shelter Halves with Poles and Pegs", cat: "camping", cond: "Good",
    era: "Korean War", country: "United States", markings: "Both halves dated 1951",
    desc: "Two matching shelter halves that button together into a classic pup tent. Poles, pegs and ropes included. Canvas is sound, a few small stains. Set up in the yard and photographed.",
    start: 4000, ship: 2200, ends: 60 * 100, bids: [["rucksack_ray", 4400], ["kilo_two_six", 4700]],
    kind: "tent", art: { color: "#6b6a44" }, label: ["TENT, SHELTER HALF", "1951", "PAIR"],
  },
  {
    seller: "mapcase_marta", title: "FM 21-76 Survival Manual, 1970 Edition, Original", cat: "documents", cond: "Good",
    era: "Vietnam War", country: "United States", markings: "Department of the Army, October 1970",
    desc: "Original Army survival field manual, complete and readable, with a previous owner's notes in a few margins. Cover wear and a creased corner.",
    start: 1200, ship: 450, ends: 60 * 30, bids: [["rucksack_ray", 1500]], auth: true,
    kind: "document", art: { color: "#9e9a73", text: "FM 21-76", bg: "wood" }, label: ["FM 21-76", "SURVIVAL", "OCT 1970"],
  },
  {
    seller: "Tommy_Atkins_Kit", title: "WW2 British GSGS Ordnance Survey Map of Normandy Coast", cat: "documents", cond: "Fair",
    era: "World War II", country: "United Kingdom", markings: "GSGS 4250, sheet number printed in the margin",
    desc: "Original wartime map sheet. Fold wear and a small tear along one fold (photographed). Fabulous detail. Wonderful framed.",
    start: 3500, ship: 900, ends: 60 * 115, bids: [["mapcase_marta", 3900], ["brass_hunter", 3700]], auth: true,
    kind: "document", art: { variant: "map", text: "GSGS 4250", bg: "wood" }, label: ["GSGS 4250", "1943", "NORMANDY"],
  },
  {
    seller: "GI_Joan", title: "Period Photograph of Three Marines, 1944, with Handwritten Caption", cat: "documents", cond: "Good",
    era: "World War II", country: "United States", markings: "Pencil caption on the reverse",
    desc: "Original snapshot of three Marines in utilities, with a caption on the back. Sharp image, light silvering at the edges.",
    start: 900, ship: 300, ends: 60 * 60 * 2, bids: [], auth: true,
    kind: "document", art: { variant: "photo", text: "Pacific, 1944", bg: "wood" }, label: ["PHOTOGRAPH", "1944"],
  },
  {
    seller: "Bundeswehr_Bernd", title: "Bundeswehr M65 Gas Mask with Filter Bag (Empty Filter)", cat: "field-gear", cond: "Excellent",
    era: "Cold War", country: "West Germany", markings: "Size 2, 1983 date, Dräger maker mark",
    desc: "Display piece. Rubber is soft and uncracked. Comes with its carrier bag. The filter is an inert, empty display filter: not for use.",
    start: 2500, ship: 1500, ends: 60 * 50, bids: [["fieldgrey_fan", 2700]], auth: true,
    kind: "gasmask", art: { color: "#5a5f48", bg: "slate" }, label: ["ABC-SCHUTZMASKE", "GR. 2", "1983"],
  },
  {
    seller: "GI_Joan", title: "US Navy Utility Cap, Chambray, 1960s", cat: "headgear", cond: "Good",
    era: "Cold War", country: "United States", markings: "Size 7 1/4",
    desc: "Navy blue chambray utility cap with a stenciled star. Light fading. A nice companion to a dungaree shirt.",
    start: 1000, ship: 600, ends: 60 * 75, bids: [],
    kind: "cap", art: { color: "#3b4a63", accent: "#e8e2c8" }, label: ["CAP, UTILITY", "7 1/4"],
  },
  {
    seller: "Tommy_Atkins_Kit", title: "Parachute Regiment Maroon Beret with Cap Badge, 1980s", cat: "headgear", cond: "Good",
    era: "Cold War", country: "United Kingdom", markings: "Kangol, size 57, 1984",
    desc: "Maroon beret with an anodised cap badge, shaped and worn. Leather band intact, ties present.",
    start: 2800, ship: 900, ends: 60 * 45, bids: [["mudlark_mike", 3300]], auth: true,
    kind: "beret", art: { color: "#7a1f2a" }, label: ["KANGOL", "SIZE 57", "1984"],
  },
  {
    seller: "DepotDan", title: "Jungle Boots, Panama Sole, Size 9R, 1970 Dated", cat: "uniforms", cond: "Excellent",
    era: "Vietnam War", country: "United States", markings: "Size 9R, 1970 date stamp inside",
    desc: "Black leather and nylon tropical combat boots with Panama soles. Barely worn, lots of tread left. Laces are replacements.",
    start: 6500, ship: 1500, ends: 60 * 34, bids: [["kilo_two_six", 7000]], auth: true,
    kind: "boots", art: { color: "#2a2722" }, label: ["BOOTS, COMBAT", "TROPICAL", "9R 1970"],
  },
  {
    seller: "GI_Joan", title: "ERDL Pattern Jungle Jacket, Small-Long, Green Dominant", cat: "uniforms", cond: "Good",
    era: "Vietnam War", country: "United States", markings: "Small-Long, ripstop, DSA 100-69 contract",
    desc: "Green-dominant ERDL leaf pattern tropical coat. Bright colours, sleeves shortened by a previous owner (noted). No holes.",
    start: 9500, reserve: 14000, ship: 1200, ends: 60 * 125, bids: [["hammer_time", 10000]], auth: true,
    kind: "jacket", art: { camo: ERDL, text: "", seed: 21 }, label: ["COAT, MAN'S", "COMBAT, TROPICAL", "SMALL-LONG"],
  },
  {
    seller: "demo_collector", title: "US Woodland BDU Jacket, Medium-Regular, 1988", cat: "uniforms", cond: "Excellent",
    era: "Cold War", country: "United States", markings: "Medium-Regular, 1988 DLA contract",
    desc: "Woodland BDU coat, lightly worn, with name tape removed (thread remains). A great everyday jacket.",
    start: 1500, ship: 900, ends: 60 * 48, bids: [["rucksack_ray", 1800]], auth: true,
    kind: "jacket", art: { camo: WOODLAND, seed: 4 }, label: ["COAT, COMBAT", "WOODLAND", "MEDIUM-REGULAR", "1988"],
  },

  /* ----------- ended auctions: price guide, feedback, and orders to try out ----------- */
  {
    seller: "DepotDan", title: "US Army M-1951 Field Pants, Medium-Regular, Unissued", cat: "uniforms", cond: "New / Unissued",
    era: "Korean War", country: "United States", markings: "Medium-Regular, 1952",
    desc: "Unissued OG-107 field trousers with the button fly and adjustable waist tabs.",
    start: 2500, ship: 995, ends: -60 * 30, bids: [["demo_collector", 4100], ["hammer_time", 3600]], auth: true,
    kind: "trousers", art: { color: "#5d6342" }, label: ["TROUSERS, FIELD", "M-1951", "1952"],
    after: { paid: true, shipped: ["USPS", "9400 1118 9922 3456 7890 12"] },
  },
  {
    seller: "Bundeswehr_Bernd", title: "Bundeswehr Moleskin Trousers, Size 7, Olive", cat: "uniforms", cond: "Good",
    era: "Cold War", country: "West Germany",
    desc: "Classic heavy moleskin trousers.", start: 1200, ship: 1500, ends: -60 * 5, bids: [["demo_collector", 1900], ["rucksack_ray", 1700]],
    kind: "trousers", art: { color: "#5b5a3c" }, label: ["FELDHOSE", "GR. 7"],
  },
  {
    seller: "demo_collector", title: "US Army Mess Kit, 1945 Dated, Complete", cat: "camping", cond: "Good",
    era: "World War II", country: "United States", markings: "US 1945 stamped on the pan",
    desc: "Two-piece mess kit, both halves dated 1945.", start: 1200, ship: 800, ends: -60 * 20, bids: [["mapcase_marta", 2100], ["hammer_time", 1800]], auth: true,
    kind: "messkit", art: { bg: "slate" }, label: ["MEAT CAN", "US 1945"],
    after: { paid: true },
  },
  {
    seller: "DepotDan", title: "Vietnam M1956 Canteen Cover, 1967", cat: "field-gear", cond: "Good", era: "Vietnam War", country: "United States",
    desc: "Dated canteen cover.", start: 900, ship: 600, ends: -60 * 24 * 3, bids: [["kilo_two_six", 1800], ["hammer_time", 1500]], auth: true,
    kind: "canteen", art: { color: "#5a6040" }, label: ["COVER, CANTEEN", "1967"],
    after: { paid: true, shipped: ["USPS", "9400 1000 0000 0000 0000 01"], received: true, review: [5, "Exactly as described and shipped the next morning. Dan packs like a pro."] },
  },
  {
    seller: "DepotDan", title: "M-1965 Field Jacket Liner, Large", cat: "uniforms", cond: "Excellent", era: "Vietnam War", country: "United States",
    desc: "Quilted liner.", start: 2000, ship: 900, ends: -60 * 24 * 9, bids: [["hammer_time", 3900], ["rucksack_ray", 3300]], auth: true,
    kind: "jacket", art: { color: "#6a7044" }, label: ["LINER, M-1965", "LARGE"],
    after: { paid: true, shipped: ["UPS", "1Z999AA10123456784"], received: true, review: [5, "Great liner, better than the photos. Would buy again."] },
  },
  {
    seller: "DepotDan", title: "Vietnam Era Poncho Liner, Leaf Pattern", cat: "camping", cond: "Good", era: "Vietnam War", country: "United States",
    desc: "The famous woobie.", start: 3000, ship: 1200, ends: -60 * 24 * 15, bids: [["rucksack_ray", 6100], ["kilo_two_six", 5800]], auth: true,
    kind: "tent", art: { camo: ERDL, seed: 13 }, label: ["LINER, PONCHO", "1968"],
    after: { paid: true, shipped: ["USPS", "9400 1000 0000 0000 0000 02"], received: true, review: [4, "Good item. Took a few extra days to ship but Dan kept me updated."] },
  },
  {
    seller: "Tommy_Atkins_Kit", title: "1937 Pattern Webbing Small Pack, 1942", cat: "bags-packs", cond: "Good", era: "World War II", country: "United Kingdom",
    desc: "Small pack.", start: 2500, ship: 1800, ends: -60 * 24 * 6, bids: [["kilo_two_six", 4800], ["mudlark_mike", 4400]], auth: true,
    kind: "rucksack", art: { color: "#8a8058" }, label: ["PACK, SMALL", "1942"],
    after: { paid: true, shipped: ["Royal Mail", "RN123456789GB"], received: true, review: [5, "Beautiful 37 pattern pack, the markings are just as described. Superb seller."] },
  },
  {
    seller: "Tommy_Atkins_Kit", title: "British Army Officer's Swagger Stick", cat: "other", cond: "Good", era: "World War II", country: "United Kingdom",
    desc: "Swagger stick.", start: 1500, ship: 1200, ends: -60 * 24 * 20, bids: [["brass_hunter", 2700], ["hammer_time", 2300]], auth: true,
    kind: "knife", art: { color: "#5a3a22", bg: "wood" }, label: ["SWAGGER STICK"],
    after: { paid: true, shipped: ["Royal Mail", "RN987654321GB"], received: true, review: [5, "Fast international shipping, very well packed."] },
  },
  {
    seller: "Bundeswehr_Bernd", title: "Bundeswehr Field Cap, Flecktarn, Size 58", cat: "headgear", cond: "Excellent", era: "Cold War", country: "Germany",
    desc: "Field cap.", start: 900, ship: 1200, ends: -60 * 24 * 11, bids: [["rucksack_ray", 1600], ["fieldgrey_fan", 1400]], auth: true,
    kind: "cap", art: { camo: FLECK, accent: "#e8e2c8", seed: 2 }, label: ["FELDMÜTZE", "GR. 58"],
    after: { paid: true, shipped: ["DHL", "JD014600006281234567"], received: true, review: [5, "Bernd answered all my sizing questions. Perfect."] },
  },
  {
    seller: "Bundeswehr_Bernd", title: "NVA Strichtarn Rain Jacket", cat: "uniforms", cond: "Fair", era: "Cold War", country: "East Germany",
    desc: "Rain camo jacket.", start: 1800, ship: 1500, ends: -60 * 24 * 25, bids: [["fieldgrey_fan", 3000], ["mudlark_mike", 2600]], auth: true,
    kind: "jacket", art: { color: "#7d7f68", text: "NVA" }, label: ["NVA", "STRICHTARN"],
    after: { paid: true, shipped: ["DHL", "JD014600006289876543"], received: true, review: [3, "Item fine but it was more worn than the photos suggested."] },
  },
  {
    seller: "PatchWorks_Pete", title: "1st Cavalry Division Patch, Full Colour, Vietnam Era", cat: "insignia", cond: "Excellent", era: "Vietnam War", country: "United States",
    desc: "1st Cav patch.", start: 800, ship: 400, ends: -60 * 24 * 4, bids: [["kilo_two_six", 2100], ["brass_hunter", 1900]], auth: true,
    kind: "patch", art: { color: "#d9b84a", accent: "#1b1b14", variant: "arrow", bg: "paper" }, label: ["1ST CAV", "FULL COLOUR"],
    after: { paid: true, shipped: ["USPS", "9400 1000 0000 0000 0000 03"], received: true, review: [5, "Pete knows his patches. Arrived in a sleeve with a COA."] },
  },
  {
    seller: "PatchWorks_Pete", title: "Ranger Tab, Subdued, Merrow Edge", cat: "insignia", cond: "Good", era: "Cold War", country: "United States",
    desc: "Ranger tab.", start: 500, ship: 400, ends: -60 * 24 * 13, bids: [["hammer_time", 1300], ["kilo_two_six", 1100]], auth: true,
    kind: "patch", art: { color: "#3d4a2c", accent: "#1b1b14", text: "RANGER", bg: "paper" }, label: ["RANGER TAB", "SUBDUED"],
    after: { paid: true, shipped: ["USPS", "9400 1000 0000 0000 0000 04"], received: true, review: [4, "Good tab, fair price."] },
  },
  {
    seller: "GI_Joan", title: "USN Dungaree Shirt, 1950s, Stenciled", cat: "uniforms", cond: "Good", era: "Korean War", country: "United States",
    desc: "Chambray shirt.", start: 2000, ship: 900, ends: -60 * 24 * 7, bids: [["mapcase_marta", 4200], ["hammer_time", 3900]], auth: true,
    kind: "jacket", art: { color: "#4a5f86", text: "U.S. NAVY" }, label: ["SHIRT, CHAMBRAY", "1950s"],
    after: { paid: true, shipped: ["USPS", "9400 1000 0000 0000 0000 05"], received: true, review: [5, "Joan is a gem. Shirt is fantastic and she included a handwritten note on its history."] },
  },
  {
    seller: "Swiss_Surplus_Co", title: "Swiss Army Wool Blanket, Red Cross, Unissued", cat: "camping", cond: "New / Unissued", era: "Cold War", country: "Switzerland",
    desc: "Wool blanket.", start: 2500, ship: 2000, ends: -60 * 24 * 18, bids: [["rucksack_ray", 5200], ["mudlark_mike", 4700]], auth: true,
    kind: "duffel", art: { color: "#6a6a62", text: "+" }, label: ["WOLLDECKE", "UNISSUED"],
    after: { paid: true, shipped: ["Swiss Post", "RR123456785CH"], received: true, review: [5, "Unissued and smells of the depot, in a good way. Fast shipping from Switzerland."] },
  },
  {
    seller: "NorthwoodsSurplus", title: "Extreme Cold Weather Mittens, Trigger Finger", cat: "uniforms", cond: "Good", era: "Cold War", country: "United States",
    desc: "Mittens.", start: 1200, ship: 900, ends: -60 * 24 * 16, bids: [["hammer_time", 2100], ["rucksack_ray", 1800]],
    kind: "boots", art: { color: "#3f4433" }, label: ["MITTENS", "TRIGGER FINGER"],
    after: { paid: true, shipped: ["USPS", "9400 1000 0000 0000 0000 06"], received: true, review: [4, "Warm and solid. Good communication."] },
  },
];

const insListing = d.prepare(
  `INSERT INTO listings (seller_id, category_id, title, description, condition, era, origin_country, markings, provenance,
     authenticity_guarantee, returns_accepted, starting_price_cents, reserve_price_cents, shipping_cents, ships_from,
     current_price_cents, ends_at, created_at)
   VALUES (?, (SELECT id FROM categories WHERE slug = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const insImg = d.prepare("INSERT INTO listing_images (listing_id, filename, position) VALUES (?, ?, ?)");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
let fileNo = 0;
const writeSvg = (svg: string) => {
  const name = `seed${String(++fileNo).padStart(4, "0")}.svg`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), svg);
  return name;
};

const now = Date.now();
const ended: { id: number; l: L }[] = [];

for (const l of LISTINGS) {
  const durationDays = l.days ?? (l.ends > 0 ? Math.max(1, Math.min(10, Math.ceil(l.ends / 1440) + 2)) : 7);
  const sellerLoc = USERS.find((u) => u.name === l.seller)!.location;
  // Every listing starts "live" with a future end so bids can be placed through the real bidding engine.
  const endsAt = new Date(now + Math.max(l.ends, 60 * 24) * 60_000);
  const createdAt = new Date((l.ends > 0 ? now + l.ends * 60_000 : now + l.ends * 60_000) - durationDays * 864e5);
  const id = Number(
    insListing.run(
      ID[l.seller], l.cat, l.title, l.desc, l.cond, l.era ?? "", l.country ?? "", l.markings ?? "", l.provenance ?? "",
      l.auth ? 1 : 0, l.returns ? 1 : 0, l.start, l.reserve ?? null, l.ship, sellerLoc, l.start, toDbDate(endsAt), toDbDate(createdAt)
    ).lastInsertRowid
  );
  const pics = art(l.kind, { ...l.art, label: l.label, seed: l.art.seed ?? id });
  [pics.main, pics.detail, pics.label].forEach((svg, i) => insImg.run(id, writeSvg(svg), i));

  for (const [who, max] of l.bids ?? []) {
    const r = placeBid(id, ID[who], max);
    if (!r.ok) console.warn(`  bid skipped on "${l.title}": ${r.error}`);
  }

  // Spread the bid times out between listing and now (or the end, for finished auctions).
  const bidIds = d.prepare("SELECT id FROM bids WHERE listing_id = ? ORDER BY id").all(id) as { id: number }[];
  const lastBidAt = Math.min(now - 60_000, now + l.ends * 60_000 - 60_000);
  bidIds.forEach((b, i) => {
    const t = createdAt.getTime() + ((lastBidAt - createdAt.getTime()) * (i + 1)) / (bidIds.length + 0.3);
    d.prepare("UPDATE bids SET created_at = ? WHERE id = ?").run(toDbDate(new Date(t)), b.id);
  });
  d.prepare("UPDATE listings SET ends_at = ? WHERE id = ?").run(toDbDate(new Date(now + l.ends * 60_000)), id);
  if (l.ends < 0) ended.push({ id, l });
}

finalizeEndedAuctions();

/* ------------------------------------------------------------------ after the sale */

for (const { id, l } of ended) {
  const a = l.after;
  if (!a) continue;
  const endAt = now + l.ends * 60_000;
  const at = (hours: number) => toDbDate(new Date(Math.min(now - 60_000, endAt + hours * 3600_000)));
  const row = d.prepare("SELECT winner_id FROM listings WHERE id = ?").get(id) as { winner_id: number | null };
  if (!row.winner_id) continue;
  const winner = USERS.find((u) => ID[u.name] === row.winner_id)!;
  if (a.paid)
    d.prepare("UPDATE listings SET paid_at = ?, payment_ref = ?, ship_to = ? WHERE id = ?").run(
      at(3), `DEMO-${(id * 7919).toString(36).toUpperCase()}`, `${winner.name}\n123 Example Street\n${winner.location}`, id
    );
  if (a.shipped) d.prepare("UPDATE listings SET shipped_at = ?, tracking_carrier = ?, tracking_number = ? WHERE id = ?").run(at(26), a.shipped[0], a.shipped[1], id);
  if (a.received) d.prepare("UPDATE listings SET received_at = ? WHERE id = ?").run(at(24 * 4), id);
  if (a.review)
    d.prepare("INSERT INTO reviews (listing_id, reviewer_id, seller_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      id, row.winner_id, ID[l.seller], a.review[0], a.review[1], at(24 * 4 + 2)
    );
}

/* ------------------------------------------------------------------ seller fees */

// In the demo, the 5% fee was already on when these items sold, and a few sellers featured a lot when
// they listed it. Sellers have paid the fees from more than ten days ago; the rest are still owed.
saveFeeSettings({ rateBp: 500, start: "", featureCents: 299 });
for (const title of [
  "British Mk II Brodie Helmet, 1940 Dated, Original Paint",
  "Bronze Star Medal in Coffin Case with Ribbon Bar and Lapel Pin",
  "Bundeswehr Hensoldt 8x30 Binoculars with Case",
  "USMC KA-BAR Fighting Knife with Leather Sheath, 1944",
  "ERDL Pattern Jungle Jacket, Small-Long, Green Dominant",
]) {
  const l = d.prepare("SELECT id, seller_id, created_at FROM listings WHERE title = ?").get(title) as { id: number; seller_id: number; created_at: string };
  featureListing(l.id, l.seller_id);
  d.prepare("UPDATE listings SET featured_at = ? WHERE id = ?").run(l.created_at, l.id);
  d.prepare("UPDATE fees SET created_at = ? WHERE listing_id = ? AND kind = 'feature'").run(l.created_at, l.id);
}
type Sale = { id: number; seller_id: number; current_price_cents: number; ends_at: string; paid_at: string };
for (const sale of d.prepare("SELECT id, seller_id, current_price_cents, ends_at, paid_at FROM listings WHERE paid_at IS NOT NULL ORDER BY id").all() as Sale[])
  if (chargeSaleFee(sale)) d.prepare("UPDATE fees SET created_at = ? WHERE listing_id = ?").run(sale.paid_at, sale.id);
type Fee = { id: number; seller_id: number; amount_cents: number; created_at: string };
const settledFees = d.prepare("SELECT id, seller_id, amount_cents, created_at FROM fees WHERE created_at < ? ORDER BY id").all(toDbDate(new Date(now - 10 * 864e5))) as Fee[];
for (const sellerId of new Set(settledFees.map((f) => f.seller_id))) {
  const fees = settledFees.filter((f) => f.seller_id === sellerId);
  const paidAt = toDbDate(new Date(parseDbDate(fees[fees.length - 1].created_at).getTime() + 2 * 864e5));
  const paymentId = d
    .prepare("INSERT INTO fee_payments (seller_id, amount_cents, fee_ids, payment_ref, created_at, paid_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(sellerId, fees.reduce((sum, f) => sum + f.amount_cents, 0), JSON.stringify(fees.map((f) => f.id)), `DEMO-FEES-${sellerId}`, paidAt, paidAt).lastInsertRowid;
  const settle = d.prepare("UPDATE fees SET status = 'paid', payment_id = ?, settled_at = ? WHERE id = ?");
  for (const f of fees) settle.run(paymentId, paidAt, f.id);
}

// Older notices are read; keep the demo account's latest ones unread so the inbox badge shows.
d.prepare("UPDATE messages SET read_at = created_at WHERE recipient_id != ?").run(ID.demo_collector);

/* ------------------------------------------------------------------ messages & watchlist */

const msg = (from: string, to: string, listingTitle: string | null, body: string, minsAgo: number, read = true) => {
  const lid = listingTitle ? (d.prepare("SELECT id FROM listings WHERE title = ?").get(listingTitle) as { id: number }).id : null;
  const t = toDbDate(new Date(now - minsAgo * 60_000));
  d.prepare("INSERT INTO messages (sender_id, recipient_id, listing_id, body, created_at, read_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    ID[from], ID[to], lid, body, t, read ? t : null
  );
};
const JACKET = "US Army M-1965 Field Jacket, Medium-Regular, 1972 Contract";
msg("demo_collector", "DepotDan", JACKET, "Hi Dan, is the hood still rolled up in the collar, and are there any name tape stitch holes?", 60 * 20);
msg("DepotDan", "demo_collector", JACKET, "Hood is there and has never been unrolled as far as I can tell. No stitch holes at all, it was never badged. Happy to send more photos of the label if you like.", 60 * 19);
msg("demo_collector", "DepotDan", JACKET, "Perfect, thanks. Bidding now!", 60 * 18);
msg("Bundeswehr_Bernd", "demo_collector", "Bundeswehr Moleskin Trousers, Size 7, Olive", "Danke for winning! Let me know if you'd like me to combine shipping with anything else from my listings.", 3, false);

for (const t of [
  "British Army Prismatic Compass Mk III, 1943, Working",
  "Bundeswehr Hensoldt 8x30 Binoculars with Case",
  "ERDL Pattern Jungle Jacket, Small-Long, Green Dominant",
  "German M56 Style Steel Helmet Shell, Ex-Bundesgrenzschutz",
]) {
  const lid = (d.prepare("SELECT id FROM listings WHERE title = ?").get(t) as { id: number }).id;
  d.prepare("INSERT INTO watchlist (user_id, listing_id) VALUES (?, ?)").run(ID.demo_collector, lid);
}
for (const [who, t] of [
  ["hammer_time", JACKET], ["kilo_two_six", JACKET], ["fieldgrey_fan", JACKET], ["mudlark_mike", "British Mk II Brodie Helmet, 1940 Dated, Original Paint"],
  ["brass_hunter", "British Mk II Brodie Helmet, 1940 Dated, Original Paint"], ["mapcase_marta", "WW2 British GSGS Ordnance Survey Map of Normandy Coast"],
] as const) {
  const lid = (d.prepare("SELECT id FROM listings WHERE title = ?").get(t) as { id: number }).id;
  d.prepare("INSERT OR IGNORE INTO watchlist (user_id, listing_id) VALUES (?, ?)").run(ID[who], lid);
}

// A sample report so the moderation page has something in it.
d.prepare("INSERT INTO reports (listing_id, reporter_id, reason, details) VALUES ((SELECT id FROM listings WHERE title LIKE 'Bundeswehr M65 Gas Mask%'), ?, ?, ?)").run(
  ID.hammer_time, "Prohibited item (weapon, ammunition, explosive, etc.)", "Is the filter really inert? Please check."
);

const count = (sql: string) => (d.prepare(sql).get() as { n: number }).n;
console.log(`Seeded ${count("SELECT COUNT(*) AS n FROM users") - 1} members, ${count("SELECT COUNT(*) AS n FROM listings")} listings (${count("SELECT COUNT(*) AS n FROM listings WHERE status = 'active'")} live), ${count("SELECT COUNT(*) AS n FROM bids")} bids, ${count("SELECT COUNT(*) AS n FROM reviews")} reviews, ${count("SELECT COUNT(*) AS n FROM fees")} seller fees (${count("SELECT COUNT(*) AS n FROM fees WHERE status = 'owed'")} owed), ${count("SELECT COUNT(*) AS n FROM listings WHERE featured_at IS NOT NULL")} featured lots.`);
console.log(`System notices from user #${systemUserId()}.`);
console.log(`Log in as demo@musterbid.test (buyer and seller) or staff@musterbid.test (moderator). Password: ${PASSWORD}`);
