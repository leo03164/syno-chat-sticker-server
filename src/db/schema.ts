import { relations } from 'drizzle-orm'
import {
    pgTable,
    varchar,
    primaryKey,
} from 'drizzle-orm/pg-core'

// 貼圖系列表
export const series = pgTable(
    'series',
    {
        id: varchar('id', { length: 255 })
            .notNull()
            .primaryKey(),
    }
)

// 貼圖主表
export const stickers = pgTable(
    'stickers',
    {
        stickerId: varchar('sticker_id', { length: 255 })
            .notNull()
            .primaryKey(),
        path: varchar('path', { length: 255 })
            .notNull(),
        seriesId: varchar('series_id', { length: 255 })
            .notNull(),
    }
)

// 標籤表
export const tags = pgTable(
    'tags',
    {
        tagId: varchar('tag_id', { length: 255 })
            .notNull()
            .primaryKey(),
        tagName: varchar('tag_name', { length: 255 })
            .notNull()
            .unique(),
    }
)

// 貼圖與標籤關聯表
export const stickerTags = pgTable(
    'sticker_tags',
    {
        stickerId: varchar('sticker_id', { length: 255 })
            .notNull()
            .references(() => stickers.stickerId),
        tagId: varchar('tag_id', { length: 255 })
            .notNull()
            .references(() => tags.tagId),
    },
    (table) => [
        primaryKey({ columns: [table.stickerId, table.tagId] })
    ]
)

// 定義關聯
export const stickersRelations = relations(stickers, ({ many }) => ({
    tags: many(stickerTags),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
    stickers: many(stickerTags),
}))

export const stickerTagsRelations = relations(stickerTags, ({ one }) => ({
    sticker: one(stickers, {
        fields: [stickerTags.stickerId],
        references: [stickers.stickerId],
    }),
    tag: one(tags, {
        fields: [stickerTags.tagId],
        references: [tags.tagId],
    }),
}))

export const table = {
    series,
    stickers,
    tags,
    stickerTags,
} as const

export type Table = typeof table