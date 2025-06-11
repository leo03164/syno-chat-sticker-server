import { t } from 'elysia'
import { stickers } from '../db/schema'
import { ApiResponse } from '../types'

// Schema 定義
export type Sticker = typeof stickers.$inferSelect
export type InsertSticker = typeof stickers.$inferInsert

// 請求/回應型別
export interface CreateStickerRequest {
  path: string
  seriesId: string
}

export type StickerResponse = {
  success: boolean
  data?: Sticker | Sticker[]
  error?: string
}

export type StickerListResponse = ApiResponse<Sticker[]>

// 導出 schema 供 Elysia 使用
export const stickerSchema = {
  insert: t.Object({
    stickerId: t.String(),
    path: t.String(),
    seriesId: t.String()
  }),
  response: t.Object({
    success: t.Boolean(),
    data: t.Optional(t.Union([
      t.Object({
        stickerId: t.String(),
        path: t.String(),
        seriesId: t.String()
      }),
      t.Array(t.Object({
        stickerId: t.String(),
        path: t.String(),
        seriesId: t.String()
      }))
    ])),
    error: t.Optional(t.String())
  })
}