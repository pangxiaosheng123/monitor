import { NextResponse } from 'next/server';
import { monitorOperations } from '@/lib/db';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // 获取token参数
    const paramsObj = await params;
    const token = paramsObj.token;
    
    // 解析URL参数
    const url = new URL(request.url);
    const status = url.searchParams.get('status')?.toLowerCase();
    const msg = url.searchParams.get('msg') || 'Unknown';
    const ping = parseInt(url.searchParams.get('ping') || '0');
    
    if (!token) {
      console.error('Push监控请求缺失token');
      return NextResponse.json(
        { error: '无效的请求，缺少token参数' },
        { status: 400 }
      );
    }
    
    // 查找对应的监控项
    const monitor = await monitorOperations.findMonitorByToken(token);
    
    // 如果没有找到对应的监控项，则返回错误
    if (!monitor) {
      console.error('未找到匹配的Push监控，token:', token);
      return NextResponse.json(
        { error: '无效的token或监控项不存在' },
        { status: 404 }
      );
    }
    
    // 确定状态值
    const numericStatus = status === 'up' ? 1 
                        : status === 'down' ? 0 
                        : Number(status) === 1 ? 1 
                        : Number(status) === 0 ? 0 
                        : 1; // 默认为up
    
    // 更新监控状态
    await monitorOperations.updateMonitorStatus({
      monitorId: monitor.id,
      status: numericStatus,
      message: msg,
      ping: ping || null,
    });
    
    // 更新最后推送时间
    // 使用事务确保数据一致性
    await prisma.$transaction(async (tx) => {
      // 获取现有配置
      const currentMonitor = await tx.monitor.findUnique({
        where: { id: monitor.id }
      });
      
      if (currentMonitor && currentMonitor.config) {
        // 更新config中的lastPushTime字段
        const config = {
          ...(currentMonitor.config as Record<string, unknown>),
          lastPushTime: new Date().toISOString()
        };
        
        // 保存更新后的配置
        await tx.monitor.update({
          where: { id: monitor.id },
          data: { config }
        });
      }
    });
    
    return NextResponse.json({
      message: '状态更新成功',
      status: numericStatus === 1 ? 'up' : 'down'
    });
  } catch (error) {
    console.error('处理Push监控请求失败:', error);
    return NextResponse.json(
      { error: '处理请求失败，请稍后重试' },
      { status: 500 }
    );
  }
} 