import { Elysia, t } from 'elysia';
import { 
  getStickersController,
  getStickerFileController,
  uploadStickersToMinIOController
} from '../modules/sticker/sticker.controller';
import { FileUploadValidatorMiddleware } from '../middleware/file-upload-validator.middleware';
import { RateLimiterMiddleware } from '../middleware/rate-limiter.middleware';
import { getRateLimitConfig } from '../config/rate-limit.config';

export const stickerRoute = new Elysia({ prefix: '/stickers' })
  .get('/', getStickersController, {
    query: t.Object({
      seriesId: t.Optional(t.String()),
      stickerId: t.Optional(t.String())
    })
  })
  .get('/rate-limit/status', ({ request, query }) => {
    const endpoint = query.endpoint as string;
    return RateLimiterMiddleware.getRateLimitStatus(request, endpoint);
  }, {
    query: t.Object({
      endpoint: t.Optional(t.String())
    })
  })
  .get('/rate-limit/config', () => {
    return getRateLimitConfig('upload');
  })
  .get('/:seriesId/:stickerId', getStickerFileController, {
    params: t.Object({
      seriesId: t.String(),
      stickerId: t.String()
    })
  })
  .post('/upload', uploadStickersToMinIOController, {
    beforeHandle: [
      RateLimiterMiddleware.createRateLimiterForEndpoint('upload'),
      FileUploadValidatorMiddleware.validateFileUpload
    ],
    body: t.Object({
      record: t.File(),
      files: t.Array(t.File())
    })
  })
  // @deprecated use /upload instead
  .post('/upload/hackmd', uploadStickersToMinIOController, {
    beforeHandle: [
      RateLimiterMiddleware.createRateLimiterForEndpoint('upload'),
      FileUploadValidatorMiddleware.validateFileUpload
    ],
    body: t.Object({
      record: t.File(),
      files: t.Array(t.File())
    })
  });