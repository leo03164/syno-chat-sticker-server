import { Elysia } from 'elysia';
import { getSticker, uploadStickersController } from '../controllers/sticker.controller';

export const stickerRoute = new Elysia({ prefix: '/sticker' })
  .get('/', () => 'Hello World')
  .get('/:id', async ({ params: { id }, set }) => {
    const sticker = await getSticker(id);
    if (!sticker) {
      set.status = 404;
      return { error: 'Sticker not found' };
    }
    return sticker;
  })
  .post('/upload', uploadStickersController);