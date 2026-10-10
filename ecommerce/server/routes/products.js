import express from 'express'
import { sql } from '../db/client.js'

const router = express.Router()

function toNumber(product) {
  return { ...product, price: Number(product.price) }
}

router.get('/', async (req, res) => {
  const products = await sql`SELECT * FROM products ORDER BY id`
  res.json(products.map(toNumber))
})

router.get('/:id', async (req, res) => {
  const [product] = await sql`SELECT * FROM products WHERE id = ${req.params.id}`
  if (!product) {
    res.status(404).json({ error: 'Product not found' })
    return
  }
  res.json(toNumber(product))
})

export default router
