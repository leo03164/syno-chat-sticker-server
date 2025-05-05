import { pool } from '../db/index';
import { Sticker } from '../models/sticker.model';
import { createHash } from 'crypto';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

export const uploadStickersService = async (body) => {
  // 1. 取得 JSON 檔案
  const recordFile = body.record;
  if (!recordFile) throw new Error('Missing record JSON');
  const recordJson = JSON.parse(await recordFile.text());

  // 先在 for 迴圈外宣告暫存用的物件
  const stickers: { id: string; series: string }[] = [];
  const seriesMap = new Map<string, Set<string>>();
  const paths: { id: string; path: string }[] = [];
  const tagsMap = new Map<string, Set<string>>();

  // 2. 逐筆處理 JSON
  for (const item of recordJson) {
    // 2-1. 找到對應檔案
    const file = body[item.name];
    if (!file) continue;

    // 2-2. 讀取檔案內容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2-3. 檔案 hash
    const hash = createHash('sha256').update(buffer).digest('hex');
    const hashPrefix = hash.slice(0, 5);

    // 2-4. 建立資料夾
    const targetDir = join(process.cwd(), 'public', hashPrefix);
    if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });

    // 2-5. 重新命名並存檔
    const targetPath = join(targetDir, hash + '.png');
    writeFileSync(targetPath, buffer);

    // 取得 id（hash，不含副檔名）
    const id = hash;
    const series = item.series;
    const filePath = join('public', hashPrefix, hash + '.png');

    // 1. sticker
    stickers.push({ id, series });

    // 2. series
    if (!seriesMap.has(series)) seriesMap.set(series, new Set());
    seriesMap.get(series)!.add(id);

    // 3. path
    paths.push({ id, path: filePath });

    // 4. tags
    if (Array.isArray(item.tags)) {
      for (const tag of item.tags) {
        if (!tagsMap.has(tag)) tagsMap.set(tag, new Set());
        tagsMap.get(tag)!.add(id);
      }
    }
  }

  // for 迴圈外，組合 series, tags 欄位
  const seriesArr = Array.from(seriesMap.entries()).map(([name, ids]) => ({
    name,
    sticker_ids: Array.from(ids)
  }));

  const tagsArr = Array.from(tagsMap.entries()).map(([name, ids]) => ({
    name,
    stickers_ids: Array.from(ids)
  }));

  // 輸出所有資訊
  console.log('sticker:', stickers);
  console.log('series:', seriesArr);
  console.log('path:', paths);
  console.log('tags:', tagsArr);

  return {};
};

export class StickerService {
  async getStickerById(id: string): Promise<Sticker | null> {
    const res = await pool.query('SELECT * FROM sticker WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  // 其他 CRUD 方法可依需求擴充
}