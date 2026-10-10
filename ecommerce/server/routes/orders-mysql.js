import express from 'express'
import { mysqlPool } from '../db/mysql-client.js'

const router = express.Router()

router.post('/', async (req, res) => {
  const { items, total } = req.body

  if (!Array.isArray(items) || items.length === 0 || typeof total !== 'number') {
    res.status(400).json({ error: 'Request must include a non-empty items array and a numeric total' })
    return
  }

  const [result] = await mysqlPool.query('INSERT INTO orders (items, total) VALUES (?, ?)', [
    JSON.stringify(items),
    total,
  ])
  const [[order]] = await mysqlPool.query('SELECT id, items, total, created_at FROM orders WHERE id = ?', [
    result.insertId,
  ])
  res.status(201).json({ ...order, total: Number(order.total) })
})

export default router
