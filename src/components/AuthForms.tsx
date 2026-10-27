"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CircleAlert } from "lucide-react";
import { login, signup, type FormState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

function ErrorBox({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>
      <CircleAlert /> <span>{state.error}</span>
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(login, undefined);
  return (
    <form action={action}>
      <ErrorBox state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required defaultValue={state?.fields?.email} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      <SubmitButton className="btn btn-brass btn-lg btn-block" pendingText="Logging in…">Log in</SubmitButton>
      <p className="small muted" style={{ textAlign: "center", margin: "16px 0 0" }}>
        New here? <Link className="link" href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create a free account</Link>
      </p>
    </form>
  );
}

export function SignupForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(signup, undefined);
  const f = state?.fields ?? {};
  return (
    <form action={action}>
      <ErrorBox state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required defaultValue={f.email} />
        <span className="hint">Never shown to other members.</span>
      </div>
      <div className="field">
        <label htmlFor="display_name">Username</label>
        <input id="display_name" name="display_name" className="input" autoComplete="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_.\-]+" defaultValue={f.display_name} placeholder="e.g. sarge_surplus" />
        <span className="hint">This is how buyers and sellers will see you.</span>
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" autoComplete="new-password" required minLength={8} />
        <span className="hint">At least 8 characters.</span>
      </div>
      <div className="field">
        <label htmlFor="location">Location (optional)</label>
        <input id="location" name="location" className="input" placeholder="City, State or Country" defaultValue={f.location} />
        <span className="hint">Helps buyers estimate shipping times.</span>
      </div>
      <label className="check" style={{ marginBottom: 18 }}>
        <input type="checkbox" name="agree" required />
        <span>
          I agree to the <Link className="link" href="/rules" target="_blank">listing rules</Link> and understand that a
          winning bid is a commitment to buy.
        </span>
      </label>
      <SubmitButton className="btn btn-brass btn-lg btn-block" pendingText="Creating account…">Create account</SubmitButton>
      <p className="small muted" style={{ textAlign: "center", margin: "16px 0 0" }}>
        Already a member? <Link className="link" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Log in</Link>
      </p>
    </form>
  );
}
