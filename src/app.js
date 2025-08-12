import { formatDateDisplay } from './utils.js';
import { getMonthKey, getCurrentMonthBudget, getDaysRemainingInMonth, getMonthlySpent, calculateDynamicDailyBudget } from './budget.js';
import { initializeCalendar, refreshCalendar, getDayBudgetStatus } from './calendar.js';

class ExpenseTracker {
  constructor() {
    this.expenses = this.loadExpenses();
    this.budgets = this.loadBudgets();
    this.calendar = null;

    this.initializeElements();
    this.bindEvents();
    this.initializeCalendar();
    this.setTodayAsDefault();
    this.updateBudgetDisplay();
  }

  initializeElements() {
    this.expenseForm = document.getElementById('expenseForm');
    this.expenseDateInput = document.getElementById('expenseDate');
    this.expenseAmountInput = document.getElementById('expenseAmount');
    this.expenseCategorySelect = document.getElementById('expenseCategory');
    this.expenseDescriptionInput = document.getElementById('expenseDescription');
    this.expenseModal = document.getElementById('expenseModal');
    this.closeModalBtn = document.getElementById('closeModal');
    this.modalDate = document.getElementById('modalDate');
    this.modalExpenses = document.getElementById('modalExpenses');
    this.modalTotal = document.getElementById('modalTotal');
    this.modalBudgetStatus = document.getElementById('modalBudgetStatus');

    // Budget elements
    this.budgetAmount = document.getElementById('budgetAmount');
    this.dailyBudget = document.getElementById('dailyBudget');
    this.manageBudgetBtn = document.getElementById('manageBudgetBtn');
    this.budgetModal = document.getElementById('budgetModal');
    this.closeBudgetModalBtn = document.getElementById('closeBudgetModal');
    this.budgetMonth = document.getElementById('budgetMonth');
    this.budgetAmountInput = document.getElementById('budgetAmountInput');
    this.applyToAllMonths = document.getElementById('applyToAllMonths');
    this.setBudgetBtn = document.getElementById('setBudgetBtn');
    this.budgetOffset = document.getElementById('budgetOffset');
    this.applyOffsetBtn = document.getElementById('applyOffsetBtn');
    this.summaryOriginalBudget = document.getElementById('summaryOriginalBudget');
    this.summaryTotalSpent = document.getElementById('summaryTotalSpent');
    this.summaryRemaining = document.getElementById('summaryRemaining');
    this.summaryDaysLeft = document.getElementById('summaryDaysLeft');

    // Confirmation modal elements
    this.confirmationModal = document.getElementById('confirmationModal');
    this.confirmationMessage = document.getElementById('confirmationMessage');
    this.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    this.cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

    this.expenseToDelete = null;
  }

  bindEvents() {
    this.expenseForm.addEventListener('submit', (e) => this.handleExpenseSubmit(e));
    this.closeModalBtn.addEventListener('click', () => this.closeModal());
    this.expenseModal.addEventListener('click', (e) => {
      if (e.target === this.expenseModal) this.closeModal();
    });

    // Budget events
    this.manageBudgetBtn.addEventListener('click', () => this.openBudgetModal());
    this.closeBudgetModalBtn.addEventListener('click', () => this.closeBudgetModal());
    this.budgetModal.addEventListener('click', (e) => {
      if (e.target === this.budgetModal) this.closeBudgetModal();
    });
    this.setBudgetBtn.addEventListener('click', () => this.setBudget());
    this.applyOffsetBtn.addEventListener('click', () => this.applyOffset());

    // Confirmation modal events
    this.confirmDeleteBtn.addEventListener('click', () => this.confirmDeleteExpense());
    this.cancelDeleteBtn.addEventListener('click', () => this.closeConfirmationModal());
    this.confirmationModal.addEventListener('click', (e) => {
      if (e.target === this.confirmationModal) this.closeConfirmationModal();
    });

    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        this.closeBudgetModal();
        this.closeConfirmationModal();
      }
    });
  }

  initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    this.calendar = initializeCalendar(
      calendarEl,
      () => this.expenses,
      () => this.budgets,
      (info) => this.handleDateClick(info),
      (info) => this.handleEventClick(info)
    );
  }

  setTodayAsDefault() {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    this.expenseDateInput.value = todayString;
  }

  loadExpenses() {
    const stored = localStorage.getItem('expenseTrackerData');
    return stored ? JSON.parse(stored) : {};
  }

  saveExpenses() {
    localStorage.setItem('expenseTrackerData', JSON.stringify(this.expenses));
  }

  loadBudgets() {
    const stored = localStorage.getItem('expenseTrackerBudgets');
    return stored
      ? JSON.parse(stored)
      : {
          monthlyBudgets: {},
          defaultBudget: 0,
          useDefault: false,
        };
  }

  saveBudgets() {
    localStorage.setItem('expenseTrackerBudgets', JSON.stringify(this.budgets));
  }

  getCurrentMonthBudget() {
    return getCurrentMonthBudget(this.budgets, new Date());
  }

  calculateDynamicDailyBudget() {
    return calculateDynamicDailyBudget(this.expenses, this.budgets, new Date());
  }

  getDayBudgetStatus(dateKey, dayTotal) {
    const dynamicDaily = this.calculateDynamicDailyBudget();
    if (dynamicDaily <= 0) return 'no-budget';
    const tolerance = dynamicDaily * 0.1;
    if (dayTotal <= dynamicDaily - tolerance) return 'under-budget';
    if (dayTotal >= dynamicDaily + tolerance) return 'over-budget';
    return 'on-budget';
  }

  refreshCalendar() {
    refreshCalendar(this.calendar, () => this.expenses, () => this.budgets);
  }

  handleDateClick(info) {
    this.expenseDateInput.value = info.dateStr;
    setTimeout(() => this.expenseAmountInput.focus(), 100);
    this.closeModal();
    if (window.innerWidth <= 768) {
      document.querySelector('.expense-form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  handleEventClick(info) {
    const dateStr = info.event.startStr;
    this.showExpenseModal(dateStr);
    info.jsEvent.preventDefault();
  }

  showExpenseModal(dateKey) {
    const expenses = this.expenses[dateKey] || [];
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const budgetStatus = getDayBudgetStatus(this.expenses, this.budgets, dateKey);
    const dailyBudget = this.calculateDynamicDailyBudget();

    this.modalDate.textContent = formatDateDisplay(dateKey);
    this.modalTotal.textContent = total.toFixed(2);

    this.modalExpenses.innerHTML =
      expenses.length === 0
        ? '<p style="text-align: center; color: #6c757d; font-style: italic;">No expenses for this day</p>'
        : expenses
            .map(
              (expense) => `
                <div class="expense-item" data-expense-id="${expense.id}" data-date="${dateKey}">
                    <button class="delete-expense-btn" onclick="expenseTracker.showDeleteConfirmation('${dateKey}', '${expense.id}')" title="Delete expense">×</button>
                    <div class="expense-item-header">
                        <span class="expense-category">${expense.category}</span>
                        <span class="expense-amount">₹${expense.amount.toFixed(2)}</span>
                    </div>
                    ${expense.description ? `<div class="expense-description">${expense.description}</div>` : ''}
                </div>
            `
            )
            .join('');

    if (dailyBudget > 0 && total > 0) {
      let statusText = '';
      let statusClass = '';
      if (budgetStatus === 'over-budget') {
        statusText = `🚨 Over Budget: ₹${(total - dailyBudget).toFixed(2)} over daily target of ₹${dailyBudget.toFixed(2)}`;
        statusClass = 'over-budget';
      } else if (budgetStatus === 'under-budget') {
        statusText = `✅ Under Budget: ₹${(dailyBudget - total).toFixed(2)} under daily target of ₹${dailyBudget.toFixed(2)}`;
        statusClass = 'under-budget';
      } else if (budgetStatus === 'on-budget') {
        statusText = `⚠️ On Budget: Close to daily target of ₹${dailyBudget.toFixed(2)}`;
        statusClass = 'on-budget';
      }
      this.modalBudgetStatus.innerHTML = statusText;
      this.modalBudgetStatus.className = `budget-status ${statusClass}`;
      this.modalBudgetStatus.style.display = 'block';
    } else {
      this.modalBudgetStatus.style.display = 'none';
    }

    this.expenseModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.expenseModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  openBudgetModal() {
    const today = new Date();
    this.budgetMonth.value = today.toISOString().slice(0, 7);
    this.updateBudgetSummary();
    this.budgetModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  closeBudgetModal() {
    this.budgetModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  updateBudgetDisplay() {
    const monthBudget = this.getCurrentMonthBudget();
    const dailyBudget = this.calculateDynamicDailyBudget();
    this.budgetAmount.textContent = `₹${monthBudget.toFixed(0)}`;
    this.dailyBudget.textContent = `₹${dailyBudget.toFixed(0)}`;
  }

  updateBudgetSummary() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const monthBudget = this.getCurrentMonthBudget();
    const totalSpent = getMonthlySpent(this.expenses, year, month);
    const remaining = monthBudget - totalSpent;
    const daysLeft = getDaysRemainingInMonth(today);

    this.summaryOriginalBudget.textContent = `₹${monthBudget.toFixed(2)}`;
    this.summaryTotalSpent.textContent = `₹${totalSpent.toFixed(2)}`;
    this.summaryRemaining.textContent = `₹${remaining.toFixed(2)}`;
    this.summaryDaysLeft.textContent = daysLeft;
  }

  setBudget() {
    const monthKey = this.budgetMonth.value;
    const amount = parseFloat(this.budgetAmountInput.value);
    const applyToAll = this.applyToAllMonths.checked;

    if (!monthKey || !amount || amount < 0) {
      alert('Please enter a valid month and budget amount');
      return;
    }

    if (applyToAll) {
      this.budgets.defaultBudget = amount;
      this.budgets.useDefault = true;
    } else {
      this.budgets.monthlyBudgets[monthKey] = amount;
    }

    this.saveBudgets();
    this.updateBudgetDisplay();
    this.updateBudgetSummary();
    this.refreshCalendar();

    this.budgetAmountInput.value = '';
    this.applyToAllMonths.checked = false;

    this.showSuccessMessage('Budget updated successfully!');
  }

  applyOffset() {
    const offset = parseFloat(this.budgetOffset.value);
    if (isNaN(offset) || offset === 0) {
      alert('Please enter a valid offset amount');
      return;
    }

    const today = new Date();
    const monthKey = getMonthKey(today);
    const currentBudget = this.getCurrentMonthBudget();

    if (currentBudget <= 0) {
      alert('Please set a budget for this month first');
      return;
    }

    const newBudget = currentBudget + offset;
    if (newBudget < 0) {
      alert('Offset would result in negative budget');
      return;
    }

    this.budgets.monthlyBudgets[monthKey] = newBudget;
    this.saveBudgets();
    this.updateBudgetDisplay();
    this.updateBudgetSummary();
    this.refreshCalendar();

    this.budgetOffset.value = '';
    this.showSuccessMessage(`Budget adjusted by ₹${offset.toFixed(2)}`);
  }

  showDeleteConfirmation(dateKey, expenseId) {
    const expense = this.expenses[dateKey]?.find((exp) => exp.id === expenseId);
    if (!expense) {
      alert('Expense not found');
      return;
    }

    this.expenseToDelete = { dateKey, expenseId, expense };
    this.confirmationMessage.innerHTML = `
            Are you sure you want to delete this expense?<br>
            <strong>${getCategoryEmoji(expense.category)} ${expense.category}: ₹${expense.amount.toFixed(2)}</strong>
            ${expense.description ? `<br><em>"${expense.description}"</em>` : ''}
        `;

    this.confirmationModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  closeConfirmationModal() {
    this.confirmationModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    this.expenseToDelete = null;
  }

  confirmDeleteExpense() {
    if (!this.expenseToDelete) {
      this.closeConfirmationModal();
      return;
    }

    const { dateKey, expenseId, expense } = this.expenseToDelete;
    this.expenses[dateKey] = this.expenses[dateKey].filter((exp) => exp.id !== expenseId);
    if (this.expenses[dateKey].length === 0) {
      delete this.expenses[dateKey];
    }

    this.saveExpenses();
    this.updateBudgetDisplay();
    this.refreshCalendar();
    this.showExpenseModal(dateKey);
    this.closeConfirmationModal();
    this.showSuccessMessage(`Expense deleted: ${getCategoryEmoji(expense.category)} ₹${expense.amount.toFixed(2)}`);
  }

  handleExpenseSubmit(e) {
    e.preventDefault();

    const date = this.expenseDateInput.value;
    const amountStr = this.expenseAmountInput.value.trim();
    const description = this.expenseDescriptionInput.value.trim();
    const category = this.expenseCategorySelect.value || 'other';

    if (!date || !amountStr) {
      alert('Please fill in date and amount fields');
      return;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
      alert('Please enter a valid positive amount');
      return;
    }

    // default category handled above

    const timestamp = new Date().toISOString();
    if (!this.expenses[date]) {
      this.expenses[date] = [];
    }

    const expense = {
      id: `${Date.now()}-0`,
      amount: amount,
      category: category,
      description: description,
      timestamp: timestamp,
    };

    this.expenses[date].push(expense);

    this.saveExpenses();
    this.updateBudgetDisplay();
    this.refreshCalendar();

    this.expenseAmountInput.value = '';
    this.expenseCategorySelect.value = '';
    this.expenseDescriptionInput.value = '';

    this.showSuccessMessage(`Expense added: ₹${amount.toFixed(2)}`);
    this.expenseAmountInput.focus();
  }

  showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.textContent = message;
    successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
            z-index: 10000;
            font-weight: 600;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

    document.body.appendChild(successDiv);
    setTimeout(() => {
      successDiv.style.transform = 'translateX(0)';
    }, 100);
    setTimeout(() => {
      successDiv.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (successDiv.parentNode) {
          document.body.removeChild(successDiv);
        }
      }, 300);
    }, 3000);
  }
}

import { initThemeToggle } from './theme.js';

let expenseTracker;
document.addEventListener('DOMContentLoaded', () => {
  window.expenseTracker = new ExpenseTracker();
  initThemeToggle('themeToggleBtn');
});