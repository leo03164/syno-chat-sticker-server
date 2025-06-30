import { StickerService } from './sticker.service';
import { Context } from 'elysia';
import { StickerResponse } from './sticker.model';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SeriesService } from '../series/series.service';

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
    const stickers = await stickerService.getStickers({ stickerId: params.id as string })
    if (stickers.length === 0) {
      set.status = 404
      return { success: false, error: 'Sticker not found' }
    }

    const sticker = stickers[0]
    const filePath = join(process.cwd(), sticker.path)
    const fileBuffer = readFileSync(filePath)
    
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

export const uploadStickersController = async ({ body, set }: Context): Promise<{ success: boolean; error?: string }> => {
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

    const result = await stickerService.uploadStickers(recordFile, filesMap);
    if (!result.success) {
      set.status = 400;
      return result;
    }

    set.status = 201;
    return { success: true };
  } catch (err) {
    console.error('Error in uploadStickersController:', err);
    set.status = 500;
    return { success: false, error: err.message || 'Failed to upload stickers' };
  }
};

export const uploadStickersToHackMDController = async ({ body, set }: Context): Promise<{ success: boolean; error?: string }> => {
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

    const result = await stickerService.uploadStickersToHackMD(recordFile, filesMap, series.id);
    if (!result.success) {
      set.status = 400;
      return result;
    }

    set.status = 201;
    return { success: true };
  } catch (err) {
    console.error('Error in uploadStickersToHackMDController:', err);
    set.status = 500;
    return { success: false, error: err.message || 'Failed to upload stickers to HackMD' };
  }
};