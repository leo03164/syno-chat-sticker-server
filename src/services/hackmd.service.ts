import dotenv from 'dotenv'

dotenv.config()

const HACKMD_API_URL = process.env.HACKMD_API_URL

export class HackmdService {
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
} 