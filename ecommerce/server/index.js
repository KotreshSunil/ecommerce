import 'dotenv/config'
import express from 'express'
import morgan from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './auth.js'
import productsRouter from './routes/products.js'
import ordersRouter from './routes/orders.js'
import productsMysqlRouter from './routes/products-mysql.js'
import ordersMysqlRouter from './routes/orders-mysql.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '../dist')

const app = express()

app.use(morgan('dev'))
app.all('/api/auth/*', toNodeHandler(auth))
app.use(express.json())

app.use('/api/products', productsRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/mysql/products', productsMysqlRouter)
app.use('/api/mysql/orders', ordersMysqlRouter)

app.use(express.static(distDir))

app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
