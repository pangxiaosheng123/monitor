import { NextRequest, NextResponse } from 'next/server';
import { 
  getNotificationChannels,
  createNotificationChannel
} from '@/lib/settings';
import { validateAuth } from '@/lib/auth-helpers';

// 获取所有通知渠道
export async function GET() {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    const channels = await getNotificationChannels();
    return NextResponse.json({ success: true, data: channels });
  } catch (error) {
    console.error('获取通知渠道列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取通知渠道列表失败' },
      { status: 500 }
    );
  }
}

// 创建新通知渠道
export async function POST(request: NextRequest) {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    const body = await request.json();
    
    if (!body || !body.name || !body.type || !body.config) {
      return NextResponse.json(
        { success: false, error: '缺少必要的字段' },
        { status: 400 }
      );
    }
    
    const newChannel = await createNotificationChannel({
      name: body.name,
      type: body.type,
      enabled: body.enabled !== false,
      defaultForNewMonitors: body.defaultForNewMonitors !== false,
      config: body.config
    });
    
    return NextResponse.json({ success: true, data: newChannel });
  } catch (error) {
    console.error('创建通知渠道失败:', error);
    return NextResponse.json(
      { success: false, error: '创建通知渠道失败' },
      { status: 500 }
    );
  }
} 