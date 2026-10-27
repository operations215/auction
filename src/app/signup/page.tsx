import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await currentUser()) redirect("/");
  return (
    <AuthShell title="Create your account" subtitle="Free to join. Bid on your first lot in under a minute.">
      <SignupForm next={next} />
    </AuthShell>
  );
}
