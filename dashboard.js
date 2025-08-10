// Simple auth guard: only allow access after login
if (localStorage.getItem('ft_logged_in') !== '1') {
  window.location.replace('login.html');
}




/***** CONFIG *****/
const USER_NAME = (localStorage.getItem('ft_firstName') || 'Alex');
const SAVINGS_GOAL = 2000;
const CATEGORY_BUDGETS = {
  Food: 500, Transport: 150, Rent: 1200, Groceries: 300,
  Entertainment: 120, Utilities: 180, Other: 200, Income: Infinity
};

// Fallback seed if the list is empty (won't overwrite existing DOM)
const MOCK_TRANSACTIONS = [
  { date: todayOffset(-2), description: "Salary",      category: "Income",    amount: 2000 },
  { date: todayOffset(-3), description: "Groceries",   category: "Groceries", amount: -65.22 },
  { date: todayOffset(-4), description: "Metro",       category: "Transport", amount: -2.75 },
  { date: todayOffset(-6), description: "Coffee",      category: "Food",      amount: -4.95 },
  { date: todayOffset(-8), description: "Dinner",      category: "Food",      amount: -32.80 },
  { date: todayOffset(-10),description: "Rent",        category: "Rent",      amount: -1200 },
  { date: todayOffset(-12),description: "Streaming",   category: "Entertainment", amount: -13.99 },
  { date: todayOffset(-15),description: "Electricity", category: "Utilities", amount: -60.10 }
];

/***** STATE *****/
let ALL_TX = [];      // [{date:'YYYY-MM-DD', description, category, amount(+/-)}]
let pieChart = null;

/***** UTILS *****/
const $ = (sel) => document.querySelector(sel);
const fmt = (n) => new Intl.NumberFormat("en-US",{ style:"currency", currency:"USD"}).format(n);
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
function todayOffset(days){ const d = new Date(); d.setDate(d.getDate()+days); return toISO(d); }
function toISO(d){ const z=new Date(d); return `${z.getFullYear()}-${String(z.getMonth()+1).padStart(2,'0')}-${String(z.getDate()).padStart(2,'0')}`; }
function formatDateShort(iso){
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month:"short", day:"numeric" }); // e.g., Aug 9
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function showToast(msg){
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=> t.classList.remove('show'), 1400);
}

/***** READ EXISTING DOM AS INITIAL DATA *****/
function parseDomTransactions(){
  const list = $('#txList');
  if (!list) return [];
  const rows = [];
  const items = list.querySelectorAll('.tx-item');
  const currentYear = new Date().getFullYear();

  items.forEach(item => {
    const descEl = item.querySelector('.tx-desc');
    const metaEl = item.querySelector('.tx-meta');
    const amtEl  = item.querySelector('.tx-amt');

    const description = descEl ? descEl.textContent.trim() : '—';

    // meta format assumed: "Category · Aug 9" (keep if different)
    let category = 'Other';
    let isoDate = toISO(new Date());
    if (metaEl){
      const parts = metaEl.textContent.split('·');
      category = (parts[0] || 'Other').trim();

      const datePart = (parts[1] || '').trim(); // e.g., 'Aug 9'
      if (datePart){
        // Try parsing like "Aug 9, <currentYear>"
        const tryDate = new Date(`${datePart} ${currentYear}`);
        if (!isNaN(tryDate)) isoDate = toISO(tryDate);
      }
    }

    // amount like "+$20.00" or "−$65.22"
    let amount = 0;
    if (amtEl){
      const raw = amtEl.textContent.replace(/[^0-9.\-]/g, ''); // keep digits . and -
      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) amount = parsed;

      // If class says negative (or a Unicode minus), enforce sign
      const text = amtEl.textContent;
      const isNeg = amtEl.classList.contains('neg') || /[-−]/.test(text);
      amount = isNeg ? -Math.abs(Math.abs(amount)) : Math.abs(amount);
    }

    rows.push({ date: isoDate, description, category, amount });
  });

  return rows;
}

/***** STATS + RENDER *****/
function computeForCurrentMonth(list){
  const now = new Date();
  const key = monthKey(now);
  const monthItems = list.filter(t => monthKey(new Date(t.date)) === key);

  const income = monthItems.filter(t => t.amount > 0).reduce((s,t) => s + t.amount, 0);
  const expenses = monthItems.filter(t => t.amount < 0).reduce((s,t) => s + t.amount, 0);
  const net = income + expenses;

  const byCatMap = new Map();
  monthItems.forEach(t => {
    if (t.amount < 0){
      const cat = t.category || 'Other';
      byCatMap.set(cat, (byCatMap.get(cat)||0) + Math.abs(t.amount));
    }
  });
  const byCat = Array.from(byCatMap, ([category, total]) => ({ category, total }))
                      .sort((a,b)=> b.total - a.total);

  return { monthItems, income, expenses, net, byCat };
}

function renderSummary({ income, expenses, net, byCat }){
  $("#userName") && ($("#userName").textContent = USER_NAME);
  $("#totalIncome").textContent = fmt(income);
  $("#totalExpenses").textContent = fmt(Math.abs(expenses));
  $("#netSavings").textContent = fmt(net);
  $("#savingsEmoji").textContent = net >= 0 ? "✅" : "⚠️";

  const topCategory = byCat[0]?.category || "—";
  $("#topCategory").textContent = `${topCategory} — ${fmt(byCat[0]?.total || 0)}`;

  const budgetForTop = CATEGORY_BUDGETS[topCategory];
  let remainingText = "—";
  if (budgetForTop != null){
    const spentTop = byCat[0]?.total || 0;
    const remaining = Math.max(budgetForTop - spentTop, 0);
    remainingText = `${fmt(remaining)} left in “${topCategory}” budget`;
  }
  $("#remainingBudget").textContent = remainingText;

  const pct = Math.max(0, Math.min(100, Math.round((Math.max(0, net)/SAVINGS_GOAL) * 100)));
  $("#progressBar").style.width = `${pct}%`;
  $("#progressLabel").textContent = `${fmt(Math.max(0, net))} / ${fmt(SAVINGS_GOAL)}`;
}

function renderChart(byCat){
  if (!window.Chart || !$('#pieChart')) return;
  const labels = byCat.map(x=>x.category);
  const values = byCat.map(x=>x.total);

  if (!pieChart){
    pieChart = new Chart($("#pieChart"), {
      type: "pie",
      data: { labels, datasets: [{ data: values }] },
      options: { plugins: { legend: { position: "bottom" } } }
    });
  } else {
    pieChart.data.labels = labels;
    pieChart.data.datasets[0].data = values;
    pieChart.update();
  }
}

function updateAll(){
  const m = computeForCurrentMonth(ALL_TX);
  renderSummary(m);
  renderChart(m.byCat);
}

/***** ADD FORM (prepend only; do not touch existing rows) *****/
function initAddForm(){
  const addBtn = $("#addBtn");
  const panel  = $("#addPanel");
  const form   = $("#addForm");
  const dEl    = $("#addDate");
  const tEl    = $("#addType");
  const cEl    = $("#addCategory");
  const aEl    = $("#addAmount");
  const descEl = $("#addDesc");
  const cancel = $("#addCancel");
  const list   = $("#txList");

  if (!addBtn || !panel || !form || !list) return;

  const today = new Date();
  dEl.value = toISO(today);

  addBtn.addEventListener("click", () => {
    panel.classList.toggle("hidden");
    if (!panel.classList.contains("hidden")) aEl.focus();
  });
  cancel.addEventListener("click", () => {
    panel.classList.add("hidden");
    form.reset();
    dEl.value = toISO(today);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const date = dEl.value;
    const type = tEl.value;                  // 'expense' | 'income'
    const cat  = cEl.value || "Other";
    const amt  = parseFloat(aEl.value);
    const desc = descEl.value.trim();

    if (!date || Number.isNaN(amt) || amt <= 0){
      showToast("Please enter a valid amount and date.");
      return;
    }

    const signedAmount = type === 'income' ? amt : -Math.abs(amt);
    const record = {
      date,
      description: desc || (type === 'income' ? 'Income' : 'Expense'),
      category: type === 'income' ? 'Income' : cat,
      amount: signedAmount
    };

    // 1) Update JS state
    ALL_TX.push(record);

    // 2) Prepend a DOM row (do not clear existing)
    const sign = record.amount >= 0 ? "+" : "−";
    const cls  = record.amount >= 0 ? "pos" : "neg";
    const html = `
      <div class="tx-item">
        <div class="tx-main">
          <div class="tx-desc">${escapeHtml(record.description)}</div>
          <div class="tx-meta">${escapeHtml(record.category)} · ${formatDateShort(record.date)}</div>
        </div>
        <div class="tx-amt ${cls}">${sign}${fmt(Math.abs(record.amount))}</div>
      </div>`;
    list.insertAdjacentHTML('afterbegin', html);

    // 3) Refresh stats/chart only (not the list)
    updateAll();

    // UX reset
    form.reset();
    dEl.value = toISO(today);
    panel.classList.add("hidden");

    // FYI if date not in current month
    const nowKey = monthKey(new Date());
    const txKey  = monthKey(new Date(record.date));
    showToast(nowKey !== txKey ? "Added! (Not in this month’s stats)" : "Transaction added!");
  });
}

/***** INIT *****/
(function init(){
  $("#userName") && ($("#userName").textContent = USER_NAME);

  // Build initial data from whatever is already in your DOM list.
  const fromDom = parseDomTransactions();
  if (fromDom.length){
    ALL_TX = fromDom;
  } else {
    // If your list is empty, seed with mock rows (and also render them once)
    ALL_TX = [...MOCK_TRANSACTIONS];
    const list = $("#txList");
    if (list){
      const seeded = ALL_TX
        .slice()
        .sort((a,b)=> new Date(b.date)-new Date(a.date))
        .map(r=>{
          const sign = r.amount >= 0 ? "+" : "−";
          const cls  = r.amount >= 0 ? "pos" : "neg";
          return `
          <div class="tx-item">
            <div class="tx-main">
              <div class="tx-desc">${escapeHtml(r.description)}</div>
              <div class="tx-meta">${escapeHtml(r.category)} · ${formatDateShort(r.date)}</div>
            </div>
            <div class="tx-amt ${cls}">${sign}${fmt(Math.abs(r.amount))}</div>
          </div>`;
        }).join("");
      list.insertAdjacentHTML('beforeend', seeded);
    }
  }

  updateAll();
  initAddForm();
})();



document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('ft_logged_in');
  window.location.href = 'login.html';
});
