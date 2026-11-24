"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/runs/sma-6-42", label: "Runs", match: "/runs" },
  { href: "/methodology", label: "Methodology" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex items-center">
      {LINKS.map((l) => {
        const active = l.match ? path.startsWith(l.match) : path === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "px-2 py-2 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors sm:px-3 sm:text-[11px] sm:tracking-[0.24em]",
              active ? "text-gold" : "text-ink/65 hover:text-ink",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
