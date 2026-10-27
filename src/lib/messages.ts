import { db } from "./db";

export type Conversation = {
  other_id: number;
  other_name: string;
  body: string;
  created_at: string;
  is_system: number;
  from_me: number;
  unread: number;
};

export function conversations(userId: number): Conversation[] {
  return db()
    .prepare(
      `WITH mine AS (
         SELECT id, CASE WHEN sender_id = @u THEN recipient_id ELSE sender_id END AS other_id
         FROM messages WHERE sender_id = @u OR recipient_id = @u
       ), last AS (SELECT other_id, MAX(id) AS last_id FROM mine GROUP BY other_id)
       SELECT last.other_id, u.display_name AS other_name, m.body, m.created_at, m.is_system,
         (m.sender_id = @u) AS from_me,
         (SELECT COUNT(*) FROM messages x WHERE x.sender_id = last.other_id AND x.recipient_id = @u AND x.read_at IS NULL) AS unread
       FROM last JOIN messages m ON m.id = last.last_id JOIN users u ON u.id = last.other_id
       ORDER BY last.last_id DESC`
    )
    .all({ u: userId }) as Conversation[];
}

export type Message = {
  id: number;
  sender_id: number;
  body: string;
  is_system: number;
  created_at: string;
  listing_id: number | null;
  listing_title: string | null;
};

export function thread(userId: number, otherId: number): Message[] {
  const d = db();
  d.prepare("UPDATE messages SET read_at = datetime('now') WHERE recipient_id = ? AND sender_id = ? AND read_at IS NULL").run(userId, otherId);
  return d
    .prepare(
      `SELECT m.id, m.sender_id, m.body, m.is_system, m.created_at, m.listing_id, l.title AS listing_title
       FROM messages m LEFT JOIN listings l ON l.id = m.listing_id
       WHERE (m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?)
       ORDER BY m.id`
    )
    .all(userId, otherId, otherId, userId) as Message[];
}
