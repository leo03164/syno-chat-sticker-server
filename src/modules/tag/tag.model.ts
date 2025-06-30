import { createInsertSchema, createSelectSchema } from 'drizzle-typebox'
import { tags } from '../../db/schema'
import { ApiResponse } from '../../types'

// Schema 定義
export const insertSchema = createInsertSchema(tags)
export const selectSchema = createSelectSchema(tags)

// 型別定義
export type InsertTag = typeof insertSchema
export type SelectTag = typeof selectSchema

// 資料結構定義
export interface Tag {
  tagId: string
  tagName: string
}

// 請求/回應型別
export interface CreateTagRequest {
  tagName: string
}

export type TagResponse = ApiResponse<Tag>
export type TagListResponse = ApiResponse<Tag[]>

// 導出 schema 供 Elysia 使用
export const tagSchema = {
  insert: insertSchema,
  select: selectSchema
} 