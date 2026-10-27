import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { lotNumber, siteStats } from "@/lib/auctions";
import { resolveReport } from "@/app/actions";
import { LocalTime } from "@/components/LocalTime";

export const metadata: Metadata = { title: "Moderation" };

export default async function AdminPage() {
  const user = await requireUser("/admin");
  if (!user.is_admin) notFound();
  const stats = siteStats();
  const reports = db()
    .prepare(
      `SELECT r.*, l.title, l.status AS listing_status, u.display_name AS reporter, s.display_name AS seller
       FROM reports r JOIN listings l ON l.id = r.listing_id JOIN users u ON u.id = r.reporter_id JOIN users s ON s.id = l.seller_id
       ORDER BY (r.status = 'open') DESC, r.id DESC LIMIT 200`
    )
    .all() as { id: number; listing_id: number; title: string; reason: string; details: string; status: string; created_at: string; reporter: string; seller: string; listing_status: string }[];
  const users = (db().prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;

  return (
    <div className="wrap">
      <div className="page-head"><div><div className="eyebrow">Staff only</div><h1>Moderation</h1></div></div>
      <div className="kpis">
        <div className="card kpi"><span>Members</span><b>{users}</b></div>
        <div className="card kpi"><span>Live auctions</span><b>{stats.live}</b></div>
        <div className="card kpi"><span>Items sold</span><b>{stats.sold}</b></div>
        <div className="card kpi"><span>Open reports</span><b style={{ color: "var(--signal)" }}>{reports.filter((r) => r.status === "open").length}</b></div>
      </div>
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Listing</th><th>Reason</th><th>Reporter</th><th>When</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {reports.length === 0 && <tr><td colSpan={6} className="muted">No reports. All quiet on the western front.</td></tr>}
            {reports.map((r) => (
              <tr key={r.id}>
                <td><Link className="link" href={`/listings/${r.listing_id}`}>{lotNumber(r.listing_id)}</Link><div className="small">{r.title}</div><div className="small muted">by {r.seller}</div></td>
                <td>{r.reason}{r.details && <div className="small muted">{r.details}</div>}</td>
                <td>{r.reporter}</td>
                <td className="small"><LocalTime value={r.created_at} /></td>
                <td><span className={`chip ${r.status === "open" ? "chip-warn" : r.status === "removed" ? "chip-signal" : ""}`}>{r.status}</span></td>
                <td>
                  {r.status === "open" && (
                    <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                      <form action={resolveReport}><input type="hidden" name="reportId" value={r.id} /><input type="hidden" name="action" value="remove" /><button className="btn btn-sm btn-danger">Remove listing</button></form>
                      <form action={resolveReport}><input type="hidden" name="reportId" value={r.id} /><input type="hidden" name="action" value="dismiss" /><button className="btn btn-sm">Dismiss</button></form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
