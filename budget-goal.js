const GOAL_KEY = 'ft_budget_goal_amount';
const TX_STORAGE_KEY = 'ft_dashboard_tx';

const goalAmount = parseFloat(localStorage.getItem(GOAL_KEY) || '0');
if (!goalAmount || goalAmount <= 0) {
  window.location.href = 'set-goal.html';
}

/* Fallback data if no stored transactions */
const MOCK_TRANSACTIONS = [
  { date: isoOffset(-2),  description: "Salary",      category: "Income",        amount: 2000 },
  { date: isoOffset(-3),  description: "Groceries",   category: "Food",          amount: -175.60 },
  { date: isoOffset(-4),  description: "Metro",       category: "Transportation",amount: -25.00 },
  { date: isoOffset(-6),  description: "Coffee",      category: "Food",          amount: -14.95 },
  { date: isoOffset(-8),  description: "Dinner",      category: "Food",          amount: -86.40 },
  { date: isoOffset(-10), description: "Rent",        category: "Rent",          amount: -2100 },
  { date: isoOffset(-12), description: "Clothes",     category: "Clothing",      amount: -220.00 },
  { date: isoOffset(-15), description: "Shoes",       category: "Clothing",      amount: -185.00 },
  { date: isoOffsetLastMonth(-5), description: "Rent (prev)",  category: "Rent",  amount: -2100 },
  { date: isoOffsetLastMonth(-7), description: "Food (prev)",  category: "Food",  amount: -1930 },
  { date: isoOffsetLastMonth(-9), description: "Clothes(prev)",category: "Clothing",amount: -770 },
  { date: isoOffsetLastMonth(-11),description: "Transport(prev)",category: "Transportation", amount: -297 }
];

function loadTransactions(){
  try {
    const raw = localStorage.getItem(TX_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e){}
  return [...MOCK_TRANSACTIONS];
}

/* Utils */
const $ = (s)=>document.querySelector(s);
const fmt = (n)=> new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
function isoOffset(days){ const d = new Date(); d.setDate(d.getDate()+days); return toISO(d); }
function isoOffsetLastMonth(days){ const d=new Date(); d.setMonth(d.getMonth()-1); d.setDate(d.getDate()+days); return toISO(d); }
function toISO(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
const mkey = (d)=> `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

/* Compute */
const ALL = loadTransactions();
const now = new Date();
const thisKey = mkey(now);
const lastKey = mkey(new Date(now.getFullYear(), now.getMonth()-1, 1));

const thisMonth = ALL.filter(t => mkey(new Date(t.date))===thisKey);
const lastMonthTx = ALL.filter(t => mkey(new Date(t.date))===lastKey);

const totalSpentThis = Math.abs(thisMonth.filter(t=>t.amount<0).reduce((s,t)=>s+t.amount,0));
const byCatThis = sumByCategory(thisMonth);
const byCatLast = sumByCategory(lastMonthTx);

const top4 = Object.entries(byCatThis)
  .map(([cat,total])=>({category:cat,total}))
  .sort((a,b)=> b.total - a.total)
  .slice(0,4);

const rows = top4.map(r => {
  const prev = byCatLast[r.category] || 0;
  const delta = changePct(prev, r.total);
  const band = deltaBand(delta);
  return {...r, prev, delta, band};
});

/* Render */
$('#goalAmountBig').textContent = fmt(goalAmount);
$('#spentBig').textContent = fmt(totalSpentThis);

const gap = totalSpentThis - goalAmount;
const guideEl = $('#guidanceText');
if (gap > 0){
  guideEl.innerHTML = `You need to spend <strong>${fmt(gap)}</strong> less next month.`;
} else if (gap < 0){
  guideEl.innerHTML = `Great! You are <strong>${fmt(Math.abs(gap))}</strong> under your goal so far.`;
} else {
  guideEl.textContent = 'You are exactly on your goal.';
}

const body = $('#topRows');
body.innerHTML = rows.map(r => {
  const pct = Math.min(100, Math.abs(r.delta));
  return `
    <div class="goal-row">
      <div class="goal-cell cat">${escapeHtml(r.category)}</div>
      <div class="goal-cell amt">${fmt(r.total)}</div>
      <div class="goal-cell delta">
        <div class="delta-bar"><div class="delta-fill ${r.band}" style="width:${pct}%"></div></div>
        <div class="delta-label">${r.delta>0?'+':''}${Math.round(r.delta)}%</div>
      </div>
    </div>`;
}).join('');

/* Helpers */
function sumByCategory(list){
  const map = {};
  list.forEach(t=>{
    if (t.amount < 0){
      const k = t.category || 'Other';
      map[k] = (map[k]||0) + Math.abs(t.amount);
    }
  });
  return map;
}
function changePct(prev, curr){
  if (!prev && curr>0) return 100;
  if (!prev && !curr) return 0;
  return ((curr - prev) / prev) * 100;
}
function deltaBand(p){
  if (p <= -5) return 'good';
  if (p <= 10) return 'ok';
  if (p <= 40) return 'warn';
  return 'bad';
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}



document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('ft_logged_in');
  window.location.href = 'login.html';
});
