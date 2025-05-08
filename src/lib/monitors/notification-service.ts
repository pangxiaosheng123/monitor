import axios from 'axios';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/db';

// 状态中文描述
const STATUS_TEXT_CN: Record<number, string> = {
  0: '异常',
  1: '正常',
  2: '等待'
};

// 通知数据接口
interface NotificationData {
  monitorName: string;
  monitorType: string;
  status: string; // 状态描述
  statusText: string; // 状态中文描述
  time: string;
  message: string;
  failureCount?: number;
  firstFailureTime?: string;
  lastFailureTime?: string;
  failureDuration?: number;
}

// 邮件配置接口
interface EmailConfig {
  email: string;
  smtpServer: string;
  smtpPort: string | number;
  username?: string;
  password?: string;
}

// Webhook配置接口
interface WebhookConfig {
  url: string;
}

// 微信推送配置接口
interface WechatConfig {
  pushUrl: string;
  titleTemplate?: string;
  contentTemplate?: string;
}

// 内存缓存，记录每个监控项的最后通知时间和状态
const notificationCache = new Map<string, { time: number; status: number }>();

/**
 * 处理监控状态变更通知
 * @param monitorId 监控项ID
 * @param status 监控状态 (0-异常, 1-正常, 2-等待)
 * @param message 状态消息
 * @param prevStatus 先前状态 (可能为空，表示第一次检查)
 */
export async function sendStatusChangeNotifications(
  monitorId: string,
  status: number,
  message: string,
  prevStatus: number | null
) {
  try {
    // 获取监控项详情
    const monitor = await prisma.monitor.findUnique({
      where: { id: monitorId },
      include: {
        notificationBindings: {
          where: { enabled: true },
          include: {
            notificationChannel: true
          }
        },
        statusHistory: {
          orderBy: { timestamp: 'desc' },
          take: 2 // 只获取最近2条记录，用于判断状态变化
        }
      }
    });

    if (!monitor) {
      console.error(`找不到监控项: ${monitorId}`);
      return;
    }

    // 如果没有启用的通知配置，则不发送
    if (!monitor.notificationBindings || monitor.notificationBindings.length === 0) {
      return;
    }

    // 检查是否为新添加的监控项（状态历史记录数量小于等于1）
    const isNewMonitor = !monitor.statusHistory || monitor.statusHistory.length <= 1;

    // 检查实际的状态变化
    let realPrevStatus = prevStatus;
    if (!isNewMonitor && monitor.statusHistory && monitor.statusHistory.length > 1) {
      // 排除当前状态，检查上一个状态
      const prevStatusFromHistory = monitor.statusHistory[1]?.status;
      if (prevStatusFromHistory !== undefined && prevStatusFromHistory !== null) {
        realPrevStatus = prevStatusFromHistory;
      }
    }

    // 如果状态没有变化，则不发送通知
    if (realPrevStatus !== null && realPrevStatus === status) {
      return;
    }

    // 如果是新监控项，且状态为正常，则不发送通知
    if (isNewMonitor && status === 1) {
      return;
    }

    // 准备基础通知数据
    const notificationData: NotificationData = {
      monitorName: monitor.name,
      monitorType: monitor.type,
      status: STATUS_TEXT_CN[status] || '未知', // 使用中文状态描述
      statusText: STATUS_TEXT_CN[status] || '未知',
      time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      message: message || '无详细信息'
    };

    // 计算时间窗口（默认30分钟）
    const timeWindow = monitor.type === 'push' 
      ? (monitor.config as Record<string, number>).pushInterval || 60 // pushInterval 是秒
      : monitor.resendInterval * 60 || 30 * 60; // 转换为秒

    // 检查上次通知时间和状态
    const lastNotification = notificationCache.get(monitorId);
    const now = Date.now();

    // 如果是失败状态
    if (status === 0) {
      // 如果上次通知在时间窗口内且状态也是失败，则不发送重复通知
      if (lastNotification && 
          (now - lastNotification.time) / 1000 < timeWindow && 
          lastNotification.status === 0) {
        return;
      }

      // 获取时间窗口内的失败记录
      const recentFailures = await prisma.monitorStatus.count({
        where: {
          monitorId,
          status: 0,
          timestamp: {
            gte: new Date(now - timeWindow * 1000)
          }
        }
      });
      
      // 获取首次失败时间
      const firstFailure = await prisma.monitorStatus.findFirst({
        where: {
          monitorId,
          status: 0,
          timestamp: {
            gte: new Date(now - timeWindow * 1000)
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      });

      // 计算失败持续时间
      const duration = firstFailure 
        ? Math.floor((now - firstFailure.timestamp.getTime()) / 1000 / 60) 
        : 0;

      // 扩展通知数据
      const aggregatedData = {
        ...notificationData,
        failureCount: recentFailures,
        firstFailureTime: firstFailure?.timestamp.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) || '未知',
        lastFailureTime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
        failureDuration: duration,
        message: `在 ${Math.floor(timeWindow / 60)} 分钟内失败 ${recentFailures} 次，首次失败于 ${firstFailure?.timestamp.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) || '未知'}，持续 ${duration} 分钟\n${message}`
      };

      // 发送聚合通知
      for (const binding of monitor.notificationBindings) {
        const channel = binding.notificationChannel;
        if (!channel.enabled) continue;

        try {
          const config = channel.config as Record<string, unknown> || {};
          await sendNotification(channel.type, config, aggregatedData);
        } catch (error) {
          console.error(`向 ${channel.name}(${channel.type}) 发送失败通知失败:`, error);
        }
      }

      // 更新通知缓存
      notificationCache.set(monitorId, { time: now, status: 0 });
    } else if (status === 1 && realPrevStatus === 0 && !isNewMonitor) {
      // 状态从故障恢复为正常，并且不是新添加的监控时才发送恢复通知
      
      // 获取恢复前的失败时长
      const recoverDuration = lastNotification && lastNotification.status === 0
        ? Math.floor((now - lastNotification.time) / 1000 / 60)
        : 0;
        
      // 增强恢复通知内容
      const recoveryData = {
        ...notificationData,
        message: `监控已恢复正常。${recoverDuration > 0 ? `故障持续了约 ${recoverDuration} 分钟。` : ''}\n${message}`
      };
      
      // 发送恢复通知
      for (const binding of monitor.notificationBindings) {
        const channel = binding.notificationChannel;
        if (!channel.enabled) continue;

        try {
          const config = channel.config as Record<string, unknown> || {};
          await sendNotification(channel.type, config, recoveryData);
        } catch (error) {
          console.error(`向 ${channel.name}(${channel.type}) 发送恢复通知失败:`, error);
        }
      }
      
      // 更新通知缓存
      notificationCache.set(monitorId, { time: now, status: 1 });
    } else {
      // 其他状态变更通知
      for (const binding of monitor.notificationBindings) {
        const channel = binding.notificationChannel;
        if (!channel.enabled) continue;

        try {
          const config = channel.config as Record<string, unknown> || {};
          await sendNotification(channel.type, config, notificationData);
        } catch (error) {
          console.error(`向 ${channel.name}(${channel.type}) 发送通知失败:`, error);
        }
      }
      
      // 更新通知缓存
      notificationCache.set(monitorId, { time: now, status });
    }
  } catch (error) {
    console.error(`处理监控 ${monitorId} 状态变更通知时出错:`, error);
  }
}

/**
 * 根据不同的通知类型发送通知
 */
async function sendNotification(
  type: string,
  config: Record<string, unknown>,
  data: NotificationData
) {
  switch (type) {
    case '邮件':
      // 转换并验证配置
      const emailConfig: EmailConfig = {
        email: String(config.email || ''),
        smtpServer: String(config.smtpServer || ''),
        smtpPort: config.smtpPort as string || '587',
        username: config.username as string,
        password: config.password as string
      };
      return await sendEmailNotification(emailConfig, data);
    case 'Webhook':
      // 转换并验证配置
      const webhookConfig: WebhookConfig = {
        url: String(config.url || '')
      };
      return await sendWebhookNotification(webhookConfig, data);
    case '微信推送':
      // 转换并验证配置
      const wechatConfig: WechatConfig = {
        pushUrl: String(config.pushUrl || ''),
        titleTemplate: config.titleTemplate as string,
        contentTemplate: config.contentTemplate as string
      };
      return await sendWechatNotification(wechatConfig, data);
    default:
      throw new Error(`不支持的通知类型: ${type}`);
  }
}

/**
 * 发送邮件通知
 */
async function sendEmailNotification(
  config: EmailConfig,
  data: NotificationData
) {
  const { email, smtpServer, smtpPort, username, password } = config;
  
  if (!email || !smtpServer || !smtpPort) {
    throw new Error('邮件配置不完整');
  }
  
  // 创建传输器
  const transporter = nodemailer.createTransport({
    host: smtpServer,
    port: Number(smtpPort),
    secure: Number(smtpPort) === 465,
    auth: {
      user: username || email,
      pass: password
    }
  });
  
  // 构建邮件内容
  const subject = `酷监控 - ${data.monitorName} 状态${data.statusText}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #6366F1; border-radius: 10px;">
      <h2 style="color: #6366F1;">🔔 监控状态变更通知</h2>
      <div style="background-color: ${data.status === 'UP' ? '#10B981' : '#EF4444'}1a; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p style="margin: 0; color: ${data.status === 'UP' ? '#10B981' : '#EF4444'}; font-weight: bold; font-size: 16px;">
          状态: ${data.statusText}
        </p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">监控名称</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">${data.monitorName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">监控类型</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.monitorType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">变更时间</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.time}</td>
        </tr>
      </table>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p style="margin: 0; white-space: pre-line;">${data.message}</p>
      </div>
      <hr style="border-top: 1px solid #EEE; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
    </div>
  `;
  
  // 发送邮件
  await transporter.sendMail({
    from: username || email,
    to: email,
    subject,
    html
  });
}

/**
 * 发送Webhook通知
 */
async function sendWebhookNotification(
  config: WebhookConfig,
  data: NotificationData
) {
  const { url } = config;
  
  if (!url) {
    throw new Error('Webhook URL不能为空');
  }
  
  // 准备webhook数据
  const webhookData = {
    event: 'status_change',
    timestamp: new Date().toISOString(),
    monitor: {
      name: data.monitorName,
      type: data.monitorType,
      status: data.statusText,  // 中文状态描述
      status_code: data.status, // 英文状态码保留但改名
      time: data.time,
      message: data.message
    },
    // 额外字段用于失败状态
    failure_info: data.failureCount ? {
      count: data.failureCount,
      first_failure_time: data.firstFailureTime,
      last_failure_time: data.lastFailureTime,
      duration_minutes: data.failureDuration
    } : null
  };
  
  // 发送webhook请求
  await axios.post(url, webhookData, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'CoolMonitor-Notification-Service'
    },
    timeout: 10000
  });
}

/**
 * 发送微信推送通知
 */
async function sendWechatNotification(
  config: WechatConfig,
  data: NotificationData
) {
  const { pushUrl, titleTemplate, contentTemplate } = config;
  
  if (!pushUrl) {
    throw new Error('微信推送URL不能为空');
  }
  
  // 替换模板中的变量
  let title = titleTemplate || "酷监控 - {monitorName} 状态{statusText}";
  let content = contentTemplate || 
    "## 监控状态变更通知\n\n" +
    "- **监控名称**: {monitorName}\n" +
    "- **监控类型**: {monitorType}\n" +
    "- **当前状态**: {statusText}\n" +
    "- **变更时间**: {time}\n" +
    (data.failureCount ? 
      "- **连续失败次数**: {failureCount} 次\n" +
      "- **首次失败时间**: {firstFailureTime}\n" +
      "- **最后失败时间**: {lastFailureTime}\n" +
      "- **失败持续时间**: {failureDuration} 分钟\n\n" : "\n") +
    "{message}";
  
  // 替换所有模板变量
  Object.entries(data).forEach(([key, value]) => {
    title = title.replace(new RegExp(`{${key}}`, 'g'), String(value));
    content = content.replace(new RegExp(`{${key}}`, 'g'), String(value));
  });
  
  // 发送微信推送请求
  await axios.post(pushUrl, { 
    title, 
    content 
  }, {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });
} 