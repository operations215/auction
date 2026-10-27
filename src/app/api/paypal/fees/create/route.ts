import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { openFeePayment } from "@/lib/fees";
import { createFeeOrder, paypalConfigured } from "@/lib/paypal";

export async function POST() {
  if (!paypalConfigured()) return NextResponse.json({ error: "PayPal is not configured." }, { status: 503 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const p = openFeePayment(user.id);
  if (!p) return NextResponse.json({ error: "You don't owe any fees." }, { status: 409 });
  try {
    const id = await createFeeOrder(p.id, p.amountCents, p.count);
    db().prepare("UPDATE fee_payments SET paypal_order_id = ? WHERE id = ?").run(id, p.id);
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
