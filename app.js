(function () {
  const KEY = "hoursTracker.v2";
  const DAY = 86400000;
  const DEFAULT = {
    view: "2w",
    start: "2026-11-16",
    end: "2026-11-29",
    gap: 11,
    rateMode: "fixed",
    fixedRate: "",
    typeRates: { Weekday: "", Saturday: "", Sunday: "" },
    nightOn: false,
    nightRate: "",
    days: { "2026-11-24": { h: 3 } }
  };

  function load() {
    const base = JSON.parse(JSON.stringify(DEFAULT));
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (saved && typeof saved === "object") {
        Object.assign(base, saved);
        base.typeRates = Object.assign({ Weekday: "", Saturday: "", Sunday: "" }, saved.typeRates || {});
      }
    } catch (e) {}
    return base;
  }
  let S = load();

  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  const pD = s => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const iso = d => d.toISOString().slice(0, 10);
  const addDays = (d, n) => new Date(d.getTime() + n * DAY);
  const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const numOrNull = v => { if (v === "" || v == null) return null; const n = parseFloat(v); return isNaN(n) ? null : n; };
  const dayType = d => { const w = d.getUTCDay(); return w === 6 ? "Saturday" : w === 0 ? "Sunday" : "Weekday"; };
  const typeClass = t => t === "Saturday" ? "sat" : t === "Sunday" ? "sun" : "";
  const fmt = (d, o) => d.toLocaleDateString("en-IE", Object.assign({ timeZone: "UTC" }, o));
  const money = n => "€" + n.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function range() {
    const start = pD(S.start);
    let end;
    if (S.view === "1w") end = addDays(start, 6);
    else if (S.view === "2w") end = addDays(start, 13);
    else end = pD(S.end);
    return { start, end };
  }

  function baseRate(type) { return S.rateMode === "fixed" ? num(S.fixedRate) : num(S.typeRates[type]); }

  function dayPay(key, type) {
    const d = S.days[key] || {};
    const override = numOrNull(d.r);
    const rate = override !== null && override > 0 ? override : baseRate(type);
    const h = num(d.h);
    const n = S.nightOn ? num(d.n) : 0;
    return h * rate + n * num(S.nightRate);
  }

  function totals() {
    const { start, end } = range();
    const invalid = end < start;
    const t = { Weekday: 0, Saturday: 0, Sunday: 0, hours: 0, night: 0, pay: 0 };
    if (!invalid) {
      for (let d = start; d <= end; d = addDays(d, 1)) {
        const k = iso(d), ty = dayType(d), dd = S.days[k] || {};
        const h = num(dd.h);
        t[ty] += h;
        t.hours += h;
        if (S.nightOn) t.night += num(dd.n);
        t.pay += dayPay(k, ty);
      }
    }
    return { t, start, end, invalid };
  }

  function renderControls() {
    const { start, end } = range();
    const custom = S.view === "custom";
    document.getElementById("controls").innerHTML = `
      <label>View
        <select id="view">
          <option value="1w">1 week</option>
          <option value="2w">2 weeks</option>
          <option value="custom">Custom range</option>
        </select>
      </label>
      <label>${custom ? "From" : "Start date"}
        <input type="date" id="start" value="${S.start}">
      </label>
      ${custom ? `<label>To <input type="date" id="end" value="${S.end}"></label>` : ""}
      <label>Days from period end to payout
        <input type="number" id="gap" min="0" step="1" value="${S.gap}">
      </label>`;
    document.getElementById("view").value = S.view;
  }

  function renderRates() {
    const typeInputs = ["Weekday", "Saturday", "Sunday"].map(t => `
      <label>${t} rate (€/h)
        <input type="number" min="0" step="0.01" data-tr="${t}" value="${S.typeRates[t]}">
      </label>`).join("");
    document.getElementById("rates").innerHTML = `
      <label>Rate type
        <select id="rateMode">
          <option value="fixed">One rate for all days</option>
          <option value="type">Different rate by day type</option>
        </select>
      </label>
      ${S.rateMode === "fixed"
        ? `<label>Hourly rate (€)<input type="number" min="0" step="0.01" id="fixedRate" value="${S.fixedRate}"></label>`
        : typeInputs}
      <label class="check"><input type="checkbox" id="nightOn" ${S.nightOn ? "checked" : ""}> Night hours bonus</label>
      ${S.nightOn ? `<label>Extra € per night hour<input type="number" min="0" step="0.01" id="nightRate" value="${S.nightRate}"></label>` : ""}`;
    document.getElementById("rateMode").value = S.rateMode;
  }

  function renderTable() {
    const { invalid } = totals();
    const head = document.getElementById("thead");
    head.innerHTML = `<th>Date</th><th>Day</th><th class="num">Hours</th>${S.nightOn ? `<th class="num">Night hrs</th>` : ""}<th class="num">Rate override (€/h)</th><th class="num">Pay</th>`;
    const body = document.getElementById("tbody");
    body.innerHTML = "";
    if (invalid) return;
    const { start, end } = range();
    for (let d = start; d <= end; d = addDays(d, 1)) {
      const k = iso(d), ty = dayType(d), dd = S.days[k] || {};
      const tr = document.createElement("tr");
      if (ty !== "Weekday") tr.className = "row-weekend";
      tr.innerHTML = `
        <td>${fmt(d, { weekday: "short", day: "numeric", month: "short" })}</td>
        <td><span class="type ${typeClass(ty)}">${ty}</span></td>
        <td class="num"><input type="number" min="0" max="24" step="0.25" data-k="${k}" data-f="h" value="${dd.h != null ? dd.h : ""}"></td>
        ${S.nightOn ? `<td class="num"><input type="number" min="0" max="24" step="0.25" data-k="${k}" data-f="n" value="${dd.n != null ? dd.n : ""}"></td>` : ""}
        <td class="num"><input type="number" min="0" step="0.01" data-k="${k}" data-f="r" placeholder="${baseRate(ty) || ""}" value="${dd.r != null ? dd.r : ""}"></td>
        <td class="num" data-pay="${k}"></td>`;
      body.appendChild(tr);
    }
  }

  function refresh() {
    const { t, start, end, invalid } = totals();
    const payout = addDays(end, num(S.gap));
    document.getElementById("payoutLine").innerHTML = invalid
      ? `<span class="warn">The end date is before the start date.</span>`
      : `Period ${fmt(start, { day: "numeric", month: "short" })} to ${fmt(end, { day: "numeric", month: "short", year: "numeric" })} · Payout ${fmt(payout, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`;
    document.getElementById("summaryBody").innerHTML = `
      <div class="summary">
        <div class="stat"><div class="label">Weekday</div><div class="value">${t.Weekday}</div><div class="sub">hours</div></div>
        <div class="stat"><div class="label">Saturday</div><div class="value">${t.Saturday}</div><div class="sub">hours</div></div>
        <div class="stat"><div class="label">Sunday</div><div class="value">${t.Sunday}</div><div class="sub">hours</div></div>
        ${S.nightOn ? `<div class="stat"><div class="label">Night hours</div><div class="value">${t.night}</div><div class="sub">bonus applies</div></div>` : ""}
        <div class="stat"><div class="label">Total hours</div><div class="value">${t.hours}</div><div class="sub">&nbsp;</div></div>
        <div class="stat"><div class="label">Est. gross pay</div><div class="value">${money(t.pay)}</div><div class="sub">${payout ? "before tax and deductions" : ""}</div></div>
      </div>`;
    document.querySelectorAll("[data-pay]").forEach(el => {
      const k = el.dataset.pay;
      el.textContent = money(dayPay(k, dayType(pD(k))));
    });
  }

  function renderAll() {
    renderControls();
    renderRates();
    renderTable();
    refresh();
  }

  // Structural changes: re-render the layout
  document.addEventListener("change", e => {
    const t = e.target;
    switch (t.id) {
      case "view":
        if (t.value === "custom") S.end = iso(range().end);
        S.view = t.value; break;
      case "start": S.start = t.value; break;
      case "end": S.end = t.value; break;
      case "rateMode": S.rateMode = t.value; break;
      case "nightOn": S.nightOn = t.checked; break;
      default: return;
    }
    save();
    renderAll();
  });

  // Value changes: update numbers without rebuilding inputs (keeps focus)
  document.addEventListener("input", e => {
    const t = e.target;
    if (t.id === "gap") S.gap = num(t.value);
    else if (t.id === "fixedRate") S.fixedRate = t.value;
    else if (t.id === "nightRate") S.nightRate = t.value;
    else if (t.dataset.tr) S.typeRates[t.dataset.tr] = t.value;
    else if (t.dataset.k) {
      const k = t.dataset.k, f = t.dataset.f;
      const v = numOrNull(t.value);
      S.days[k] = S.days[k] || {};
      if (v === null) delete S.days[k][f]; else S.days[k][f] = v;
      if (!Object.keys(S.days[k]).length) delete S.days[k];
      if (f === "r") renderTable();
    } else return;
    save();
    refresh();
  });

  document.getElementById("export").addEventListener("click", () => {
    const { start, end, invalid } = totals();
    const rows = [["Date", "Day type", "Hours", "Night hours", "Rate override", "Pay (EUR)"]];
    if (!invalid) {
      for (let d = start; d <= end; d = addDays(d, 1)) {
        const k = iso(d), ty = dayType(d), dd = S.days[k] || {};
        rows.push([k, ty, num(dd.h), S.nightOn ? num(dd.n) : "", dd.r != null ? dd.r : "", dayPay(k, ty).toFixed(2)]);
      }
    }
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "hours.csv";
    a.click();
  });

  document.getElementById("reset").addEventListener("click", () => {
    if (!confirm("Clear all entries and settings?")) return;
    S = JSON.parse(JSON.stringify(DEFAULT));
    save();
    renderAll();
  });

  renderAll();
})();
