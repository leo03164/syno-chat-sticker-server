import { SeriesService } from '../services/series.service'
import { Context } from 'elysia'
import { 
  SeriesResponse, 
  SeriesListResponse,
} from '../models/series.model'

const seriesService = new SeriesService()

export const getAllSeriesController = async ({ set }: Context): Promise<SeriesListResponse> => {
  try {
    const result = await seriesService.getAllSeries()
    return { success: true, data: result }
  } catch (err) {
    set.status = 500
    return { success: false, error: err.message || 'Failed to fetch series' }
  }
}

export const getSeriesByIdController = async ({ params, set }: Context): Promise<SeriesResponse> => {
  try {
    const result = await seriesService.getSeriesById(params.seriesId as string)
    if (!result) {
      set.status = 404
      return { success: false, error: 'Series not found' }
    }
    return { success: true, data: result }
  } catch (err) {
    set.status = 500
    return { success: false, error: err.message || 'Failed to fetch series' }
  }
}