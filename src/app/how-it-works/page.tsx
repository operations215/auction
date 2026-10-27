import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CalendarClock, Gavel, Receipt, ShieldCheck, Star, Truck, Wallet } from "lucide-react";
import { bidIncrement, formatMoney } from "@/lib/auctions";
import { FEE_DUE_DAYS, feeSettings, formatDay, formatRate, freeUntil } from "@/lib/fees";

export const metadata: Metadata = { title: "How it works" };

const TIERS = [0, 100, 500, 2500, 10000, 25000, 50000, 100000, 250000];

export default function HowItWorks() {
  const fees = feeSettings();
  const until = freeUntil(fees);
  const rate = formatRate(fees.rateBp);
  return (
    <div className="wrap">
      <div className="page-head">
        <div>
          <div className="eyebrow">Field manual</div>
          <h1>How Quartermaster works</h1>
          <p className="muted" style={{ margin: 0, maxWidth: 640 }}>Everything you need to buy and sell with confidence, from your first bid to leaving feedback.</p>
        </div>
      </div>

      <div className="steps" style={{ marginBottom: 40 }}>
        <div className="card"><h3>Find</h3><p>Search by keyword, category, condition, price or ending time. Check sold items to see what things are worth.</p></div>
        <div className="card"><h3>Bid</h3><p>Enter your maximum. We bid on your behalf, one step at a time, only when someone bids against you.</p></div>
        <div className="card"><h3>Pay</h3><p>Win, then pay the seller through PayPal from your dashboard. Your money goes straight to their PayPal account.</p></div>
        <div className="card"><h3>Receive &amp; rate</h3><p>Track the parcel, confirm delivery and rate the seller. Only real buyers can leave feedback.</p></div>
      </div>

      <div className="prose">
        <h2 id="bidding"><Gavel size={22} style={{ verticalAlign: -3 }} /> Bidding, explained</h2>
        <p>
          Quartermaster uses <b>proxy bidding</b>, the same system collectors know from the big auction sites. You tell
          us the most you&apos;re willing to pay. We keep that number secret and bid for you only as much as it takes to
          stay in front, one increment at a time.
        </p>
        <p>
          <b>Example:</b> the current bid is $40 and you enter a maximum of $75. You become the high bidder at $41.
          If someone else bids $50, we automatically raise you to $51. You only pay $75 if someone pushes you there.
        </p>
        <p>Bid increments grow with the price:</p>
        <div className="card" style={{ padding: "6px 18px", marginBottom: 20 }}>
          <table className="table">
            <thead><tr><th>Current price</th><th className="num">Minimum raise</th></tr></thead>
            <tbody>
              {TIERS.map((t, i) => (
                <tr key={t}>
                  <td>{TIERS[i + 1] ? `${formatMoney(t)} to ${formatMoney(TIERS[i + 1] - 1)}` : `${formatMoney(t)} and up`}</td>
                  <td className="num"><b>{formatMoney(bidIncrement(t))}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 id="anti-sniping"><CalendarClock size={22} style={{ verticalAlign: -3 }} /> No more sniping</h2>
        <p>
          A bid placed in the <b>final 2 minutes</b> extends the auction so it ends 2 minutes after that bid. Everybody
          gets a fair chance to respond, and the item sells for what it&apos;s really worth to the people who want it.
        </p>

        <h2 id="reserve">Reserve prices</h2>
        <p>
          Sellers can set a hidden minimum. Bidders see whether the reserve has been met, never the amount. If bidding
          ends below the reserve, the item doesn&apos;t sell and nobody has to pay.
        </p>

        <h2 id="buyer-protection"><ShieldCheck size={22} style={{ verticalAlign: -3 }} /> Buyer protection</h2>
        <ul>
          <li><Wallet size={16} style={{ verticalAlign: -3 }} /> <b>Pay with PayPal, through the site.</b> PayPal&apos;s own buyer protection can cover items that never arrive or are significantly not as described. Never pay by bank transfer, gift card or crypto, even if a seller asks.</li>
          <li><BadgeCheck size={16} style={{ verticalAlign: -3 }} /> <b>Authenticity pledge.</b> Listings with the badge are guaranteed original issue by the seller. If it turns out to be a reproduction, you&apos;re entitled to return it.</li>
          <li><Truck size={16} style={{ verticalAlign: -3 }} /> <b>Tracked shipping.</b> Sellers add carrier and tracking details, and you confirm delivery when it arrives.</li>
          <li><b>Reports reviewed by people.</b> Any listing can be reported. Prohibited or fake items are taken down.</li>
        </ul>

        <h2 id="ratings"><Star size={22} style={{ verticalAlign: -3 }} /> Seller ratings</h2>
        <p>
          Only the winning bidder who paid for an item can rate the seller, once per item, so ratings can&apos;t be
          faked. Each seller&apos;s profile shows their average rating, positive percentage, items sold and full
          feedback history. Sellers with at least 3 ratings and 95% positive earn the <b>Top-rated</b> badge.
        </p>

        <h2 id="selling">Selling on Quartermaster</h2>
        <ul>
          <li>Listing is free. Add up to 10 photos, a detailed description, markings and provenance.</li>
          <li>Choose a starting bid, an optional reserve, shipping cost and an auction length of 1 to 10 days.</li>
          <li>When the auction ends, the winner pays straight into your PayPal account. We notify you the moment they pay.</li>
          <li>Ship promptly, add tracking from your seller dashboard, and collect great feedback.</li>
          <li>You can cancel a listing any time before the first bid.</li>
        </ul>

        <h2 id="fees"><Receipt size={22} style={{ verticalAlign: -3 }} /> Fees</h2>
        <ul>
          <li><b>Buyers pay no fees.</b> You pay the winning bid plus the seller&apos;s shipping cost, and nothing more.</li>
          {fees.rateBp > 0 ? (
            <li>
              <b>Listing is free.</b> When an item sells and the buyer pays, the seller owes {rate} of the winning bid.
              Shipping isn&apos;t included, and nothing is owed if the buyer never pays.
            </li>
          ) : (
            <li><b>Listing and selling are free.</b> There are no seller fees right now.</li>
          )}
          {fees.rateBp > 0 && until && <li><b>Launch offer:</b> no seller fees on auctions that end before {formatDay(until)}.</li>}
          <li>
            Fees add up under <Link href="/account?tab=fees">My Quartermaster › Fees</Link>. Pay them with PayPal whenever
            you like, as long as each one is paid within {FEE_DUE_DAYS} days. If any fee is older than that, you can&apos;t
            list new items until it&apos;s paid. Your live auctions carry on as normal.
          </li>
          <li>PayPal&apos;s own processing fees on the payments you receive are separate, and go to PayPal.</li>
        </ul>
        <p>
          Ready? <Link href="/sell">List your first item</Link>, and read the <Link href="/rules">listing rules</Link> first.
        </p>
      </div>
    </div>
  );
}
