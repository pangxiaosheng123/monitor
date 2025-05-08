import { ERROR_MESSAGES } from './types';

// 辅助函数：检查HTTP状态码是否符合预期
export function checkStatusCode(statusCode: number, expectedStatusCodes: string): boolean {
  // 支持多种格式：200-299, 200,201,202, 200
  const statusParts = expectedStatusCodes.split(',');
  
  for (const part of statusParts) {
    const trimmedPart = part.trim();
    
    // 范围表示法，如 200-299
    if (trimmedPart.includes('-')) {
      const [min, max] = trimmedPart.split('-').map(s => parseInt(s));
      if (statusCode >= min && statusCode <= max) {
        return true;
      }
    } 
    // 单个状态码，如 200
    else if (parseInt(trimmedPart) === statusCode) {
      return true;
    }
  }
  
  return false;
}

// 辅助函数：获取网络错误的可读消息
export function getNetworkErrorMessage(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : '';
  
  if (errorMessage.includes('ECONNREFUSED')) {
    return ERROR_MESSAGES.CONNECTION_REFUSED;
  } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
    return ERROR_MESSAGES.TIMEOUT;
  } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
    return ERROR_MESSAGES.HOST_NOT_FOUND;
  } else {
    return `${ERROR_MESSAGES.NETWORK_ERROR}: ${errorMessage}`;
  }
} 