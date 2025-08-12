export function getMonthKey(date) {
  return date.toISOString().slice(0, 7);
}

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function getDaysRemainingInMonth(today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const totalDays = getDaysInMonth(year, month);
  const daysPassed = today.getDate();
  return totalDays - daysPassed + 1; // include today
}

export function getMonthlySpent(expenses, year, month) {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  let totalSpent = 0;

  Object.keys(expenses).forEach((dateKey) => {
    const expenseDate = new Date(dateKey + 'T00:00:00');
    if (expenseDate >= monthStart && expenseDate <= monthEnd) {
      totalSpent += expenses[dateKey].reduce((sum, expense) => sum + expense.amount, 0);
    }
  });

  return totalSpent;
}

export function getCurrentMonthBudget(budgets, today = new Date()) {
  const monthKey = getMonthKey(today);
  if (budgets.monthlyBudgets[monthKey]) {
    return budgets.monthlyBudgets[monthKey];
  }
  if (budgets.useDefault && budgets.defaultBudget > 0) {
    return budgets.defaultBudget;
  }
  return 0;
}

export function calculateDynamicDailyBudget(expenses, budgets, today = new Date()) {
  const monthBudget = getCurrentMonthBudget(budgets, today);
  if (monthBudget <= 0) return 0;

  const year = today.getFullYear();
  const month = today.getMonth();
  const totalSpent = getMonthlySpent(expenses, year, month);
  const remainingBudget = monthBudget - totalSpent;
  const daysRemaining = getDaysRemainingInMonth(today);
  if (daysRemaining <= 0) return 0;
  return Math.max(0, remainingBudget / daysRemaining);
}