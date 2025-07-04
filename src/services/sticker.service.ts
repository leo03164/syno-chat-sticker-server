import { db } from '../db/index'
import { stickers, tags, stickerTags, series } from '../db/schema'
import { eq, and, SQL } from 'drizzle-orm'
import { Sticker } from '../models/sticker.model'
import { createHash } from 'crypto'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { StickerRecord } from '../types'
import { FileValidatorService } from './file-validator.service'
import { HackmdService } from './hackmd.service'

// 檔案處理相關函數
async function processFileUpload(file: File, hash: string, hashPrefix: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const targetDir = join(process.cwd(), 'public', hashPrefix)

  if (!existsSync(targetDir)) 
    mkdirSync(targetDir, { recursive: true })

  const targetPath = join(targetDir, hash + '.png')
  writeFileSync(targetPath, buffer)
  return join('public', hashPrefix, hash + '.png')
}

export class StickerService {
  // 根據 ID 獲取貼圖
  async getStickerById(id: string): Promise<Sticker | null> {
    const result = await db.select().from(stickers).where(eq(stickers.stickerId, id))
    return result[0] || null
  }

  // 創建新貼圖
  async createSticker(data: { stickerId: string; path: string; seriesId: string }): Promise<Sticker> {
    const result = await db.insert(stickers).values(data).returning()
    return result[0]
  }

  // 批次上傳貼圖
  async uploadStickers(recordFile: File, filesMap: Record<string, File>): Promise<{ success: boolean; error?: string }> {
    try {
      // 解析 record JSON
      const recordText = await recordFile.text()
      const records: StickerRecord[] = JSON.parse(recordText)

      // 驗證檔案
      const validationResult = FileValidatorService.validateFiles(records, filesMap)
      if (!validationResult.isValid) {
        return { success: false, error: validationResult.error }
      }

      // 處理每個貼圖
      for (const record of records) {
        const file = filesMap[record.file_name]!
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const hash = createHash('sha256').update(buffer).digest('hex')
        const hashPrefix = hash.slice(0, 5)
        const path = await processFileUpload(file, hash, hashPrefix)

        // 檢查並創建 series（如果不存在）
        let seriesRecord = await db.select().from(series).where(eq(series.id, record.series))
        if (!seriesRecord[0]) {
          const newSeries = await db.insert(series).values({
            id: record.series
          }).returning()
          seriesRecord = newSeries
        }

        // 創建貼圖記錄
        const sticker = await this.createSticker({
          stickerId: hash,
          path,
          seriesId: seriesRecord[0].id
        })

        // 處理標籤
        if (record.tags && record.tags.length > 0) {
          for (const tagName of record.tags) {
            // 檢查標籤是否存在，不存在則創建
            const existingTag = await db.select().from(tags).where(eq(tags.tagName, tagName))
            let tagId: string

            if (existingTag.length === 0) {
              const newTag = await db.insert(tags).values({
                tagId: crypto.randomUUID(),
                tagName
              }).returning()
              tagId = newTag[0].tagId
            } else {
              tagId = existingTag[0].tagId
            }

            // 建立貼圖和標籤的關聯
            await db.insert(stickerTags).values({
              stickerId: sticker.stickerId,
              tagId
            })
          }
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error uploading stickers:', error)
      return { success: false, error: error.message }
    }
  }

  // 批次上傳貼圖到 HackMD
  async uploadStickersToHackMD(recordFile: File, filesMap: Record<string, File>, seriesId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 解析 record JSON
      const recordText = await recordFile.text()
      const records: StickerRecord[] = JSON.parse(recordText)

      // 驗證檔案
      const validationResult = FileValidatorService.validateFiles(records, filesMap)
      if (!validationResult.isValid) {
        return { success: false, error: validationResult.error }
      }

      // 處理每個貼圖
      for (const record of records) {
        const file = filesMap[record.file_name]!
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const hash = createHash('sha256').update(buffer).digest('hex')
        
        // 上傳到 HackMD
        const hackmdResult = await HackmdService.uploadImage(file)
        const path = hackmdResult.link

        // 檢查並創建 series（如果不存在）
        let seriesRecord = await db.select().from(series).where(eq(series.id, seriesId))
        if (!seriesRecord[0]) {
          const newSeries = await db.insert(series).values({
            id: seriesId
          }).returning()
          seriesRecord = newSeries
        }

        // 創建貼圖記錄
        const sticker = await this.createSticker({
          stickerId: hash,
          path,
          seriesId: seriesRecord[0].id
        })

        // 處理標籤
        if (record.tags && record.tags.length > 0) {
          for (const tagName of record.tags) {
            // 檢查標籤是否存在，不存在則創建
            const existingTag = await db.select().from(tags).where(eq(tags.tagName, tagName))
            let tagId: string

            if (existingTag.length === 0) {
              const newTag = await db.insert(tags).values({
                tagId: crypto.randomUUID(),
                tagName
              }).returning()
              tagId = newTag[0].tagId
            } else {
              tagId = existingTag[0].tagId
            }

            // 建立貼圖和標籤的關聯
            await db.insert(stickerTags).values({
              stickerId: sticker.stickerId,
              tagId
            })
          }
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error uploading stickers to HackMD:', error)
      return { success: false, error: error.message }
    }
  }

  // 統一的貼圖查詢方法
  async getStickers(params: { seriesId?: string; stickerId?: string }): Promise<Sticker[]> {
    const { seriesId, stickerId } = params

    // 構建查詢條件
    const conditions: SQL<unknown>[] = []
    if (seriesId) {
      conditions.push(eq(stickers.seriesId, seriesId))
    }
    if (stickerId) {
      conditions.push(eq(stickers.stickerId, stickerId))
    }

    // 執行查詢
    const query = db.select().from(stickers)
    if (conditions.length > 0) {
      query.where(and(...conditions))
    }

    const result = await query
    return result
  }
}