import { NextRequest, NextResponse } from 'next/server';
import { 
  getNotificationChannelById,
  updateNotificationChannel,
  deleteNotificationChannel,
  toggleNotificationChannelEnabled
} from '@/lib/settings';
import { validateAuth } from '@/lib/auth-helpers';

// 获取单个通知渠道
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少通知渠道ID' },
        { status: 400 }
      );
    }
    
    const channel = await getNotificationChannelById(id);
    
    if (!channel) {
      return NextResponse.json(
        { success: false, error: '找不到指定的通知渠道' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: channel });
  } catch (error) {
    console.error('获取通知渠道详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取通知渠道详情失败' },
      { status: 500 }
    );
  }
}

// 更新通知渠道
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    const id = params.id;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少通知渠道ID' },
        { status: 400 }
      );
    }
    
    if (!body || !body.name || !body.type || !body.config) {
      return NextResponse.json(
        { success: false, error: '缺少必要的字段' },
        { status: 400 }
      );
    }
    
    const channel = await updateNotificationChannel(id, {
      name: body.name,
      type: body.type,
      enabled: body.enabled,
      defaultForNewMonitors: body.defaultForNewMonitors,
      config: body.config
    });
    
    if (!channel) {
      return NextResponse.json(
        { success: false, error: '找不到指定的通知渠道' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: channel });
  } catch (error) {
    console.error('更新通知渠道失败:', error);
    return NextResponse.json(
      { success: false, error: '更新通知渠道失败' },
      { status: 500 }
    );
  }
}

// 删除通知渠道
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    const id = params.id;
    await deleteNotificationChannel(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除通知渠道失败:', error);
    return NextResponse.json(
      { success: false, error: '删除通知渠道失败' },
      { status: 500 }
    );
  }
}

// 切换通知渠道启用状态
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    const id = params.id;
    const updatedChannel = await toggleNotificationChannelEnabled(id);
    
    return NextResponse.json({ success: true, data: updatedChannel });
  } catch (error) {
    console.error('切换通知渠道状态失败:', error);
    return NextResponse.json(
      { success: false, error: '切换通知渠道状态失败' },
      { status: 500 }
    );
  }
} 