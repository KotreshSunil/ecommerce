import 'dotenv/config'
import { sql } from './client.js'
import { products } from './seed-data.js'

async function seed() {
  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id INT PRIMARY KEY,
      name TEXT NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      category TEXT NOT NULL,
      emoji TEXT NOT NULL,
      description TEXT NOT NULL
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      items JSONB NOT NULL,
      total NUMERIC(10, 2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      user_id TEXT REFERENCES "user"(id)
    )
  `

  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES "user"(id)`

  for (const product of products) {
    await sql`
      INSERT INTO products (id, name, price, category, emoji, description)
      VALUES (${product.id}, ${product.name}, ${product.price}, ${product.category}, ${product.emoji}, ${product.description})
      ON CONFLICT (id) DO NOTHING
    `
  }

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM products`
  console.log(`Seed complete. products table has ${count} rows.`)
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exitCode = 1
  })
