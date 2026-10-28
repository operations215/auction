import type { Metadata } from "next";
import { MessagesSquare } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { conversations } from "@/lib/messages";
import { InboxList } from "@/components/Inbox";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUser("/messages");
  const convos = conversations(user.id);
  return (
    <div className="wrap">
      <div className="page-head"><div><div className="eyebrow">Field radio</div><h1>Messages</h1></div></div>
      <div className="card inbox">
        <div className="inbox-list"><InboxList convos={convos} /></div>
        <div className="thread" style={{ display: "grid", placeItems: "center", color: "var(--ink-3)", padding: 40, textAlign: "center" }}>
          <div>
            <MessagesSquare size={42} style={{ margin: "0 auto 10px", color: "var(--khaki)" }} />
            <p>Choose a conversation. Keep all deals on MusterBid: never pay outside the PayPal button on your order.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
