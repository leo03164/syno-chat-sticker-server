import { Context } from 'elysia';
import { StickerRecord } from '../types';

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
   * 驗證 record 檔案的 JSON 格式和內容
   */
  private static async validateRecordFile(file: File): Promise<{ isValid: boolean; records?: StickerRecord[]; error?: string }> {
    try {
      const text = await file.text();
      
      // 檢查是否為空內容
      if (!text.trim()) {
        return { isValid: false, error: 'Record 檔案內容為空' };
      }

      // 嘗試解析 JSON
      let records;
      try {
        records = JSON.parse(text);
      } catch (parseError) {
        return { isValid: false, error: `Record 檔案不是有效的 JSON 格式: ${parseError.message}` };
      }

      // 檢查是否為陣列
      if (!Array.isArray(records)) {
        return { isValid: false, error: 'Record 檔案內容必須是陣列格式' };
      }

      // 檢查是否為空陣列
      if (records.length === 0) {
        return { isValid: false, error: 'Record 檔案不能為空陣列，至少需要包含一個貼圖記錄' };
      }

      // 檢查每個記錄的格式
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        // 檢查是否為物件
        if (typeof record !== 'object' || record === null) {
          return { isValid: false, error: `記錄 ${i + 1} 不是有效的物件格式` };
        }

        // 檢查 file_name 欄位
        if (!record.file_name || typeof record.file_name !== 'string') {
          return { isValid: false, error: `記錄 ${i + 1} 缺少 file_name 欄位或格式不正確` };
        }

        // 檢查 file_name 是否為空
        if (!record.file_name.trim()) {
          return { isValid: false, error: `記錄 ${i + 1} 的 file_name 不能為空` };
        }

        // 檢查 file_name 是否包含特殊字符
        if (/[<>:"/\\|?*]/.test(record.file_name)) {
          return { isValid: false, error: `記錄 ${i + 1} 的 file_name 包含不允許的特殊字符` };
        }

        // 檢查 tags 欄位（如果存在）
        if (record.tags !== undefined) {
          if (!Array.isArray(record.tags)) {
            return { isValid: false, error: `記錄 ${i + 1} 的 tags 必須是陣列格式` };
          }
          
          // 檢查 tags 陣列中的每個元素是否為字串
          for (let j = 0; j < record.tags.length; j++) {
            if (typeof record.tags[j] !== 'string') {
              return { isValid: false, error: `記錄 ${i + 1} 的 tags[${j}] 必須是字串格式` };
            }
          }
        }
      }

      return { isValid: true, records };
    } catch (error) {
      return { isValid: false, error: `驗證 record 檔案時發生錯誤: ${error.message}` };
    }
  }

  /**
   * 驗證檔案匹配
   */
  private static validateFileMatching(records: StickerRecord[], filesMap: Record<string, File>): { isValid: boolean; error?: string } {
    const missingFiles: string[] = [];
    const extraFiles: string[] = [];

    // 檢查 JSON 中定義的檔案是否都存在
    for (const record of records) {
      if (!filesMap[record.file_name]) {
        missingFiles.push(record.file_name);
      }
    }

    // 檢查是否有額外的檔案
    const recordFileNames = records.map(r => r.file_name);
    for (const fileName of Object.keys(filesMap)) {
      if (!recordFileNames.includes(fileName)) {
        extraFiles.push(fileName);
      }
    }

    // 如果有不符合的檔案，回傳錯誤
    if (missingFiles.length > 0 || extraFiles.length > 0) {
      let errorMessage = '檔案匹配失敗：\n';
      if (missingFiles.length > 0) {
        errorMessage += `缺少檔案：${missingFiles.join(', ')}\n`;
      }
      if (extraFiles.length > 0) {
        errorMessage += `多餘檔案：${extraFiles.join(', ')}`;
      }
      return { isValid: false, error: errorMessage.trim() };
    }

    return { isValid: true };
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
      } else {
        // 驗證 record 檔案的 JSON 格式
        const recordValidation = await FileUploadValidatorMiddleware.validateRecordFile(uploadBody.record);
        if (!recordValidation.isValid) {
          errors.push({
            field: 'record',
            fileName: uploadBody.record.name,
            error: recordValidation.error!
          });
        }
      }
    } else {
      errors.push({
        field: 'record',
        error: '缺少 record 檔案'
      });
    }

    // 檢查 files 陣列
    if (uploadBody.files && Array.isArray(uploadBody.files)) {
      // 檢查是否有檔案
      if (uploadBody.files.length === 0) {
        errors.push({
          field: 'files',
          error: 'files 陣列不能為空，至少需要上傳一個 PNG 檔案'
        });
      } else {
        // 檢查檔案數量限制
        if (uploadBody.files.length < 16) {
          errors.push({
            field: 'files',
            error: '至少需要上傳16張圖片'
          });
        }
        if (uploadBody.files.length > 60) {
          errors.push({
            field: 'files',
            error: '最多只能上傳60張圖片'
          });
        }

        // 檢查檔案名稱是否重複
        const fileNames = uploadBody.files.map(file => file.name);
        const uniqueFileNames = new Set(fileNames);
        if (fileNames.length !== uniqueFileNames.size) {
          errors.push({
            field: 'files',
            error: '檔案名稱不能重複'
          });
        }

        for (let i = 0; i < uploadBody.files.length; i++) {
          const file = uploadBody.files[i];
          
          // 檢查檔案名稱
          if (!file.name || !file.name.trim()) {
            errors.push({
              field: 'files',
              fileName: file.name,
              error: `檔案名稱不能為空`
            });
            continue;
          }

          // 檢查檔案名稱是否包含特殊字符
          if (/[<>:"/\\|?*]/.test(file.name)) {
            errors.push({
              field: 'files',
              fileName: file.name,
              error: `檔案名稱包含不允許的特殊字符`
            });
          }
          
          // 檢查檔案大小（1MB = 1024 * 1024 bytes）
          if (file.size > 1024 * 1024) {
            errors.push({
              field: 'files',
              fileName: file.name,
              error: `檔案大小超過限制：${file.name} (${file.size} bytes > 1048576 bytes)`
            });
          }

          // 檢查檔案格式（PNG 魔術數字檢查）
          const isPNG = await FileUploadValidatorMiddleware.isPNGFile(file);
          if (!isPNG) {
            errors.push({
              field: 'files',
              fileName: file.name,
              error: `檔案格式不正確：${file.name} 不是有效的 PNG 檔案`
            });
          }
        }
      }
    } else {
      errors.push({
        field: 'files',
        error: '缺少 files 陣列或格式不正確'
      });
    }

    // 如果基本驗證通過，檢查檔案匹配
    if (errors.length === 0 && uploadBody.record) {
      const recordValidation = await FileUploadValidatorMiddleware.validateRecordFile(uploadBody.record);
      if (recordValidation.isValid && recordValidation.records) {
        const filesMap = Object.fromEntries(
          uploadBody.files.map(file => [file.name, file])
        );
        const matchingValidation = FileUploadValidatorMiddleware.validateFileMatching(recordValidation.records, filesMap);
        if (!matchingValidation.isValid) {
          errors.push({
            field: 'validation',
            error: matchingValidation.error!
          });
        }
      }
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