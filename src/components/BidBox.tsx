"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CircleAlert, CircleCheck, Gavel, Info, TrendingUp } from "lucide-react";
import { bidAction, type BidState } from "@/app/actions";

const money = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-brass btn-lg btn-block" disabled={pending}>
      <Gavel /> {pending ? "Placing bid…" : "Confirm bid"}
    </button>
  );
}

export function BidBox(props: {
  listingId: number;
  minBidCents: number;
  incrementCents: number;
  shippingCents: number;
  loggedIn: boolean;
  leadingMaxCents: number | null;
  outbid: boolean;
}) {
  const { listingId, minBidCents, incrementCents, shippingCents, loggedIn, leadingMaxCents, outbid } = props;
  const [state, action] = useActionState<BidState, FormData>(bidAction, undefined);
  const [amount, setAmount] = useState("");
  const [review, setReview] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const lastAt = useRef(0);

  useEffect(() => {
    if (state && state.at !== lastAt.current) {
      lastAt.current = state.at;
      setReview(null);
      if (state.ok) setAmount("");
    }
  }, [state]);

  // A leader raising their own maximum must go above it; everyone else starts from the minimum bid.
  const base = leadingMaxCents != null ? leadingMaxCents + incrementCents : minBidCents;
  const quick = [base, base + incrementCents * 2, base + incrementCents * 5];

  function startReview(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount.replace(/[$,\s]/g, "")) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return setLocalError("Enter a bid amount, like 45.00.");
    if (leadingMaxCents == null && cents < minBidCents) return setLocalError(`Enter ${money(minBidCents)} or more.`);
    if (leadingMaxCents != null && cents <= leadingMaxCents)
      return setLocalError(`Your maximum is already ${money(leadingMaxCents)}. Enter more to raise it.`);
    setLocalError(null);
    setReview(cents);
  }

  if (!loggedIn)
    return (
      <a href={`/login?next=/listings/${listingId}`} className="btn btn-brass btn-lg btn-block">
        <Gavel /> Log in to bid
      </a>
    );

  return (
    <div>
      {leadingMaxCents != null && !state && (
        <div className="alert alert-ok bid-status" style={{ marginBottom: 12 }}>
          <CircleCheck />
          <span>You&apos;re the high bidder. Your maximum is {money(leadingMaxCents)}.</span>
        </div>
      )}
      {outbid && !state && (
        <div className="alert alert-error bid-status" style={{ marginBottom: 12 }}>
          <CircleAlert />
          <span>You&apos;ve been outbid. Bid again to get back in front.</span>
        </div>
      )}
      {state && (
        <div className={`alert ${state.ok ? (state.leading ? "alert-ok" : "alert-warn") : "alert-error"}`} style={{ marginBottom: 12 }} role="status">
          {state.ok ? state.leading ? <CircleCheck /> : <TrendingUp /> : <CircleAlert />}
          <span>
            {state.ok ? state.message : state.error}
            {state.ok && state.extended && " Your late bid extended the auction by 2 minutes."}
          </span>
        </div>
      )}

      {review == null ? (
        <form onSubmit={startReview}>
          <label htmlFor="bid-amt" className="label">
            {leadingMaxCents != null ? "Raise your maximum bid" : "Your maximum bid"}
          </label>
          <div className="quick-bids">
            {quick.map((c) => (
              <button type="button" key={c} onClick={() => { setAmount((c / 100).toFixed(2)); setLocalError(null); }}>
                {money(c)}
              </button>
            ))}
          </div>
          <div className="bid-row">
            <div className="input-money">
              <input
                id="bid-amt"
                className="input"
                inputMode="decimal"
                autoComplete="off"
                placeholder={(base / 100).toFixed(2)}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <button className="btn btn-brass btn-lg">
              <Gavel /> Bid
            </button>
          </div>
          {localError && <p className="small" style={{ color: "var(--signal)", margin: "8px 0 0" }}>{localError}</p>}
          <p className="small muted" style={{ margin: "10px 0 0", display: "flex", gap: 6 }}>
            <Info size={15} style={{ flex: "none", marginTop: 2 }} />
            {leadingMaxCents != null ? (
              <>Enter more than {money(leadingMaxCents)} to raise your maximum. The price only moves if someone bids against you.</>
            ) : (
              <>Enter {money(minBidCents)} or more. We&apos;ll bid for you in {money(incrementCents)} steps, only as needed, up to your maximum.</>
            )}
          </p>
        </form>
      ) : (
        <form action={action} className="confirm-panel">
          <input type="hidden" name="listingId" value={listingId} />
          <input type="hidden" name="amount" value={(review / 100).toFixed(2)} />
          <div className="eyebrow" style={{ color: "var(--brass-lo)" }}>Review your bid</div>
          <div className="big">{money(review)}</div>
          <p className="small" style={{ margin: "4px 0 12px" }}>
            maximum bid, plus {shippingCents ? money(shippingCents) : "free"} shipping. If you win, you agree to pay the
            seller through PayPal within 3 days.
          </p>
          <div className="stack" style={{ gap: 8 }}>
            <ConfirmButton />
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setReview(null)}>
              Change amount
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
