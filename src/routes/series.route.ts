import { Elysia } from 'elysia';
import { 
  getAllSeriesController, 
  getSeriesByIdController,
} from '../modules/series/series.controller';

export const seriesRoute = new Elysia({ prefix: '/series' })
  .get('/', getAllSeriesController)
  .get('/:seriesId', getSeriesByIdController)