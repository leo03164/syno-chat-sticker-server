import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'
import dotenv from 'dotenv'

dotenv.config()

// 建立資料庫連線
const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
})

// 建立 Drizzle 實體
export const db = drizzle(pool, { schema })

// 導出 pool 用於關閉連接
export { pool }