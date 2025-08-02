// Rate Limit 配置
export const RATE_LIMIT_CONFIG = {
  // 上傳 API 的 rate limit 設定
  upload: {
    windowMs: 60 * 60 * 1000, // 1 小時 (毫秒)
    maxRequests: 5, // 每小時最多 5 次請求
    message: '上傳 API 請求過於頻繁。每小時最多只能上傳 5 次，請稍後再試。'
  },
  
  // 可以為其他 API 端點添加設定
  // example: {
  //   windowMs: 15 * 60 * 1000, // 15 分鐘
  //   maxRequests: 100,
  //   message: '請求過於頻繁，請稍後再試。'
  // }
} as const;

// 取得特定端點的 rate limit 設定
export function getRateLimitConfig(endpoint: keyof typeof RATE_LIMIT_CONFIG) {
  return RATE_LIMIT_CONFIG[endpoint];
}

// 取得所有可用的端點
export function getAvailableEndpoints() {
  return Object.keys(RATE_LIMIT_CONFIG);
} 