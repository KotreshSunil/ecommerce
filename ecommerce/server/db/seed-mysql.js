import 'dotenv/config'
import { mysqlPool } from './mysql-client.js'
import { products } from './seed-data.js'

async function seed() {
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      category VARCHAR(255) NOT NULL,
      emoji VARCHAR(16) NOT NULL,
      description TEXT NOT NULL
    )
  `)

  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      items JSON NOT NULL,
      total DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  for (const product of products) {
    await mysqlPool.query(
      `INSERT INTO products (id, name, price, category, emoji, description)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [product.id, product.name, product.price, product.category, product.emoji, product.description]
    )
  }

  const [[{ count }]] = await mysqlPool.query('SELECT COUNT(*) AS count FROM products')
  console.log(`Seed complete. products table has ${count} rows.`)
  await mysqlPool.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exitCode = 1
})
