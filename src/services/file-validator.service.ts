import { StickerRecord } from '../types'

export class FileValidatorService {
  static validateFiles(records: StickerRecord[], filesMap: Record<string, File>): { isValid: boolean; error?: string } {
    const missingFiles: string[] = []
    const extraFiles: string[] = []

    // 檢查 JSON 中定義的檔案是否都存在
    for (const record of records) {
      if (!filesMap[record.file_name]) {
        missingFiles.push(record.file_name)
      }
    }

    // 檢查是否有額外的檔案
    const recordFileNames = records.map(r => r.file_name)
    for (const fileName of Object.keys(filesMap)) {
      if (!recordFileNames.includes(fileName)) {
        extraFiles.push(fileName)
      }
    }

    // 如果有不符合的檔案，回傳錯誤
    if (missingFiles.length > 0 || extraFiles.length > 0) {
      let errorMessage = '檔案不符合：\n'
      if (missingFiles.length > 0) {
        errorMessage += `缺少檔案：${missingFiles.join(', ')}\n`
      }
      if (extraFiles.length > 0) {
        errorMessage += `多餘檔案：${extraFiles.join(', ')}`
      }
      return { isValid: false, error: errorMessage }
    }

    return { isValid: true }
  }
} 