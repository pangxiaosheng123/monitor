import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllGeneralSettings, 
  getAllProxySettings, 
  updateSettings, 
  resetSettings,
  SETTINGS_KEYS
} from '@/lib/settings';
import { validateAuth } from '@/lib/auth-helpers';

// 获取设置
export async function GET(request: NextRequest) {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    const searchParams = request.nextUrl.searchParams;
    const section = searchParams.get('section');
    
    let settings = {};
    
    if (section === 'general') {
      settings = await getAllGeneralSettings();
    } else if (section === 'proxy') {
      settings = await getAllProxySettings();
    } else {
      // 获取所有设置
      const generalSettings = await getAllGeneralSettings();
      const proxySettings = await getAllProxySettings();
      settings = {
        ...generalSettings,
        ...proxySettings
      };
    }
    
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('获取设置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取设置失败' },
      { status: 500 }
    );
  }
}

// 更新设置
export async function POST(request: NextRequest) {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    const body = await request.json();
    
    console.log('收到设置更新请求:', body);
    
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: '无效的请求数据' },
        { status: 400 }
      );
    }
    
    // 处理代理启用设置 - 确保正确转换布尔值
    if (SETTINGS_KEYS.PROXY_ENABLED in body) {
      const proxyEnabledValue = body[SETTINGS_KEYS.PROXY_ENABLED];
      console.log('原始代理启用值:', proxyEnabledValue, typeof proxyEnabledValue);
      
      // 规范化代理启用值为字符串 'true' 或 'false'
      if (typeof proxyEnabledValue === 'boolean') {
        body[SETTINGS_KEYS.PROXY_ENABLED] = proxyEnabledValue ? 'true' : 'false';
      } else if (typeof proxyEnabledValue === 'string') {
        body[SETTINGS_KEYS.PROXY_ENABLED] = 
          proxyEnabledValue.toLowerCase() === 'true' ? 'true' : 'false';
      } else {
        body[SETTINGS_KEYS.PROXY_ENABLED] = 'false';
      }
      
      console.log('处理后的代理启用值:', body[SETTINGS_KEYS.PROXY_ENABLED]);
    }
    
    // 对其他值进行字符串转换
    Object.keys(body).forEach(key => {
      if (body[key] === undefined || body[key] === null) {
        body[key] = '';
      } else if (typeof body[key] !== 'string') {
        body[key] = String(body[key]);
      }
    });
    
    console.log('规范化后的设置数据:', body);
    
    await updateSettings(body);
    
    return NextResponse.json({ 
      success: true,
      message: '设置已更新',
      updatedSettings: body
    });
  } catch (error) {
    console.error('更新设置失败:', error);
    return NextResponse.json(
      { success: false, error: '更新设置失败' },
      { status: 500 }
    );
  }
}

// 重置所有设置
export async function DELETE() {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    await resetSettings();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('重置设置失败:', error);
    return NextResponse.json(
      { success: false, error: '重置设置失败' },
      { status: 500 }
    );
  }
} 