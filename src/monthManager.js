const SNAPSHOT_KEY = 'expenseTrackerMonthSnapshots';

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function loadMonthSnapshots() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveMonthSnapshots(snapshots) {
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots));
}

export function isMonthBeforeCurrent(date, today = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const ty = today.getFullYear();
  const tm = today.getMonth();
  return y < ty || (y === ty && m < tm);
}

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function computeMonthlySpent(expenses, year, month) {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  let total = 0;
  Object.keys(expenses).forEach((dateKey) => {
    const [yy, mm, dd] = dateKey.split('-').map(Number);
    const d = new Date(yy, mm - 1, dd);
    if (d >= monthStart && d <= monthEnd) {
      total += expenses[dateKey].reduce((s, e) => s + e.amount, 0);
    }
  });
  return total;
}

export function ensureClosedSnapshots(expenses, budgets, snapshots, today = new Date()) {
  const result = { ...snapshots };
  // Consider months seen in expenses or explicit monthlyBudgets
  const monthKeys = new Set();
  Object.keys(expenses).forEach((dateKey) => monthKeys.add(dateKey.slice(0, 7)));
  Object.keys(budgets?.monthlyBudgets || {}).forEach((mk) => monthKeys.add(mk));

  for (const mk of monthKeys) {
    const [y, m] = mk.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    if (isMonthBeforeCurrent(d, today)) {
      if (!result[mk] || !result[mk].closed) {
        const monthBudget = budgets?.monthlyBudgets?.[mk] ?? (budgets?.useDefault ? budgets?.defaultBudget || 0 : 0);
        const spent = computeMonthlySpent(expenses, y, m - 1);
        const days = getDaysInMonth(y, m - 1);
        result[mk] = { budget: monthBudget, spent, daysInMonth: days, closed: true };
      }
    }
  }
  return result;
}

export function getMonthBudgetForDate(date, budgets, snapshots) {
  const mk = getMonthKey(date);
  if (snapshots?.[mk]?.closed) return snapshots[mk].budget || 0;
  return budgets?.monthlyBudgets?.[mk] ?? (budgets?.useDefault ? budgets?.defaultBudget || 0 : 0);
}

function computeSpentUpToDate(expenses, date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  let total = 0;
  Object.keys(expenses).forEach((dateKey) => {
    const [yy, mm, dd] = dateKey.split('-').map(Number);
    if (yy === y && mm - 1 === m && dd < d) {
      total += expenses[dateKey].reduce((s, e) => s + e.amount, 0);
    }
  });
  return total;
}

export function getDailyTargetForDate(expenses, budgets, snapshots, date) {
  const mk = getMonthKey(date);
  const y = date.getFullYear();
  const m = date.getMonth();
  const daysInMonth = getDaysInMonth(y, m);
  // Closed month: static daily target from snapshot
  if (snapshots?.[mk]?.closed) {
    const budget = snapshots[mk].budget || 0;
    return budget > 0 ? budget / (snapshots[mk].daysInMonth || daysInMonth) : 0;
  }
  // Current or future month
  const monthBudget = getMonthBudgetForDate(date, budgets, snapshots);
  if (monthBudget <= 0) return 0;
  const spentToDate = computeSpentUpToDate(expenses, date);
  const daysRemaining = daysInMonth - date.getDate() + 1; // include this date
  if (daysRemaining <= 0) return 0;
  const remaining = monthBudget - spentToDate;
  return Math.max(0, remaining / daysRemaining);
}