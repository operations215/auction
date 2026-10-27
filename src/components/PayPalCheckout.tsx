"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PayPalNamespace = {
  Buttons: (opts: Record<string, unknown>) => { render: (el: HTMLElement) => Promise<void>; close?: () => void };
};
declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

let sdkPromise: Promise<void> | null = null;
function loadSdk(clientId: string) {
  if (window.paypal) return Promise.resolve();
  sdkPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons`;
    s.onload = () => resolve();
    s.onerror = () => {
      sdkPromise = null;
      reject(new Error("Couldn't load PayPal. Check your connection and try again."));
    };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

/**
 * Official PayPal Smart Buttons. The server creates and captures the order, so amounts can't be tampered with.
 * `endpoint` names the route pair (`/create` and `/capture`) and `payload` is sent to both.
 */
export function PayPalCheckout({
  clientId,
  endpoint = "/api/paypal",
  payload = {},
  doneText = "Payment complete. The seller has been notified.",
}: {
  clientId: string;
  endpoint?: string;
  payload?: Record<string, string | number>;
  doneText?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const body = JSON.stringify(payload);

  useEffect(() => {
    let cancelled = false;
    let buttons: ReturnType<PayPalNamespace["Buttons"]> | undefined;
    loadSdk(clientId)
      .then(() => {
        if (cancelled || !ref.current || !window.paypal) return;
        buttons = window.paypal.Buttons({
          style: { layout: "vertical", color: "gold", shape: "rect", label: "pay" },
          createOrder: async () => {
            setError(null);
            const res = await fetch(`${endpoint}/create`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body,
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Couldn't start the payment.");
            return json.id;
          },
          onApprove: async (data: { orderID: string }) => {
            const res = await fetch(`${endpoint}/capture`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...JSON.parse(body), orderId: data.orderID }),
            });
            const json = await res.json();
            if (!res.ok) return setError(json.error ?? "Payment failed. You have not been charged.");
            setDone(true);
            router.refresh();
          },
          onError: (err: Error) => setError(err?.message || "PayPal reported a problem. You have not been charged."),
        });
        return buttons.render(ref.current);
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
      buttons?.close?.();
    };
  }, [clientId, endpoint, body, router]);

  if (done) return <div className="alert alert-ok">{doneText}</div>;
  return (
    <div>
      <div ref={ref} style={{ minHeight: 45, maxWidth: 360 }} />
      {error && <div className="alert alert-error" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  );
}
