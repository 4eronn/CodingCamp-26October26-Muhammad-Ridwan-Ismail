/* ============================================================
   Budgetly — Expense & Budget Visualizer
   Vanilla JavaScript · Local Storage · Chart.js
   ============================================================ */

(() => {
  "use strict";

  /* ---------- Konstanta & state ---------- */
  const STORAGE = {
    transactions: "budgetly.transactions",
    budgets: "budgetly.monthlyBudget",
    theme: "budgetly.theme",
    sort: "budgetly.sort",
  };

  const CATEGORIES = ["Food", "Transport", "Fun"];
  const CATEGORY_COLOR = {
    Food: "#f59e0b",
    Transport: "#3b82f6",
    Fun: "#ec4899",
  };

  const MONTH_NAMES = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  let transactions = [];
  let chart = null;
  let toastTimer = null;

  /* ---------- Cache DOM ---------- */
  const $ = (id) => document.getElementById(id);

  const els = {
    form: $("transactionForm"),
    itemType: $("itemType"),
    itemName: $("itemName"),
    itemAmount: $("itemAmount"),
    itemCategory: $("itemCategory"),
    nameError: $("itemNameError"),
    amountError: $("itemAmountError"),
    categoryError: $("itemCategoryError"),

    totalExpense: $("totalExpense"),

    budgetLimit: $("budgetLimit"),
    budgetBar: $("budgetBar"),
    budgetNote: $("budgetNote"),
    budgetBadge: $("budgetBadge"),

    transactionList: $("transactionList"),
    listEmpty: $("listEmpty"),
    sortSelect: $("sortSelect"),

    chartCanvas: $("categoryChart"),
    chartEmpty: $("chartEmpty"),

    themeToggle: $("themeToggle"),
  };

  /* ---------- Helper ---------- */
  const todayKey = () => new Date().toISOString().slice(0, 7); // YYYY-MM

  const formatRupiah = (num) => {
    const negative = num < 0;
    const abs = Math.abs(Math.round(num));
    const formatted = abs.toLocaleString("id-ID");
    return (negative ? "-Rp " : "Rp ") + formatted;
  };

  const escapeHTML = (str) =>
    str.replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));

  const uid = () =>
    "tx_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);

  const showToast = (message) => {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("output");
      toast.className = "toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    // paksa reflow supaya transisi jalan ulang
    void toast.offsetWidth;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  };
  /* ---------- Storage ---------- */
  const safeParse = (value, fallback) => {
    try {
      const parsed = JSON.parse(value);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch {
      return fallback;
    }
  };

  const loadTransactions = () => {
    transactions = safeParse(localStorage.getItem(STORAGE.transactions), []);
    // hanya menerima data yang punya bentuk benar
    transactions = transactions.filter(
      (t) => t && typeof t.id === "string" && typeof t.name === "string" && typeof t.category === "string"
    );
  };

  const saveTransactions = () =>
    localStorage.setItem(STORAGE.transactions, JSON.stringify(transactions));

  const loadBudget = () => String(localStorage.getItem(STORAGE.budgets) || "");
  const saveBudget = () => localStorage.setItem(STORAGE.budgets, String(els.budgetLimit.value || ""));

  const loadSort = () => localStorage.getItem(STORAGE.sort) || "date-desc";
  const saveSort = () => localStorage.setItem(STORAGE.sort, els.sortSelect.value);

  /* ---------- Perhitungan ---------- */
  const thisMonthExpense = (list) =>
    list
      .filter((t) => (t.created || "").slice(0, 7) === todayKey())
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const budgetLimitValue = () => Number(els.budgetLimit.value) || 0;

  /* ---------- Tema (dark / light mode) ---------- */
  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    if (chart) updateChartColors();
  };

  const initTheme = () => {
    let saved = localStorage.getItem(STORAGE.theme);
    if (!saved) {
      // ikuti preferensi sistem saat pertama kali
      saved = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    applyTheme(saved);
  };

  const toggleTheme = () => {
    const next =
      document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE.theme, next);
    applyTheme(next);
  };

  /* ---------- Render ---------- */
  const getSorted = () => {
    const mode = els.sortSelect.value;
    const list = [...transactions];
    const byName = (a, b) => a.name.localeCompare(b.name, "id");
    const byAmount = (a, b) => Number(a.amount) - Number(b.amount);
    const byDate = (a, b) => new Date(a.created || 0) - new Date(b.created || 0);

    switch (mode) {
      case "date-asc":     return list.sort(byDate);
      case "date-desc":    return list.sort((a, b) => byDate(b, a));
      case "amount-desc":  return list.sort((a, b) => byAmount(b, a));
      case "amount-asc":   return list.sort(byAmount);
      case "category":     return list.sort((a, b) => a.category.localeCompare(b.category, "id") || byName(a, b));
      default:             return list;
    }
  };

  const renderSummary = () => {
    const expense = transactions
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    if (els.totalExpense) els.totalExpense.textContent = formatRupiah(expense);
  };

  const renderBudget = () => {
    const limit = budgetLimitValue();
    const spent = thisMonthExpense(transactions);
    const month = MONTH_NAMES[new Date().getMonth()];

    if (!limit || limit <= 0) {
      els.budgetBar.style.width = "0%";
      els.budgetBar.classList.remove("over");
      els.budgetNote.textContent = "Belum ada batas ditetapkan.";
      els.budgetNote.classList.remove("warn");
      els.budgetBadge.hidden = true;
      els.budgetBar.parentElement.setAttribute("aria-valuenow", "0");
      return;
    }

    const pct = Math.min(Math.round((spent / limit) * 100), 100);
    const over = spent > limit;

    els.budgetBar.style.width = Math.max(pct, spent > 0 ? 3 : 0) + "%";
    els.budgetBar.classList.toggle("over", over);
    els.budgetBar.parentElement.setAttribute("aria-valuenow", String(pct));

    if (over) {
      els.budgetNote.textContent =
        `Pengeluaran ${month} melewati batas: ${formatRupiah(spent)} / ${formatRupiah(limit)} (+${formatRupiah(spent - limit)})`;
      els.budgetNote.classList.add("warn");
      els.budgetBadge.hidden = false;
    } else {
      const remaining = limit - spent;
      els.budgetNote.textContent =
        `${month}: ${formatRupiah(spent)} / ${formatRupiah(limit)} — sisa ${formatRupiah(remaining)}`;
      els.budgetNote.classList.remove("warn");
      els.budgetBadge.hidden = true;
    }
  };

  const renderTransactions = () => {
    const sorted = getSorted();
    const limit = budgetLimitValue();

    // Kumulatif pengeluaran bulan berjalan dihitung KRONOLOGIS (urutan asli),
    // sehingga highlight over-limit tidak berubah saat sort diganti-ganti.
    const chrono = [...transactions].sort(
      (a, b) => new Date(a.created || 0) - new Date(b.created || 0)
    );
    let cum = 0;
    const cumAt = new Map(); // id -> total pengeluaran bulan ini saat item itu masuk
    for (const t of chrono) {
      cum += Number(t.amount) || 0;
      cumAt.set(t.id, cum);
    }

    els.transactionList.innerHTML = "";
    els.listEmpty.hidden = sorted.length > 0;

    for (const t of sorted) {
      const amount = Number(t.amount) || 0;

      // Highlight: pengeluaran yang membuat total bulan ini melewati batas
      const isInCurrentMonth = (t.created || "").slice(0, 7) === todayKey();
      const totalAtTime = cumAt.get(t.id) || 0;
      const overLimit = limit > 0 && isInCurrentMonth && totalAtTime > limit;

      const li = document.createElement("li");
      li.className = "tx-item" + (overLimit ? " over-limit" : "");
      li.setAttribute("role", "listitem");

      const dateObj = t.created ? new Date(t.created) : null;
      const dateText = dateObj
        ? `${dateObj.getDate()} ${MONTH_NAMES[dateObj.getMonth()].slice(0, 3)} ${dateObj.getFullYear()}`
        : "Tanpa tanggal";

      li.innerHTML = `
        <span class="tx-dot" style="background:${CATEGORY_COLOR[t.category] || "var(--accent)"}" aria-hidden="true"></span>
        <span class="tx-main">
          <span class="tx-name"></span>
          <span class="tx-sub">
            <span class="tx-cat"></span> · ${escapeHTML(dateText)}
          </span>
        </span>
        <span class="tx-amount"></span>
        <button type="button" class="tx-delete" data-id="${t.id}"
                aria-label="Hapus transaksi ${t.name}" title="Hapus">✕</button>
      `;

      li.querySelector(".tx-name").textContent = t.name;
      li.querySelector(".tx-cat").textContent = t.category;
      li.querySelector(".tx-amount").textContent = "-" + formatRupiah(amount);

      els.transactionList.appendChild(li);
    }
  };

  /* ---------- Chart.js ---------- */
  const combinedByCategory = () => {
    const totals = { Food: 0, Transport: 0, Fun: 0 };
    for (const t of transactions) {
      const amount = Number(t.amount) || 0;
      if (t.category in totals) {
        totals[t.category] += amount;
      }
    }
    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ category: k, total: v, type: "expense" }));
  };

  const activeThemeIsDark = () =>
    document.documentElement.getAttribute("data-theme") === "dark";

  const updateChartColors = () => {
    if (!chart) return;
    const dark = activeThemeIsDark();
    chart.options.plugins.legend.labels.color = dark ? "#a2aabb" : "#5c6470";
    chart.options.plugins.tooltip.backgroundColor = dark ? "#eef0f3" : "#1a1d21";
    chart.options.plugins.tooltip.titleColor = dark ? "#12141a" : "#ffffff";
    chart.options.plugins.tooltip.bodyColor = dark ? "#12141a" : "#ffffff";
    chart.data.datasets[0].borderColor = dark ? "#1a1d25" : "#ffffff";
    chart.update("none");
  };

  const renderChart = () => {
    const data = combinedByCategory();
    const isEmpty = data.length === 0;

    els.chartEmpty.hidden = !isEmpty;

    const labels = data.map((d) => d.category);
    const values = data.map((d) => d.total);
    const colors = labels.map((c) => CATEGORY_COLOR[c] || ["#6c5ce7", "#3b82f6", "#f59e0b"][labels.indexOf(c) % 3]);

    if (!chart) {
      if (typeof Chart === "undefined") return; // CDN belum termuat — coba lagi nanti
      chart = new Chart(els.chartCanvas, {
        type: "pie",
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: colors,
            borderColor: activeThemeIsDark() ? "#1a1d25" : "#ffffff",
            borderWidth: 3,
            hoverOffset: 8,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: activeThemeIsDark() ? "#a2aabb" : "#5c6470",
                boxWidth: 10,
                boxHeight: 10,
                usePointStyle: true,
                padding: 16,
                font: { family: "Inter, sans-serif", size: 12.5, weight: 600 },
              },
            },
            tooltip: {
              backgroundColor: activeThemeIsDark() ? "#eef0f3" : "#1a1d21",
              titleColor: activeThemeIsDark() ? "#12141a" : "#ffffff",
              bodyColor: activeThemeIsDark() ? "#12141a" : "#ffffff",
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => {
                  const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                  const pct = total ? Math.round((ctx.parsed / total) * 100) : 0;
                  return ` ${ctx.label}: ${formatRupiah(ctx.parsed)} (${pct}%)`;
                },
              },
            },
          },
        },
      });
    } else {
      chart.data.labels = labels;
      chart.data.datasets[0].data = values;
      chart.data.datasets[0].backgroundColor = colors;
      chart.update();
    }
  };

  const renderAll = () => {
    renderSummary();
    renderBudget();
    renderTransactions();
    renderChart();
  };

  /* ---------- Validasi ---------- */
  const setError = (input, errorEl, message) => {
    if (message) {
      input.classList.add("invalid");
      errorEl.textContent = message;
      errorEl.hidden = false;
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", errorEl.id);
    } else {
      input.classList.remove("invalid");
      errorEl.textContent = "";
      errorEl.hidden = true;
      input.removeAttribute("aria-invalid");
    }
  };

  const validateInputs = () => {
    let valid = true;

    // Item Name
    const name = els.itemName.value.trim();
    if (!name) {
      setError(els.itemName, els.nameError, "Nama item wajib diisi.");
      valid = false;
    } else if (name.length < 2) {
      setError(els.itemName, els.nameError, "Nama minimal 2 karakter.");
      valid = false;
    } else {
      setError(els.itemName, els.nameError, "");
    }

    // Amount
    const amountRaw = els.itemAmount.value.trim();
    const amount = Number(amountRaw);
    if (!amountRaw) {
      setError(els.itemAmount, els.amountError, "Nominal wajib diisi.");
      valid = false;
    } else if (!Number.isFinite(amount) || amount <= 0) {
      setError(els.itemAmount, els.amountError, "Nominal harus angka lebih besar dari 0.");
      valid = false;
    } else if (amount > 1e12) {
      setError(els.itemAmount, els.amountError, "Nominal terlalu besar.");
      valid = false;
    } else {
      setError(els.itemAmount, els.amountError, "");
    }

    // Category
    const category = els.itemCategory.value;
    if (!category || !CATEGORIES.includes(category)) {
      setError(els.itemCategory, els.categoryError, "Silakan pilih kategori.");
      valid = false;
    } else {
      setError(els.itemCategory, els.categoryError, "");
    }

    if (!valid) {
      const firstInvalid = document.querySelector(".form-card .invalid");
      if (firstInvalid) firstInvalid.focus();
    } else {
      els.nameError.hidden = true;
      els.amountError.hidden = true;
      els.categoryError.hidden = true;
    }

    return { valid, name, amount, category, type: "expense" };
  };

  const clearForm = () => {
    els.itemName.value = "";
    els.itemAmount.value = "";
    els.itemType.value = "expense";
    els.itemCategory.selectedIndex = 0;
    setError(els.itemName, els.nameError, "");
    setError(els.itemAmount, els.amountError, "");
    setError(els.itemCategory, els.categoryError, "");
    els.itemName.focus();
  };

  /* ---------- Aksi ---------- */
  const handleSubmit = (event) => {
    event.preventDefault();
    const { valid, name, amount, category, type } = validateInputs();
    if (!valid) return;

    transactions.push({
      id: uid(),
      name: name.trim(),
      amount: Number(amount),
      category,
      type,
      created: new Date().toISOString(),
    });
    saveTransactions();
    renderAll();
    clearForm();

    const limit = budgetLimitValue();
    const spent = thisMonthExpense(transactions);
    if (limit > 0 && spent > limit) {
      showToast(`Tersimpan, tapi pengeluaran bulan ini melewati batas`);
    } else {
      showToast(`"${name.trim()}" tersimpan`);
    }
  };

  const handleDelete = (event) => {
    const button = event.target.closest(".tx-delete");
    if (!button) return;
    const id = button.getAttribute("data-id");
    const tx = transactions.find((t) => t.id === id);
    transactions = transactions.filter((t) => t.id !== id);
    saveTransactions();
    renderAll();
    showToast(`${tx ? `"${tx.name}"` : "Transaksi"} dihapus`);  };

  const handleSortChange = () => {
    saveSort();
    renderTransactions();
  };

  const handleBudget = () => {
    saveBudget();
    renderBudget();
    renderTransactions();
  };

  /* ---------- Init ---------- */
  const init = () => {
    initTheme();

    els.themeToggle.addEventListener("click", toggleTheme);
    els.form.addEventListener("submit", handleSubmit);
    els.transactionList.addEventListener("click", handleDelete);
    els.sortSelect.addEventListener("change", handleSortChange);
    els.budgetLimit.addEventListener("input", handleBudget);

    for (const [input, error] of [
      [els.itemName, els.nameError],
      [els.itemAmount, els.amountError],
      [els.itemCategory, els.categoryError],
    ]) {
      input.addEventListener("input", () => {
        if (input.classList.contains("invalid")) setError(input, error, "");
      });
    }

    els.sortSelect.value = loadSort();
    els.budgetLimit.value = loadBudget();
    loadTransactions();
    renderAll();

    // ikuti perubahan tema sistem jika pengguna belum memilih manual
    if (window.matchMedia) {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const onSystemChange = () => {
        if (!localStorage.getItem(STORAGE.theme)) {
          applyTheme(media.matches ? "dark" : "light");
        }
      };
      if (media.addEventListener) media.addEventListener("change", onSystemChange);
      else if (media.addListener) media.addListener(onSystemChange); // Safari lama
    }
  };

  // Chart.js dimuat dengan `defer`; tunggu sampai tersedia
  const boot = () => {
    init();
    if (typeof Chart === "undefined") {
      const retry = setInterval(() => {
        if (typeof Chart !== "undefined") {
          clearInterval(retry);
          renderChart();
        }
      }, 100);
      setTimeout(() => clearInterval(retry), 8000);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
