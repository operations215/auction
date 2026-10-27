import { BadgeCheck, CalendarClock, Gavel, ShieldCheck, Star } from "lucide-react";
import { HERO_CAMO } from "@/lib/camo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="auth-wrap">
      <div className="auth-art" style={{ backgroundImage: HERO_CAMO }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--brass-hi)" }}>Report for duty</div>
          <h2>Join the collectors who trade honestly.</h2>
          <ul>
            <li><Gavel /> Proxy bidding does the work while you sleep</li>
            <li><CalendarClock /> Anti-sniping keeps every auction fair</li>
            <li><ShieldCheck /> Pay through PayPal, never wire money to strangers</li>
            <li><Star /> Feedback only from verified buyers</li>
            <li><BadgeCheck /> Strict rules: no weapons, ammunition or explosives</li>
          </ul>
        </div>
      </div>
      <div className="auth-form">
        <div className="card card-pad" style={{ padding: 32 }}>
          <h1 style={{ textTransform: "uppercase", fontSize: 32, marginBottom: 6 }}>{title}</h1>
          <p className="muted" style={{ marginBottom: 22 }}>{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
