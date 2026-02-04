// Estado da aplicação
let tasks = [];
let taskToDelete = null;

// Elementos do DOM
const board = document.querySelector('.board');
const modal = document.getElementById('modal');
const deleteModal = document.getElementById('delete-modal');
const taskForm = document.getElementById('task-form');
const modalTitle = document.getElementById('modal-title');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    renderAllTasks();
    setupEventListeners();
    setupDragAndDrop();
});

// Carregar tarefas do localStorage
function loadTasks() {
    const saved = localStorage.getItem('kanban-tasks');
    if (saved) {
        tasks = JSON.parse(saved);
    }
}

// Salvar tarefas no localStorage
function saveTasks() {
    localStorage.setItem('kanban-tasks', JSON.stringify(tasks));
}

// Gerar ID único
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Configurar event listeners
function setupEventListeners() {
    // Botão nova tarefa
    document.getElementById('btn-new-task').addEventListener('click', () => openModal());

    // Fechar modais
    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('btn-cancel').addEventListener('click', closeModal);
    document.getElementById('btn-close-delete-modal').addEventListener('click', closeDeleteModal);
    document.getElementById('btn-cancel-delete').addEventListener('click', closeDeleteModal);
    document.getElementById('btn-confirm-delete').addEventListener('click', confirmDelete);

    // Fechar modal ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeDeleteModal();
    });

    // Submit do formulário
    taskForm.addEventListener('submit', handleFormSubmit);

    // Atalhos de teclado
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeDeleteModal();
        }
        if (e.key === 'n' && e.ctrlKey) {
            e.preventDefault();
            openModal();
        }
    });
}

// Configurar drag and drop
function setupDragAndDrop() {
    const containers = document.querySelectorAll('.tasks-container');

    containers.forEach(container => {
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('dragenter', handleDragEnter);
        container.addEventListener('dragleave', handleDragLeave);
        container.addEventListener('drop', handleDrop);
    });
}

// Handlers de drag and drop
function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.tasks-container').forEach(container => {
        container.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const draggingCard = document.querySelector('.dragging');
    const afterElement = getDragAfterElement(this, e.clientY);

    if (afterElement == null) {
        this.appendChild(draggingCard);
    } else {
        this.insertBefore(draggingCard, afterElement);
    }
}

function handleDragEnter(e) {
    e.preventDefault();
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    if (!this.contains(e.relatedTarget)) {
        this.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');

    const taskId = e.dataTransfer.getData('text/plain');
    const newStatus = this.dataset.status;

    // Atualizar status da tarefa
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
        task.status = newStatus;
        task.updatedAt = new Date().toISOString();
        saveTasks();
        updateTaskCounts();
    }
}

// Obter elemento após o cursor durante drag
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Abrir modal
function openModal(task = null) {
    modal.classList.remove('hidden');
    taskForm.reset();

    if (task) {
        modalTitle.textContent = 'Editar Tarefa';
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-due-date').value = task.dueDate || '';
        document.getElementById('task-tags').value = task.tags ? task.tags.join(', ') : '';
    } else {
        modalTitle.textContent = 'Nova Tarefa';
        document.getElementById('task-id').value = '';
    }

    setTimeout(() => {
        document.getElementById('task-title').focus();
    }, 100);
}

// Fechar modal
function closeModal() {
    modal.classList.add('hidden');
    taskForm.reset();
}

// Fechar modal de exclusão
function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    taskToDelete = null;
}

// Abrir modal de confirmação de exclusão
function openDeleteModal(taskId) {
    taskToDelete = taskId;
    deleteModal.classList.remove('hidden');
}

// Confirmar exclusão
function confirmDelete() {
    if (taskToDelete) {
        tasks = tasks.filter(t => t.id !== taskToDelete);
        saveTasks();
        renderAllTasks();
        closeDeleteModal();
    }
}

// Processar formulário
function handleFormSubmit(e) {
    e.preventDefault();

    const taskId = document.getElementById('task-id').value;
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-due-date').value;
    const tagsInput = document.getElementById('task-tags').value;

    const tags = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

    if (taskId) {
        // Editar tarefa existente
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.title = title;
            task.description = description;
            task.priority = priority;
            task.dueDate = dueDate;
            task.tags = tags;
            task.updatedAt = new Date().toISOString();
        }
    } else {
        // Criar nova tarefa
        const newTask = {
            id: generateId(),
            title,
            description,
            priority,
            dueDate,
            tags,
            status: 'todo',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        tasks.push(newTask);
    }

    saveTasks();
    renderAllTasks();
    closeModal();
}

// Renderizar todas as tarefas
function renderAllTasks() {
    const containers = document.querySelectorAll('.tasks-container');
    containers.forEach(container => {
        container.innerHTML = '';
    });

    tasks.forEach(task => {
        const card = createTaskCard(task);
        const container = document.querySelector(`.tasks-container[data-status="${task.status}"]`);
        if (container) {
            container.appendChild(card);
        }
    });

    updateTaskCounts();
}

// Criar card de tarefa
function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.dataset.id = task.id;

    const priorityLabels = {
        low: 'Baixa',
        medium: 'Média',
        high: 'Alta'
    };

    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

    card.innerHTML = `
        <div class="task-header">
            <span class="task-title">${escapeHtml(task.title)}</span>
            <div class="task-actions">
                <button class="btn-edit" title="Editar">✏️</button>
                <button class="btn-delete" title="Excluir">🗑️</button>
            </div>
        </div>
        ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
        <div class="task-meta">
            <span class="task-priority ${task.priority}">${priorityLabels[task.priority]}</span>
            ${task.dueDate ? `
                <span class="task-due-date ${isOverdue ? 'overdue' : ''}">
                    📅 ${formatDate(task.dueDate)}
                </span>
            ` : ''}
        </div>
        ${task.tags && task.tags.length > 0 ? `
            <div class="task-tags">
                ${task.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
        ` : ''}
    `;

    // Event listeners do card
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    // Botão editar
    card.querySelector('.btn-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        openModal(task);
    });

    // Botão excluir
    card.querySelector('.btn-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteModal(task.id);
    });

    // Duplo clique para editar
    card.addEventListener('dblclick', () => openModal(task));

    return card;
}

// Atualizar contadores de tarefas
function updateTaskCounts() {
    const statuses = ['todo', 'in-progress', 'review', 'done'];

    statuses.forEach(status => {
        const count = tasks.filter(t => t.status === status).length;
        const column = document.querySelector(`.column[data-status="${status}"]`);
        if (column) {
            column.querySelector('.task-count').textContent = count;
        }
    });
}

// Formatar data
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Exportar tarefas (para uso futuro)
function exportTasks() {
    const dataStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kanban-tasks.json';
    a.click();
    URL.revokeObjectURL(url);
}

// Importar tarefas (para uso futuro)
function importTasks(jsonString) {
    try {
        const imported = JSON.parse(jsonString);
        if (Array.isArray(imported)) {
            tasks = imported;
            saveTasks();
            renderAllTasks();
            return true;
        }
    } catch (e) {
        console.error('Erro ao importar tarefas:', e);
    }
    return false;
}

// Filtrar tarefas por texto (para uso futuro)
function filterTasks(searchText) {
    const search = searchText.toLowerCase();
    document.querySelectorAll('.task-card').forEach(card => {
        const title = card.querySelector('.task-title').textContent.toLowerCase();
        const description = card.querySelector('.task-description')?.textContent.toLowerCase() || '';
        const matches = title.includes(search) || description.includes(search);
        card.style.display = matches ? 'block' : 'none';
    });
}

// Limpar filtro
function clearFilter() {
    document.querySelectorAll('.task-card').forEach(card => {
        card.style.display = 'block';
    });
}
