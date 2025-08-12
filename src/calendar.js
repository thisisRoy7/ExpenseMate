import { calculateDynamicDailyBudget } from './budget.js';
import { getDailyTargetForDate } from './monthManager.js';

export function getDayBudgetStatus(expenses, budgets, dateKey, snapshots) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dailyBudget = getDailyTargetForDate(expenses, budgets, snapshots || {}, dateObj);
  const dayExpenses = expenses[dateKey] || [];
  const dayTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);
  if (dailyBudget <= 0) return 'no-budget';
  const tolerance = dailyBudget * 0.1;
  if (dayTotal <= dailyBudget - tolerance) return 'under-budget';
  if (dayTotal >= dailyBudget + tolerance) return 'over-budget';
  return 'on-budget';
}

export function getEventsFromExpenses(expenses, budgets, snapshots) {
  const events = [];
  Object.keys(expenses).forEach((dateKey) => {
    const dayExpenses = expenses[dateKey];
    const totalAmount = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    if (dayExpenses.length === 0) return;

    const budgetStatus = getDayBudgetStatus(expenses, budgets, dateKey, snapshots);
    const [y, m, d] = dateKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dailyBudget = getDailyTargetForDate(expenses, budgets, snapshots || {}, dateObj);

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

export function initializeCalendar(calendarEl, expensesRef, budgetsRef, onDateClick, onEventClick, snapshotsRef) {
  const events = getEventsFromExpenses(expensesRef(), budgetsRef(), snapshotsRef ? snapshotsRef() : {});
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
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${day}`;
      const expenses = expensesRef();
      const budgets = budgetsRef();
      const snapshots = snapshotsRef ? snapshotsRef() : {};
      const items = expenses[dateKey] || [];
      if (items.length === 0) return [];
      const daily = getDailyTargetForDate(expenses, budgets, snapshots, d);
      const total = items.reduce((s, e) => s + e.amount, 0);
      if (daily <= 0) return [];
      if (total > daily) return ['day-over'];
      if (total >= daily * 0.9) return ['day-warning'];
      return ['day-under'];
    },
  });
  calendar.render();
  return calendar;
}

export function refreshCalendar(calendar, expensesRef, budgetsRef, snapshotsRef) {
  if (!calendar) return;
  calendar.removeAllEvents();
  const events = getEventsFromExpenses(expensesRef(), budgetsRef(), snapshotsRef ? snapshotsRef() : {});
  calendar.addEventSource(events);
}