import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await currentUser()) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
  return (
    <AuthShell title="Welcome back" subtitle="Log in to bid, sell and check your messages.">
      <LoginForm next={next} />
    </AuthShell>
  );
}
