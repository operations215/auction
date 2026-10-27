import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, CircleAlert, MessagesSquare } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney, lotNumber, siteStats } from "@/lib/auctions";
import { dueDate, feeBalances, feePolicy, feeSettings, feeTotals, formatRate, recentFees } from "@/lib/fees";
import { resolveReport, updateFeeSettings, waiveSellerFee } from "@/app/actions";
import { LocalTime } from "@/components/LocalTime";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Moderation" };

const FEE_STATUS = { owed: "Owed", paid: "Paid", waived: "Waived" } as const;

const FEE_FLASH: Record<string, [ok: boolean, text: string]> = {
  saved: [true, "Fee settings saved. They apply to sales paid from now on."],
  waived: [true, "Fee waived. The seller has been told."],
  invalid: [false, "Enter a rate between 0 and 30%, and a valid start date (or leave the date blank)."],
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ fees?: string }> }) {
  const user = await requireUser("/admin");
  if (!user.is_admin) notFound();
  const { fees: feeFlash } = await searchParams;
  const stats = siteStats();
  const reports = db()
    .prepare(
      `SELECT r.*, l.title, l.status AS listing_status, u.display_name AS reporter, s.display_name AS seller
       FROM reports r JOIN listings l ON l.id = r.listing_id JOIN users u ON u.id = r.reporter_id JOIN users s ON s.id = l.seller_id
       ORDER BY (r.status = 'open') DESC, r.id DESC LIMIT 200`
    )
    .all() as { id: number; listing_id: number; title: string; reason: string; details: string; status: string; created_at: string; reporter: string; seller: string; listing_status: string }[];
  const users = (db().prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
  const fs = feeSettings();
  const totals = feeTotals();
  const balances = feeBalances();
  const recent = recentFees(40);
  const flash = feeFlash ? FEE_FLASH[feeFlash] : undefined;

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

      <section className="section" id="fees">
        <div className="section-head">
          <div><div className="eyebrow">Revenue</div><h2>Seller fees</h2></div>
        </div>
        {flash && (
          <div className={`alert ${flash[0] ? "alert-ok" : "alert-error"}`} style={{ marginBottom: 18 }}>
            {flash[0] ? <CircleCheck /> : <CircleAlert />} {flash[1]}
          </div>
        )}
        <div className="kpis">
          <div className="card kpi"><span>Owed to you</span><b>{formatMoney(totals.owed)}</b></div>
          <div className="card kpi"><span>Collected this month</span><b style={{ color: "var(--go)" }}>{formatMoney(totals.collected_month)}</b></div>
          <div className="card kpi"><span>Collected all time</span><b>{formatMoney(totals.collected)}</b></div>
          <div className="card kpi"><span>Fee rate</span><b>{formatRate(fs.rateBp)}</b></div>
        </div>
        <div className="admin-fees">
          <form action={updateFeeSettings} className="card stack" style={{ padding: 22, gap: 14 }}>
            <div>
              <h3 style={{ margin: "0 0 6px" }}>Fee settings</h3>
              <p className="small muted" style={{ margin: 0 }}>Sellers currently see: <i>{feePolicy(fs)}</i></p>
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="rate">Fee (% of the winning bid)</label>
                <input id="rate" name="rate" type="number" min="0" max="30" step="0.25" defaultValue={fs.rateBp / 100} className="input" required />
                <span className="hint">Set 0 to make selling free.</span>
              </div>
              <div className="field">
                <label htmlFor="start">Fees start on</label>
                <input id="start" name="start" type="date" defaultValue={fs.start} className="input" />
                <span className="hint">Sales that end before this date are free. Leave blank to charge from today.</span>
              </div>
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              Fees already charged keep their rate. Sellers pay into the PayPal account your PayPal keys belong to.
            </p>
            <div><SubmitButton className="btn btn-olive">Save fee settings</SubmitButton></div>
          </form>

          <div className="card table-wrap">
            <h3 style={{ margin: 0, padding: "18px 16px 4px" }}>Who owes what</h3>
            <table className="table">
              <thead><tr><th>Seller</th><th className="num">Owed</th><th>Due</th><th></th></tr></thead>
              <tbody>
                {balances.length === 0 && <tr><td colSpan={4} className="muted">Nobody owes anything right now.</td></tr>}
                {balances.map((b) => {
                  const due = dueDate(b.oldest);
                  const late = due.getTime() < Date.now();
                  return (
                    <tr key={b.seller_id}>
                      <td><Link className="link" href={`/users/${b.seller_id}`}>{b.seller}</Link><div className="small muted">{b.n} {b.n === 1 ? "sale" : "sales"}</div></td>
                      <td className="num"><b>{formatMoney(b.owed)}</b></td>
                      <td className="small">
                        {late ? <span className="chip chip-signal">Overdue</span> : <LocalTime value={due.toISOString()} withTime={false} />}
                      </td>
                      <td><Link className="btn btn-sm btn-ghost" href={`/messages/${b.seller_id}`} aria-label={`Message ${b.seller}`}><MessagesSquare /></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card table-wrap" style={{ marginTop: 18 }}>
          <h3 style={{ margin: 0, padding: "18px 16px 4px" }}>Recent fees</h3>
          <table className="table">
            <thead><tr><th>Item</th><th>Seller</th><th className="num">Sold for</th><th className="num">Fee</th><th>Charged</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {recent.length === 0 && <tr><td colSpan={7} className="muted">No fees charged yet. They appear here as buyers pay for items.</td></tr>}
              {recent.map((f) => (
                <tr key={f.id}>
                  <td><Link className="link mono small" href={`/listings/${f.listing_id}`}>{lotNumber(f.listing_id)}</Link><div className="small">{f.title}</div></td>
                  <td>{f.seller}</td>
                  <td className="num">{formatMoney(f.sale_cents)}</td>
                  <td className="num"><b>{formatMoney(f.amount_cents)}</b><div className="small muted">{formatRate(f.rate_bp)}</div></td>
                  <td className="small"><LocalTime value={f.created_at} withTime={false} /></td>
                  <td><span className={`chip ${f.status === "owed" ? "chip-warn" : f.status === "paid" ? "chip-go" : ""}`}>{FEE_STATUS[f.status]}</span></td>
                  <td>
                    {f.status === "owed" && (
                      <form action={waiveSellerFee}>
                        <input type="hidden" name="feeId" value={f.id} />
                        <button className="btn btn-sm">Waive</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
