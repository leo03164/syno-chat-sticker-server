import { createInsertSchema, createSelectSchema } from 'drizzle-typebox'
import { series } from '../db/schema'
import { ApiResponse } from '../types'

// Schema 定義
export const insertSchema = createInsertSchema(series)
export const selectSchema = createSelectSchema(series)

// 型別定義
export type InsertSeries = typeof insertSchema
export type SelectSeries = typeof selectSchema

// 資料結構定義
export interface Series {
  id: string
}

// 請求/回應型別
export type SeriesResponse = ApiResponse<Series>
export type SeriesListResponse = ApiResponse<Series[]>

// 匯出 schema 供 Elysia 使用
export const seriesSchema = {
  insert: insertSchema,
  select: selectSchema
} 