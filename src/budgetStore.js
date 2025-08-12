const STORAGE_KEY = 'expenseTrackerPerMonthBudgets';

export function loadBudgetStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveBudgetStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getMonthBudget(store, monthKey) {
  return Number(store?.[monthKey] || 0);
}

export function setMonthBudget(store, monthKey, amount) {
  const next = { ...(store || {}) };
  next[monthKey] = Number(amount) || 0;
  return next;
}

export function applyMonthOffset(store, monthKey, delta) {
  const next = { ...(store || {}) };
  const curr = Number(next[monthKey] || 0);
  next[monthKey] = Math.max(0, curr + Number(delta || 0));
  return next;
}