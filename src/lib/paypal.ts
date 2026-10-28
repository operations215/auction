import "server-only";
import crypto from "node:crypto";
import { lotNumber, type ListingRow } from "./auctions";

/**
 * PayPal Checkout (Orders v2). The buyer pays the seller directly: each order names the
 * seller's PayPal email as the payee, so buyers' money never sits with the platform.
 * Seller fee orders name no payee, so they pay into the PayPal account the keys belong to.
 *
 * Configure with PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET and PAYPAL_ENV=sandbox|live.
 */

const ENV = process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
const BASE = ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

export function paypalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

export function paypalClientId() {
  return process.env.PAYPAL_CLIENT_ID ?? "";
}

/**
 * Without PayPal keys, local/demo installs get a clearly labelled "simulate payment" button
 * so the whole flow can be tried. Never on in production unless explicitly enabled.
 */
export function demoPaymentsEnabled() {
  if (paypalConfigured()) return false;
  if (process.env.DEMO_PAYMENTS === "0") return false;
  return process.env.NODE_ENV !== "production" || process.env.DEMO_PAYMENTS === "1";
}

let cached: { token: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": crypto.randomUUID(),
      Prefer: "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = (json as { details?: { issue?: string; description?: string }[] }).details?.[0];
    throw new Error(detail?.description ?? detail?.issue ?? `PayPal request failed (${res.status})`);
  }
  return json as T;
}

const money = (cents: number) => ({ currency_code: "USD", value: (cents / 100).toFixed(2) });

export function orderTotalCents(l: Pick<ListingRow, "current_price_cents" | "shipping_cents">) {
  return l.current_price_cents + l.shipping_cents;
}

export async function createOrder(l: ListingRow, payeeEmail: string): Promise<string> {
  const order = await api<{ id: string }>("/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: `listing-${l.id}`,
        custom_id: String(l.id),
        description: l.title.slice(0, 127),
        payee: { email_address: payeeEmail },
        amount: {
          ...money(orderTotalCents(l)),
          breakdown: { item_total: money(l.current_price_cents), shipping: money(l.shipping_cents) },
        },
        items: [
          {
            name: l.title.slice(0, 127),
            sku: lotNumber(l.id),
            quantity: "1",
            category: "PHYSICAL_GOODS",
            unit_amount: money(l.current_price_cents),
          },
        ],
      },
    ],
  });
  return order.id;
}

export function feeCustomId(paymentId: number) {
  return `fees-${paymentId}`;
}

/** A seller paying the fees they owe. The money goes to the site's own PayPal account. */
export async function createFeeOrder(paymentId: number, amountCents: number, count: number): Promise<string> {
  const order = await api<{ id: string }>("/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: feeCustomId(paymentId),
        custom_id: feeCustomId(paymentId),
        description: `MusterBid seller fees (${count} ${count === 1 ? "sale" : "sales"})`,
        amount: money(amountCents),
      },
    ],
    application_context: { brand_name: "MusterBid", shipping_preference: "NO_SHIPPING" },
  });
  return order.id;
}

type Capture = {
  id: string;
  status: string;
  purchase_units: {
    custom_id?: string;
    shipping?: {
      name?: { full_name?: string };
      address?: {
        address_line_1?: string;
        address_line_2?: string;
        admin_area_2?: string;
        admin_area_1?: string;
        postal_code?: string;
        country_code?: string;
      };
    };
    payments?: { captures?: { id: string; status: string; amount: { value: string; currency_code: string }; custom_id?: string }[] };
  }[];
};

export type CaptureResult = { captureId: string; amountCents: number; customId: string; shipTo: string };

export async function captureOrder(orderId: string): Promise<CaptureResult> {
  const c = await api<Capture>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`);
  const unit = c.purchase_units?.[0];
  const cap = unit?.payments?.captures?.[0];
  if (c.status !== "COMPLETED" || !cap || cap.status !== "COMPLETED")
    throw new Error("PayPal did not complete the payment. No money was taken.");
  const a = unit?.shipping?.address;
  const shipTo = [
    unit?.shipping?.name?.full_name,
    a?.address_line_1,
    a?.address_line_2,
    [a?.admin_area_2, a?.admin_area_1, a?.postal_code].filter(Boolean).join(", "),
    a?.country_code,
  ]
    .filter(Boolean)
    .join("\n");
  return {
    captureId: cap.id,
    amountCents: Math.round(parseFloat(cap.amount.value) * 100),
    customId: cap.custom_id ?? unit?.custom_id ?? "",
    shipTo,
  };
}
