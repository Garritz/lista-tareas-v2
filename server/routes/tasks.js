import express from 'express';
import Task from '../models/Task.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener todas las tareas del usuario
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

// Crear una nueva tarea
router.post('/', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'El texto de la tarea es requerido' });
    }

    const task = new Task({
      userId: req.user.userId,
      text: text.trim()
    });
    
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear tarea' });
  }
});

// Actualizar una tarea
router.put('/:id', async (req, res) => {
  try {
    const { completed, text } = req.body;
    
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!task) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    if (completed !== undefined) task.completed = completed;
    if (text !== undefined) task.text = text.trim();

    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar tarea' });
  }
});

// Eliminar una tarea
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!task) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    res.json({ message: 'Tarea eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar tarea' });
  }
});

export default router;