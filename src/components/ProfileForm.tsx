"use client";

import { useActionState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { updateProfile, type FormState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function ProfileForm({ user }: { user: { email: string; display_name: string; location: string; bio: string; paypal_email: string } }) {
  const [state, action] = useActionState<FormState, FormData>(updateProfile, undefined);
  return (
    <form action={action} className="card card-pad" style={{ maxWidth: 680 }}>
      {state?.error && <div className="alert alert-error" style={{ marginBottom: 16 }}><CircleAlert /> {state.error}</div>}
      {state?.ok && <div className="alert alert-ok" style={{ marginBottom: 16 }}><CircleCheck /> {state.ok}</div>}
      <div className="grid-2">
        <div className="field"><label>Username</label><input className="input" value={user.display_name} disabled /></div>
        <div className="field"><label>Login email</label><input className="input" value={user.email} disabled /></div>
      </div>
      <div className="field">
        <label htmlFor="location">Location</label>
        <input id="location" name="location" className="input" defaultValue={user.location} placeholder="City, State or Country" />
      </div>
      <div className="field">
        <label htmlFor="bio">About you</label>
        <textarea id="bio" name="bio" className="textarea" defaultValue={user.bio} placeholder="What do you collect? Any specialties? Buyers trust sellers who introduce themselves." />
      </div>
      <div className="field">
        <label htmlFor="paypal_email">PayPal email for receiving payments</label>
        <input id="paypal_email" name="paypal_email" type="email" className="input" defaultValue={user.paypal_email} placeholder="you@example.com" />
        <span className="hint">Buyers pay you directly through PayPal. Kept private.</span>
      </div>
      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}
