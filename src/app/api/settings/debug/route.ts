import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SETTINGS_KEYS } from '@/lib/settings';
import { validateAuth } from '@/lib/auth-helpers';

// 调试API: 获取数据库中的原始设置值，开发环境中排查问题使用
export async function GET() {
  // 验证用户是否已登录
  const authError = await validateAuth();
  if (authError) return authError;
  
  // 生产环境禁用此API
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is disabled in production' },
      { status: 403 }
    );
  }
  
  try {
    // 获取所有系统配置项
    const allConfigs = await prisma.systemConfig.findMany();
    
    // 获取代理相关的配置
    const proxyConfigs = allConfigs.filter(config => 
      config.key === SETTINGS_KEYS.PROXY_ENABLED ||
      config.key === SETTINGS_KEYS.PROXY_SERVER ||
      config.key === SETTINGS_KEYS.PROXY_PORT ||
      config.key === SETTINGS_KEYS.PROXY_USERNAME ||
      config.key === SETTINGS_KEYS.PROXY_PASSWORD
    );
    
    return NextResponse.json({
      success: true,
      message: '仅用于开发环境调试',
      allConfigs,
      proxyConfigs,
      // 特别显示代理启用状态的原始值
      proxyEnabled: allConfigs.find(c => c.key === SETTINGS_KEYS.PROXY_ENABLED)?.value,
      proxyEnabledType: typeof allConfigs.find(c => c.key === SETTINGS_KEYS.PROXY_ENABLED)?.value
    });
  } catch (error) {
    console.error('获取调试数据失败:', error);
    return NextResponse.json(
      { success: false, error: '获取调试数据失败' },
      { status: 500 }
    );
  }
} 