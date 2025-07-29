class ExpenseTracker {
    constructor() {
        this.currentDate = new Date();
        this.expenses = this.loadExpenses();
        this.selectedDate = null;
        
        this.initializeElements();
        this.bindEvents();
        this.renderCalendar();
        this.setTodayAsDefault();
    }

    initializeElements() {
        this.calendarGrid = document.getElementById('calendarGrid');
        this.currentMonthElement = document.getElementById('currentMonth');
        this.prevMonthBtn = document.getElementById('prevMonth');
        this.nextMonthBtn = document.getElementById('nextMonth');
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
    }

    bindEvents() {
        this.prevMonthBtn.addEventListener('click', () => this.previousMonth());
        this.nextMonthBtn.addEventListener('click', () => this.nextMonth());
        this.expenseForm.addEventListener('submit', (e) => this.handleExpenseSubmit(e));
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.expenseModal.addEventListener('click', (e) => {
            if (e.target === this.expenseModal) this.closeModal();
        });
        
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
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

    formatDateKey(date) {
        return date.toISOString().split('T')[0];
    }

    formatDateDisplay(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return date.toLocaleDateString('en-US', options);
    }

    getCategoryEmoji(category) {
        const emojis = {
            food: '🍔',
            transport: '🚗',
            entertainment: '🎬',
            shopping: '🛍️',
            bills: '📄',
            healthcare: '🏥',
            other: '📝'
        };
        return emojis[category] || '📝';
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Update month display
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        this.currentMonthElement.textContent = `${monthNames[month]} ${year}`;

        // Clear calendar grid
        this.calendarGrid.innerHTML = '';

        // Get first day of month and number of days
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const firstDayWeekday = firstDayOfMonth.getDay();
        const daysInMonth = lastDayOfMonth.getDate();

        // Add days from previous month
        const prevMonth = new Date(year, month - 1, 0);
        const daysInPrevMonth = prevMonth.getDate();
        
        for (let i = firstDayWeekday - 1; i >= 0; i--) {
            const dayNumber = daysInPrevMonth - i;
            const dayElement = this.createDayElement(dayNumber, true, year, month - 1);
            this.calendarGrid.appendChild(dayElement);
        }

        // Add days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = this.createDayElement(day, false, year, month);
            this.calendarGrid.appendChild(dayElement);
        }

        // Add days from next month to fill the grid
        const totalCells = this.calendarGrid.children.length;
        const remainingCells = 42 - totalCells; // 6 rows × 7 days = 42 cells
        
        for (let day = 1; day <= remainingCells; day++) {
            const dayElement = this.createDayElement(day, true, year, month + 1);
            this.calendarGrid.appendChild(dayElement);
        }
    }

    createDayElement(dayNumber, isOtherMonth, year, month) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        if (isOtherMonth) {
            dayElement.classList.add('other-month');
        }

        const date = new Date(year, month, dayNumber);
        const today = new Date();
        
        if (!isOtherMonth && 
            date.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }

        const dateKey = this.formatDateKey(date);
        const dayExpenses = this.expenses[dateKey] || [];
        const totalAmount = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);

        dayElement.innerHTML = `
            <div class="day-number">${dayNumber}</div>
            <div class="day-expenses">
                ${dayExpenses.slice(0, 2).map(expense => 
                    `<div class="expense-indicator">${this.getCategoryEmoji(expense.category)} $${expense.amount.toFixed(2)}</div>`
                ).join('')}
                ${dayExpenses.length > 2 ? `<div class="expense-indicator">+${dayExpenses.length - 2} more</div>` : ''}
            </div>
            ${totalAmount > 0 ? `<div class="expense-total">$${totalAmount.toFixed(2)}</div>` : ''}
        `;

        dayElement.addEventListener('click', () => {
            this.selectedDate = dateKey;
            this.showExpenseModal(dateKey);
        });

        return dayElement;
    }

    showExpenseModal(dateKey) {
        const expenses = this.expenses[dateKey] || [];
        const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

        this.modalDate.textContent = this.formatDateDisplay(dateKey);
        this.modalTotal.textContent = total.toFixed(2);

        this.modalExpenses.innerHTML = expenses.length === 0 
            ? '<p style="text-align: center; color: #6c757d; font-style: italic;">No expenses for this day</p>'
            : expenses.map(expense => `
                <div class="expense-item">
                    <div class="expense-item-header">
                        <span class="expense-category">${this.getCategoryEmoji(expense.category)} ${expense.category}</span>
                        <span class="expense-amount">$${expense.amount.toFixed(2)}</span>
                    </div>
                    ${expense.description ? `<div class="expense-description">${expense.description}</div>` : ''}
                </div>
            `).join('');

        this.expenseModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.expenseModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    handleExpenseSubmit(e) {
        e.preventDefault();

        const date = this.expenseDateInput.value;
        const amount = parseFloat(this.expenseAmountInput.value);
        const category = this.expenseCategorySelect.value;
        const description = this.expenseDescriptionInput.value.trim();

        if (!date || !amount || !category) {
            alert('Please fill in all required fields');
            return;
        }

        if (amount <= 0) {
            alert('Amount must be greater than 0');
            return;
        }

        const expense = {
            id: Date.now().toString(),
            amount: amount,
            category: category,
            description: description,
            timestamp: new Date().toISOString()
        };

        if (!this.expenses[date]) {
            this.expenses[date] = [];
        }

        this.expenses[date].push(expense);
        this.saveExpenses();
        this.renderCalendar();

        // Clear form
        this.expenseAmountInput.value = '';
        this.expenseCategorySelect.value = '';
        this.expenseDescriptionInput.value = '';

        // Show success message
        this.showSuccessMessage('Expense added successfully!');
        
        // Set focus back to amount input for quick entry
        this.expenseAmountInput.focus();
    }

    showSuccessMessage(message) {
        // Create temporary success message
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
        
        // Animate in
        setTimeout(() => {
            successDiv.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
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

// Initialize the expense tracker when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ExpenseTracker();
});