import { StickerService } from '../services/sticker.service';
import { uploadStickersService } from '../services/sticker.service';

const stickerService = new StickerService();

export const getSticker = async (id: string) => {
  return await stickerService.getStickerById(id);
};

export const uploadStickersController = async ({ body, set }) => {
  try {
    const result = await uploadStickersService(body);
    return { success: true, ...result };
  } catch (err) {
    set.status = 400;
    return { error: err.message || 'Upload failed' };
  }
};