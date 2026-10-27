import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Send, ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db, systemUserId } from "@/lib/db";
import { conversations, thread } from "@/lib/messages";
import { lotNumber } from "@/lib/auctions";
import { sendMessage } from "@/app/actions";
import { InboxList } from "@/components/Inbox";
import { LocalTime } from "@/components/LocalTime";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Conversation" };

type Params = { params: Promise<{ userId: string }>; searchParams: Promise<{ listing?: string }> };

export default async function ThreadPage({ params, searchParams }: Params) {
  const otherId = Number((await params).userId);
  const { listing } = await searchParams;
  const user = await requireUser(`/messages/${otherId}`);
  if (otherId === user.id) redirect("/messages");
  const other = db().prepare("SELECT id, display_name FROM users WHERE id = ?").get(otherId) as { id: number; display_name: string } | undefined;
  if (!other) notFound();
  const msgs = thread(user.id, otherId);
  const convos = conversations(user.id);
  const about = listing ? (db().prepare("SELECT id, title FROM listings WHERE id = ?").get(Number(listing)) as { id: number; title: string } | undefined) : undefined;

  return (
    <div className="wrap">
      <div className="page-head"><div><div className="eyebrow">Field radio</div><h1>Messages</h1></div></div>
      <div className="card inbox has-thread">
        <div className="inbox-list"><InboxList convos={convos} activeId={otherId} /></div>
        <div className="thread">
          <div className="thread-head">
            <Link href="/messages" className="btn btn-ghost btn-sm back" aria-label="Back to inbox"><ChevronLeft /></Link>
            <span className="avatar avatar-sm">{other.display_name[0]?.toUpperCase()}</span>
            <div>
              {other.id === systemUserId() ? (
                <b>{other.display_name}</b>
              ) : (
                <Link href={`/users/${other.id}`} style={{ fontWeight: 700 }}>{other.display_name}</Link>
              )}
              {about && <div className="small muted">About <Link className="link" href={`/listings/${about.id}`}>{lotNumber(about.id)} · {about.title}</Link></div>}
            </div>
          </div>
          <div className="thread-body">
            <div className="bubble system"><ShieldAlert size={14} style={{ verticalAlign: -2 }} /> Stay safe: pay only through the PayPal button on your order page. Quartermaster staff will never ask for your password.</div>
            {msgs.length === 0 && <p className="muted small" style={{ textAlign: "center" }}>Say hello to {other.display_name}.</p>}
            {msgs.map((m) => (
              <div key={m.id} className={`bubble ${m.sender_id === user.id ? "me" : "them"}`}>
                {m.listing_id && m.listing_title && <Link className="ref" href={`/listings/${m.listing_id}`}>{lotNumber(m.listing_id)} · {m.listing_title}</Link>}
                {m.body}
                <span className="meta"><LocalTime value={m.created_at} /></span>
              </div>
            ))}
          </div>
          {otherId === systemUserId() ? (
            <div className="thread-form small muted">Automated notices about your bids, sales and orders. Replies aren&apos;t monitored.</div>
          ) : (
          <form action={sendMessage} className="thread-form">
            <input type="hidden" name="recipientId" value={other.id} />
            {about && <input type="hidden" name="listingId" value={about.id} />}
            <label htmlFor="body" className="sr-only">Message</label>
            <textarea id="body" name="body" className="textarea" required maxLength={3000} placeholder={`Message ${other.display_name}…`} />
            <SubmitButton className="btn btn-brass" pendingText="Sending…"><Send /> Send</SubmitButton>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
