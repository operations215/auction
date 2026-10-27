import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getListing } from "@/lib/auctions";
import { createOrder, paypalConfigured } from "@/lib/paypal";

export async function POST(req: Request) {
  if (!paypalConfigured()) return NextResponse.json({ error: "PayPal is not configured." }, { status: 503 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const { listingId } = (await req.json().catch(() => ({}))) as { listingId?: number };
  const l = getListing(Number(listingId));
  if (!l || l.status !== "ended" || l.winner_id !== user.id)
    return NextResponse.json({ error: "You can only pay for auctions you've won." }, { status: 403 });
  if (l.paid_at) return NextResponse.json({ error: "This item is already paid for." }, { status: 409 });
  if (!l.seller_paypal_email)
    return NextResponse.json({ error: "The seller hasn't set up PayPal yet. Message them to sort it out." }, { status: 409 });
  try {
    const id = await createOrder(l, l.seller_paypal_email);
    db().prepare("UPDATE listings SET paypal_order_id = ? WHERE id = ?").run(id, l.id);
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
