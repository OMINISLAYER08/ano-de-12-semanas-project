// ============================================
// ANO DE 12 SEMANAS - APP PRINCIPAL
// Versão 2.0 - Interface Redesenhada
// ============================================

/* ============================================
   STATE MANAGEMENT
   ============================================ */

let state = {
    cycles: [],
    goals: [], // type: 'main' | 'sub', parentGoalId for subs
    currentCycleId: null,
    currentView: 'weekly',
    currentWeek: 1,
    sidebarOpen: false,
    completionHistory: {}, // { 'YYYY-MM-DD': count }
    user: {
        xp: 0,
        level: 1,
        totalXp: 0
    }
};

/* ============================================
   DATA PERSISTENCE (Electron + Web Fallback)
   ============================================ */

async function saveData() {
    try {
        if (window.electronAPI) {
            // Electron: Save to file
            const result = await window.electronAPI.saveData(state);
            if (result.success) {
                console.log('✅ Dados salvos no arquivo');
                return true;
            }
        } else {
            // Web: Save to localStorage  
            localStorage.setItem('12weekYear', JSON.stringify(state));
            console.log('✅ Dados salvos no localStorage');
            return true;
        }
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        return false;
    }
}

async function loadData() {
    try {
        if (window.electronAPI) {
            // Electron: Load from file
            const result = await window.electronAPI.loadData();
            if (result.success && result.data) {
                state = { ...state, ...result.data };
                console.log('✅ Dados carregados do arquivo');
                updateCurrentCycle();
                return true;
            }
        } else {
            // Web: Load from localStorage
            const saved = localStorage.getItem('12weekYear');
            if (saved) {
                const loadedData = JSON.parse(saved);
                state = { ...state, ...loadedData };
                console.log('✅ Dados carregados do localStorage');
                updateCurrentCycle();
                return true;
            }
        }
        console.log('ℹ️ Nenhum dado salvo');
        return false;
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        return false;
    }
}

function checkStorageAvailability() {
    if (window.electronAPI) {
        console.log('✅ Rodando em Electron');
        window.electronAPI.getDataPath().then(path => {
            console.log('📁 Arquivo:', path);
        });
    } else {
        console.log('✅ Rodando no navegador');
    }
}

/* ============================================
   CYCLE MANAGEMENT
   ============================================ */

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
    const cycle = getCurrentCycle();
    if (!cycle) return;
    
    const now = new Date();
    const start = new Date(cycle.startDate);
    const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    const week = Math.floor(days / 7) + 1;
    
    state.currentWeek = Math.max(1, Math.min(12, week));
}

function handleCreateCycle(e) {
    e.preventDefault();
    console.log('🏁 Iniciando criação de ciclo...');
    
    try {
        const titleInput = document.getElementById('cycle-title');
        const startInput = document.getElementById('cycle-start');
        
        if (!titleInput.value || !startInput.value) {
            alert('Por favor, preencha todos os campos!');
            return;
        }

        const title = titleInput.value;
        const startDateString = startInput.value;
        const startDate = new Date(startDateString);
        
        if (isNaN(startDate.getTime())) {
            alert('Data de início inválida!');
            return;
        }
        
        const cycle = {
            id: Date.now().toString(),
            title,
            startDate: startDate.toISOString(),
            weeks: generateWeeks(startDate),
            createdAt: new Date().toISOString()
        };
        
        state.cycles.push(cycle);
        state.currentCycleId = cycle.id;
        
        saveData();
        closeModal('cycle-modal');
        renderApp();
        console.log('✅ Ciclo criado com sucesso:', cycle.title);
    } catch (error) {
        console.error('❌ Erro ao criar ciclo:', error);
        alert('Erro ao criar ciclo: ' + error.message);
    }
}

function selectCycle(cycleId) {
    state.currentCycleId = cycleId;
    saveData();
    renderApp();
}

/* ============================================
   GOAL MANAGEMENT (Main & Sub Goals)
   ============================================ */

function getMainGoalsForWeek() {
    return state.goals.filter(g => 
        g.type === 'main' && 
        g.cycleId === state.currentCycleId &&
        g.weeklyPriority >= 1 && g.weeklyPriority <= 3
    ).sort((a, b) => a.weeklyPriority - b.weeklyPriority).slice(0, 3);
}

function getSubGoalsForMainGoal(mainGoalId) {
    return state.goals.filter(g => 
        g.type === 'sub' && 
        g.parentGoalId === mainGoalId
    );
}

function handleCreateMainGoal(e) {
    e.preventDefault();
    console.log('🎯 Criando meta principal...');
    
    try {
        if (!state.currentCycleId) {
            alert('Por favor, crie um ciclo primeiro!');
            return;
        }
        
        const title = document.getElementById('main-goal-title').value;
        const priority = parseInt(document.getElementById('main-goal-priority').value);
        
        if (!title) {
            alert('A meta precisa de um título!');
            return;
        }
        
        const goal = {
            id: Date.now().toString(),
            type: 'main',
            cycleId: state.currentCycleId,
            title,
            description: document.getElementById('main-goal-description').value || '',
            weeklyPriority: priority,
            createdAt: new Date().toISOString()
        };
        
        state.goals.push(goal);
        saveData();
        closeModal('main-goal-modal');
        renderApp();
        console.log('✅ Meta principal criada:', title);
    } catch (error) {
        console.error('❌ Erro ao criar meta principal:', error);
        alert('Erro ao criar meta: ' + error.message);
    }
}

function handleCreateSubGoal(e) {
    e.preventDefault();
    console.log('✅ Criando sub-meta...');
    
    try {
        const parentId = document.getElementById('sub-goal-parent').value;
        const title = document.getElementById('sub-goal-title').value;
        
        if (!parentId) {
            alert('Selecione uma meta principal!');
            return;
        }
        
        if (!title) {
            alert('A sub-meta precisa de um título!');
            return;
        }
        
        const goal = {
            id: Date.now().toString(),
            type: 'sub',
            parentGoalId: parentId,
            title,
            description: document.getElementById('sub-goal-description').value || '',
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        state.goals.push(goal);
        saveData();
        closeModal('sub-goal-modal');
        renderApp();
        console.log('✅ Sub-meta criada:', title);
    } catch (error) {
        console.error('❌ Erro ao criar sub-meta:', error);
        alert('Erro ao criar sub-meta: ' + error.message);
    }
}

function toggleSubGoal(goalId) {
    const goal = state.goals.find(g => g.id === goalId);
    if (goal && goal.type === 'sub') {
        goal.completed = !goal.completed;
        goal.completedDate = goal.completed ? new Date().toISOString().split('T')[0] : null;
        
        // Award XP on completion
        if (goal.completed) {
            awardXP(20, `Sub-meta: ${goal.title}`);
            
            // Check if all subgoals of the parent are complete
            const parentId = goal.parentGoalId;
            const sibs = getSubGoalsForMainGoal(parentId);
            const allDone = sibs.length > 0 && sibs.every(s => s.completed);
            
            if (allDone) {
                const parent = state.goals.find(g => g.id === parentId);
                awardXP(100, `META COMPLETA: ${parent ? parent.title : ''}`);
            }
        } else {
            // Optional: remove XP if unchecking? 
            // Better not for now to avoid negative feels.
            awardXP(-20, `Cancelado: ${goal.title}`);
        }

        updateCompletionHistory();
        saveData();
        renderApp();
    }
}

/* ============================================
   GAMIFICATION SYSTEM (XP & LEVELS)
   ============================================ */

function getXPForNextLevel() {
    // Level 1 -> 2: 100 XP
    // Level 2 -> 3: 150 XP
    // Level 3 -> 4: 200 XP
    return 100 + (state.user.level - 1) * 50;
}

function awardXP(amount, reason = "") {
    state.user.xp += amount;
    state.user.totalXp += (amount > 0 ? amount : 0);
    
    console.log(`🎮 XP: ${amount > 0 ? '+' : ''}${amount} | Motivo: ${reason}`);
    
    // Check for level up
    let levelUpCount = 0;
    while (state.user.xp >= getXPForNextLevel()) {
        state.user.xp -= getXPForNextLevel();
        state.user.level++;
        levelUpCount++;
    }

    if (levelUpCount > 0) {
        console.log(`🎉 LEVEL UP! Agora você está no nível ${state.user.level}!`);
        showLevelUpAnimation();
    }
}

function showLevelUpAnimation() {
    // To be implemented in UI
    const celebration = document.createElement('div');
    celebration.className = 'level-up-toast';
    celebration.innerHTML = `🎉 NÍVEL ${state.user.level}!`;
    document.body.appendChild(celebration);
    setTimeout(() => celebration.remove(), 3000);
}

/* ============================================
   PROGRESS & STATISTICS
   ============================================ */

function updateCompletionHistory() {
    const today = new Date().toISOString().split('T')[0];
    const completedToday = state.goals.filter(g => 
        g.type === 'sub' && 
        g.completed &&
        g.completedDate === today
    ).length;
    
    state.completionHistory[today] = completedToday;
}

function getWeekCompletionData() {
    const cycle = getCurrentCycle();
    if (!cycle) return [];
    
    const weekData = cycle.weeks[state.currentWeek - 1];
    if (!weekData) return [];
    
    const weekStart = new Date(weekData.startDate);
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

function getTimeUntilWeekEnd() {
    const cycle = getCurrentCycle();
    if (!cycle) return null;
    
    const weekData = cycle.weeks[state.currentWeek - 1];
    if (!weekData) return null;
    
    const weekEnd = new Date(weekData.endDate);
    weekEnd.setHours(23, 59, 59, 999);
    
    const now = new Date();
    const diff = weekEnd - now;
    
    if (diff < 0) return { days: 0, hours: 0, minutes: 0, expired: true };
    
    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        expired: false
    };
}

function renderUserStats() {
    const levelEl = document.getElementById('user-level');
    const xpBarFill = document.getElementById('xp-bar-fill');
    const xpLabel = document.getElementById('xp-label');
    
    if (levelEl) levelEl.textContent = state.user.level;
    
    if (xpBarFill && xpLabel) {
        const nextXp = getXPForNextLevel();
        const progress = (state.user.xp / nextXp) * 100;
        
        xpBarFill.style.width = `${progress}%`;
        xpLabel.textContent = `${Math.floor(state.user.xp)} / ${nextXp} XP`;
    }
}

/* ============================================
   UI - SIDEBAR & NAVIGATION
   ============================================ */

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

function switchView(viewName) {
    state.currentView = viewName;
    
    // Update sidebar links
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Update views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    const viewId = `${viewName}-view`;
    const selectedView = document.getElementById(viewId);
    if (selectedView) {
        selectedView.classList.add('active');
    }
    
    renderApp();
}

/* ============================================
   UI - MODALS
   ============================================ */

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.add('active');
    
    // Populate selects if needed
    if (modalId === 'sub-goal-modal') {
        populateParentGoalSelect();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.remove('active');
    modal.querySelector('form')?.reset();
}

function populateParentGoalSelect() {
    const select = document.getElementById('sub-goal-parent');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione uma meta principal</option>';
    
    const mainGoals = getMainGoalsForWeek();
    mainGoals.forEach(goal => {
        const option = document.createElement('option');
        option.value = goal.id;
        option.textContent = goal.title;
        select.appendChild(option);
    });
}

/* ============================================
   UI - RENDER FUNCTIONS
   ============================================ */

function renderApp() {
    updateCurrentCycle();
    renderUserStats();
    
    switch (state.currentView) {
        case 'weekly':
            renderWeeklyView();
            break;
        case 'cycles':
            renderCyclesView();
            break;
        case 'main-goals':
            renderMainGoalsView();
            break;
        case 'sub-goals':
            renderSubGoalsView();
            break;
        case 'stats':
            renderStatsView();
            break;
        default:
            renderWeeklyView();
    }
}

function renderWeeklyView() {
    const cycle = getCurrentCycle();
    
    // Update week title
    const weekTitle = document.getElementById('week-title');
    const weekDates = document.getElementById('week-dates');
    
    if (cycle && weekTitle && weekDates) {
        weekTitle.textContent = `Semana ${state.currentWeek}`;
        
        const weekData = cycle.weeks[state.currentWeek - 1];
        if (weekData) {
            weekDates.textContent = `${formatDate(weekData.startDate)} - ${formatDate(weekData.endDate)}`;
        }
    }
    
    updateCountdownTimer();
    renderMainGoalsSection();
    renderSubGoalsSection();
    renderProgressChart();
}

function renderMainGoalsSection() {
    const container = document.getElementById('main-goals-list');
    if (!container) return;
    
    const mainGoals = getMainGoalsForWeek();
    
    if (mainGoals.length === 0) {
        container.innerHTML = '<p class="empty-state">Adicione até 3 metas principais para esta semana</p>';
        return;
    }
    
    container.innerHTML = mainGoals.map(goal => {
        const subGoals = getSubGoalsForMainGoal(goal.id);
        const completed = subGoals.filter(s => s.completed).length;
        const total = subGoals.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return `
            <div class="card glass-card main-goal-card">
                <span class="main-goal-badge">Meta ${goal.weeklyPriority}</span>
                <h3 class="main-goal-title">${goal.title}</h3>
                ${goal.description ? `<p class="main-goal-description">${goal.description}</p>` : ''}
                <div class="main-goal-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <p class="sub-goal-meta">${completed} de ${total} tarefas</p>
                </div>
            </div>
        `;
    }).join('');
}

function renderSubGoalsSection() {
    const container = document.getElementById('sub-goals-list');
    if (!container) return;
    
    const mainGoals = getMainGoalsForWeek();
    const allSubs = [];
    
    mainGoals.forEach(main => {
        const subs = getSubGoalsForMainGoal(main.id);
        subs.forEach(sub => {
            allSubs.push({ ...sub, parentTitle: main.title });
        });
    });
    
    if (allSubs.length === 0) {
        container.innerHTML = '<p class="empty-state">Adicione tarefas diárias para suas metas</p>';
        return;
    }
    
    container.innerHTML = allSubs.map(goal => `
        <div class="sub-goal-item ${goal.completed ? 'completed' : ''}" onclick="toggleSubGoal('${goal.id}')">
            <input type="checkbox" 
                   class="sub-goal-checkbox" 
                   ${goal.completed ? 'checked' : ''}
                   onclick="event.stopPropagation(); toggleSubGoal('${goal.id}')">
            <div class="sub-goal-content">
                <div class="sub-goal-title">${goal.title}</div>
                <div class="sub-goal-meta">
                    <span class="sub-goal-parent-label">${goal.parentTitle}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderCyclesView() {
    const container = document.getElementById('cycles-list');
    if (!container) return;
    
    if (state.cycles.length === 0) {
        container.innerHTML = '<p class="empty-state">Crie seu primeiro ciclo de 12 semanas!</p>';
        return;
    }
    
    container.innerHTML = state.cycles.map(cycle => {
        const isActive = cycle.id === state.currentCycleId;
        const endDate = new Date(cycle.startDate);
        endDate.setDate(endDate.getDate() + (12 * 7) - 1);
        
        return `
            <div class="card glass-card ${isActive ? 'active-cycle' : ''}">
                <div class="cycle-info">
                    <h3>${cycle.title} ${isActive ? '⭐' : ''}</h3>
                    <p>${formatDate(cycle.startDate)} - ${formatDate(endDate)}</p>
                </div>
                ${!isActive ? `<button class="btn btn-secondary" onclick="selectCycle('${cycle.id}')">Selecionar</button>` : '<span class="badge">Ativo</span>'}
            </div>
        `;
    }).join('');
}

function renderMainGoalsView() {
    const container = document.getElementById('main-goals-view-list');
    if (!container) return;
    
    const mainGoals = state.goals.filter(g => g.type === 'main' && g.cycleId === state.currentCycleId);
    
    if (mainGoals.length === 0) {
        container.innerHTML = '<p class="empty-state">Crie suas metas principais</p>';
        return;
    }
    
    container.innerHTML = mainGoals.map(goal => {
        const subs = getSubGoalsForMainGoal(goal.id);
        const completed = subs.filter(s => s.completed).length;
        const progress = subs.length > 0 ? Math.round((completed / subs.length) * 100) : 0;
        
        return `
            <div class="card glass-card">
                <span class="main-goal-badge">Prioridade ${goal.weeklyPriority}</span>
                <h3 class="main-goal-title">${goal.title}</h3>
                ${goal.description ? `<p class="main-goal-description">${goal.description}</p>` : ''}
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <p class="sub-goal-meta">${completed}/${subs.length} sub-metas (${progress}%)</p>
            </div>
        `;
    }).join('');
}

function renderSubGoalsView() {
    const container = document.getElementById('sub-goals-view-list');
    if (!container) return;
    
    const subs = state.goals.filter(g => g.type === 'sub');
    
    if (subs.length === 0) {
        container.innerHTML = '<p class="empty-state">Crie sub-metas</p>';
        return;
    }
    
    container.innerHTML = subs.map(goal => {
        const parent = state.goals.find(g => g.id === goal.parentGoalId);
        return `
            <div class="sub-goal-item ${goal.completed ? 'completed' : ''}" onclick="toggleSubGoal('${goal.id}')">
                <input type="checkbox" class="sub-goal-checkbox" ${goal.completed ? 'checked' : ''}>
                <div class="sub-goal-content">
                    <div class="sub-goal-title">${goal.title}</div>
                    <div class="sub-goal-meta">
                        <span class="sub-goal-parent-label">${parent ? parent.title : '-'}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderStatsView() {
    const container = document.getElementById('stats-content');
    if (!container) return;
    
    const totalMain = state.goals.filter(g => g.type === 'main').length;
    const totalSub = state.goals.filter(g => g.type === 'sub').length;
    const completedSub = state.goals.filter(g => g.type === 'sub' && g.completed).length;
    const rate = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;
    
    container.innerHTML = `
        <div class="card glass-card">
            <h3>📊 Estatísticas</h3>
            <p><strong>Metas Principais:</strong> ${totalMain}</p>
            <p><strong>Sub-metas:</strong> ${totalSub}</p>
            <p><strong>Completadas:</strong> ${completedSub}</p>
            <p><strong>Taxa:</strong> ${rate}%</p>
        </div>
    `;
}

/* ============================================
   UI - COUNTDOWN & CHART
   ============================================ */

function updateCountdownTimer() {
    const timer = document.getElementById('countdown-timer');
    if (!timer) return;
    
    const time = getTimeUntilWeekEnd();
    if (!time) {
        timer.innerHTML = '<p class="countdown-text">Crie um ciclo primeiro</p>';
        return;
    }
    
    if (time.expired) {
        timer.innerHTML = '<p class="countdown-text">Semana encerrada!</p>';
        return;
    }
    
    timer.innerHTML = `
        <div class="countdown-label">⏰ Tempo até fim da semana:</div>
        <div class="countdown-values">
            <div class="countdown-item">
                <span class="countdown-number">${time.days}</span>
                <span class="countdown-unit">dias</span>
            </div>
            <div class="countdown-item">
                <span class="countdown-number">${time.hours}</span>
                <span class="countdown-unit">horas</span>
            </div>
            <div class="countdown-item">
                <span class="countdown-number">${time.minutes}</span>
                <span class="countdown-unit">min</span>
            </div>
        </div>
    `;
}

let chart = null;

function renderProgressChart() {
    const canvas = document.getElementById('progress-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const data = getWeekCompletionData();
    
    if (chart) chart.destroy();
    
    chart = new Chart(ctx, {
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
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10, 14, 39, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    borderColor: '#6366f1',
                    borderWidth: 1,
                    padding: 12
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#94a3b8', stepSize: 1 },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                }
            }
        }
    });
}

/* ============================================
   UTILITIES
   ============================================ */

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

/* ============================================
   INITIALIZATION
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
    checkStorageAvailability();
    await loadData();
    
    // Event listeners
    document.getElementById('cycle-form')?.addEventListener('submit', handleCreateCycle);
    document.getElementById('main-goal-form')?.addEventListener('submit', handleCreateMainGoal);
    document.getElementById('sub-goal-form')?.addEventListener('submit', handleCreateSubGoal);
    
    // Modal close on overlay click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });
    
    // Set default date
    const cycleStart = document.getElementById('cycle-start');
    if (cycleStart) {
        cycleStart.value = new Date().toISOString().split('T')[0];
    }
    
    // Initial render
    renderApp();
    updateCountdownTimer();
    
    // Update countdown every minute
    setInterval(updateCountdownTimer, 60000);
    
    // Expose functions to global scope for HTML onclick handlers
    window.toggleSidebar = toggleSidebar;
    window.switchView = switchView;
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.toggleSubGoal = toggleSubGoal;
    window.selectCycle = selectCycle;
});
