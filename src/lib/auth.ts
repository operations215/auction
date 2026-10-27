import "server-only";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, toDbDate } from "./db";

const COOKIE = "qm_session";
const SESSION_DAYS = 30;

export type User = {
  id: number;
  email: string;
  display_name: string;
  location: string;
  bio: string;
  paypal_email: string;
  is_admin: number;
  created_at: string;
};

export function hashPassword(pw: string) {
  return bcrypt.hashSync(pw, 10);
}

export function verifyPassword(pw: string, hash: string) {
  return bcrypt.compareSync(pw, hash);
}

export async function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  db()
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .run(token, userId, toDbDate(expires));
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) db().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = db()
    .prepare(
      `SELECT u.id, u.email, u.display_name, u.location, u.bio, u.paypal_email, u.is_admin, u.created_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`
    )
    .get(token) as User | undefined;
  return row ?? null;
}

export async function requireUser(next?: string): Promise<User> {
  const u = await currentUser();
  if (!u) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return u;
}
