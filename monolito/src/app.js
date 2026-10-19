const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ estado: 'ok', servicio: 'monolito' });
});

// --- USUARIOS ---
app.get('/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM usuarios');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar usuarios' });
    }
});

app.post('/usuarios', async (req, res) => {
    const { nombre, email } = req.body;
    if (!nombre || !email) {
        return res.status(400).json({ error: 'Nombre y email son obligatorios' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email) VALUES ($1, $2) RETURNING *',
            [nombre, email]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear usuario' });
    }
});

// --- PRODUCTOS ---
app.get('/productos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar productos' });
    }
});

app.post('/productos', async (req, res) => {
    const { nombre, precio } = req.body;
    if (!nombre || precio === undefined || !Number.isFinite(Number(precio)) || Number(precio) < 0) {
        return res.status(400).json({ error: 'Nombre y precio válido son obligatorios' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO productos (nombre, precio) VALUES ($1, $2) RETURNING *',
            [nombre, precio]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

// --- PEDIDOS ---
app.get('/pedidos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pedidos');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar pedidos' });
    }
});

app.post('/pedidos', async (req, res) => {
    const { usuario_id, producto_id, cantidad } = req.body;
    if (![usuario_id, producto_id, cantidad].every(valor => Number.isInteger(Number(valor)) && Number(valor) > 0)) {
        return res.status(400).json({ error: 'Los identificadores y la cantidad deben ser enteros positivos' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO pedidos (usuario_id, producto_id, cantidad) VALUES ($1, $2, $3) RETURNING *',
            [usuario_id, producto_id, cantidad]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23503') {
            return res.status(400).json({ error: 'El usuario o producto indicado no existe' });
        }
        console.error(error);
        res.status(500).json({ error: 'Error al crear pedido' });
    }
});

app.put('/pedidos/:id', async (req, res) => {
    const { usuario_id, producto_id, cantidad } = req.body;
    if (![usuario_id, producto_id, cantidad].every(valor => Number.isInteger(Number(valor)) && Number(valor) > 0)) {
        return res.status(400).json({ error: 'Los identificadores y la cantidad deben ser enteros positivos' });
    }
    try {
        const result = await pool.query(
            'UPDATE pedidos SET usuario_id = $1, producto_id = $2, cantidad = $3 WHERE id = $4 RETURNING *',
            [usuario_id, producto_id, cantidad, req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        if (error.code === '23503') {
            return res.status(400).json({ error: 'El usuario o producto indicado no existe' });
        }
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar pedido' });
    }
});

app.delete('/pedidos/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM pedidos WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        res.json({ mensaje: 'Pedido eliminado', pedido: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar pedido' });
    }
});

module.exports = app;
