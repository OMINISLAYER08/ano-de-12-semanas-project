// ============================================
// App State & Data Structure
// ============================================

let state = {
    cycles: [],
    goals: [], // Now with type: 'main' or 'sub', parentGoalId for subs
    tasks: [],
    currentCycleId: null,
    currentView: 'weekly', // Changed default view
    currentWeek: 1,
    sidebarOpen: false,
    completionHistory: {} // Track daily completions for graph: { 'YYYY-MM-DD': count }
};

// ============================================
// Initialize App
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Check if localStorage is available
    checkLocalStorageAvailability();
    
    loadFromLocalStorage();
    initializeEventListeners();
    renderApp();
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('cycle-start').value = today;
});

// ============================================
// Local Storage Functions (Electron File-Based)
// ============================================

async function saveToLocalStorage() {
    try {
        // Check if running in Electron
        if (window.electronAPI) {
            const result = await window.electronAPI.saveData(state);
            if (result.success) {
                console.log('✅ Dados salvos com sucesso no arquivo!', state);
                console.log('📊 Total de ciclos:', state.cycles.length);
                console.log('🎯 Total de metas:', state.goals.length);
                console.log('✅ Total de tarefas:', state.tasks.length);
                return true;
            } else {
                console.error('❌ Erro ao salvar dados:', result.error);
                alert('Erro ao salvar dados: ' + result.error);
                return false;
            }
        } else {
            // Fallback to localStorage for web version
            const dataToSave = JSON.stringify(state);
            localStorage.setItem('12weekYear', dataToSave);
            console.log('✅ Dados salvos com sucesso (localStorage)!', state);
            return true;
        }
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error);
        alert('Erro ao salvar dados. Verifique o console para mais detalhes.');
        return false;
    }
}

async function loadFromLocalStorage() {
    try {
        // Check if running in Electron
        if (window.electronAPI) {
            const result = await window.electronAPI.loadData();
            if (result.success && result.data) {
                state = result.data;
                console.log('✅ Dados carregados com sucesso do arquivo!', state);
                console.log('📊 Total de ciclos carregados:', state.cycles.length);
                console.log('🎯 Total de metas carregadas:', state.goals.length);
                console.log('✅ Total de tarefas carregadas:', state.tasks.length);
                updateCurrentCycle();
                return true;
            } else if (result.success && !result.data) {
                console.log('ℹ️ Nenhum dado salvo encontrado. Começando do zero.');
                return false;
            } else {
                console.error('❌ Erro ao carregar dados:', result.error);
                return false;
            }
        } else {
            // Fallback to localStorage for web version
            const saved = localStorage.getItem('12weekYear');
            if (saved) {
                const loadedState = JSON.parse(saved);
                state = loadedState;
                console.log('✅ Dados carregados com sucesso (localStorage)!', state);
                updateCurrentCycle();
                return true;
            } else {
                console.log('ℹ️ Nenhum dado salvo encontrado. Começando do zero.');
                return false;
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        alert('Erro ao carregar dados salvos. Os dados podem estar corrompidos.');
        return false;
    }
}

// Check if localStorage is available (modified for Electron)
function checkLocalStorageAvailability() {
    if (window.electronAPI) {
        console.log('✅ Rodando em Electron - usando armazenamento em arquivo');
        window.electronAPI.getDataPath().then(path => {
            console.log('📁 Arquivo de dados:', path);
        });
        return true;
    }
}

// ============================================
// Navigation
// ============================================

function initializeEventListeners() {
    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            switchView(view);
        });
    });
    
    // Modal controls
    document.querySelectorAll('[data-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.currentTarget.dataset.modal;
            closeModal(modalId);
        });
    });
    
    // New item buttons
    document.getElementById('new-cycle-btn').addEventListener('click', () => openModal('cycle-modal'));
    document.getElementById('new-goal-btn').addEventListener('click', () => openModal('goal-modal'));
    document.getElementById('new-task-btn').addEventListener('click', () => openModal('task-modal'));
    document.getElementById('add-task-from-dashboard').addEventListener('click', () => openModal('task-modal'));
    
    // Forms
    document.getElementById('cycle-form').addEventListener('submit', handleCreateCycle);
    document.getElementById('goal-form').addEventListener('submit', handleCreateGoal);
    document.getElementById('task-form').addEventListener('submit', handleCreateTask);
    
    // Close modal on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

function switchView(viewName) {
    state.currentView = viewName;
    
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === viewName) {
            btn.classList.add('active');
        }
    });
    
    // Update views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`${viewName}-view`).classList.add('active');
    
    // Render the view
    renderApp();
}

// ============================================
// Modal Functions
// ============================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('active');
    
    // Populate task goal select if opening task modal
    if (modalId === 'task-modal') {
        populateTaskGoalSelect();
        populateTaskWeekSelect();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
    
    // Reset forms
    modal.querySelector('form')?.reset();
}

// ============================================
// Cycle Functions
// ============================================

function handleCreateCycle(e) {
    e.preventDefault();
    
    const title = document.getElementById('cycle-title').value;
    const startDate = new Date(document.getElementById('cycle-start').value);
    
    const cycle = {
        id: Date.now().toString(),
        title,
        startDate: startDate.toISOString(),
        weeks: generateWeeks(startDate),
        createdAt: new Date().toISOString()
    };
    
    state.cycles.push(cycle);
    state.currentCycleId = cycle.id;
    
    saveToLocalStorage();
    closeModal('cycle-modal');
    renderApp();
}

function generateWeeks(startDate) {
    const weeks = [];
    for (let i = 0; i < 12; i++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() + (i * 7));
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        weeks.push({
            number: i + 1,
            startDate: weekStart.toISOString(),
            endDate: weekEnd.toISOString()
        });
    }
    return weeks;
}

function getCurrentCycle() {
    return state.cycles.find(c => c.id === state.currentCycleId);
}

function updateCurrentCycle() {
    const currentCycle = getCurrentCycle();
    if (!currentCycle) return;
    
    const now = new Date();
    const cycleStart = new Date(currentCycle.startDate);
    const daysSinceStart = Math.floor((now - cycleStart) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(daysSinceStart / 7) + 1;
    
    state.currentWeek = Math.max(1, Math.min(12, weekNumber));
}

function getCurrentWeekNumber() {
    const currentCycle = getCurrentCycle();
    if (!currentCycle) return 1;
    
    const now = new Date();
    const cycleStart = new Date(currentCycle.startDate);
    const daysSinceStart = Math.floor((now - cycleStart) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(daysSinceStart / 7) + 1;
    
    return Math.max(1, Math.min(12, weekNumber));
}

// ============================================
// Goal Functions
// ============================================

function handleCreateGoal(e) {
    e.preventDefault();
    
    if (!state.currentCycleId) {
        alert('Por favor, crie um ciclo primeiro!');
        return;
    }
    
    const title = document.getElementById('goal-title').value;
    const description = document.getElementById('goal-description').value;
    
    const goal = {
        id: Date.now().toString(),
        cycleId: state.currentCycleId,
        title,
        description,
        createdAt: new Date().toISOString()
    };
    
    state.goals.push(goal);
    
    saveToLocalStorage();
    closeModal('goal-modal');
    renderApp();
}

function getGoalsForCurrentCycle() {
    return state.goals.filter(g => g.cycleId === state.currentCycleId);
}

function getTasksForGoal(goalId) {
    return state.tasks.filter(t => t.goalId === goalId);
}

function getGoalProgress(goalId) {
    const tasks = getTasksForGoal(goalId);
    if (tasks.length === 0) return 0;
    
    const completed = tasks.filter(t => t.completed).length;
    return Math.round((completed / tasks.length) * 100);
}

// ============================================
// Task Functions
// ============================================

function populateTaskGoalSelect() {
    const select = document.getElementById('task-goal');
    select.innerHTML = '<option value="">Selecione uma meta</option>';
    
    const goals = getGoalsForCurrentCycle();
    goals.forEach(goal => {
        const option = document.createElement('option');
        option.value = goal.id;
        option.textContent = goal.title;
        select.appendChild(option);
    });
}

function populateTaskWeekSelect() {
    const select = document.getElementById('task-week');
    select.innerHTML = '';
    
    for (let i = 1; i <= 12; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Semana ${i}`;
        if (i === getCurrentWeekNumber()) {
            option.selected = true;
        }
        select.appendChild(option);
    }
}

function handleCreateTask(e) {
    e.preventDefault();
    
    const goalId = document.getElementById('task-goal').value;
    const title = document.getElementById('task-title').value;
    const week = parseInt(document.getElementById('task-week').value);
    
    if (!goalId) {
        alert('Por favor, selecione uma meta!');
        return;
    }
    
    const task = {
        id: Date.now().toString(),
        goalId,
        title,
        week,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    state.tasks.push(task);
    
    saveToLocalStorage();
    closeModal('task-modal');
    renderApp();
}

function toggleTask(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveToLocalStorage();
        renderApp();
    }
}

function deleteTask(taskId) {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
        state.tasks = state.tasks.filter(t => t.id !== taskId);
        saveToLocalStorage();
        renderApp();
    }
}

function getTasksForWeek(week) {
    return state.tasks.filter(t => {
        const goal = state.goals.find(g => g.id === t.goalId);
        return goal && goal.cycleId === state.currentCycleId && t.week === week;
    });
}

// ============================================
// Progress Calculations
// ============================================

function getOverallProgress() {
    const allTasks = state.tasks.filter(t => {
        const goal = state.goals.find(g => g.id === t.goalId);
        return goal && goal.cycleId === state.currentCycleId;
    });
    
    if (allTasks.length === 0) return { percentage: 0, completed: 0, total: 0 };
    
    const completed = allTasks.filter(t => t.completed).length;
    const percentage = Math.round((completed / allTasks.length) * 100);
    
    return { percentage, completed, total: allTasks.length };
}

function getWeeklyProgress(week) {
    const weekTasks = getTasksForWeek(week);
    
    if (weekTasks.length === 0) return { percentage: 0, completed: 0, total: 0 };
    
    const completed = weekTasks.filter(t => t.completed).length;
    const percentage = Math.round((completed / weekTasks.length) * 100);
    
    return { percentage, completed, total: weekTasks.length };
}

// ============================================
// Render Functions
// ============================================

function renderApp() {
    updateCurrentCycle();
    
    switch (state.currentView) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'cycles':
            renderCycles();
            break;
        case 'goals':
            renderGoals();
            break;
        case 'tasks':
            renderTasks();
            break;
    }
}

function renderDashboard() {
    const currentCycle = getCurrentCycle();
    
    // Update cycle info
    if (currentCycle) {
        const currentWeek = getCurrentWeekNumber();
        document.getElementById('current-week-badge').textContent = `Semana ${currentWeek}`;
        document.getElementById('cycle-name').textContent = currentCycle.title;
        
        const startDate = new Date(currentCycle.startDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (12 * 7) - 1);
        
        document.getElementById('cycle-dates').innerHTML = `
            ${formatDate(startDate)} - ${formatDate(endDate)}
        `;
    } else {
        document.getElementById('current-week-badge').textContent = 'Semana -';
        document.getElementById('cycle-name').textContent = 'Nenhum ciclo ativo';
        document.getElementById('cycle-dates').innerHTML = '<span>Crie seu primeiro ciclo para começar!</span>';
    }
    
    // Update overall progress
    const overall = getOverallProgress();
    document.getElementById('overall-percentage').textContent = `${overall.percentage}%`;
    document.getElementById('overall-progress').style.width = `${overall.percentage}%`;
    document.getElementById('overall-tasks').textContent = `${overall.completed} de ${overall.total} tarefas completadas`;
    
    // Update weekly progress
    const weekly = getWeeklyProgress(getCurrentWeekNumber());
    document.getElementById('weekly-percentage').textContent = `${weekly.percentage}%`;
    document.getElementById('weekly-progress').style.width = `${weekly.percentage}%`;
    document.getElementById('weekly-tasks').textContent = `${weekly.completed} de ${weekly.total} tarefas esta semana`;
    
    // Update goals count
    const goals = getGoalsForCurrentCycle();
    document.getElementById('goals-count').textContent = goals.length;
    
    // Render goals summary
    const goalsList = document.getElementById('goals-list');
    if (goals.length === 0) {
        goalsList.innerHTML = '<p class="empty-state">Nenhuma meta definida</p>';
    } else {
        goalsList.innerHTML = goals.map(goal => {
            const progress = getGoalProgress(goal.id);
            return `
                <div class="goal-item">
                    <div class="goal-title">${goal.title}</div>
                    <div class="goal-progress">
                        <div class="progress-bar" style="flex: 1;">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="goal-progress-text">${progress}%</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Render this week's tasks
    const weekTasks = getTasksForWeek(getCurrentWeekNumber());
    const weeklyTasksList = document.getElementById('weekly-tasks-list');
    
    if (weekTasks.length === 0) {
        weeklyTasksList.innerHTML = '<p class="empty-state">Nenhuma tarefa para esta semana</p>';
    } else {
        weeklyTasksList.innerHTML = weekTasks.map(task => renderTaskItem(task)).join('');
        
        // Add event listeners
        weeklyTasksList.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                toggleTask(e.target.dataset.taskId);
            });
        });
        
        weeklyTasksList.querySelectorAll('.task-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                deleteTask(e.target.dataset.taskId);
            });
        });
    }
}

function renderCycles() {
    const cyclesList = document.getElementById('cycles-list');
    
    if (state.cycles.length === 0) {
        cyclesList.innerHTML = '<p class="empty-state">Nenhum ciclo criado ainda. Comece criando seu primeiro ciclo de 12 semanas!</p>';
        return;
    }
    
    cyclesList.innerHTML = state.cycles.map(cycle => {
        const isActive = cycle.id === state.currentCycleId;
        const currentWeek = isActive ? getCurrentWeekNumber() : 1;
        
        const startDate = new Date(cycle.startDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (12 * 7) - 1);
        
        return `
            <div class="card glass-card cycle-card">
                <div class="cycle-header">
                    <div class="cycle-info">
                        <h3>${cycle.title}</h3>
                        <p class="cycle-dates-display">${formatDate(startDate)} - ${formatDate(endDate)}</p>
                    </div>
                    ${isActive ? '<div class="cycle-status">Ativo</div>' : ''}
                </div>
                
                <div class="cycle-weeks-grid">
                    ${cycle.weeks.map(week => `
                        <div class="week-item ${week.number === currentWeek && isActive ? 'current' : ''}">
                            <div class="week-number">${week.number}</div>
                            <div class="week-date">${formatShortDate(new Date(week.startDate))}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function renderGoals() {
    const goalsList = document.getElementById('goals-view-list');
    const goals = getGoalsForCurrentCycle();
    
    if (!state.currentCycleId) {
        goalsList.innerHTML = '<p class="empty-state">Crie um ciclo primeiro!</p>';
        return;
    }
    
    if (goals.length === 0) {
        goalsList.innerHTML = '<p class="empty-state">Nenhuma meta definida. Comece adicionando suas metas!</p>';
        return;
    }
    
    goalsList.innerHTML = goals.map(goal => {
        const tasks = getTasksForGoal(goal.id);
        const progress = getGoalProgress(goal.id);
        const completedTasks = tasks.filter(t => t.completed).length;
        
        return `
            <div class="card glass-card goal-card">
                <div class="goal-card-header">
                    <h3 class="goal-card-title">${goal.title}</h3>
                </div>
                ${goal.description ? `<p class="goal-description">${goal.description}</p>` : ''}
                
                <div class="progress-bar">
                    <div class="progress-fill accent" style="width: ${progress}%"></div>
                </div>
                
                <div class="goal-stats">
                    <div class="goal-stat">
                        <div class="goal-stat-label">Progresso</div>
                        <div class="goal-stat-value">${progress}%</div>
                    </div>
                    <div class="goal-stat">
                        <div class="goal-stat-label">Tarefas</div>
                        <div class="goal-stat-value">${completedTasks}/${tasks.length}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderTasks() {
    // Render week selector
    const weekSelector = document.getElementById('week-selector');
    weekSelector.innerHTML = Array.from({length: 12}, (_, i) => i + 1)
        .map(week => `
            <button class="week-btn ${week === state.currentWeek ? 'active' : ''}" 
                    data-week="${week}">
                Semana ${week}
            </button>
        `).join('');
    
    // Add event listeners to week buttons
    weekSelector.querySelectorAll('.week-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            state.currentWeek = parseInt(e.target.dataset.week);
            renderTasks();
        });
    });
    
    // Render tasks for selected week
    const tasksList = document.getElementById('tasks-view-list');
    const tasks = getTasksForWeek(state.currentWeek);
    
    if (!state.currentCycleId) {
        tasksList.innerHTML = '<p class="empty-state">Crie um ciclo primeiro!</p>';
        return;
    }
    
    if (tasks.length === 0) {
        tasksList.innerHTML = '<p class="empty-state">Nenhuma tarefa para esta semana</p>';
        return;
    }
    
    tasksList.innerHTML = tasks.map(task => renderTaskItem(task)).join('');
    
    // Add event listeners
    tasksList.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            toggleTask(e.target.dataset.taskId);
        });
    });
    
    tasksList.querySelectorAll('.task-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            deleteTask(e.target.dataset.taskId);
        });
    });
}

function renderTaskItem(task) {
    const goal = state.goals.find(g => g.id === task.goalId);
    const goalTitle = goal ? goal.title : 'Meta desconhecida';
    
    return `
        <div class="task-item ${task.completed ? 'completed' : ''}">
            <input type="checkbox" 
                   class="task-checkbox" 
                   ${task.completed ? 'checked' : ''}
                   data-task-id="${task.id}">
            <div class="task-content">
                <div class="task-title">${task.title}</div>
                <div class="task-meta">
                    <span class="task-goal-label">${goalTitle}</span>
                    <span>Semana ${task.week}</span>
                </div>
            </div>
            <button class="task-delete" data-task-id="${task.id}">🗑️</button>
        </div>
    `;
}

// ============================================
// Utility Functions
// ============================================

function formatDate(date) {
    return new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatShortDate(date) {
    return new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
    });
}
// ============================================
// New Functions for Redesigned UI
// ============================================

// Sidebar toggle
function toggleSidebar() {
    state.sidebarOpen = !state.sidebarOpen;
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (state.sidebarOpen) {
        sidebar.classList.add('open');
        overlay.classList.add('active');
    } else {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }
}

// Get main goals for current week
function getMainGoalsForWeek() {
    return state.goals.filter(g => 
        g.type === 'main' && 
        g.cycleId === state.currentCycleId &&
        g.weeklyPriority >= 1 && g.weeklyPriority <= 3
    ).sort((a, b) => a.weeklyPriority - b.weeklyPriority).slice(0, 3);
}

// Get sub-goals for a main goal
function getSubGoalsForMainGoal(mainGoalId) {
    return state.goals.filter(g => 
        g.type === 'sub' && 
        g.parentGoalId === mainGoalId
    );
}

// Get all sub-goals for current week's main goals
function getAllSubGoalsForWeek() {
    const mainGoals = getMainGoalsForWeek();
    const subGoals = [];
    mainGoals.forEach(main => {
        const subs = getSubGoalsForMainGoal(main.id);
        subGoals.push(...subs);
    });
    return subGoals;
}

// Update completion history when task is toggled
function updateCompletionHistory() {
    const today = new Date().toISOString().split('T')[0];
    const completedToday = state.goals.filter(g => 
        g.type === 'sub' && 
        g.completed &&
        g.completedDate === today
    ).length;
    
    state.completionHistory[today] = completedToday;
    saveToLocalStorage();
}

// Get completion history for current week (for graph)
function getWeekCompletionData() {
    const currentCycle = getCurrentCycle();
    if (!currentCycle) return [];
    
    const currentWeekData = currentCycle.weeks[state.currentWeek - 1];
    if (!currentWeekData) return [];
    
    const weekStart = new Date(currentWeekData.startDate);
    const data = [];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()];
        
        data.push({
            day: dayName,
            date: dateStr,
            count: state.completionHistory[dateStr] || 0
        });
    }
    
    return data;
}

// Calculate time until week end
function getTimeUntilWeekEnd() {
    const currentCycle = getCurrentCycle();
    if (!currentCycle) return null;
    
    const currentWeekData = currentCycle.weeks[state.currentWeek - 1];
    if (!currentWeekData) return null;
    
    const weekEnd = new Date(currentWeekData.endDate);
    weekEnd.setHours(23, 59, 59, 999);
    
    const now = new Date();
    const diff = weekEnd - now;
    
    if (diff < 0) return { days: 0, hours: 0, minutes: 0, expired: true };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes, expired: false };
}

// Toggle sub-goal completion
function toggleSubGoal(goalId) {
    const goal = state.goals.find(g => g.id === goalId);
    if (goal && goal.type === 'sub') {
        goal.completed = !goal.completed;
        if (goal.completed) {
            goal.completedDate = new Date().toISOString().split('T')[0];
        } else {
            delete goal.completedDate;
        }
        updateCompletionHistory();
        saveToLocalStorage();
        renderApp();
    }
}

// Create chart for progress graph
let progressChart = null;

function renderProgressChart() {
    const canvas = document.getElementById('progress-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const data = getWeekCompletionData();
    
    // Destroy previous chart if exists
    if (progressChart) {
        progressChart.destroy();
    }
    
    // Create new chart
    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.day),
            datasets: [{
                label: 'Tarefas Completadas',
                data: data.map(d => d.count),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 14, 39, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    borderColor: '#6366f1',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#94a3b8',
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        color: '#94a3b8'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Update countdown timer every minute
function updateCountdownTimer() {
    const timerElement = document.getElementById('countdown-timer');
    if (!timerElement) return;
    
    const timeData = getTimeUntilWeekEnd();
    if (!timeData) {
        timerElement.innerHTML = '<p class="countdown-text">Crie um ciclo primeiro</p>';
        return;
    }
    
    if (timeData.expired) {
        timerElement.innerHTML = '<p class="countdown-text">Semana encerrada!</p>';
        return;
    }
    
    timerElement.innerHTML = `
        <div class="countdown-label">⏰ Tempo até fim da semana:</div>
        <div class="countdown-values">
            <div class="countdown-item">
                <span class="countdown-number">${timeData.days}</span>
                <span class="countdown-unit">dias</span>
            </div>
            <div class="countdown-item">
                <span class="countdown-number">${timeData.hours}</span>
                <span class="countdown-unit">horas</span>
            </div>
            <div class="countdown-item">
                <span class="countdown-number">${timeData.minutes}</span>
                <span class="countdown-unit">min</span>
            </div>
        </div>
    `;
}

// Start countdown timer interval
setInterval(updateCountdownTimer, 60000); // Update every minute
