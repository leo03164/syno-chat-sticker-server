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

export const getStickerFileController = async ({ params, set }: Context) => {
  try {    
    const { seriesId, stickerId } = params;
    const fileBuffer = await MinIOService.getImageFromMinIO({ stickerId, seriesId })
    
    set.headers['Content-Type'] = 'image/png'
    
    return new Response(fileBuffer)
  } catch (err) {
    set.status = 500
    return { success: false, error: err.message || 'Failed to fetch sticker file' }
  }
}

interface BatchUploadBody {
  record: File;
  files: File[];
}

export const uploadStickersToMinIOController = async ({ body, set }: Context): Promise<{ success: boolean; error?: string }> => {
  try {
    const uploadBody = body as BatchUploadBody;
    
    const recordFile = uploadBody.record;
    if (!recordFile) {
      set.status = 400;
      return { success: false, error: 'Missing record file' };
    }

    // 將檔案陣列轉換為 Map
    const filesMap = Object.fromEntries(
      uploadBody.files.map(file => [file.name, file])
    ) as Record<string, File>;

    const seriesService = new SeriesService();
    const series = await seriesService.createSeries();

    const result = await stickerService.uploadStickersToMinIO(recordFile, filesMap, series.id);
    if (!result.success) {
      set.status = 400;
      return result;
    }

    set.status = 201;
    return { success: true };
  } catch (err) {
    console.error('Error in uploadStickersController:', err);
    set.status = 500;
    return { success: false, error: err.message || 'Failed to upload stickers to MinIO' };
  }
};