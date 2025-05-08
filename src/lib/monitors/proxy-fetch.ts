import { ProxyAgent, fetch as undiciFetch } from 'undici';
import { getAllProxySettings, SETTINGS_KEYS } from '../settings';

// 代理配置接口
interface ProxyConfig {
  enabled: boolean;
  server: string;
  port: string;
  username?: string;
  password?: string;
}

// 创建代理配置
async function getProxyConfig(): Promise<ProxyConfig | null> {
  try {
    const proxySettings = await getAllProxySettings();
    const enabled = proxySettings[SETTINGS_KEYS.PROXY_ENABLED] === 'true';
    
    if (!enabled) {
      return null;
    }
    
    const server = proxySettings[SETTINGS_KEYS.PROXY_SERVER];
    const port = proxySettings[SETTINGS_KEYS.PROXY_PORT];
    
    if (!server || !port) {
      return null;
    }
    
    const username = proxySettings[SETTINGS_KEYS.PROXY_USERNAME];
    const password = proxySettings[SETTINGS_KEYS.PROXY_PASSWORD];
    
    return {
      enabled,
      server,
      port,
      username: username || undefined,
      password: password || undefined
    };
  } catch {
    // 忽略错误
    return null;
  }
}

// 代理配置接口
interface ProxyAgentConfig {
  uri: string;
  auth?: string;
  requestTls?: {
    rejectUnauthorized: boolean;
  };
}

// 扩展的请求选项接口
interface ExtendedRequestOptions extends RequestInit {
  dispatcher?: unknown;
  [key: string]: unknown;
}

/**
 * 使用系统配置的代理发送HTTP请求
 * 如果代理未启用或配置无效，将使用普通的fetch请求
 * @param url 请求URL
 * @param options 请求选项
 * @param ignoreTls 是否忽略TLS/SSL证书错误 
 * @returns 返回fetch API的Response对象
 */
export async function proxyFetch(
  url: string, 
  options?: RequestInit, 
  ignoreTls = false
): Promise<globalThis.Response> {
  const proxyConfig = await getProxyConfig();
  
  if (!proxyConfig) {
    return await standardFetch(url, options, ignoreTls);
  }
  
  const proxyUrl = `http://${proxyConfig.server}:${proxyConfig.port}`;
  const auth = proxyConfig.username && proxyConfig.password
    ? `${proxyConfig.username}:${proxyConfig.password}`
    : undefined;
  
  // 创建代理配置
  const proxyAgentConfig: ProxyAgentConfig = {
    uri: proxyUrl
  };
  
  if (auth) {
    proxyAgentConfig.auth = auth;
  }
  
  // 设置是否忽略证书错误
  if (ignoreTls) {
    proxyAgentConfig.requestTls = {
      rejectUnauthorized: false
    };
  }
  
  const dispatcher = new ProxyAgent(proxyAgentConfig);
  
  try {
    // 创建信号控制器并设置超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // 构建请求选项
    const fetchOptions: ExtendedRequestOptions = {
      ...(options || {}),
      dispatcher,
      signal: controller.signal
    };
    
    const response = await undiciFetch(url, fetchOptions as any);
    clearTimeout(timeoutId);
    
    return response as unknown as globalThis.Response;
  } catch (error) {
    throw error;
  }
}

/**
 * 标准的fetch请求，不使用代理
 * 用于普通请求或测试
 * @param url 请求URL
 * @param options 请求选项
 * @param ignoreTls 是否忽略TLS/SSL证书错误
 */
export async function standardFetch(
  url: string, 
  options?: RequestInit, 
  ignoreTls = false
): Promise<globalThis.Response> {
  try {
    // 创建信号控制器并设置超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // 构建请求选项
    const fetchOptions: ExtendedRequestOptions = {
      ...(options || {}),
      signal: controller.signal
    };
    
    // 如果设置忽略证书错误
    if (ignoreTls) {
      fetchOptions.dispatcher = {
        factory: (origin: string) => {
          return new ProxyAgent({
            uri: origin,
            requestTls: {
              rejectUnauthorized: false
            }
          });
        }
      };
    }
    
    const response = await undiciFetch(url, fetchOptions as any);
    clearTimeout(timeoutId);
    
    return response as unknown as globalThis.Response;
  } catch (error) {
    throw error;
  }
} 