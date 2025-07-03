import { Elysia, t } from 'elysia';
import { 
  getStickersController,
  getStickerFileController,
  uploadStickersToMinIOController
} from '../modules/sticker/sticker.controller';

export const stickerRoute = new Elysia({ prefix: '/stickers' })
  .get('/', getStickersController, {
    query: t.Object({
      seriesId: t.Optional(t.String()),
      stickerId: t.Optional(t.String())
    })
  })
  .get('/:seriesId/:stickerId', getStickerFileController, {
    params: t.Object({
      seriesId: t.String(),
      stickerId: t.String()
    })
  })
  .post('/upload/hackmd', uploadStickersToMinIOController, {
    body: t.Object({
      record: t.File(),
      files: t.Array(t.File())
    })
  });