import Link from "next/link";
import { CONTAINER } from "@/components/ui/section";
import { LiveDot } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { day } from "@/lib/format";
import { NavLinks } from "./nav-links";

export function Wordmark() {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="SignalBench home">
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center bg-gold font-mono text-[12px] font-bold text-paper transition-transform group-hover:-translate-y-0.5"
      >
        SB
      </span>
      <span className="tc-display hidden text-[18px] leading-none tracking-[-0.02em] sm:inline">
        SIGNAL<span className="text-gold">BENCH</span>
      </span>
    </Link>
  );
}

export function Header({ dataAsOf }: { dataAsOf?: number }) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/80 backdrop-blur">
      <div className={cn(CONTAINER, "flex h-[71px] items-center justify-between gap-6")}>
        <Wordmark />
        <NavLinks />
        <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60 lg:flex">
          {dataAsOf ? (
            <>
              <LiveDot />
              Data to {day(dataAsOf)}
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
