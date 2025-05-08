/**
 * 系统启动脚本
 * 在服务器启动时自动初始化监控系统
 */
import { forceInitSystem } from './system-init';

// 自动执行的初始化函数
(async () => {
  try {
    console.log('========================');
    console.log('系统启动中，执行自动初始化...');
    
    // 调用系统初始化函数
    const result = await forceInitSystem();
    
    if (result) {
      console.log('系统初始化成功');
    } else {
      console.log('系统初始化失败或无需初始化');
    }
    console.log('========================');
  } catch (error) {
    console.error('系统自动初始化过程中发生错误:', error);
  }
})();

// 导出标记，表示此模块已加载
export const SYSTEM_INITIALIZED = true; 