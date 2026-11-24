import { loadIndex } from "@/lib/runs";

export const dynamic = "force-dynamic";

/** Liveness and version for the ALB target group, ECS and the deploy smoke test. */
export async function GET() {
  try {
    const index = await loadIndex();
    return Response.json(
      { ok: true, commit: process.env.COMMIT_SHA ?? "dev", dataAsOf: new Date(index.dataAsOf * 1000).toISOString(), runs: index.runs.length },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    console.error("health check failed", e);
    return Response.json({ ok: false }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
