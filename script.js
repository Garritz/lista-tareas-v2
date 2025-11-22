// Lista de Tareas con Autenticación
let tareasPorHacer = []; 
let tareasTerminadas = [];
let currentUser = null;
let lastDeletedTask = null;

// Configuración de la API
const API_URL = 'https://tareas-backend-s69a.onrender.com/api';

// ============================================
// UTILIDADES DE UI
// ============================================

// Agregar clase de loading a un botón
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
        // Envolver el texto en un span si no existe
        if (!button.querySelector('span')) {
            button.innerHTML = `<span>${button.textContent}</span>`;
        }
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

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
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
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
    const activeButton = isRegister ? registerBtn : loginBtn;
    
    // Activar loading en el botón correspondiente
    setButtonLoading(activeButton, true);
    
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
    } finally {
        setButtonLoading(activeButton, false);
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
    
    // Mostrar mensajes de carga en los títulos
    mostrarMensajesCarga();
    
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
        
        // Quitar la animación de carga
        quitarMensajesCarga();
        
        // Actualizar contadores
        actualizarContadores();
        
        // Mostrar las tareas
        mostrarTareas();
    } catch (error) {
        console.error('Error cargando tareas:', error);
        alert('No se pudieron cargar las tareas. Verifica tu conexión.');
        // Quitar animación y mostrar estado vacío en caso de error
        quitarMensajesCarga();
        actualizarContadores();
        mostrarTareas();
    }
}

// Mostrar mensajes de carga en los títulos H1
function mostrarMensajesCarga() {
    const tituloPorHacer = document.querySelector('#porhacer h1');
    const tituloTerminadas = document.querySelector('#terminadas h1');
    
    tituloPorHacer.textContent = 'Cargando tareas...';
    tituloPorHacer.classList.add('loading');
    
    tituloTerminadas.textContent = 'Estamos trabajando para usted...';
    tituloTerminadas.classList.add('loading');
}

// Quitar mensajes de carga de los títulos H1
function quitarMensajesCarga() {
    const tituloPorHacer = document.querySelector('#porhacer h1');
    const tituloTerminadas = document.querySelector('#terminadas h1');
    
    tituloPorHacer.classList.remove('loading');
    tituloTerminadas.classList.remove('loading');
}

// Agregar una tarea nueva
async function agregarTarea(event) {
    const textarea = document.querySelector('textarea[name="ingresartarea"]');
    const textoTarea = textarea.value.trim();
    const token = localStorage.getItem('token');
    const submitBtn = event ? event.submitter : document.querySelector('#taskForm button[type="submit"]');
    
    // Validación
    if (textoTarea === '') {
        alert('Por favor escribe una tarea antes de agregar');
        return; 
    }
    
    if (!token) {
        alert('Debes iniciar sesión para agregar tareas');
        return;
    }
    
    // Activar loading en el botón
    setButtonLoading(submitBtn, true);
    
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
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// Eliminar una tarea
async function eliminarTarea(id, esCompletada, event) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('Debes iniciar sesión');
        return;
    }
    
    // Obtener el botón que disparó el evento
    const button = event ? event.target : null;
    if (button) {
        setButtonLoading(button, true);
    }
    
    // Guardar la tarea antes de eliminarla (para undo)
    const tareaAEliminar = [...tareasPorHacer, ...tareasTerminadas].find(t => t._id === id);
    
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
        
        // Guardar para undo
        lastDeletedTask = tareaAEliminar;
        
        // Recargar tareas desde el servidor
        await cargarTareas();
        
        // Mostrar notificación de undo
        mostrarNotificacionUndo();
    } catch (error) {
        console.error('Error eliminando tarea:', error);
        alert('No se pudo eliminar la tarea. Intenta de nuevo.');
    } finally {
        if (button) {
            setButtonLoading(button, false);
        }
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
                <button onclick="eliminarTarea('${tarea._id}', false, event)"><span>Eliminar</span></button>
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
                <button onclick="eliminarTarea('${tarea._id}', true, event)"><span>Eliminar</span></button>
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

// Mostrar notificación de undo
function mostrarNotificacionUndo() {
    // Crear notificación si no existe
    let notificacion = document.getElementById('undoNotification');
    
    if (!notificacion) {
        notificacion = document.createElement('div');
        notificacion.id = 'undoNotification';
        notificacion.className = 'undo-notification hidden';
        notificacion.innerHTML = `
            <span>Tarea eliminada</span>
            <button onclick="deshacerEliminacion()">Deshacer (Ctrl+Z)</button>
        `;
        document.body.appendChild(notificacion);
    }
    
    // Mostrar notificación
    notificacion.classList.remove('hidden');
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        notificacion.classList.add('hidden');
    }, 5000);
}

// Deshacer eliminación
async function deshacerEliminacion() {
    if (!lastDeletedTask) {
        console.log('No hay tarea para restaurar');
        return;
    }
    
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('Debes iniciar sesión');
        return;
    }
    
    try {
        // Recrear la tarea
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                text: lastDeletedTask.text,
                completed: lastDeletedTask.completed
            })
        });
        
        if (response.ok) {
            // Limpiar el historial
            lastDeletedTask = null;
            
            // Ocultar notificación
            const notificacion = document.getElementById('undoNotification');
            if (notificacion) {
                notificacion.classList.add('hidden');
            }
            
            // Recargar tareas
            await cargarTareas();
        }
    } catch (error) {
        console.error('Error restaurando tarea:', error);
        alert('No se pudo restaurar la tarea.');
    }
}

// Actualizar números de los títulos
function actualizarContadores() {
    const tituloPorHacer = document.querySelector('#porhacer h1');
    const tituloTerminadas = document.querySelector('#terminadas h1');
    
    // Actualizar los textos con los contadores
    tituloPorHacer.textContent = `Tengo (${tareasPorHacer.length}) tareas por hacer`;
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
            agregarTarea(evento);
        });
    }
    
    const botonLimpiar = document.querySelector('button[type="reset"]');
    if (botonLimpiar) {
        botonLimpiar.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelector('textarea[name="ingresartarea"]').value = '';
        });
    }
    
    // Listener para Ctrl+Z / Cmd+Z
    document.addEventListener('keydown', function(e) {
        // Ctrl+Z en Windows/Linux o Cmd+Z en Mac
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            deshacerEliminacion();
        }
    });
});