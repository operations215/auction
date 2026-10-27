import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="wrap" style={{ padding: "80px 20px", textAlign: "center" }}>
      <Compass size={56} style={{ margin: "0 auto 16px", color: "var(--khaki)" }} />
      <div className="eyebrow">Error 404 · Off the map</div>
      <h1 className="stencil" style={{ fontSize: 48, marginTop: 8 }}>Missing in action</h1>
      <p className="muted">That page or listing doesn&apos;t exist, or it&apos;s been removed.</p>
      <div className="row" style={{ justifyContent: "center", marginTop: 20 }}>
        <Link href="/" className="btn btn-brass">Back to base</Link>
        <Link href="/search" className="btn">Browse auctions</Link>
      </div>
    </div>
  );
}
