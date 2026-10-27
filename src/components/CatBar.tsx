"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function CatBar({ categories }: { categories: { slug: string; name: string }[] }) {
  const path = usePathname();
  const params = useSearchParams();
  const active = path === "/search" ? params.get("category") ?? "" : null;
  return (
    <div className="catbar">
      <div className="wrap">
        <Link href="/search" className={active === "" ? "active" : ""}>All auctions</Link>
        {categories.map((c) => (
          <Link key={c.slug} href={`/search?category=${c.slug}`} className={active === c.slug ? "active" : ""}>
            {c.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
