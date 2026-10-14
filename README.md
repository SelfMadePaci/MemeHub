# MemeHub

MemeHub is a read-only Solana token research dashboard. Enter a mint address on the landing page to open a separate research page with DEX Screener market data, a Bubblemaps holder map, and shortcuts to Solscan, J7Tracker, and an X search.

## Run locally

The local Ruby/WEBrick server serves the static app. No API token is required to run the current version.

```sh
ruby server.rb
```

Open <http://localhost:8765>. Use `localhost` rather than `127.0.0.1` so Bubblemaps permits its local-test iframe; the app automatically redirects the latter to `localhost`. Searching on the landing page navigates to a separate results page. You can also open a results page directly using `http://localhost:8765/results.html?ca=YOUR_MINT_ADDRESS`.

## Data and limitations

- Market data comes from the public DEX Screener token endpoint. The app chooses the pair with the highest reported USD liquidity.
- The PnL panel has selectable 1-hour, 24-hour, 7-day, and rolling 30-day ranges. It is currently a UI only: no PnL provider is connected and no trader rankings or figures are displayed.
- The planned PnL scope is pump.fun/PumpSwap activity only. FOMO is intentionally not offered until a suitable data source is available. Venue-specific PnL requires a source that can reliably identify relevant trades and calculate positions; do not treat cross-venue results as pump.fun-only.
- Bubblemaps is embedded with its `demo` partner ID for local testing. Confirm Bubblemaps integration requirements before deploying publicly.
- J7Tracker opens its website; no undocumented J7Tracker API is assumed.
- X opens a search for the mint, ticker, and token name. This is not an API-powered feed and X may change search behavior or access.

No wallet connection is required. The dashboard is for research only, not a safety verdict or financial advice.
