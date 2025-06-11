// 通用回應型別
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// 分頁相關型別
export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface StickerRecord {
  file_name: string
  tags?: string[]
} 