const DEX_TOKEN_URL = "https://api.dexscreener.com/latest/dex/tokens/";
const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const form = document.querySelector("#scan-form");
const input = document.querySelector("#ca-input");
const scanButton = document.querySelector("#scan-button");
const statusMessage = document.querySelector("#status-message");
const results = document.querySelector("#results");

function setStatus(message, isError = false) {
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function compactNumber(value, currency = false) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "N/A";
  if (currency && Math.abs(number) < 0.0001 && number !== 0) {
    return `$${number.toExponential(2)}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: currency ? "currency" : "decimal",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(number);
}

function priceNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "N/A";
  if (number !== 0 && Math.abs(number) < 0.0001) return `$${number.toExponential(3)}`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumSignificantDigits: 6,
  }).format(number);
}

function shortAddress(address) {
  return `${address.slice(0, 5)}…${address.slice(-5)}`;
}

function setText(selector, text) {
  document.querySelector(selector).textContent = text;
}

async function fetchDexData(address) {
  const response = await fetch(`${DEX_TOKEN_URL}${encodeURIComponent(address)}`);
  if (!response.ok) throw new Error(`DEX Screener returned HTTP ${response.status}.`);
  const data = await response.json();
  const pairs = Array.isArray(data.pairs) ? data.pairs : [];
  if (!pairs.length) throw new Error("No DEX Screener pairs were found for this address.");
  pairs.sort((a, b) => Number(b.liquidity?.usd ?? 0) - Number(a.liquidity?.usd ?? 0));
  return pairs[0];
}

function renderToken(address, pair) {
  const token = pair.baseToken?.address === address ? pair.baseToken : pair.quoteToken;
  const name = token?.name || "Solana token";
  const symbol = token?.symbol || "TOKEN";
  const marketCap = pair.marketCap ?? pair.fdv;

  setText("#token-name", name);
  setText("#token-symbol", symbol);
  setText("#token-ca", shortAddress(address));
  setText("#token-avatar", symbol.slice(0, 1).toUpperCase());
  setText("#metric-price", priceNumber(pair.priceUsd));
  setText("#metric-market-cap", marketCap == null ? "N/A" : compactNumber(marketCap, true));
  setText("#metric-liquidity", compactNumber(pair.liquidity?.usd, true));
  setText("#metric-volume", compactNumber(pair.volume?.h24, true));

  const changeElement = document.querySelector("#metric-change");
  const change = Number(pair.priceChange?.h24);
  changeElement.textContent = Number.isFinite(change)
    ? `${change > 0 ? "+" : ""}${change.toFixed(2)}% in 24h`
    : "24h price change unavailable";
  changeElement.classList.toggle("positive", Number.isFinite(change) && change > 0);
  changeElement.classList.toggle("negative", Number.isFinite(change) && change < 0);

  const solscanLink = document.querySelector("#solscan-link");
  solscanLink.href = `https://solscan.io/token/${encodeURIComponent(address)}`;
  const dexLink = document.querySelector("#dex-link");
  dexLink.href = pair.url || `https://dexscreener.com/solana/${encodeURIComponent(address)}`;
  const pairLink = document.querySelector("#pair-link");
  pairLink.href = pair.url || `https://dexscreener.com/solana/${encodeURIComponent(address)}`;

  const query = [...new Set([address, symbol, name].filter(Boolean))].join(" ");
  const xLink = document.querySelector("#x-link");
  xLink.href = `https://x.com/search?q=${encodeURIComponent(query)}`;

  const bubblemap = document.querySelector("#bubblemap-frame");
  bubblemap.src = `https://iframe.bubblemaps.io/map?address=${encodeURIComponent(address)}&chain=solana&partnerId=demo`;
  bubblemap.classList.remove("is-hidden");
  document.querySelector("#map-placeholder").classList.add("is-hidden");

  setText("#updated-at", `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  results.classList.remove("is-hidden");
}

async function scanToken(address) {
  if (!BASE58_ADDRESS.test(address)) {
    setStatus("Enter a valid-looking Solana mint address (base58, 32–44 characters).", true);
    input.focus();
    return;
  }

  scanButton.disabled = true;
  scanButton.querySelector("span:first-child").textContent = "Scanning…";
  results.classList.add("is-hidden");
  setStatus("Loading market data…");

  try {
    const pair = await fetchDexData(address);
    renderToken(address, pair);
    setStatus("");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "The scan failed. Please try again.", true);
  } finally {
    scanButton.disabled = false;
    scanButton.querySelector("span:first-child").textContent = "Scan token";
  }
}

const pnlPeriodLabel = document.querySelector("#pnl-period-label");
document.querySelectorAll("[data-pnl-period]").forEach((button) => {
  button.addEventListener("click", () => {
    const period = button.dataset.pnlPeriod;
    if (!period) return;

    document.querySelectorAll("[data-pnl-period]").forEach((periodButton) => {
      const isSelected = periodButton === button;
      periodButton.setAttribute("aria-pressed", String(isSelected));
    });
    pnlPeriodLabel.textContent = button.textContent.trim();
  });
});

form.addEventListener("submit", (event) => {
  const address = input.value.trim();
  if (!address) {
    event.preventDefault();
    setStatus("Paste a Solana mint address to start your research.", true);
    input.focus();
    return;
  }
  if (!BASE58_ADDRESS.test(address)) {
    event.preventDefault();
    setStatus("Enter a valid-looking Solana mint address (base58, 32–44 characters).", true);
    input.focus();
    return;
  }

  input.value = address;
  if (document.body.classList.contains("home-page")) {
    const formBounds = form.getBoundingClientRect();
    window.sessionStorage.setItem("memehub-search-origin", JSON.stringify({
      x: formBounds.x,
      y: formBounds.y,
      width: formBounds.width,
      height: formBounds.height,
      timestamp: Date.now(),
      viewportWidth: window.innerWidth,
    }));
    return;
  }

  event.preventDefault();
  scanToken(address);
});

function animateSearchFromLanding() {
  const root = document.documentElement;
  if (!root.classList.contains("search-transition-ready")) return;

  const origin = JSON.parse(root.dataset.searchOrigin);
  const target = form.getBoundingClientRect();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || typeof form.animate !== "function") {
    root.classList.remove("search-transition-ready", "search-transition-pending");
    delete root.dataset.searchOrigin;
    return;
  }

  const animation = form.animate([
    {
      transformOrigin: "top left",
      transform: `translate(${origin.x - target.x}px, ${origin.y - target.y}px) scale(${origin.width / target.width}, ${origin.height / target.height})`,
    },
    { transformOrigin: "top left", transform: "translate(0, 0) scale(1, 1)" },
  ], {
    duration: 700,
    easing: "cubic-bezier(.22, 1, .36, 1)",
  });

  root.classList.remove("search-transition-ready");
  const finishTransition = () => {
    root.classList.remove("search-transition-pending");
    delete root.dataset.searchOrigin;
  };
  animation.addEventListener("finish", finishTransition, { once: true });
  animation.addEventListener("cancel", finishTransition, { once: true });
}

const copyButton = document.querySelector("#copy-ca");
copyButton?.addEventListener("click", async () => {
  const address = input.value.trim();
  if (!address) return;
  try {
    await navigator.clipboard.writeText(address);
    setStatus("Contract address copied.");
  } catch {
    setStatus("Could not copy the address. Select and copy it manually.", true);
  }
});

const params = new URLSearchParams(window.location.search);
const initialAddress = params.get("ca");
animateSearchFromLanding();
if (initialAddress && document.body.classList.contains("results-page")) {
  input.value = initialAddress;
  scanToken(initialAddress);
} else if (document.body.classList.contains("results-page")) {
  setStatus("Paste a Solana mint address to start your research.");
}
