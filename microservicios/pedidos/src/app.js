const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

async function validarReferencias(usuarioId, productoId) {
    try {
        const usuariosUrl = process.env.USUARIOS_URL || 'http://usuarios-app:3001';
        const productosUrl = process.env.PRODUCTOS_URL || 'http://productos-app:3002';

        const [resUsuario, resProducto] = await Promise.all([
            fetch(`${usuariosUrl}/usuarios/${usuarioId}`),
            fetch(`${productosUrl}/productos/${productoId}`)
        ]);

        if (resUsuario.status === 404 || resProducto.status === 404) {
            return false;
        }

        return resUsuario.ok && resProducto.ok;
    } catch (error) {
        console.error('Error de conexion entre microservicios:', error.message);
        throw error;
    }
}

app.get('/health', (req, res) => {
    res.json({ estado: 'ok', servicio: 'pedidos' });
});

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

    if (![usuario_id, producto_id, cantidad].every(
        valor => Number.isInteger(Number(valor)) && Number(valor) > 0
    )) {
        return res.status(400).json({
            error: 'Los identificadores y la cantidad deben ser enteros positivos'
        });
    }

    try {
        const referenciasValidas = await validarReferencias(
            usuario_id,
            producto_id
        );

        if (!referenciasValidas) {
            return res.status(400).json({
                error: 'El usuario o producto indicado no existe'
            });
        }

        const result = await pool.query(
            `INSERT INTO pedidos (usuario_id, producto_id, cantidad)
             VALUES ($1, $2, $3) RETURNING *`,
            [usuario_id, producto_id, cantidad]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear pedido' });
    }
});

app.put('/pedidos/:id', async (req, res) => {
    const { usuario_id, producto_id, cantidad } = req.body;

    if (![usuario_id, producto_id, cantidad].every(
        valor => Number.isInteger(Number(valor)) && Number(valor) > 0
    )) {
        return res.status(400).json({
            error: 'Los identificadores y la cantidad deben ser enteros positivos'
        });
    }

    try {
        const referenciasValidas = await validarReferencias(
            usuario_id,
            producto_id
        );

        if (!referenciasValidas) {
            return res.status(400).json({
                error: 'El usuario o producto indicado no existe'
            });
        }

        const result = await pool.query(
            `UPDATE pedidos
             SET usuario_id = $1, producto_id = $2, cantidad = $3
             WHERE id = $4 RETURNING *`,
            [usuario_id, producto_id, cantidad, req.params.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar pedido' });
    }
});

app.delete('/pedidos/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM pedidos WHERE id = $1 RETURNING *', [req.params.id]);
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

