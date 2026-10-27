import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import type { Conversation } from "@/lib/messages";
import { LocalTime } from "./LocalTime";

export function InboxList({ convos, activeId }: { convos: Conversation[]; activeId?: number }) {
  if (!convos.length)
    return (
      <div style={{ padding: 28, textAlign: "center" }} className="muted">
        <MessagesSquare style={{ margin: "0 auto 8px" }} />
        <p>No conversations yet. Ask a seller a question from any listing.</p>
      </div>
    );
  return (
    <>
      {convos.map((c) => (
        <Link key={c.other_id} href={`/messages/${c.other_id}`} className={`${c.other_id === activeId ? "active" : ""}${c.unread ? " unread" : ""}`}>
          <span className="avatar avatar-sm">{c.other_name[0]?.toUpperCase()}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="who">
              {c.other_name}
              <span><LocalTime value={c.created_at} withTime={false} short /></span>
            </div>
            <div className="prev">
              {c.unread > 0 && <span className="chip chip-signal" style={{ height: 18, marginRight: 6 }}>{c.unread} new</span>}
              {c.from_me && !c.is_system ? "You: " : ""}{c.body}
            </div>
          </div>
        </Link>
      ))}
    </>
  );
}
