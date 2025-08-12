import { calculateDynamicDailyBudget } from './budget.js';
import { getCategoryEmoji } from './utils.js';

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

    let backgroundColor = '#28a745';
    let borderColor = '#1e7e34';
    let statusIcon = '💰';

    if (budgetStatus === 'over-budget') {
      backgroundColor = '#dc3545';
      borderColor = '#c82333';
      statusIcon = '🚨';
    } else if (budgetStatus === 'on-budget') {
      backgroundColor = '#ffc107';
      borderColor = '#e0a800';
      statusIcon = '⚠️';
    } else if (budgetStatus === 'under-budget') {
      backgroundColor = '#28a745';
      borderColor = '#1e7e34';
      statusIcon = '✅';
    }

    let title = `${statusIcon} ₹${totalAmount.toFixed(2)} (${dayExpenses.length} items)`;
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