import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { settleFeePayment, type FeePayment } from "@/lib/fees";
import { captureOrder, feeCustomId, paypalConfigured } from "@/lib/paypal";

export async function POST(req: Request) {
  if (!paypalConfigured()) return NextResponse.json({ error: "PayPal is not configured." }, { status: 503 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const { orderId } = (await req.json().catch(() => ({}))) as { orderId?: string };
  const p = orderId
    ? (db().prepare("SELECT * FROM fee_payments WHERE paypal_order_id = ? AND seller_id = ?").get(orderId, user.id) as FeePayment | undefined)
    : undefined;
  if (!p || !orderId) return NextResponse.json({ error: "Payment doesn't match your fees." }, { status: 403 });
  if (p.paid_at) return NextResponse.json({ ok: true });
  try {
    const cap = await captureOrder(orderId);
    if (cap.customId !== feeCustomId(p.id) || cap.amountCents !== p.amount_cents)
      return NextResponse.json({ error: "PayPal reported an unexpected amount. Contact support." }, { status: 409 });
    settleFeePayment(p.id, cap.captureId);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
