import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getListing, sendSystemMessage, formatMoney } from "@/lib/auctions";
import { chargeSaleFee, feeNotice } from "@/lib/fees";
import { captureOrder, orderTotalCents, paypalConfigured } from "@/lib/paypal";

export async function POST(req: Request) {
  if (!paypalConfigured()) return NextResponse.json({ error: "PayPal is not configured." }, { status: 503 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const { listingId, orderId } = (await req.json().catch(() => ({}))) as { listingId?: number; orderId?: string };
  const l = getListing(Number(listingId));
  if (!l || l.winner_id !== user.id || !orderId || l.paypal_order_id !== orderId)
    return NextResponse.json({ error: "Payment doesn't match this order." }, { status: 403 });
  if (l.paid_at) return NextResponse.json({ ok: true });
  try {
    const cap = await captureOrder(orderId);
    if (cap.customId !== String(l.id) || cap.amountCents !== orderTotalCents(l))
      return NextResponse.json({ error: "PayPal reported an unexpected amount. Contact support." }, { status: 409 });
    db()
      .prepare("UPDATE listings SET paid_at = datetime('now'), payment_ref = ?, ship_to = ? WHERE id = ? AND paid_at IS NULL")
      .run(cap.captureId, cap.shipTo || null, l.id);
    const fee = chargeSaleFee(l);
    sendSystemMessage(l.seller_id, l.id,
      `Payment of ${formatMoney(cap.amountCents)} received via PayPal for "${l.title}" (ref ${cap.captureId}). Please ship and add tracking from your seller dashboard.${feeNotice(fee)}`);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
