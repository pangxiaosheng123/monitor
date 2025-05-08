import { PrismaClient, Prisma } from '@prisma/client';
import { SimpleNotificationBinding } from '@/types/monitor';

// 创建一个全局prisma实例（在开发环境中避免热重载产生多个连接）
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 监控相关数据库操作
export const monitorOperations = {
  // 创建新监控项
  async createMonitor(data: {
    name: string;
    type: string;
    config: Record<string, unknown>;
    interval: number;
    retries: number;
    retryInterval: number;
    resendInterval: number;
    upsideDown: boolean;
    description: string;
    active: boolean;
    notificationBindings: SimpleNotificationBinding[];
  }) {
    const { notificationBindings, ...monitorData } = data;

    // 使用事务来保证数据一致性
    return prisma.$transaction(async (tx) => {
      // 创建监控项
      const monitor = await tx.monitor.create({
        data: {
          ...monitorData,
          config: monitorData.config as Prisma.JsonObject
        }
      });

      // 如果有通知绑定关系，就创建关联
      if (notificationBindings && Array.isArray(notificationBindings) && notificationBindings.length > 0) {
        // 批量创建通知绑定关系
        const notifications = notificationBindings.map(binding => ({
          monitorId: monitor.id,
          notificationChannelId: binding.notificationId,
          enabled: binding.enabled
        }));

        await tx.monitorNotification.createMany({
          data: notifications
        });
      }

      return monitor;
    });
  },

  // 获取所有监控项
  async getAllMonitors(orderBy = { createdAt: 'desc' } as Prisma.MonitorOrderByWithRelationInput) {
    return prisma.monitor.findMany({
      orderBy,
      include: {
        notificationBindings: {
          include: {
            notificationChannel: true
          }
        }
      }
    });
  },

  // 获取单个监控项
  async getMonitorById(id: string) {
    return prisma.monitor.findUnique({
      where: { id },
      include: {
        statusHistory: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 20
        },
        notificationBindings: {
          include: {
            notificationChannel: true
          }
        }
      }
    });
  },

  // 更新监控项
  async updateMonitor(id: string, data: Record<string, unknown>) {
    const { notificationBindings, ...monitorData } = data;
    
    // 使用事务来保证数据一致性
    return prisma.$transaction(async (tx) => {
      // 先获取现有的监控项数据，以确保config合并正确
      const existingMonitor = await tx.monitor.findUnique({
        where: { id }
      });
      
      // 特殊处理config字段，确保现有的config字段不会丢失
      const finalData = { ...monitorData };
      if (monitorData.config && existingMonitor?.config) {
        // 深度合并config对象，确保pushToken等字段不会丢失
        finalData.config = {
          ...(existingMonitor.config as Prisma.JsonObject),
          ...(monitorData.config as Prisma.JsonObject)
        } as Prisma.JsonObject;
      }
      
      // 更新监控项基本信息
      const monitor = await tx.monitor.update({
        where: { id },
        data: finalData as Prisma.MonitorUpdateInput
      });

      // 如果提供了通知绑定关系，就更新关联
      if (notificationBindings && Array.isArray(notificationBindings)) {
        // 先删除现有关联
        await tx.monitorNotification.deleteMany({
          where: { monitorId: id }
        });

        // 如果有绑定关系，就重新创建关联
        if (notificationBindings.length > 0) {
          const notifications = notificationBindings.map(binding => ({
            monitorId: id,
            notificationChannelId: binding.notificationId,
            enabled: binding.enabled
          }));

          await tx.monitorNotification.createMany({
            data: notifications
          });
        }
      }

      return monitor;
    });
  },

  // 删除监控项
  async deleteMonitor(id: string) {
    return prisma.monitor.delete({
      where: { id }
    });
  },

  // 添加监控状态记录
  async addMonitorStatus(monitorId: string, status: number, message?: string, ping?: number) {
    return prisma.monitorStatus.create({
      data: {
        monitorId,
        status,
        message,
        ping
      }
    });
  },

  // 更新监控状态
  async updateMonitorStatus(data: {
    monitorId: string,
    status: number,
    message?: string,
    ping?: number | null,
    timestamp?: string
  }) {
    const { monitorId, status, message, ping, timestamp } = data;
    
    // 使用事务保证数据一致性
    return prisma.$transaction(async (tx) => {
      // 添加状态历史记录
      await tx.monitorStatus.create({
        data: {
          monitorId,
          status,
          message,
          ping,
          ...(timestamp ? { timestamp: new Date(timestamp) } : {})
        }
      });
      
      // 更新监控项的最后状态
      await tx.monitor.update({
        where: { id: monitorId },
        data: {
          lastStatus: status,
          lastCheckAt: new Date()
        }
      });
    });
  },
  
  // 根据token查找监控项
  async findMonitorByToken(token: string) {
    try {
      // 使用原始SQL查询，因为Prisma对JSON查询的支持有限
      const monitors = await prisma.$queryRaw`
        SELECT * FROM "Monitor" 
        WHERE type = 'push' 
        AND config->>'pushToken' = ${token}
      `;
      
      // 返回第一个匹配的结果
      return Array.isArray(monitors) && monitors.length > 0 ? monitors[0] : null;
    } catch (error) {
      console.error('查找token失败:', error);
      return null;
    }
  },

  // 获取监控项的通知绑定关系
  async getMonitorNotifications(monitorId: string) {
    return prisma.monitorNotification.findMany({
      where: { monitorId },
      include: {
        notificationChannel: true
      }
    });
  },

  // 更新监控项的通知绑定关系
  async updateMonitorNotifications(monitorId: string, bindings: SimpleNotificationBinding[]) {
    // 使用事务来保证数据一致性
    return prisma.$transaction(async (tx) => {
      // 先删除现有关联
      await tx.monitorNotification.deleteMany({
        where: { monitorId }
      });

      // 如果有绑定关系，就重新创建关联
      if (bindings.length > 0) {
        const notifications = bindings.map(binding => ({
          monitorId,
          notificationChannelId: binding.notificationId,
          enabled: binding.enabled
        }));

        await tx.monitorNotification.createMany({
          data: notifications
        });
      }

      return bindings;
    });
  }
}; 