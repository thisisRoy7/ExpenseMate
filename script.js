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
        this.expressionPreview = document.getElementById('expressionPreview');
        
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
        
        // Store reference for deletion
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
        
        // Expression parsing
        this.expenseAmountInput.addEventListener('input', () => this.handleExpressionInput());
        this.expenseAmountInput.addEventListener('blur', () => this.hideExpressionPreview());
        
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

    loadBudgets() {
        const stored = localStorage.getItem('expenseTrackerBudgets');
        return stored ? JSON.parse(stored) : {
            monthlyBudgets: {},
            defaultBudget: 0,
            useDefault: false
        };
    }

    saveBudgets() {
        localStorage.setItem('expenseTrackerBudgets', JSON.stringify(this.budgets));
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

    // Fuzzy matching for category names
    fuzzyMatchCategory(input) {
        const categories = ['food', 'transport', 'entertainment', 'shopping', 'bills', 'healthcare', 'other'];
        const aliases = {
            food: ['food', 'eat', 'meal', 'lunch', 'dinner', 'breakfast', 'snack', 'restaurant', 'cafe', 'grocery', 'groceries'],
            transport: ['transport', 'travel', 'taxi', 'bus', 'train', 'metro', 'uber', 'ola', 'petrol', 'fuel', 'gas'],
            entertainment: ['entertainment', 'movie', 'cinema', 'game', 'fun', 'party', 'music', 'concert', 'show'],
            shopping: ['shopping', 'shop', 'buy', 'purchase', 'cloth', 'clothes', 'dress', 'shirt', 'electronics'],
            bills: ['bills', 'bill', 'electric', 'electricity', 'water', 'internet', 'phone', 'rent', 'utility'],
            healthcare: ['healthcare', 'health', 'medical', 'doctor', 'medicine', 'pharmacy', 'hospital', 'clinic'],
            other: ['other', 'misc', 'miscellaneous', 'random', 'general']
        };

        const normalizedInput = input.toLowerCase().trim();
        
        // Exact match first
        for (const [category, words] of Object.entries(aliases)) {
            if (words.includes(normalizedInput)) {
                return category;
            }
        }
        
        // Fuzzy match with edit distance
        let bestMatch = 'other';
        let bestScore = Infinity;
        
        for (const [category, words] of Object.entries(aliases)) {
            for (const word of words) {
                const score = this.levenshteinDistance(normalizedInput, word);
                if (score < bestScore && score <= 2) { // Allow up to 2 character differences
                    bestScore = score;
                    bestMatch = category;
                }
            }
        }
        
        return bestMatch;
    }

    // Calculate edit distance between two strings
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    // Parse expense expressions like "90+40+10" or "90(food)+40(transport)"
    parseExpenseExpression(expression) {
        const result = {
            isValid: false,
            expenses: [],
            total: 0,
            error: null
        };

        try {
            // Clean the expression
            const cleanExpr = expression.trim();
            if (!cleanExpr) {
                result.error = 'Please enter an amount or expression';
                return result;
            }

            // Check if it's a simple number
            const simpleNumber = parseFloat(cleanExpr);
            if (!isNaN(simpleNumber) && isFinite(simpleNumber) && simpleNumber > 0) {
                result.isValid = true;
                result.expenses = [{
                    amount: simpleNumber,
                    category: this.expenseCategorySelect.value || 'other'
                }];
                result.total = simpleNumber;
                return result;
            }

            // Parse complex expression with + operator
            const parts = cleanExpr.split('+').map(part => part.trim());
            let total = 0;

            for (const part of parts) {
                if (!part) continue;

                // Check for category in parentheses: 90(food)
                const categoryMatch = part.match(/^(\d+(?:\.\d+)?)\s*\(\s*([^\)]+)\s*\)$/);
                if (categoryMatch) {
                    const amount = parseFloat(categoryMatch[1]);
                    const categoryInput = categoryMatch[2];
                    
                    if (isNaN(amount) || amount <= 0) {
                        result.error = `Invalid amount: ${categoryMatch[1]}`;
                        return result;
                    }

                    const category = this.fuzzyMatchCategory(categoryInput);
                    result.expenses.push({ amount, category, originalCategory: categoryInput });
                    total += amount;
                } else {
                    // Simple number without category
                    const amount = parseFloat(part);
                    if (isNaN(amount) || amount <= 0) {
                        result.error = `Invalid amount: ${part}`;
                        return result;
                    }

                    // For expressions with +, use 'other' if no category selected
                    const category = this.expenseCategorySelect.value || 'other';
                    result.expenses.push({ amount, category });
                    total += amount;
                }
            }

            if (result.expenses.length === 0) {
                result.error = 'No valid expenses found';
                return result;
            }

            result.isValid = true;
            result.total = total;
            return result;

        } catch (error) {
            result.error = 'Invalid expression format';
            return result;
        }
    }

    handleExpressionInput() {
        const expression = this.expenseAmountInput.value;
        
        if (!expression.trim()) {
            this.hideExpressionPreview();
            return;
        }

        const parsed = this.parseExpenseExpression(expression);
        this.showExpressionPreview(parsed);
    }

    showExpressionPreview(parsed) {
        if (!parsed.isValid) {
            this.expressionPreview.className = 'expression-preview visible error';
            this.expressionPreview.innerHTML = `<strong>Error:</strong> ${parsed.error}`;
            return;
        }

        if (parsed.expenses.length === 1) {
            // Don't show preview for simple single amounts
            this.hideExpressionPreview();
            return;
        }

        this.expressionPreview.className = 'expression-preview visible success';
        
        let html = '<strong>Parsed Expenses:</strong><br>';
        parsed.expenses.forEach(expense => {
            const categoryDisplay = expense.originalCategory ? 
                `${expense.category} (${expense.originalCategory})` : 
                expense.category;
            html += `
                <div class="parsed-expense">
                    <span class="parsed-category">${this.getCategoryEmoji(expense.category)} ${categoryDisplay}</span>
                    <span class="parsed-amount">₹${expense.amount.toFixed(2)}</span>
                </div>
            `;
        });
        
        html += `<div class="expression-total">Total: ₹${parsed.total.toFixed(2)}</div>`;
        this.expressionPreview.innerHTML = html;
    }

    hideExpressionPreview() {
        setTimeout(() => {
            this.expressionPreview.className = 'expression-preview';
        }, 150); // Small delay to allow clicking on preview
    }

    getMonthKey(date) {
        return date.toISOString().slice(0, 7); // YYYY-MM format
    }

    getCurrentMonthBudget() {
        const today = new Date();
        const monthKey = this.getMonthKey(today);
        
        if (this.budgets.monthlyBudgets[monthKey]) {
            return this.budgets.monthlyBudgets[monthKey];
        } else if (this.budgets.useDefault && this.budgets.defaultBudget > 0) {
            return this.budgets.defaultBudget;
        }
        return 0;
    }

    getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    getDaysPassedInMonth(year, month) {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        
        if (year === currentYear && month === currentMonth) {
            return today.getDate();
        } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
            return this.getDaysInMonth(year, month);
        }
        return 0;
    }

    getDaysRemainingInMonth() {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const totalDays = this.getDaysInMonth(year, month);
        const daysPassed = today.getDate();
        return totalDays - daysPassed + 1; // +1 to include today
    }

    getMonthlySpent(year, month) {
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        let totalSpent = 0;

        Object.keys(this.expenses).forEach(dateKey => {
            const expenseDate = new Date(dateKey + 'T00:00:00');
            if (expenseDate >= monthStart && expenseDate <= monthEnd) {
                totalSpent += this.expenses[dateKey].reduce((sum, expense) => sum + expense.amount, 0);
            }
        });

        return totalSpent;
    }

    calculateDynamicDailyBudget() {
        const today = new Date();
        const monthBudget = this.getCurrentMonthBudget();
        
        if (monthBudget <= 0) return 0;

        const year = today.getFullYear();
        const month = today.getMonth();
        const totalSpent = this.getMonthlySpent(year, month);
        const remainingBudget = monthBudget - totalSpent;
        const daysRemaining = this.getDaysRemainingInMonth();

        if (daysRemaining <= 0) return 0;

        return Math.max(0, remainingBudget / daysRemaining);
    }

    getDayBudgetStatus(dateKey, dayTotal) {
        const dynamicDaily = this.calculateDynamicDailyBudget();
        
        if (dynamicDaily <= 0) return 'no-budget';
        
        const tolerance = dynamicDaily * 0.1; // 10% tolerance for "on budget"
        
        if (dayTotal <= dynamicDaily - tolerance) return 'under-budget';
        if (dayTotal >= dynamicDaily + tolerance) return 'over-budget';
        return 'on-budget';
    }

    getEventsFromExpenses() {
        const events = [];
        
        Object.keys(this.expenses).forEach(dateKey => {
            const dayExpenses = this.expenses[dateKey];
            const totalAmount = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
            
            if (dayExpenses.length > 0) {
                const budgetStatus = this.getDayBudgetStatus(dateKey, totalAmount);
                const dailyBudget = this.calculateDynamicDailyBudget();
                
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
                    title: title,
                    date: dateKey,
                    backgroundColor: backgroundColor,
                    borderColor: borderColor,
                    extendedProps: {
                        type: 'summary',
                        expenses: dayExpenses,
                        total: totalAmount,
                        budgetStatus: budgetStatus,
                        dailyBudget: dailyBudget
                    }
                });
            }
        });
        
        return events;
    }

    handleDateClick(info) {
        // Set the form date to clicked date
        this.expenseDateInput.value = info.dateStr;
        
        // Focus on amount input for quick expense entry
        setTimeout(() => {
            this.expenseAmountInput.focus();
        }, 100);
        
        // Close any open modals first
        this.closeModal();
        
        // Scroll to form area on mobile
        if (window.innerWidth <= 768) {
            document.querySelector('.expense-form-container').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
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
        const budgetStatus = this.getDayBudgetStatus(dateKey, total);
        const dailyBudget = this.calculateDynamicDailyBudget();

        this.modalDate.textContent = this.formatDateDisplay(dateKey);
        this.modalTotal.textContent = total.toFixed(2);

        this.modalExpenses.innerHTML = expenses.length === 0 
            ? '<p style="text-align: center; color: #6c757d; font-style: italic;">No expenses for this day</p>'
            : expenses.map(expense => `
                <div class="expense-item" data-expense-id="${expense.id}" data-date="${dateKey}">
                    <button class="delete-expense-btn" onclick="expenseTracker.showDeleteConfirmation('${dateKey}', '${expense.id}')" title="Delete expense">×</button>
                    <div class="expense-item-header">
                        <span class="expense-category">${this.getCategoryEmoji(expense.category)} ${expense.category}</span>
                        <span class="expense-amount">₹${expense.amount.toFixed(2)}</span>
                    </div>
                    ${expense.description ? `<div class="expense-description">${expense.description}</div>` : ''}
                </div>
            `).join('');

        // Show budget status
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
        const totalSpent = this.getMonthlySpent(year, month);
        const remaining = monthBudget - totalSpent;
        const daysLeft = this.getDaysRemainingInMonth();

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
        
        // Clear form
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
        const monthKey = this.getMonthKey(today);
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
        
        // Clear form
        this.budgetOffset.value = '';
        
        this.showSuccessMessage(`Budget adjusted by ₹${offset.toFixed(2)}`);
    }

    showDeleteConfirmation(dateKey, expenseId) {
        const expense = this.expenses[dateKey]?.find(exp => exp.id === expenseId);
        
        if (!expense) {
            alert('Expense not found');
            return;
        }

        this.expenseToDelete = { dateKey, expenseId, expense };
        
        this.confirmationMessage.innerHTML = `
            Are you sure you want to delete this expense?<br>
            <strong>${this.getCategoryEmoji(expense.category)} ${expense.category}: ₹${expense.amount.toFixed(2)}</strong>
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
        
        // Remove expense from the array
        this.expenses[dateKey] = this.expenses[dateKey].filter(exp => exp.id !== expenseId);
        
        // If no expenses left for this date, remove the date entry
        if (this.expenses[dateKey].length === 0) {
            delete this.expenses[dateKey];
        }
        
        // Save updated expenses
        this.saveExpenses();
        
        // Update all displays
        this.updateBudgetDisplay();
        this.refreshCalendar();
        
        // Update the modal if it's still open
        this.showExpenseModal(dateKey);
        
        // Close confirmation modal
        this.closeConfirmationModal();
        
        // Show success message
        this.showSuccessMessage(`Expense deleted: ${this.getCategoryEmoji(expense.category)} ₹${expense.amount.toFixed(2)}`);
    }

    handleExpenseSubmit(e) {
        e.preventDefault();

        const date = this.expenseDateInput.value;
        const expressionInput = this.expenseAmountInput.value.trim();
        const description = this.expenseDescriptionInput.value.trim();

        if (!date || !expressionInput) {
            alert('Please fill in date and amount fields');
            return;
        }

        // Parse the expression
        const parsed = this.parseExpenseExpression(expressionInput);
        
        if (!parsed.isValid) {
            alert(`Error: ${parsed.error}`);
            return;
        }

        // Check if we need a category for simple number input
        const isSimpleNumber = !isNaN(parseFloat(expressionInput)) && 
                              isFinite(parseFloat(expressionInput)) && 
                              !expressionInput.includes('+') && 
                              !expressionInput.includes('(');
                              
        if (isSimpleNumber && !this.expenseCategorySelect.value) {
            alert('Please select a category for simple amount entries, or use expressions like "100(food)"');
            return;
        }

        // Create expense entries
        const timestamp = new Date().toISOString();
        let expenseCount = 0;

        if (!this.expenses[date]) {
            this.expenses[date] = [];
        }

        // Add each parsed expense
        parsed.expenses.forEach((parsedExpense, index) => {
            const expense = {
                id: `${Date.now()}-${index}`,
                amount: parsedExpense.amount,
                category: parsedExpense.category,
                description: description || (parsed.expenses.length > 1 ? `Multi-expense entry ${index + 1}` : ''),
                timestamp: timestamp
            };

            this.expenses[date].push(expense);
            expenseCount++;
        });

        this.saveExpenses();
        this.updateBudgetDisplay();
        this.refreshCalendar();

        // Clear form
        this.expenseAmountInput.value = '';
        this.expenseCategorySelect.value = '';
        this.expenseDescriptionInput.value = '';
        this.hideExpressionPreview();

        // Show success message
        const message = expenseCount === 1 ? 
            `Expense added: ₹${parsed.total.toFixed(2)}` : 
            `${expenseCount} expenses added: ₹${parsed.total.toFixed(2)} total`;
        this.showSuccessMessage(message);
        
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
let expenseTracker;
document.addEventListener('DOMContentLoaded', () => {
    expenseTracker = new ExpenseTracker();
});