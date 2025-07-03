import dotenv from 'dotenv'
import { Client } from 'minio'

dotenv.config()

const HACKMD_API_URL = process.env.HACKMD_API_URL

// MinIO 配置
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost'
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000')
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true'
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin'
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin'
const MINIO_BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'stickers'

// 初始化 MinIO 客戶端
const minioClient = new Client({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
})

export class MinIOService {
  static async uploadImage(image: File): Promise<{ link: string }> {
    // 將 File 轉成 Buffer
    const arrayBuffer = await image.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Bun 內建 FormData，直接用 Blob 包裝 buffer
    const form = new FormData()
    form.append('image', new Blob([buffer]), image.name)

    // 發送 POST 請求，使用 Bun 的 fetch 選項
    const response = await fetch(`${HACKMD_API_URL}/uploadimage`, {
      method: 'POST',
      body: form,
      // Bun 特定的 fetch 選項
      // @ts-ignore
      tls: {
        rejectUnauthorized: false
      }
    })

    if (!response.ok) {
      throw new Error(`上傳失敗: ${response.statusText}`)
    }

    return await response.json()
  }

  static async uploadImageByMinIO(image: File, hash: string, seriesId: string): Promise<{ link: string }> {
    try {
      // 將 File 轉成 Buffer
      const arrayBuffer = await image.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // 使用 seriesId 作為資料夾名稱，hash 作為檔案名稱
      const fileName = `stickers/${seriesId}/${hash}.png`

      // 確保 bucket 存在
      const bucketExists = await minioClient.bucketExists(MINIO_BUCKET_NAME)
      if (!bucketExists) {
        await minioClient.makeBucket(MINIO_BUCKET_NAME, 'us-east-1')
        console.log(`Bucket '${MINIO_BUCKET_NAME}' 已建立`)
      }

      // 上傳檔案到 MinIO
      await minioClient.putObject(
        MINIO_BUCKET_NAME,
        fileName,
        buffer,
        buffer.length,
        {
          'Content-Type': 'image/png',
        }
      )

      // 回傳 API GET Image 的 URL
      return { link: `https://${process.env.DOMAIN}/stickers/${seriesId}/${hash}` }
    } catch (error) {
      console.error('MinIO 上傳失敗:', error)
      throw new Error(`MinIO 上傳失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }

  static async getImageFromMinIO(params: { stickerId: string, seriesId: string }): Promise<Buffer> {
    try {
      const { stickerId, seriesId } = params
      const fileName = `stickers/${seriesId}/${stickerId}.png`

      // 從 MinIO 獲取檔案
      const dataStream = await minioClient.getObject(MINIO_BUCKET_NAME, fileName)
      
      // 將 stream 轉換為 Buffer
      const chunks: Buffer[] = []
      return new Promise((resolve, reject) => {
        dataStream.on('data', (chunk) => chunks.push(chunk))
        dataStream.on('end', () => resolve(Buffer.concat(chunks)))
        dataStream.on('error', (error) => reject(error))
      })
    } catch (error) {
      console.error('從 MinIO 獲取圖片失敗:', error)
      throw new Error(`從 MinIO 獲取圖片失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }
} 