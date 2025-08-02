import { StickerService } from './sticker.service';
import { Context } from 'elysia';
import { StickerResponse } from './sticker.model';
import { SeriesService } from '../series/series.service';
import { MinIOService } from './minio.service';

const stickerService = new StickerService();

export const getStickersController = async ({ query, set }: Context): Promise<StickerResponse> => {
  try {
    const stickers = await stickerService.getStickers({
      seriesId: query.seriesId as string | undefined,
      stickerId: query.stickerId as string | undefined
    })
    
    // 如果查詢單一貼圖且找到結果，返回單一物件
    if (query.stickerId && stickers.length === 1) {
      return { 
        success: true, 
        data: stickers[0]
      }
    }
    
    // 否則回傳陣列
    return { 
      success: true, 
      data: stickers
    }
  } catch (err) {
    set.status = 500
    return { success: false, error: err.message || 'Failed to fetch stickers' }
  }
}

export const getStickerFileController = async ({ params, set, request }: Context) => {
  try {    
    const { seriesId, stickerId } = params;
    
    // 使用 stickerId 作為 ETag，因為貼圖檔案內容不會改變
    // stickerId 本身就是檔案的 SHA-256 hash，所以可以直接使用
    const etag = `"${stickerId}"`;
    
    // 檢查客戶端是否提供了 If-None-Match 標頭
    const ifNoneMatch = request.headers.get('if-none-match');
    
    // 如果 ETag 匹配，回傳 304 Not Modified
    if (ifNoneMatch === etag) {
      set.status = 304;
      return new Response(null, { status: 304 });
    }
    
    // 檢查檔案是否存在於 MinIO（如果不存在會拋出錯誤）
    await MinIOService.checkImageExists({ stickerId, seriesId });
    
    // 只有在檔案存在且 ETag 不匹配時才下載檔案
    const fileBuffer = await MinIOService.getImageFromMinIO({ stickerId, seriesId });
    
    // 設定快取相關標頭
    set.headers['Content-Type'] = 'image/png';
    set.headers['ETag'] = etag;
    set.headers['Cache-Control'] = 'public, max-age=31536000, immutable'; // 快取一年
    set.headers['Last-Modified'] = new Date().toUTCString();
    
    return new Response(fileBuffer);
  } catch (err) {
    // 如果是檔案不存在的錯誤，回傳 404
    if (err.message && err.message.includes('statObject')) {
      set.status = 404;
      return { success: false, error: 'Sticker file not found' };
    }
    
    set.status = 500;
    return { success: false, error: err.message || 'Failed to fetch sticker file' };
  }
}

interface BatchUploadBody {
  record: File;
  files: File[];
}

export const uploadStickersToMinIOController = async ({ body, set }: Context): Promise<{ success: boolean; error?: string }> => {
  try {
    const uploadBody = body as BatchUploadBody;
    
    // 將檔案陣列轉換為 Map
    const filesMap = Object.fromEntries(
      uploadBody.files.map(file => [file.name, file])
    ) as Record<string, File>;

    const seriesService = new SeriesService();
    const series = await seriesService.createSeries();

    const result = await stickerService.uploadStickersToMinIO(uploadBody.record, filesMap, series.id);
    if (!result.success) {
      set.status = 400;
      return result;
    }

    set.status = 201;
    return { success: true };
  } catch (err) {
    console.error('Error in uploadStickersController:', err);
    
    // 如果 middleware 已經設置了狀態碼，保持該狀態碼
    if (set.status === 200) {
      set.status = 500;
    }
    
    return { success: false, error: err.message || 'Failed to upload stickers to MinIO' };
  }
};