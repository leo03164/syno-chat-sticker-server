import { Elysia, t } from 'elysia';
import { 
  getStickersController,
  uploadStickersController,
  getStickerFileController,
  uploadStickersToHackMDController
} from '../modules/sticker/sticker.controller';

export const stickerRoute = new Elysia({ prefix: '/stickers' })
  .get('/', getStickersController, {
    query: t.Object({
      seriesId: t.Optional(t.String()),
      stickerId: t.Optional(t.String())
    })
  })
  .get('/:id', getStickerFileController, {
    params: t.Object({
      id: t.String()
    })
  })
  .post('/upload', uploadStickersController, {
    body: t.Object({
      record: t.File(),
      files: t.Array(t.File())
    })
  })
  .post('/upload/hackmd', uploadStickersToHackMDController, {
    body: t.Object({
      record: t.File(),
      files: t.Array(t.File())
    })
  });