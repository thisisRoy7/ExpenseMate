const KEY_PREFIX = 'EM:month:';

export function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function readContainer(monthKey) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + monthKey);
    if (!raw) return createDefaultContainer(monthKey);
    const parsed = JSON.parse(raw);
    return normalizeContainer(monthKey, parsed);
  } catch {
    return createDefaultContainer(monthKey);
  }
}

export function writeContainer(monthKey, container) {
  const toWrite = normalizeContainer(monthKey, container);
  toWrite.updatedAt = new Date().toISOString();
  localStorage.setItem(KEY_PREFIX + monthKey, JSON.stringify(toWrite));
  return toWrite;
}

export function ensureContainer(monthKey) {
  const existing = readContainer(monthKey);
  if (!existing.createdAt) {
    existing.createdAt = new Date().toISOString();
  }
  return writeContainer(monthKey, existing);
}

export function setBudget(monthKey, amount) {
  const c = ensureContainer(monthKey);
  c.budget = Math.max(0, Number(amount) || 0);
  return writeContainer(monthKey, c);
}

export function applyOffset(monthKey, delta) {
  const c = ensureContainer(monthKey);
  const next = (Number(c.budget) || 0) + (Number(delta) || 0);
  c.budget = Math.max(0, next);
  return writeContainer(monthKey, c);
}

export function getBudget(monthKey) {
  const c = readContainer(monthKey);
  return Number(c.budget) || 0;
}

export function getDaysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function computeMonthlySpent(expenses, year, monthIndex) {
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
  let total = 0;
  Object.keys(expenses || {}).forEach((dateKey) => {
    const [yy, mm, dd] = dateKey.split('-').map(Number);
    const d = new Date(yy, (mm || 1) - 1, dd || 1);
    if (d >= monthStart && d <= monthEnd) {
      total += (expenses[dateKey] || []).reduce((s, e) => s + e.amount, 0);
    }
  });
  return total;
}

function computeSpentUpToDate(expenses, date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  let total = 0;
  Object.keys(expenses || {}).forEach((dateKey) => {
    const [yy, mm, dd] = dateKey.split('-').map(Number);
    if (yy === y && (mm - 1) === m && dd <= d) {
      total += (expenses[dateKey] || []).reduce((s, e) => s + e.amount, 0);
    }
  });
  return total;
}

export function computeDailyTargetForDate(expenses, date) {
  const mk = getMonthKey(date);
  const budget = getBudget(mk);
  if (budget <= 0) return 0;

  const today = new Date();
  const y = date.getFullYear();
  const m = date.getMonth();
  const dim = getDaysInMonth(y, m);

  if (y < today.getFullYear() || (y === today.getFullYear() && m < today.getMonth())) {
    // Past month: static per-day
    return budget / dim;
  }

  // Current/future month: dynamic remaining per remaining days including this date
  const spentToDate = computeSpentUpToDate(expenses, date);
  const remainingDays = dim - date.getDate() + 1;
  if (remainingDays <= 0) return 0;
  const remainingBudget = budget - spentToDate;
  return Math.max(0, remainingBudget / remainingDays);
}

function createDefaultContainer(monthKey) {
  return normalizeContainer(monthKey, { monthKey, budget: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
}

function normalizeContainer(monthKey, obj) {
  return {
    monthKey,
    budget: Number(obj?.budget || 0),
    createdAt: obj?.createdAt || null,
    updatedAt: obj?.updatedAt || null,
  };
}