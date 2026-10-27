import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { CATEGORIES } from "@/lib/db";
import { CONDITIONS } from "@/lib/auctions";
import { SellForm } from "@/components/SellForm";

export const metadata: Metadata = { title: "List an item" };

export default async function SellPage() {
  const user = await requireUser("/sell");
  return (
    <div className="wrap">
      <div className="page-head">
        <div>
          <div className="eyebrow">Seller&apos;s desk</div>
          <h1>List an item for auction</h1>
          <p className="muted" style={{ margin: 0 }}>Five quick steps. Free to list, and you&apos;re paid through PayPal when it sells.</p>
        </div>
      </div>
      <SellForm
        categories={CATEGORIES.map((c) => ({ slug: c.slug, name: c.name }))}
        conditions={CONDITIONS}
        paypalEmail={user.paypal_email}
        location={user.location}
      />
    </div>
  );
}
