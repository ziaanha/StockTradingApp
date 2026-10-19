const INITIAL_CASH = 100000;
const STORAGE_KEY = "zea-trade-paper-v1";

const stocks = [
  { symbol: "RELIANCE", name: "Reliance Industries", price: 1450, change: 1.24, market: "NSE", logo: "R" },
  { symbol: "TCS", name: "Tata Consultancy", price: 3820, change: 0.83, market: "NSE", logo: "T" },
  { symbol: "HDFCBANK", name: "HDFC Bank", price: 1680, change: -0.42, market: "NSE", logo: "H" },
  { symbol: "INFY", name: "Infosys", price: 1525, change: 1.71, market: "NSE", logo: "I" },
  { symbol: "ICICIBANK", name: "ICICI Bank", price: 1240, change: 0.55, market: "NSE", logo: "I" },
  { symbol: "ITC", name: "ITC Limited", price: 435, change: -0.31, market: "NSE", logo: "I" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", price: 1880, change: 1.08, market: "NSE", logo: "B" },
  { symbol: "WIPRO", name: "Wipro", price: 290, change: -0.76, market: "NSE", logo: "W" },
  { symbol: "TATAMOTORS", name: "Tata Motors", price: 720, change: 2.12, market: "NSE", logo: "T" },
  { symbol: "LT", name: "Larsen & Toubro", price: 3650, change: 0.64, market: "NSE", logo: "L" }
];

let selectedSymbol = "RELIANCE";
let selectedPeriod = "1D";
let toastTimer;

let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (
      saved &&
      Number.isFinite(saved.cash) &&
      saved.holdings &&
      Array.isArray(saved.orders)
    ) {
      return {
        cash: saved.cash,
        holdings: saved.holdings,
        orders: saved.orders,
        realised: Number(saved.realised) || 0
      };
    }
  } catch (error) {
    console.warn("Could not load saved account.", error);
  }

  return {
    cash: INITIAL_CASH,
    holdings: {},
    orders: [],
    realised: 0
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Could not save account.", error);
    showToast("Could not save changes in this browser.", "error");
  }
}

function money(value) {
  return "₹" + Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function signedMoney(value) {
  return (value >= 0 ? "+" : "−") + money(Math.abs(value));
}

function getStock(symbol) {
  return stocks.find(stock => stock.symbol === symbol);
}

function getHoldingValue() {
  return Object.entries(state.holdings).reduce(
    (total, [symbol, holding]) =>
      total + holding.quantity * getStock(symbol).price,
    0
  );
}

function getUnrealised() {
  return Object.entries(state.holdings).reduce(
    (total, [symbol, holding]) =>
      total + (getStock(symbol).price - holding.average) * holding.quantity,
    0
  );
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.style.color =
    type === "error" ? "var(--red)" : "var(--green)";
  toast.style.borderColor =
    type === "error" ? "#73323c" : "#315c47";

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

/* DASHBOARD METRICS */

function renderMetrics() {
  const portfolioValue = state.cash + getHoldingValue();
  const totalPnl = state.realised + getUnrealised();

  document.getElementById("portfolio-value").textContent =
    money(portfolioValue);

  document.getElementById("cash-value").textContent =
    money(state.cash);

  const pnlElement = document.getElementById("total-pnl");

  pnlElement.textContent = signedMoney(totalPnl);
  pnlElement.className = totalPnl >= 0 ? "positive" : "negative";

  document.getElementById("positions-count").textContent =
    Object.values(state.holdings).filter(
      holding => holding.quantity > 0
    ).length;
}

/* STOCK SELECTOR */

function renderStockSelect() {
  const select = document.getElementById("stock-select");

  select.innerHTML = stocks.map(stock => `
    <option value="${stock.symbol}">
      ${stock.symbol} — ${stock.name}
    </option>
  `).join("");

  select.value = selectedSymbol;
}

/* MARKET WATCH */

function renderStockTable() {
  const query = document
    .getElementById("stock-search")
    .value.toLowerCase()
    .trim();

  const visibleStocks = stocks.filter(stock =>
    stock.name.toLowerCase().includes(query) ||
    stock.symbol.toLowerCase().includes(query)
  );

  const body = document.getElementById("stocks-body");

  body.innerHTML = visibleStocks.map(stock => `
    <tr>
      <td>
        <div class="stock-cell">
          <div class="stock-logo">${stock.logo}</div>
          <div>
            <div class="stock-name">${stock.name}</div>
            <div class="stock-symbol">${stock.symbol}</div>
          </div>
        </div>
      </td>

      <td class="mono">${money(stock.price)}</td>

      <td class="mono ${stock.change >= 0 ? "positive" : "negative"}">
        ${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}%
      </td>

      <td>${stock.market}</td>

      <td>
        <button type="button" class="mini-button"
          data-select-stock="${stock.symbol}">
          Trade ↗
        </button>
      </td>
    </tr>
  `).join("");

  if (visibleStocks.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          No matching stocks found.
        </td>
      </tr>
    `;
  }
}

/* HOLDINGS */

function renderHoldings() {
  const entries = Object.entries(state.holdings).filter(
    ([, holding]) => holding.quantity > 0
  );

  const body = document.getElementById("holdings-body");

  document.getElementById("empty-holdings").hidden =
    entries.length > 0;

  body.innerHTML = entries.map(([symbol, holding]) => {
    const stock = getStock(symbol);
    const currentValue = holding.quantity * stock.price;
    const pnl = (stock.price - holding.average) * holding.quantity;

    return `
      <tr>
        <td>
          <div class="stock-cell">
            <div class="stock-logo">${stock.logo}</div>
            <div>
              <div class="stock-name">${stock.name}</div>
              <div class="stock-symbol">${symbol}</div>
            </div>
          </div>
        </td>

        <td class="mono">${holding.quantity}</td>
        <td class="mono">${money(holding.average)}</td>
        <td class="mono">${money(currentValue)}</td>

        <td class="mono ${pnl >= 0 ? "positive" : "negative"}">
          ${signedMoney(pnl)}
        </td>

        <td>
          <button type="button" class="mini-button"
            data-sell-stock="${symbol}">
            Sell
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

/* ORDER HISTORY */

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderOrders() {
  const body = document.getElementById("orders-body");

  document.getElementById("empty-orders").hidden =
    state.orders.length > 0;

  body.innerHTML = state.orders.slice(0, 30).map(order => `
    <tr>
      <td class="mono">${escapeHTML(order.time)}</td>
      <td>${escapeHTML(order.symbol)}</td>

      <td class="${order.type === "BUY" ? "positive" : "negative"}">
        ${order.type}
      </td>

      <td class="mono">${order.quantity}</td>
      <td class="mono">${money(order.price)}</td>
      <td><span class="positive">SIMULATED</span></td>
    </tr>
  `).join("");
}

/* ILLUSTRATIVE STOCK CHART */

function renderChart() {
  const stock = getStock(selectedSymbol);

  document.getElementById("chart-stock-name").textContent =
    stock.name;

  document.getElementById("chart-symbol").textContent =
    `${stock.symbol} · ${stock.market}`;

  document.getElementById("chart-price").textContent =
    money(stock.price);

  const change = document.getElementById("chart-change");

  change.textContent =
    `${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}%`;

  change.className =
    stock.change >= 0 ? "positive" : "negative";

  const svg = document.getElementById("price-chart");

  const pointsCount = {
    "1D": 36,
    "1W": 45,
    "1M": 55,
    "1Y": 65
  }[selectedPeriod] || 36;

  let seed =
    stock.symbol.split("").reduce(
      (sum, character) => sum + character.charCodeAt(0),
      0
    ) + selectedPeriod.length * 19;

  function random() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  const values = [];
  let value = 110;

  for (let i = 0; i < pointsCount; i++) {
    value += (random() - 0.47) * 18;
    value = Math.max(35, Math.min(190, value));
    values.push(value);
  }

  const width = 700;
  const height = 210;

  const points = values.map((v, i) => {
    const x = i * width / (values.length - 1);
    const y = height - v;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const line = points.join(" ");
  const area = `0,${height} ${line} ${width},${height}`;

  const color =
    stock.change >= 0 ? "#27d69b" : "#ff6474";

  const grid = [35, 85, 135, 185].map(y => `
    <line
      x1="0"
      y1="${y}"
      x2="${width}"
      y2="${y}"
      stroke="var(--border)"
      stroke-dasharray="4 5"
    />
  `).join("");

  svg.innerHTML = `
    <defs>
      <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity=".22"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>

    ${grid}

    <polygon
      points="${area}"
      fill="url(#chart-fill)"
    />

    <polyline
      points="${line}"
      fill="none"
      stroke="${color}"
      stroke-width="2.4"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
  `;
}

/* ORDER TICKET */

function renderTicket() {
  const stock = getStock(selectedSymbol);

  document.getElementById("stock-select").value =
    selectedSymbol;

  document.getElementById("ticket-price").textContent =
    money(stock.price);

  const quantity = Math.max(
    1,
    Math.floor(
      Number(document.getElementById("quantity").value) || 1
    )
  );

  document.getElementById("order-total").textContent =
    money(quantity * stock.price);
}

/* REFRESH EVERYTHING */

function renderAll() {
  renderMetrics();
  renderStockSelect();
  renderStockTable();
  renderHoldings();
  renderOrders();
  renderChart();
  renderTicket();
}

/* PAPER BUY AND SELL */

function placeOrder(type) {
  const quantity = Number(
    document.getElementById("quantity").value
  );

  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 1000000
  ) {
    showToast("Enter a valid whole-number quantity.", "error");
    return;
  }

  const stock = getStock(selectedSymbol);
  const price = stock.price;
  const total = price * quantity;

  if (!Number.isSafeInteger(total)) {
    showToast("Order value is too large.", "error");
    return;
  }

  if (type === "BUY") {
    if (total > state.cash) {
      showToast(
        "Insufficient virtual cash. Add funds or reduce quantity.",
        "error"
      );
      return;
    }

    const existing = state.holdings[selectedSymbol] || {
      quantity: 0,
      average: 0
    };

    const newQuantity = existing.quantity + quantity;

    existing.average =
      (
        existing.quantity * existing.average + total
      ) / newQuantity;

    existing.quantity = newQuantity;

    state.holdings[selectedSymbol] = existing;
    state.cash -= total;

  } else {
    const holding = state.holdings[selectedSymbol];

    if (!holding || holding.quantity < quantity) {
      showToast(
        "You don't have enough shares to sell.",
        "error"
      );
      return;
    }

    state.cash += total;

    state.realised +=
      (price - holding.average) * quantity;

    holding.quantity -= quantity;

    if (holding.quantity === 0) {
      delete state.holdings[selectedSymbol];
    }
  }

  state.orders.unshift({
    time: new Date().toLocaleString("en-IN"),
    symbol: selectedSymbol,
    type,
    quantity,
    price
  });

  saveState();
  renderAll();

  showToast(
    `${type === "BUY" ? "Bought" : "Sold"} ${quantity} ${stock.symbol} share${quantity === 1 ? "" : "s"} successfully.`
  );
}

/* SELECT A STOCK */

function selectStock(symbol) {
  if (!getStock(symbol)) return;

  selectedSymbol = symbol;

  document.getElementById("quantity").value = 1;

  renderChart();
  renderTicket();
}

/* SIDEBAR NAVIGATION FIX */

function showView(view) {
  const titles = {
    dashboard: "Dashboard",
    markets: "Markets",
    portfolio: "Portfolio",
    orders: "Order History"
  };

  const sections = {
    dashboard: [
      ".market-strip",
      ".metrics",
      ".content-grid"
    ],
    markets: ["#markets-section"],
    portfolio: ["#portfolio-section"],
    orders: ["#orders-section"]
  };

  const allSections = [
    ".market-strip",
    ".metrics",
    ".content-grid",
    "#markets-section",
    "#portfolio-section",
    "#orders-section"
  ];

  if (!sections[view]) {
    view = "dashboard";
  }

  document.getElementById("page-title").textContent =
    titles[view];

  document.querySelectorAll(".nav-item").forEach(button => {
    const active = button.dataset.view === view;

    button.classList.toggle("active", active);

    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  allSections.forEach(selector => {
    const section = document.querySelector(selector);

    if (section) {
      section.hidden = true;
    }
  });

  sections[view].forEach(selector => {
    const section = document.querySelector(selector);

    if (section) {
      section.hidden = false;
    }
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* EVENT LISTENERS */

document.querySelector(".sidebar").addEventListener(
  "click",
  event => {
    const button = event.target.closest(".nav-item");

    if (!button) return;

    event.preventDefault();
    showView(button.dataset.view);
  }
);

document.getElementById("stock-select").addEventListener(
  "change",
  event => {
    selectStock(event.target.value);
  }
);

document.getElementById("quantity").addEventListener(
  "input",
  renderTicket
);

document.getElementById("buy-button").addEventListener(
  "click",
  () => placeOrder("BUY")
);

document.getElementById("sell-button").addEventListener(
  "click",
  () => placeOrder("SELL")
);

document.getElementById("stock-search").addEventListener(
  "input",
  renderStockTable
);

/* MARKET WATCH TRADE BUTTON */

document.getElementById("stocks-body").addEventListener(
  "click",
  event => {
    const button = event.target.closest("[data-select-stock]");

    if (!button) return;

    selectStock(button.dataset.selectStock);

    showView("dashboard");

    document.querySelector(".order-panel").scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }
);

/* SELL FROM HOLDINGS */

document.getElementById("holdings-body").addEventListener(
  "click",
  event => {
    const button = event.target.closest("[data-sell-stock]");

    if (!button) return;

    const symbol = button.dataset.sellStock;
    const holding = state.holdings[symbol];

    if (!holding) return;

    selectStock(symbol);

    document.getElementById("quantity").value =
      holding.quantity;

    renderTicket();

    showView("dashboard");

    document.querySelector(".order-panel").scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }
);

/* CHART PERIOD BUTTONS */

document.querySelectorAll(".period").forEach(button => {
  button.addEventListener("click", () => {
    selectedPeriod = button.dataset.period;

    document.querySelectorAll(".period").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    renderChart();
  });
});

/* LIGHT / DARK THEME */

document.getElementById("theme-toggle").addEventListener(
  "click",
  () => {
    document.body.classList.toggle("light");
  }
);

/* ADD VIRTUAL FUNDS */

const fundsDialog = document.getElementById("funds-dialog");

document.getElementById("add-funds").addEventListener(
  "click",
  () => fundsDialog.showModal()
);

document.getElementById("cancel-funds").addEventListener(
  "click",
  () => fundsDialog.close()
);

document.getElementById("funds-form").addEventListener(
  "submit",
  event => {
    event.preventDefault();

    const amount = Number(
      document.getElementById("fund-amount").value
    );

    if (
      !Number.isFinite(amount) ||
      amount < 1 ||
      amount > 10000000
    ) {
      showToast(
        "Enter an amount between ₹1 and ₹1,00,00,000.",
        "error"
      );
      return;
    }

    state.cash += amount;

    saveState();
    renderAll();

    fundsDialog.close();

    showToast(
      `${money(amount)} added to your virtual account.`
    );
  }
);

/* RESET ACCOUNT */

document.getElementById("reset-account").addEventListener(
  "click",
  () => {
    const confirmed = confirm(
      "Reset your paper-trading account? This will erase your holdings and order history."
    );

    if (!confirmed) return;

    state = {
      cash: INITIAL_CASH,
      holdings: {},
      orders: [],
      realised: 0
    };

    saveState();
    renderAll();

    showView("dashboard");

    showToast("Account reset to ₹1,00,000 virtual cash.");
  }
);

/* START THE APP */

renderAll();
showView("dashboard");