import express from 'express'
import { fromNodeHeaders } from 'better-auth/node'
import { sql } from '../db/client.js'
import { auth } from '../auth.js'

const router = express.Router()

function toNumber(order) {
  return { ...order, total: Number(order.total) }
}

router.post('/', async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
  if (!session) {
    res.status(401).json({ error: 'Sign in required' })
    return
  }

  const { items, total } = req.body

  if (!Array.isArray(items) || items.length === 0 || typeof total !== 'number') {
    res.status(400).json({ error: 'Request must include a non-empty items array and a numeric total' })
    return
  }

  const [order] = await sql`
    INSERT INTO orders (items, total, user_id)
    VALUES (${JSON.stringify(items)}, ${total}, ${session.user.id})
    RETURNING id, items, total, created_at
  `
  res.status(201).json(toNumber(order))
})

router.get('/mine', async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
  if (!session) {
    res.status(401).json({ error: 'Sign in required' })
    return
  }

  const orders = await sql`
    SELECT id, items, total, created_at
    FROM orders
    WHERE user_id = ${session.user.id}
    ORDER BY created_at DESC
  `
  res.json(orders.map(toNumber))
})

export default router
