import { calculateDynamicDailyBudget } from './budget.js';

export function getDayBudgetStatus(expenses, budgets, dateKey) {
  const dailyBudget = calculateDynamicDailyBudget(expenses, budgets);
  const dayExpenses = expenses[dateKey] || [];
  const dayTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);
  if (dailyBudget <= 0) return 'no-budget';
  const tolerance = dailyBudget * 0.1;
  if (dayTotal <= dailyBudget - tolerance) return 'under-budget';
  if (dayTotal >= dailyBudget + tolerance) return 'over-budget';
  return 'on-budget';
}

export function getEventsFromExpenses(expenses, budgets) {
  const events = [];
  Object.keys(expenses).forEach((dateKey) => {
    const dayExpenses = expenses[dateKey];
    const totalAmount = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    if (dayExpenses.length === 0) return;

    const budgetStatus = getDayBudgetStatus(expenses, budgets, dateKey);
    const dailyBudget = calculateDynamicDailyBudget(expenses, budgets);

    let backgroundColor = '#111111';
    let borderColor = '#111111';
    if (budgetStatus === 'over-budget') {
      backgroundColor = '#cc0000';
      borderColor = '#cc0000';
    } else if (budgetStatus === 'on-budget') {
      backgroundColor = '#666666';
      borderColor = '#666666';
    } else if (budgetStatus === 'under-budget') {
      backgroundColor = '#e5e5e5';
      borderColor = '#111111';
    }

    let title = `₹${totalAmount.toFixed(2)} (${dayExpenses.length} items)`;
    if (dailyBudget > 0) {
      title += ` / ₹${dailyBudget.toFixed(0)}`;
    }

    events.push({
      id: `summary-${dateKey}`,
      title,
      date: dateKey,
      backgroundColor,
      borderColor,
      classNames: [budgetStatus],
      extendedProps: {
        type: 'summary',
        expenses: dayExpenses,
        total: totalAmount,
        budgetStatus,
        dailyBudget,
      },
    });
  });
  return events;
}

export function initializeCalendar(calendarEl, expensesRef, budgetsRef, onDateClick, onEventClick) {
  const events = getEventsFromExpenses(expensesRef(), budgetsRef());
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek',
    },
    height: 'auto',
    events,
    dateClick: (info) => onDateClick(info),
    eventClick: (info) => onEventClick(info),
    dayMaxEvents: 3,
    moreLinkClick: 'popover',
    displayEventTime: false,
    eventDisplay: 'block',
    dayCellClassNames: (arg) => {
      const d = arg.date;
      const dateKey = d.toISOString().split('T')[0];
      const expenses = expensesRef();
      const budgets = budgetsRef();
      const items = expenses[dateKey] || [];
      if (items.length === 0) return [];
      const total = items.reduce((s, e) => s + e.amount, 0);
      const daily = calculateDynamicDailyBudget(expenses, budgets);
      if (daily <= 0) return [];
      if (total > daily) return ['day-over'];
      if (total >= daily * 0.9) return ['day-warning'];
      return ['day-under'];
    },
  });
  calendar.render();
  return calendar;
}

export function refreshCalendar(calendar, expensesRef, budgetsRef) {
  if (!calendar) return;
  calendar.removeAllEvents();
  const events = getEventsFromExpenses(expensesRef(), budgetsRef());
  calendar.addEventSource(events);
}