import { Context } from 'elysia';

// PNG 檔案的魔術數字（前 8 bytes）
const PNG_MAGIC_NUMBER = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

interface FileValidationError {
  field: string;
  fileName?: string;
  error: string;
}

export class FileUploadValidatorMiddleware {
  /**
   * 檢查檔案是否為 PNG 格式
   */
  private static async isPNGFile(file: File): Promise<boolean> {
    // 檢查 MIME type
    if (file.type !== 'image/png') {
      return false;
    }

    // 檢查魔術數字
    try {
      const arrayBuffer = await file.slice(0, 8).arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < PNG_MAGIC_NUMBER.length; i++) {
        if (bytes[i] !== PNG_MAGIC_NUMBER[i]) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('檢查 PNG 魔術數字時發生錯誤:', error);
      return false;
    }
  }

  /**
   * 驗證檔案上傳
   */
  static async validateFileUpload({ body, set }: Context): Promise<void> {
    const uploadBody = body as { record: File; files: File[] };
    const errors: FileValidationError[] = [];

    // 檢查 record 檔案
    if (uploadBody.record) {
      // 檢查檔案大小（10KB = 10 * 1024 bytes）
      if (uploadBody.record.size > 10 * 1024) {
        errors.push({
          field: 'record',
          fileName: uploadBody.record.name,
          error: `檔案大小超過限制：${uploadBody.record.size} bytes > 10 KB`
        });
      }
    } else {
      errors.push({
        field: 'record',
        error: '缺少 record 檔案'
      });
    }

    // 檢查 files 陣列
    if (uploadBody.files && Array.isArray(uploadBody.files)) {
      for (let i = 0; i < uploadBody.files.length; i++) {
        const file = uploadBody.files[i];
        
        // 檢查檔案大小（1MB = 1024 * 1024 bytes）
        if (file.size > 1024 * 1024) {
          errors.push({
            field: 'files',
            fileName: file.name,
            error: `檔案大小超過限制：${file.name} (${file.size} bytes > 1048576 bytes)`
          });
        }

        // 檢查檔案格式
        const isPNG = await FileUploadValidatorMiddleware.isPNGFile(file);
        if (!isPNG) {
          errors.push({
            field: 'files',
            fileName: file.name,
            error: `檔案格式不正確：${file.name} 不是有效的 PNG 檔案`
          });
        }
      }
    } else {
      errors.push({
        field: 'files',
        error: '缺少 files 陣列或格式不正確'
      });
    }

    // 如果有錯誤，回傳 400 狀態碼和錯誤訊息
    if (errors.length > 0) {
      set.status = 400;
      const errorMessage = errors.map(error => {
        if (error.fileName) {
          return `${error.field} - ${error.fileName}: ${error.error}`;
        }
        return `${error.field}: ${error.error}`;
      }).join('\n');
      
      throw new Error(`檔案驗證失敗：\n${errorMessage}`);
    }
  }
} 