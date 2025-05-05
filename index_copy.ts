import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { createHash } from 'crypto';
import { mkdirSync, existsSync, writeFileSync, unlinkSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import AdmZip from 'adm-zip';

// 定義貼圖的型別
interface Sticker {
  id: string;  // hash 值
  sticker_name: string;  // 原始檔案名稱
  sticker_path: string;  // 圖片位於專案的路徑
}

// 模擬資料庫
let stickers: Sticker[] = [];

const app = new Elysia()
  .use(cors())
  .use(swagger())
  .get('/', () => 'Welcome to Chat Sticker Server')
  // 獲取貼圖檔案
  .get('/public/:seriesId/:stickerId', async ({ params: { seriesId, stickerId }, set }) => {
    const filePath = join(process.cwd(), 'public', seriesId, `${stickerId}`);
    if (!existsSync(filePath)) throw new Error('Sticker file not found');

    // 設定正確的 Content-Type
    set.headers['Content-Type'] = 'image/png';
    
    // 回傳檔案
    return new Response(readFileSync(filePath));
  })
  
  // 創建新貼圖系列
  .post('/stickers', async ({ body }: { body: { stickerId: string } }) => {
    const { stickerId } = body;
    const stickerUrls = [
      `https://stickershop.line-scdn.net/stickershop/v1/product/${stickerId}/iphone/stickers@2x.zip`,
      `https://stickershop.line-scdn.net/stickershop/v1/product/${stickerId}/iphone/stickerpack@2x.zip`
    ];

    // 創建資料夾
    const stickerDir = join(process.cwd(), 'public', stickerId);
    if (!existsSync(stickerDir)) {
      mkdirSync(stickerDir, { recursive: true });
    }

    let downloaded = false;
    const newStickers: Sticker[] = [];

    for (const url of stickerUrls) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
            'Accept': '*/*',
            'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://store.line.me/'
          }
        });
        
        if (!response.ok) {
          console.log(`Failed to download from ${url}: ${response.status} ${response.statusText}`);
          continue;
        }

        const zipBuffer = await response.arrayBuffer();
        const zip = new AdmZip(Buffer.from(zipBuffer));
        
        // 解壓縮所有檔案
        zip.extractAllTo(stickerDir, true);

        // 處理解壓縮後的檔案
        const zipEntries = zip.getEntries();
        for (const entry of zipEntries) {
          if (/^\d+@2x\.png$/.test(entry.entryName)) {
            const originalName = entry.entryName;
            const hash = createHash('sha256').update(originalName).digest('hex');
            const newFilename = `${hash}.png`;
            const newFilePath = join(stickerDir, newFilename);
            
            // 寫入新檔案
            writeFileSync(newFilePath, entry.getData());

            newStickers.push({
              id: hash,
              sticker_name: originalName,
              sticker_path: `public/${stickerId}/${newFilename}`
            });
          }
        }

        // 清理原始檔案
        const files = readdirSync(stickerDir);
        for (const file of files) {
          // 只保留 hash 後的 png 檔案
          if (!/^[a-f0-9]{64}\.png$/.test(file)) {
            unlinkSync(join(stickerDir, file));
          }
        }

        downloaded = true;
        break;
      } catch (error) {
        console.error(`Failed to download from ${url}:`, error);
        continue;
      }
    }

    if (!downloaded) {
      throw new Error('Failed to download sticker pack from all URLs');
    }

    // 更新資料庫
    stickers = [...stickers, ...newStickers];

    return {
      success: true,
      message: 'Sticker pack downloaded and processed successfully',
      stickers: newStickers
    };
  })
  
const port = parseInt(process.env.PORT || '3000');
const host = process.env.HOST || '0.0.0.0';

app.listen({
  port,
  hostname: host
}, () => {
  console.log(`🦊 Server is running at http://${host}:${port}`);
  console.log(`🦊 Swagger documentation available at http://${host}:${port}/swagger`);
});
