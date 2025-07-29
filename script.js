class ExpenseTracker {
    constructor() {
        this.expenses = this.loadExpenses();
        this.calendar = null;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeCalendar();
        this.setTodayAsDefault();
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
    }

    bindEvents() {
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

    initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        
        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,dayGridWeek'
            },
            height: 'auto',
            events: this.getEventsFromExpenses(),
            dateClick: (info) => {
                this.handleDateClick(info);
            },
            eventClick: (info) => {
                this.handleEventClick(info);
            },
            dayMaxEvents: 3,
            moreLinkClick: 'popover',
            displayEventTime: false,
            eventDisplay: 'block'
        });
        
        this.calendar.render();
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

    getCategoryColor(category) {
        const colors = {
            food: '#e74c3c',
            transport: '#3498db',
            entertainment: '#9b59b6',
            shopping: '#e67e22',
            bills: '#f39c12',
            healthcare: '#27ae60',
            other: '#95a5a6'
        };
        return colors[category] || '#95a5a6';
    }

    getEventsFromExpenses() {
        const events = [];
        
        Object.keys(this.expenses).forEach(dateKey => {
            const dayExpenses = this.expenses[dateKey];
            const totalAmount = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
            
            if (dayExpenses.length > 0) {
                // Add a summary event for the day
                events.push({
                    id: `summary-${dateKey}`,
                    title: `💰 $${totalAmount.toFixed(2)} (${dayExpenses.length} items)`,
                    date: dateKey,
                    backgroundColor: '#28a745',
                    borderColor: '#1e7e34',
                    extendedProps: {
                        type: 'summary',
                        expenses: dayExpenses,
                        total: totalAmount
                    }
                });
            }
        });
        
        return events;
    }

    handleDateClick(info) {
        // Set the form date to clicked date
        this.expenseDateInput.value = info.dateStr;
        
        // Show expenses for this date
        this.showExpenseModal(info.dateStr);
    }

    handleEventClick(info) {
        // Show expenses for the event's date
        const dateStr = info.event.startStr;
        this.showExpenseModal(dateStr);
        
        // Prevent default event behavior
        info.jsEvent.preventDefault();
    }

    refreshCalendar() {
        if (this.calendar) {
            // Remove all existing events
            this.calendar.removeAllEvents();
            
            // Add updated events
            const events = this.getEventsFromExpenses();
            this.calendar.addEventSource(events);
        }
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
        this.refreshCalendar();

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