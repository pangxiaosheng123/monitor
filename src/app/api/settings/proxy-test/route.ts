import { NextRequest, NextResponse } from 'next/server';
import { proxyFetch } from '@/lib/monitors/proxy-fetch';
import { getAllProxySettings, updateSettings, SETTINGS_KEYS } from '@/lib/settings';
import { validateAuth } from '@/lib/auth-helpers';

// 测试代理连接
export async function POST(request: NextRequest) {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    // 获取请求信息
    const data = await request.json();
    
    // 检查代理设置是否有效
    const proxySettings = await getAllProxySettings();
    const proxyEnabled = proxySettings[SETTINGS_KEYS.PROXY_ENABLED] === 'true';
    const proxyServer = proxySettings[SETTINGS_KEYS.PROXY_SERVER];
    const proxyPort = proxySettings[SETTINGS_KEYS.PROXY_PORT];
    
    if (!proxyEnabled) {
      return NextResponse.json({
        success: false,
        error: '代理功能未启用，请先启用代理'
      });
    }
    
    if (!proxyServer || !proxyPort) {
      return NextResponse.json({
        success: false,
        error: '代理服务器或端口未配置，请检查设置'
      });
    }
    
    // 确保请求必须使用代理 - 如果临时设置了禁用代理，需要立即报错
    if (data.forceUpdateSettings === true) {
      await updateSettings({
        [SETTINGS_KEYS.PROXY_ENABLED]: 'true'
      });
    }
    
    // 测试URL，默认使用一个常见可访问的网站
    const testUrl = data.url || 'https://httpbin.org/ip';
    
    // 通过代理发送请求，这里会强制使用代理
    const startTime = Date.now();
    try {
      const response = await proxyFetch(testUrl);
      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `代理请求失败，状态码: ${response.status}`,
          statusCode: response.status
        });
      }
      
      // 尝试读取响应内容
      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      let responseBody;
      
      try {
        responseBody = isJson ? await response.json() : await response.text();
      } catch (error) {
        responseBody = '无法解析响应内容';
      }
      
      return NextResponse.json({
        success: true,
        data: {
          ping: responseTime,
          statusCode: response.status,
          responseBody: responseBody,
          proxyServer: proxyServer,
          proxyPort: proxyPort
        }
      });
    } catch (error) {
      // 这里是代理连接失败的情况
      return NextResponse.json({
        success: false, 
        error: `代理连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
        proxyServer: proxyServer,
        proxyPort: proxyPort
      });
    }
  } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
    console.error('代理测试失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '代理测试失败' 
      },
      { status: 500 }
    );
  }
} 