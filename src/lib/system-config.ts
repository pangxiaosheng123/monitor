import { prisma } from './prisma';
import crypto from 'crypto';

// 系统配置键名常量
export const CONFIG_KEYS = {
  REGISTRATION_ENABLED: 'registration_enabled',
};

// 获取系统配置值
export async function getSystemConfig(key: string): Promise<string | null> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });
    
    return config?.value || null;
  } catch (error) {
    console.error(`获取系统配置${key}失败:`, error);
    return null;
  }
}

// 设置系统配置值
export async function setSystemConfig(key: string, value: string): Promise<void> {
  try {
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value },
    });
    console.log(`系统配置${key}更新成功`);
  } catch (error) {
    console.error(`设置系统配置${key}失败:`, error);
    throw new Error(`无法保存系统配置: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// JWT密钥长度常量
const JWT_SECRET_LENGTH = 32; // 固定长度，确保一致性

// 生成随机JWT密钥
export function generateRandomSecret(): string {
  try {
    return crypto.randomBytes(JWT_SECRET_LENGTH).toString('hex');
  } catch (error) {
    console.error('生成随机密钥失败:', error);
    // 备用方案：使用Math.random
    const backupRandom = Array.from(
      { length: JWT_SECRET_LENGTH * 2 },
      () => Math.floor(Math.random() * 16).toString(16)
    ).join('');
    console.log('使用备用方法生成密钥');
    return backupRandom;
  }
}

// 获取JWT密钥
export async function getOrCreateJwtSecret(): Promise<string> {
  // 使用环境变量中的NEXTAUTH_SECRET
  const envSecret = process.env.NEXTAUTH_SECRET;
  if (envSecret) {
    return envSecret;
  }
  
  // 如果环境变量不存在，生成一个临时密钥并发出警告
  console.warn('未找到NEXTAUTH_SECRET环境变量，使用临时JWT密钥，重启后会话将失效！');
  return generateRandomSecret();
}

// 检查注册功能是否启用
export async function isRegistrationEnabled(): Promise<boolean> {
  const value = await getSystemConfig(CONFIG_KEYS.REGISTRATION_ENABLED);
  // 默认值为 'true'，仅当明确设置为 'false' 时禁用注册
  return value !== 'false';
}

// 设置注册功能状态
export async function setRegistrationEnabled(enabled: boolean): Promise<void> {
  await setSystemConfig(CONFIG_KEYS.REGISTRATION_ENABLED, enabled ? 'true' : 'false');
}

// 系统初始化后禁用注册功能
export async function disableRegistrationAfterInit(): Promise<void> {
  const hasAdmin = await prisma.user.count({
    where: { isAdmin: true }
  });
  
  // 检查是否已经有管理员用户，如果有，则禁用注册
  if (hasAdmin > 0) {
    console.log('系统已初始化（存在管理员用户），禁用注册功能');
    await setRegistrationEnabled(false);
  } else {
    console.log('系统未初始化（不存在管理员用户），保持注册功能开启');
    await setRegistrationEnabled(true);
  }
} 