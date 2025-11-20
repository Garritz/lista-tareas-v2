// Lista de Tareas con Autenticación
let tareasPorHacer = []; 
let tareasTerminadas = [];
let currentUser = null;

// Configuración de la API
const API_URL = 'https://tareas-backend-s69a.onrender.com/api'; // Cambiado a producción

// ============================================
// AUTENTICACIÓN
// ============================================

// Verificar si hay sesión al cargar
function checkAuth() {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
        currentUser = JSON.parse(savedUser);
        mostrarApp();
        cargarTareas();
    } else {
        mostrarLogin();
    }
}

// Mostrar pantalla de login
function mostrarLogin() {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('userSection').classList.add('hidden');
    document.getElementById('mainContent').classList.add('hidden');
}

// Mostrar aplicación
function mostrarApp() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('userSection').classList.remove('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
    document.getElementById('username').textContent = currentUser.username;
}

// Manejar login/registro
async function handleAuth(isRegister) {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorDiv = document.getElementById('errorMessage');
    
    // Validaciones
    if (!username || !password) {
        mostrarError('Por favor completa todos los campos');
        return;
    }
    
    if (username.length < 3) {
        mostrarError('El usuario debe tener al menos 3 caracteres');
        return;
    }
    
    if (password.length < 6) {
        mostrarError('La contraseña debe tener al menos 6 caracteres');
        return;
    }
    
    const endpoint = isRegister ? '/auth/register' : '/auth/login';
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            
            // Limpiar campos
            document.getElementById('loginUsername').value = '';
            document.getElementById('loginPassword').value = '';
            ocultarError();
            
            mostrarApp();
            cargarTareas();
        } else {
            mostrarError(data.error || 'Error al autenticar');
        }
    } catch (error) {
        console.error('Error de autenticación:', error);
        mostrarError('Error de conexión con el servidor');
    }
}

// Cerrar sesión
function handleLogout() {
    if (confirm('¿Seguro que quieres cerrar sesión?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        currentUser = null;
        tareasPorHacer = [];
        tareasTerminadas = [];
        mostrarLogin();
    }
}

// Mostrar error
function mostrarError(mensaje) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = mensaje;
    errorDiv.classList.remove('hidden');
}

// Ocultar error
function ocultarError() {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.classList.add('hidden');
}

// ============================================
// GESTIÓN DE TAREAS
// ============================================

// Cargar tareas desde el backend
async function cargarTareas() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.error('No hay token de autenticación');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/tasks`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401 || response.status === 403) {
            // Token inválido o expirado
            alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
            handleLogout();
            return;
        }
        
        if (!response.ok) throw new Error('Error al cargar tareas');
        
        const todasLasTareas = await response.json();
        
        // Separar tareas completadas y pendientes
        tareasPorHacer = todasLasTareas.filter(tarea => !tarea.completed);
        tareasTerminadas = todasLasTareas.filter(tarea => tarea.completed);
        
        mostrarTareas();
        actualizarContadores();
    } catch (error) {
        console.error('Error cargando tareas:', error);
        alert('No se pudieron cargar las tareas. Verifica tu conexión.');
    }
}

// Agregar una tarea nueva
async function agregarTarea() {
    const textarea = document.querySelector('textarea[name="ingresartarea"]');
    const textoTarea = textarea.value.trim();
    const token = localStorage.getItem('token');
    
    // Validación
    if (textoTarea === '') {
        alert('Por favor escribe una tarea antes de agregar');
        return; 
    }
    
    if (!token) {
        alert('Debes iniciar sesión para agregar tareas');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                text: textoTarea
            })
        });
        
        if (response.status === 401 || response.status === 403) {
            alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
            handleLogout();
            return;
        }
        
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Error del servidor: ${response.status} - ${errorData}`);
        }
        
        // Limpiar formulario
        textarea.value = '';
        
        // Recargar tareas desde el servidor
        await cargarTareas();
    } catch (error) {
        console.error('Error agregando tarea:', error);
        alert(`No se pudo agregar la tarea.\n\nError: ${error.message}`);
    }
}

// Eliminar una tarea
async function eliminarTarea(id, esCompletada) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('Debes iniciar sesión');
        return;
    }
    
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;
    
    try {
        const response = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401 || response.status === 403) {
            alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
            handleLogout();
            return;
        }
        
        if (!response.ok) throw new Error('Error al eliminar tarea');
        
        // Recargar tareas desde el servidor
        await cargarTareas();
    } catch (error) {
        console.error('Error eliminando tarea:', error);
        alert('No se pudo eliminar la tarea. Intenta de nuevo.');
    }
}

// Marcar una tarea como completada o pendiente
async function toggleTarea(id, esCompletada) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('Debes iniciar sesión');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                completed: !esCompletada
            })
        });
        
        if (response.status === 401 || response.status === 403) {
            alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
            handleLogout();
            return;
        }
        
        if (!response.ok) throw new Error('Error al actualizar tarea');
        
        // Recargar tareas desde el servidor
        await cargarTareas();
    } catch (error) {
        console.error('Error actualizando tarea:', error);
        alert('No se pudo actualizar la tarea. Intenta de nuevo.');
    }
}

// Mostrar todas las tareas
function mostrarTareas() {
    mostrarTareasPorHacer();
    mostrarTareasTerminadas();
}

// Mostrar pendientes
function mostrarTareasPorHacer() {
    const lista = document.querySelector('#porhacer ul');
    lista.innerHTML = '';
    
    tareasPorHacer.forEach((tarea, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="tarea">
                <p class="tareaID">${index + 1}.</p>
                <p class="tareaNombre">${escapeHTML(tarea.text)}</p>
            </div>
            <div class="opciones">
                <button onclick="eliminarTarea('${tarea._id}', false)">Eliminar</button>
                <input type="checkbox" onchange="toggleTarea('${tarea._id}', false)">
            </div>
        `;
        lista.appendChild(li);
    });
    
    if (tareasPorHacer.length === 0) {
        lista.innerHTML = '<li>¡Todo listo!</li>';
    }
}

// Mostrar completadas
function mostrarTareasTerminadas() {
    const lista = document.querySelector('#terminadas ul');
    lista.innerHTML = '';

    tareasTerminadas.forEach((tarea, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="tarea">
                <p class="tareaID">${index + 1}.</p>
                <p class="tareaNombre" style="text-decoration: line-through;">${escapeHTML(tarea.text)}</p>
            </div>
            <div class="opciones">
                <button onclick="eliminarTarea('${tarea._id}', true)">Eliminar</button>
                <input type="checkbox" checked onchange="toggleTarea('${tarea._id}', true)">
            </div>
        `;
        lista.appendChild(li);
    });
    
    if (tareasTerminadas.length === 0) {
        lista.innerHTML = '<li>Ni una papa pelá.</li>';
    }
}

// Escapar HTML para prevenir XSS
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Actualizar números de los títulos
function actualizarContadores() {
    const tituloPorHacer = document.querySelector('#porhacer h1');
    tituloPorHacer.textContent = `Tengo (${tareasPorHacer.length}) tareas por hacer`;
    
    const tituloTerminadas = document.querySelector('#terminadas h1');
    tituloTerminadas.textContent = `Ya terminé (${tareasTerminadas.length}) tareas`;
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación al cargar
    checkAuth();
    
    // Event listeners para autenticación
    document.getElementById('loginBtn').addEventListener('click', () => handleAuth(false));
    document.getElementById('registerBtn').addEventListener('click', () => handleAuth(true));
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Enter en campos de login
    document.getElementById('loginUsername').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAuth(false);
    });
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAuth(false);
    });
    
    // Formulario de tareas
    const formulario = document.getElementById('taskForm');
    if (formulario) {
        formulario.addEventListener('submit', function(evento) {
            evento.preventDefault();
            agregarTarea();
        });
    }
    
    const botonLimpiar = document.querySelector('button[type="reset"]');
    if (botonLimpiar) {
        botonLimpiar.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelector('textarea[name="ingresartarea"]').value = '';
        });
    }
});