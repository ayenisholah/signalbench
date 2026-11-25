# SignalBench

**Backtest trading signals with honest fills.** Every signal trades as a 2 bps limit order on a fixed 4-hour UTC schedule. If price doesn't trade
_through_ the limit inside the window, the order is cancelled and never chased. The dashboard reports what that does to return, Sharpe, drawdown,
win rate and fill rate for a 70% gold / 30% BTC portfolio.

**Live:** https://signalbench.sholaayeni.xyz

![SignalBench dashboard](docs/screenshot.png)

## What it does

Most backtests assume you trade at the close. Real limit orders don't always fill, and they tend to fill when price is moving against you.
SignalBench models that explicitly, so a strategy's numbers include the cost of actually getting filled.

The site has three kinds of page:

- **Dashboard** (`/`): every strategy side by side over 30 days, 90 days, 1 year or the full history. It shows equity and drawdown curves, the
  headline metrics against a buy-and-hold benchmark, and the most recent trades.
- **Run pages** (`/runs/<id>`): one strategy in depth, with metrics per window, monthly returns, round-trip trades and every limit order. Cancelled
  orders are listed too.
- **Methodology** (`/methodology`): the fill model, how each metric is computed, the data used, and where the numbers can mislead.

One example from the data: PAXG/USD (the gold leg) is thin on Bitstamp. More than half of its 15-minute bars have zero volume (59% when this was
written), so the gold sleeve fills far less often than BTC. A close-price backtest would hide that completely.

## Where the data comes from

All market data comes from the **[Bitstamp public REST API](https://www.bitstamp.net/api/)** (v2). It needs no API key or account.

| Market        | Bitstamp pair | Role in the portfolio                                                         | Weight |
| ------------- | ------------- | ----------------------------------------------------------------------------- | -----: |
| Gold (PAXG)   | `paxgusd`     | Pax Gold, a token backed by one troy ounce of LBMA gold. Used as a gold proxy |    70% |
| Bitcoin (BTC) | `btcusd`      | Bitcoin against the US dollar                                                 |    30% |

- **Endpoint:** `GET https://www.bitstamp.net/api/v2/ohlc/{pair}/?step=900&limit=1000&start=<unix>`, which returns 15-minute OHLCV bars, up to
  1,000 per request.
- **History:** the last 365 days by default (`SB_HISTORY_DAYS`). Only fully closed bars are kept.
- **Client** (`packages/data`): pages through the range, retries 429 and 5xx responses with exponential backoff, applies a per-request timeout and
  validates every response with zod before using it.
- **Cache:** bars are written to `data/candles/` as JSON. A later `npm run fetch` only requests bars newer than the cache.
- **Freshness:** production fetches data while the Docker image builds. A nightly workflow (02:15 UTC) rebuilds and redeploys, so the live site is
  at most about a day behind. The running container makes no outbound requests. See [ADR 0002](docs/adr/0002-data-baked-into-image.md).
- **Caveats:** PAXG is tokenised gold, not spot XAUUSD, and it trades thinly on Bitstamp. Weekends are included because both markets trade every
  day.

Signals for the built-in strategies are computed from these same bars. External signals are your own files (see
[Bring your own signals](#bring-your-own-signals)).

## How the fill model works

For each asset at each anchor (00:00, 04:00 … 20:00 UTC):

1. The **target** is the latest signal with `t <= anchor`, so there's no look-ahead.
2. The **reference** is the close of the last fully closed 15m bar.
3. A **limit** order is placed for the difference between target and position, 2 bps better than the reference.
4. It **fills** on the first bar in `[anchor, anchor + 4h)` whose low is strictly below the limit (high strictly above, for sells). The fill is at the
   limit, all-or-nothing, with a 5 bps fee. Otherwise the order is **cancelled**. It is never chased or re-priced.

**Metrics.** Sharpe and Sortino use daily returns at 00:00 UTC, annualised with √365 because both markets trade every day. Max drawdown and time
underwater come from 4h equity points. Win rate is over round trips, net of fees. Turnover, fill rate and exposure are reported too. The engine has a
hand-worked golden test (`packages/engine/test/portfolio.test.ts`).

**Baselines** ship with it:

- **Buy and hold**: the benchmark every run is compared against.
- **SMA 6/42**: a trend filter on 4h closes.
- **Coin flip** (seeded): it loses money even with zero fees. That's the adverse-selection cost of resting limit orders, made visible.

## Architecture

```
packages/engine   pure TypeScript, no I/O: UTC schedule, limit-order fill model, sleeve accounting, metrics, strategies
packages/data     Bitstamp public OHLC client (paging, retries with backoff, zod validation) + JSON file cache
scripts/          fetch-candles.ts → run-backtests.ts → apps/web/data/{index.json, runs/*.json}
apps/web          Next.js 15 dashboard, fully prerendered, standalone server in a container
infra/            CloudFormation: ECR, VPC, ACM certificate, ECS Fargate + ALB
docs/             deployment guide and architecture decision records
.github/          CI, deploy-to-ECS and nightly data-refresh workflows
```

The data flow runs one way. `npm run fetch` fills the candle cache. `npm run backtest` runs every strategy and writes the run JSON. `next build`
prerenders every page and share image from that JSON. At runtime the server only serves static output, plus `/api/health`.

### Routes

| Route                                            | What it serves                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| `/`                                              | Dashboard                                                                        |
| `/methodology`                                   | Fill model, metric definitions, data notes                                       |
| `/runs/<id>`                                     | One strategy run (one page per strategy, generated at build time)                |
| `/api/health`                                    | `{ ok, commit, dataAsOf, runs }`, used by the ALB, ECS and the deploy smoke test |
| `/sitemap.xml`, `/robots.txt`                    | Generated from the run index                                                     |
| `/manifest.webmanifest`                          | Web app manifest                                                                 |
| `/opengraph-image`, `/runs/<id>/opengraph-image` | 1200×630 share cards. Run cards show that run's live metrics                     |

## Run it locally

```sh
nvm use               # Node 22
npm ci
npm run fetch         # 365 days of 15m bars into data/candles
npm run backtest      # writes apps/web/data/
npm run dev           # http://localhost:3000
npm run verify        # lint, format, typecheck, tests, production build
```

Or as a container:

```sh
docker build --build-arg COMMIT_SHA=$(git rev-parse HEAD) -t signalbench/web .
docker run --rm -p 3000:3000 signalbench/web
```

### Configuration

| Variable             | Used by                    | Default                              | Purpose                                                                                     |
| -------------------- | -------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------- |
| `SB_HISTORY_DAYS`    | `fetch`, Docker build      | `365`                                | Days of 15m history to keep                                                                 |
| `SB_SIGNALS_FILE`    | `backtest`                 | unset                                | Path to an external signal file                                                             |
| `SB_SIGNALS_MAPPING` | `backtest`                 | unset                                | Field mapping for that file                                                                 |
| `SB_SIGNALS_NAME`    | `backtest`                 | `External signals`                   | Display name for the external run                                                           |
| `SITE_URL`           | `next build`, Docker build | `https://signalbench.sholaayeni.xyz` | Absolute URL for canonical links, the sitemap and share images. Set it for forks or staging |
| `COMMIT_SHA`         | Docker build, runtime      | `dev`                                | Shown in the footer and returned by `/api/health`                                           |
| `DATA_BUILD_ID`      | Docker build               | `local`                              | Busts the layer cache so each deploy fetches fresh data                                     |

## Bring your own signals

Any JSON signal file can run through the same engine with a field mapping. Keep private files under `signals/private/`, which git ignores.

```jsonc
// signals/private/mapping.json
{
  "recordsPath": "data.signals", // omit if the file is a bare array
  "timeField": "time",
  "timeUnit": "iso", // "s" | "ms" | "iso"
  "assetField": "symbol",
  "assetMap": { "XAUUSD": "PAXGUSD", "BTCUSD": "BTCUSD" },
  "sideField": "action", // BUY / SELL / FLAT (case-insensitive), or use "targetField" for a number in [-1, 1]
}
```

```sh
SB_SIGNALS_FILE=signals/private/model.json \
SB_SIGNALS_MAPPING=signals/private/mapping.json \
SB_SIGNALS_NAME="My model" npm run backtest
```

The run appears on the dashboard next to the baselines.

## Deployment

The app runs on ECS Fargate (arm64) in eu-north-1, behind an ALB with TLS. GitHub Actions run CI on pull requests. Every push to `main` deploys,
with a smoke test that checks the live `/api/health` reports the new commit. A nightly run redeploys with fresh data. See
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and the [ADRs](docs/adr).

**Production hardening.** The container runs as a non-root user with a health check. Rollouts use the ECS deployment circuit breaker with automatic
rollback. Responses carry HSTS, a strict Content-Security-Policy (same-origin only), `X-Frame-Options: DENY`, `nosniff`, a referrer policy, a
permissions policy and COOP. Every GitHub Action is pinned to a commit SHA.

## SEO and sharing

Each page sets its own title, description and canonical URL, plus complete Open Graph and Twitter card tags. Share images are generated at build
time in the site's own fonts and colours, and each run's card shows its return, Sharpe, max drawdown and fill rate. The root layout includes
schema.org `WebApplication` JSON-LD. The sitemap lists every run, and `robots.txt` keeps crawlers off `/api/`.

## Design

The UI uses the dark, square, single-accent design system from my agentfloor project: Space Grotesk and Space Mono, `#cbfe42` on `#0f0f0f`,
corner-bracket cards, a mono micro-type scale and reduced-motion support. Charts have a keyboard readout and hidden data tables for screen readers.

## Limitations and disclaimer

- Fills are simulated from 15m OHLC bars, not order-book data. Queue position and partial fills aren't modelled. A touch of the limit price doesn't
  count as a fill; price has to trade through it.
- There's one venue (Bitstamp) and one portfolio (70/30 PAXG/BTC).

This is an engineering project about measuring signals honestly. It is **not investment advice**, and past simulated performance says nothing about
future returns.

## License

[MIT](LICENSE) © Shola Ayeni
