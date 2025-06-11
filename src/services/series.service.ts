import { db } from '../db/index';
import { eq } from 'drizzle-orm';
import { series } from '../db/schema';
import { Series } from '../models/series.model';

export class SeriesService {
  // 獲取所有系列
  async getAllSeries(): Promise<Series[]> {
    const result = await db
      .select()
      .from(series);

    return result;
  }

  // 根據 ID 取得單一系列
  async getSeriesById(seriesId: string): Promise<Series | null> {
    const result = await db
      .select()
      .from(series)
      .where(eq(series.id, seriesId));

    return result[0] || null;
  }

  // 建立新系列
  async createSeries(): Promise<Series> {
    const result = await db
      .insert(series)
      .values({
        id: crypto.randomUUID(),
      })
      .returning();

    return result[0];
  }
} 