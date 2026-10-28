import type { Metadata } from "next";
import { Ban, CircleCheck, Flag } from "lucide-react";

export const metadata: Metadata = { title: "Listing rules" };

const BANNED = [
  "Firearms, receivers, frames, barrels and firearm parts kits",
  "Ammunition, cartridges, primers, powder and reloading components",
  "Live or unverified ordnance: grenades, shells, mines, fuzes, rockets",
  "Explosives, pyrotechnics, smoke and CS/tear gas canisters",
  "Magazines and conversion parts for firearms",
  "Current-issue body armor plates where restricted, and police or military ID",
  "Stolen or currently controlled government property",
  "Reproductions or fakes presented as original",
];

const ALLOWED = [
  "Uniforms, camouflage, boots and clothing",
  "Helmets, liners, berets and caps",
  "Webbing, load-bearing gear, pouches and canteens",
  "Rucksacks, duffels and field bags",
  "Patches, insignia, badges and medals",
  "Compasses, binoculars, field radios and telephones",
  "Bayonets, knives and tools, where legal for buyer and seller",
  "Manuals, maps, documents and photographs",
];

export default function RulesPage() {
  return (
    <div className="wrap">
      <div className="page-head">
        <div>
          <div className="eyebrow">Standing orders</div>
          <h1>Listing rules</h1>
          <p className="muted" style={{ margin: 0, maxWidth: 680 }}>
            MusterBid is a marketplace for collectors of military surplus and militaria. These rules keep it legal,
            safe and trustworthy for everyone. Breaking them can get listings removed and accounts closed.
          </p>
        </div>
      </div>

      <h2 id="prohibited" style={{ textTransform: "uppercase" }}>Not allowed</h2>
      <div className="ban-grid">
        {BANNED.map((b) => <div className="card" key={b}><Ban /> <span>{b}</span></div>)}
      </div>

      <h2 style={{ textTransform: "uppercase", marginTop: 32 }}>Welcome here</h2>
      <div className="ban-grid ok-grid">
        {ALLOWED.map((b) => <div className="card" key={b}><CircleCheck /> <span>{b}</span></div>)}
      </div>

      <div className="prose" style={{ marginTop: 32 }}>
        <h2>Describe items honestly</h2>
        <ul>
          <li>Reproductions, restrikes and post-war copies must say so in the title.</li>
          <li>Show and describe damage, repairs, missing parts, stains and odors.</li>
          <li>Use your own photos of the actual item you&apos;re selling.</li>
          <li>Only tick the authenticity pledge if you&apos;re confident the item is original issue.</li>
        </ul>

        <h2>Sensitive historical items</h2>
        <p>
          Genuine historical militaria from every nation is welcome for collecting and education. Items must be
          described in a factual, historical way. Listings that glorify hate groups or violence, or modern replicas of
          extremist symbols, are removed. Some countries restrict the sale or shipping of certain historical insignia;
          sellers and buyers are responsible for following their local laws.
        </p>

        <h2>Bidding is a promise</h2>
        <ul>
          <li>A winning bid is a commitment to buy. Pay within 3 days of the auction ending.</li>
          <li>Don&apos;t bid on your own items or ask friends to raise the price (shill bidding). It leads to an immediate ban.</li>
          <li>Keep payment on MusterBid. Offers to pay or sell &quot;off site&quot; are a common scam.</li>
        </ul>

        <h2 id="reporting"><Flag size={20} style={{ verticalAlign: -3 }} /> Reporting a listing</h2>
        <p>
          See something that breaks these rules, or a fake sold as original? Open the listing and use{" "}
          <b>Report this listing</b> at the bottom of the page. Every report is reviewed by our team.
        </p>
      </div>
    </div>
  );
}
