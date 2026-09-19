import mysql from 'mysql2/promise'

const required = ['TIDB_HOST', 'TIDB_PORT', 'TIDB_USER', 'TIDB_PASSWORD', 'TIDB_DATABASE']
const missing = required.filter((key) => !process.env[key])

if (missing.length > 0) {
  throw new Error(
    `Missing TiDB env vars: ${missing.join(', ')}. Copy .env.example to .env and fill in your TiDB Serverless connection details.`
  )
}

export const mysqlPool = mysql.createPool({
  host: process.env.TIDB_HOST,
  port: Number(process.env.TIDB_PORT),
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE,
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
})
