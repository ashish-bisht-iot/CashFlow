// ── STATE ──────────────────────────────────────────────────────────────
let state = {
  salaryINR: 0,
  expenses: [],      // { id, name, amountINR, date }
  currency: 'INR',
  darkMode: false
};

let chartInstance  = null;
let exchangeRates  = { INR: 1 };

const SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥' };

// ── LOCALSTORAGE ───────────────────────────────────────────────────────
function save() {
  localStorage.setItem('cashflow_v3', JSON.stringify({
    salaryINR: state.salaryINR,
    expenses:  state.expenses,
    darkMode:  state.darkMode
  }));
}

function load() {
  const raw = localStorage.getItem('cashflow_v3');
  if (raw) {
    const d        = JSON.parse(raw);
    state.salaryINR = d.salaryINR || 0;
    state.expenses  = d.expenses  || [];
    state.darkMode  = d.darkMode  || false;
  }
}

// ── THEME ──────────────────────────────────────────────────────────────
function applyTheme() {
  const btn   = document.getElementById('themeToggle');
  const label = document.getElementById('themeLabel');

  if (state.darkMode) {
    document.body.classList.add('dark');
    btn.classList.add('active');
    label.textContent = 'Light Mode';
  } else {
    document.body.classList.remove('dark');
    btn.classList.remove('active');
    label.textContent = 'Dark Mode';
  }

  // Re-render chart so its colours match the theme
  if (chartInstance) {
    const totalExp  = state.expenses.reduce((s, e) => s + e.amountINR, 0);
    const balanceINR = state.salaryINR - totalExp;
    renderChart(totalExp, balanceINR);
  }
}

function toggleTheme() {
  state.darkMode = !state.darkMode;
  applyTheme();
  save();
}

// ── CURRENCY ───────────────────────────────────────────────────────────
async function fetchRates() {
  try {
    const res  = await fetch('https://api.frankfurter.app/latest?from=INR');
    const data = await res.json();
    exchangeRates = { INR: 1, ...data.rates };
  } catch (_) {
    // Fallback approximate rates
    exchangeRates = { INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0095, JPY: 1.77 };
  }
}

function convert(inrAmount) {
  return inrAmount * (exchangeRates[state.currency] || 1);
}

function fmt(inrAmount) {
  const val = convert(inrAmount);
  const sym = SYMBOLS[state.currency] || state.currency;
  if (state.currency === 'JPY') return sym + Math.round(val).toLocaleString();
  return sym + val.toFixed(2);
}

document.getElementById('currencySelect').addEventListener('change', function () {
  state.currency = this.value;
  document.getElementById('currBadge').textContent = state.currency;
  render();
});

// ── SALARY ─────────────────────────────────────────────────────────────
function setSalary() {
  const val = Number(document.getElementById('salaryInput').value);
  if (isNaN(val) || val < 0) return;
  state.salaryINR = val;
  document.getElementById('salaryInput').value = '';
  save();
  render();
}

// ── EXPENSE ────────────────────────────────────────────────────────────
function addExpense() {
  const name   = document.getElementById('expenseName').value.trim();
  const amount = Number(document.getElementById('expenseAmount').value);

  if (!name)               { showError('Expense name cannot be empty.');        return; }
  if (!amount || amount <= 0) { showError('Amount must be a positive number.'); return; }

  document.getElementById('formError').style.display = 'none';

  state.expenses.push({
    id:        Date.now(),
    name,
    amountINR: amount,
    date:      new Date().toLocaleDateString('en-IN', {
                 day: '2-digit', month: 'short', year: 'numeric'
               })
  });

  document.getElementById('expenseName').value   = '';
  document.getElementById('expenseAmount').value = '';
  save();
  render();
}

function deleteExpense(id) {
  state.expenses = state.expenses.filter(e => e.id !== id);
  save();
  render();
}

function showError(msg) {
  const el      = document.getElementById('formError');
  el.textContent   = msg;
  el.style.display = 'block';
  setTimeout(() => (el.style.display = 'none'), 3000);
}

// ── RENDER ─────────────────────────────────────────────────────────────
function render() {
  const totalExpINR = state.expenses.reduce((s, e) => s + e.amountINR, 0);
  const balanceINR  = state.salaryINR - totalExpINR;

  // Stat values
  document.getElementById('displaySalary').textContent   = fmt(state.salaryINR);
  document.getElementById('displayExpenses').textContent = fmt(totalExpINR);

  const balEl = document.getElementById('displayBalance');
  balEl.textContent = fmt(balanceINR);

  // Budget alert — trigger when balance ≤ 10 % of salary
  const alertEl   = document.getElementById('budgetAlert');
  const balCard   = document.getElementById('balanceCard');
  const threshold = state.salaryINR * 0.1;

  if (state.salaryINR > 0 && balanceINR <= threshold) {
    alertEl.classList.add('show');
    balEl.classList.add('danger');
    balCard.classList.add('alert-mode');
  } else {
    alertEl.classList.remove('show');
    balEl.classList.remove('danger');
    balCard.classList.remove('alert-mode');
  }

  // Expense list
  const list = document.getElementById('expenseList');
  if (state.expenses.length === 0) {
    list.innerHTML = '<p class="empty-msg">No expenses yet. Add one above.</p>';
  } else {
    list.innerHTML = state.expenses.map(e => `
      <div class="expense-item">
        <div style="flex:1; min-width:0;">
          <div class="expense-name">${escHtml(e.name)}</div>
          <div class="expense-date">${e.date}</div>
        </div>
        <div class="expense-amount">${fmt(e.amountINR)}</div>
        <button class="trash-btn" onclick="deleteExpense(${e.id})" title="Delete expense">🗑</button>
      </div>
    `).join('');
  }

  renderChart(totalExpINR, balanceINR);
}

function escHtml(s) {
  return s
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

// ── CHART ──────────────────────────────────────────────────────────────
function renderChart(totalExp, balance) {
  const ctx       = document.getElementById('pieChart').getContext('2d');
  const hasSalary = state.salaryINR > 0;
  const isDark    = state.darkMode;

  // Colours adapt to theme
  const balColor  = isDark ? '#2de8a8' : '#12c98a';
  const expColor  = isDark ? '#ff6b8a' : '#f05a7e';
  const textColor = isDark ? '#ddeaf8' : '#182a46';
  const borderCol = isDark ? '#1c2432' : '#ffffff';

  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Remaining Balance', 'Total Expenses'],
      datasets: [{
        data:            hasSalary ? [Math.max(balance, 0), totalExp] : [1, 0],
        backgroundColor: [balColor, expColor],
        borderColor:     borderCol,
        borderWidth:     4,
        hoverOffset:     8
      }]
    },
    options: {
      cutout: '66%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color:        textColor,
            font:         { family: 'Syne', size: 12, weight: '700' },
            padding:      18,
            boxWidth:     12,
            boxHeight:    12,
            borderRadius: 4
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = hasSalary
                ? (ctx.dataIndex === 0 ? Math.max(balance, 0) : totalExp)
                : 0;
              return `  ${ctx.label}: ${fmt(val)}`;
            }
          }
        }
      },
      animation: { animateRotate: true, duration: 550 }
    }
  });
}

// ── PDF EXPORT ─────────────────────────────────────────────────────────
function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc       = new jsPDF({ unit: 'pt', format: 'a4' });
  const totalExp  = state.expenses.reduce((s, e) => s + e.amountINR, 0);
  const balance   = state.salaryINR - totalExp;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(43, 142, 240);
  doc.text('CashFlow Report', 40, 50);

  // Metadata line
  doc.setFontSize(10);
  doc.setTextColor(120, 140, 170);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated: ${new Date().toLocaleString('en-IN')}  |  Currency: ${state.currency}`,
    40, 68
  );

  doc.setDrawColor(200, 220, 245);
  doc.line(40, 76, 555, 76);

  // Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(24, 42, 70);
  doc.text('Summary', 40, 100);

  const sumRows = [
    ['Total Salary',      fmt(state.salaryINR)],
    ['Total Expenses',    fmt(totalExp)],
    ['Remaining Balance', fmt(balance)]
  ];

  let y = 118;
  sumRows.forEach(([k, v]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 130, 160);
    doc.text(k, 50, y);
    doc.setTextColor(24, 42, 70);
    doc.text(v, 220, y);
    y += 18;
  });

  doc.line(40, y + 4, 555, y + 4);
  y += 22;

  // Expense table header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(24, 42, 70);
  doc.text('Expense List', 40, y);
  y += 18;

  doc.setFillColor(234, 244, 255);
  doc.rect(40, y - 13, 515, 19, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(90, 130, 170);
  doc.text('#',      48,  y);
  doc.text('Name',   70,  y);
  doc.text('Amount', 360, y);
  doc.text('Date',   450, y);
  y += 8;

  // Expense rows
  state.expenses.forEach((e, i) => {
    if (y > 760) { doc.addPage(); y = 50; }
    if (i % 2 === 0) {
      doc.setFillColor(248, 252, 255);
      doc.rect(40, y - 12, 515, 17, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 70, 110);
    doc.text(String(i + 1),           48,  y);
    doc.text(e.name.substring(0, 38), 70,  y);
    doc.text(fmt(e.amountINR),        360, y);
    doc.text(e.date,                  450, y);
    y += 16;
  });

  if (state.expenses.length === 0) {
    doc.setTextColor(160, 180, 200);
    doc.setFontSize(9);
    doc.text('No expenses recorded.', 50, y);
  }

  doc.save('cashflow-report.pdf');
}

// ── CLEAR ALL ──────────────────────────────────────────────────────────
function clearAll() {
  if (!confirm('Reset all data? This cannot be undone.')) return;
  state.salaryINR = 0;
  state.expenses  = [];
  save();
  render();
}

// ── INIT ───────────────────────────────────────────────────────────────
(async () => {
  load();
  applyTheme();
  await fetchRates();
  render();
})();

// Enter-key shortcuts
document.getElementById('salaryInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') setSalary();
});
document.getElementById('expenseName').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('expenseAmount').focus();
});
document.getElementById('expenseAmount').addEventListener('keydown', e => {
  if (e.key === 'Enter') addExpense();
});