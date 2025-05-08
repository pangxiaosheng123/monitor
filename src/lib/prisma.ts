import { PrismaClient } from '@prisma/client';

// 声明全局变量以避免热重载期间连接过多
declare global {
  var prisma: PrismaClient | undefined;
}

// 在开发环境中使用全局变量，在生产环境中创建新实例
export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma; 