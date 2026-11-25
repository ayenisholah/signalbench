import { CONTAINER } from "@/components/ui/section";
import { cn } from "@/lib/utils";
import { AUTHOR, REPO_URL } from "@/lib/site";

export function Footer({ commit }: { commit?: string }) {
  return (
    <footer className="mt-auto border-t border-ink/10">
      <div
        className={cn(
          CONTAINER,
          "flex flex-col gap-4 py-10 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50 md:flex-row md:items-center md:justify-between",
        )}
      >
        <p>
          Built by{" "}
          <a href={AUTHOR.url} className="text-ink/80 hover:text-gold">
            {AUTHOR.name}
          </a>{" "}
          · Data:{" "}
          <a href="https://www.bitstamp.net/api/" className="text-ink/80 hover:text-gold">
            Bitstamp public API
          </a>{" "}
          · Not investment advice
        </p>
        <p className="flex gap-4">
          <a href={REPO_URL} className="text-ink/80 hover:text-gold">
            Source on GitHub →
          </a>
          {commit ? <span title="Deployed commit">{commit.slice(0, 7)}</span> : null}
        </p>
      </div>
    </footer>
  );
}
