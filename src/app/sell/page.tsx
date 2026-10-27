import type { Metadata } from "next";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { CATEGORIES } from "@/lib/db";
import { CONDITIONS, formatMoney } from "@/lib/auctions";
import { FEE_DUE_DAYS, feeBalance, feePolicy } from "@/lib/fees";
import { SellForm } from "@/components/SellForm";

export const metadata: Metadata = { title: "List an item" };

export default async function SellPage() {
  const user = await requireUser("/sell");
  const balance = feeBalance(user.id);
  return (
    <div className="wrap">
      <div className="page-head">
        <div>
          <div className="eyebrow">Seller&apos;s desk</div>
          <h1>List an item for auction</h1>
          <p className="muted" style={{ margin: 0 }}>Five quick steps. Free to list, and you&apos;re paid through PayPal when it sells.</p>
        </div>
      </div>
      {balance.overdue ? (
        <div className="card fee-summary overdue">
          <div>
            <div className="eyebrow">Selling paused</div>
            <h2>Settle your fees to keep listing</h2>
            <p>
              You owe {formatMoney(balance.owedCents)} in seller fees, and the oldest is more than {FEE_DUE_DAYS} days old.
              Pay it and you can list again straight away. Your live auctions carry on as normal.
            </p>
          </div>
          <Link href="/account?tab=fees" className="btn btn-brass btn-lg"><Wallet /> Pay {formatMoney(balance.owedCents)}</Link>
        </div>
      ) : (
        <SellForm
          categories={CATEGORIES.map((c) => ({ slug: c.slug, name: c.name }))}
          conditions={CONDITIONS}
          paypalEmail={user.paypal_email}
          location={user.location}
          feeNote={feePolicy()}
        />
      )}
    </div>
  );
}
