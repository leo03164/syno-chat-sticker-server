import { Context } from 'elysia';
import { getRateLimitConfig } from '../config/rate-limit.config';

interface RateLimitConfig {
  windowMs: number; // 時間窗口（毫秒）
  maxRequests: number; // 最大請求次數
  message?: string; // 自定義錯誤訊息
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// 儲存 rate limit 資料的記憶體快取
const rateLimitStore = new Map<string, RateLimitEntry>();

export class RateLimiterMiddleware {
  /**
   * 取得客戶端 IP 位址
   */
  private static getClientIP(request: Request): string {
    // 檢查 X-Forwarded-For header（用於代理伺服器）
    const forwardedFor = request.headers.get('X-Forwarded-For');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    // 檢查 X-Real-IP header
    const realIP = request.headers.get('X-Real-IP');
    if (realIP) {
      return realIP;
    }

    // 如果都沒有，回傳預設值（實際部署時應該有真實 IP）
    return 'unknown';
  }

  /**
   * 清理過期的 rate limit 記錄
   */
  private static cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }

  /**
   * 建立 rate limiter 函數
   */
  static createRateLimiter(config: RateLimitConfig) {
    return async ({ request, set }: Context): Promise<void> => {
      // 定期清理過期記錄
      this.cleanupExpiredEntries();

      const clientIP = this.getClientIP(request);
      const now = Date.now();
      const key = `${clientIP}:${request.url}`;

      // 取得現有的 rate limit 記錄
      const entry = rateLimitStore.get(key);

      if (!entry || now > entry.resetTime) {
        // 建立新的記錄或重置過期的記錄
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + config.windowMs
        });
      } else {
        // 檢查是否超過限制
        if (entry.count >= config.maxRequests) {
          set.status = 429; // Too Many Requests
          const resetTime = new Date(entry.resetTime).toLocaleString('zh-TW');
          const errorMessage = config.message || 
            `請求過於頻繁。請在 ${resetTime} 後再試。`;
          
          throw new Error(errorMessage);
        }

        // 增加計數器
        entry.count++;
      }
    };
  }

  /**
   * 為特定端點建立 rate limiter
   */
  static createRateLimiterForEndpoint(endpoint: string) {
    const config = getRateLimitConfig(endpoint as any);
    if (!config) {
      throw new Error(`未找到端點 "${endpoint}" 的 rate limit 配置`);
    }
    return this.createRateLimiter(config);
  }

  /**
   * 為上傳端點建立 rate limiter（向後相容）
   */
  static createUploadRateLimiter() {
    return this.createRateLimiterForEndpoint('upload');
  }

  /**
   * 取得 rate limit 狀態（用於測試和監控）
   */
  static getRateLimitStatus(request: Request, endpoint?: string) {
    this.cleanupExpiredEntries();
    
    const clientIP = this.getClientIP(request);
    const key = `${clientIP}:${request.url}`;
    const entry = rateLimitStore.get(key);
    
    // 取得端點的配置
    const config = endpoint ? getRateLimitConfig(endpoint as any) : getRateLimitConfig('upload');
    const maxRequests = config?.maxRequests || 5;
    
    if (!entry) {
      return {
        remaining: maxRequests,
        resetTime: null,
        limit: maxRequests,
        endpoint: endpoint || 'upload'
      };
    }

    const now = Date.now();
    if (now > entry.resetTime) {
      return {
        remaining: maxRequests,
        resetTime: null,
        limit: maxRequests,
        endpoint: endpoint || 'upload'
      };
    }

    return {
      remaining: Math.max(0, maxRequests - entry.count),
      resetTime: new Date(entry.resetTime).toISOString(),
      limit: maxRequests,
      endpoint: endpoint || 'upload'
    };
  }

  /**
   * 清除所有 rate limit 記錄（用於測試）
   */
  static clearAllRateLimits(): void {
    rateLimitStore.clear();
  }
} 