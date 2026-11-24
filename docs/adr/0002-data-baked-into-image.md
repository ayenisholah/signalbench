# ADR 0002: Bake market data and backtest results into the image

- Status: accepted
- Date: 2026-11-24

## Context

The dashboard shows backtests over public 15-minute bars. The data changes once per bar, the results are deterministic, and the site gets little
traffic.

## Decision

`docker build` fetches the candles, runs every backtest and pre-renders every page. The running container only serves static output, plus
`/api/health`. A nightly workflow redeploys so the data stays fresh.

## Consequences

- Every image is a reproducible snapshot: the commit SHA and the data cut-off identify exactly what's served.
- There's no database, no scheduler in the container, no outbound network at runtime and no secrets in the task.
- Data is at most about a day old. That's fine for a 4-hour strategy dashboard, and a manual `refresh-data` run updates it on demand.
- A Bitstamp outage fails a build, not the live site. The previous image keeps serving.
