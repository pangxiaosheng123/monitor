"use client";

import { useState, useEffect, FormEvent, useRef, useCallback } from "react";
import { SETTINGS_KEYS } from "@/lib/settings";
import { useSession } from "next-auth/react";

export function SystemSettings() {
  const { data: session } = useSession();
  const [dataRetentionDays, setDataRetentionDays] = useState(90);
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyServer, setProxyServer] = useState("");
  const [proxyPort, setProxyPort] = useState("");
  const [proxyUsername, setProxyUsername] = useState("");
  const [proxyPassword, setProxyPassword] = useState("");
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 表单引用
  const formRef = useRef<HTMLFormElement>(null);

  // 提取出fetchSettings函数，便于重用
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 添加随机参数防止缓存
      const timestamp = new Date().getTime();
      
      // 获取数据保留天数设置
      const generalResponse = await fetch(`/api/settings?section=general&_=${timestamp}`);
      // 获取代理设置
      const proxyResponse = await fetch(`/api/settings?section=proxy&_=${timestamp}`);
      
      if (!generalResponse.ok || !proxyResponse.ok) {
        throw new Error('加载设置失败');
      }
      
      const generalData = await generalResponse.json();
      const proxyData = await proxyResponse.json();
      
      if (generalData.success && generalData.data) {
        // 设置数据保留天数
        const retentionDays = parseInt(generalData.data[SETTINGS_KEYS.DATA_RETENTION_DAYS] || '90', 10);
        setDataRetentionDays(isNaN(retentionDays) ? 90 : retentionDays);
      }
      
      if (proxyData.success && proxyData.data) {
        // 设置代理数据
        const proxyEnabledValue = proxyData.data[SETTINGS_KEYS.PROXY_ENABLED] === 'true';
        setProxyEnabled(proxyEnabledValue);
        
        setProxyServer(proxyData.data[SETTINGS_KEYS.PROXY_SERVER] || '');
        setProxyPort(proxyData.data[SETTINGS_KEYS.PROXY_PORT] || '');
        setProxyUsername(proxyData.data[SETTINGS_KEYS.PROXY_USERNAME] || '');
        setProxyPassword(proxyData.data[SETTINGS_KEYS.PROXY_PASSWORD] || '');
      }
    } catch (err) {
      console.error('加载设置失败:', err);
      setError('加载设置失败，请刷新页面重试');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 在代理开关组件上添加点击处理
  const handleProxyToggleClick = (e: React.MouseEvent) => {
    // 防止事件冒泡导致重复触发
    e.preventDefault();
    e.stopPropagation();
    
    // 切换状态
    setProxyEnabled(!proxyEnabled);
  };

  // 处理设置表单提交
  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      // 构建要发送的数据对象
      const settingsData = {
        [SETTINGS_KEYS.DATA_RETENTION_DAYS]: String(dataRetentionDays),
        [SETTINGS_KEYS.PROXY_ENABLED]: proxyEnabled ? 'true' : 'false',
        [SETTINGS_KEYS.PROXY_SERVER]: proxyServer || '',
        [SETTINGS_KEYS.PROXY_PORT]: proxyPort || '',
        [SETTINGS_KEYS.PROXY_USERNAME]: proxyUsername || '',
        [SETTINGS_KEYS.PROXY_PASSWORD]: proxyPassword || ''
      };
      
      // 添加请求超时处理
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // 清除超时计时器
      
      // 检查响应是否成功
      if (!response.ok) {
        console.error('保存设置失败 - 状态码:', response.status);
        throw new Error(`保存设置失败: ${response.status}`);
      }
      
      // 解析响应数据
      const responseData = await response.json();
      
      // 从响应中更新状态
      if (responseData.updatedSettings) {
        // 将响应中的设置值直接应用到表单中
        const settings = responseData.updatedSettings;
        
        // 更新数据保留天数
        if (settings[SETTINGS_KEYS.DATA_RETENTION_DAYS]) {
          const retentionDays = parseInt(settings[SETTINGS_KEYS.DATA_RETENTION_DAYS], 10);
          if (!isNaN(retentionDays)) {
            setDataRetentionDays(retentionDays);
          }
        }
        
        // 更新代理设置
        if (settings[SETTINGS_KEYS.PROXY_ENABLED] !== undefined) {
          const proxyEnabledValue = settings[SETTINGS_KEYS.PROXY_ENABLED] === 'true';
          setProxyEnabled(proxyEnabledValue);
        }
        
        if (settings[SETTINGS_KEYS.PROXY_SERVER] !== undefined) {
          setProxyServer(settings[SETTINGS_KEYS.PROXY_SERVER]);
        }
        
        if (settings[SETTINGS_KEYS.PROXY_PORT] !== undefined) {
          setProxyPort(settings[SETTINGS_KEYS.PROXY_PORT]);
        }
        
        if (settings[SETTINGS_KEYS.PROXY_USERNAME] !== undefined) {
          setProxyUsername(settings[SETTINGS_KEYS.PROXY_USERNAME]);
        }
        
        if (settings[SETTINGS_KEYS.PROXY_PASSWORD] !== undefined) {
          setProxyPassword(settings[SETTINGS_KEYS.PROXY_PASSWORD]);
        }
      }
      
      return true;
    } catch (err) {
      console.error('保存设置失败:', err);
      return false;
    }
  }, [dataRetentionDays, proxyEnabled, proxyServer, proxyPort, proxyUsername, proxyPassword]);
  
  // 监听来自父组件的保存请求
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    
    const handleSaveSettings = async (event: Event) => {
      event.preventDefault();
      
      try {
        // 执行保存操作
        const success = await handleSubmit(event as unknown as FormEvent<HTMLFormElement>);
        
        // 通知父组件保存完成
        form.dispatchEvent(new CustomEvent('saveSettingsResult', {
          bubbles: true,
          detail: { success, message: success ? '设置已保存' : '保存失败' }
        }));
        
        return success;
      } catch (error) {
        console.error('处理保存请求时出错:', error);
        
        // 通知父组件保存失败
        form.dispatchEvent(new CustomEvent('saveSettingsResult', {
          bubbles: true,
          detail: { success: false, message: '保存过程中出错' }
        }));
        
        return false;
      }
    };
    
    // 添加事件监听器
    form.addEventListener('saveSettings', handleSaveSettings);
    
    // 清理
    return () => {
      form.removeEventListener('saveSettings', handleSaveSettings);
    };
  }, [handleSubmit]);
  
  // 加载设置数据
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // 处理密码更新
  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    
    // 重置状态
    setPasswordError(null);
    setPasswordSuccess(false);
    
    // 验证新密码
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的密码不一致');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('密码长度不能少于6个字符');
      return;
    }
    
    try {
      // 从会话中获取当前用户ID
      const userId = session?.user?.id;
      
      if (!userId) {
        setPasswordError('用户未登录或会话已过期');
        return;
      }
      
      const response = await fetch('/api/settings/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          currentPassword,
          newPassword,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setPasswordError(data.error || '密码更新失败');
        return;
      }
      
      // 清空表单
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(true);
      
      // 3秒后清除成功提示
      setTimeout(() => setPasswordSuccess(false), 3000);
      
    } catch (err) {
      console.error('更新密码失败:', err);
      setPasswordError('密码更新失败，请重试');
    }
  };

  // 处理测试代理连接
  const handleTestProxyConnection = async () => {
    if (!proxyEnabled || !proxyServer || !proxyPort) {
      alert('请配置正确的代理服务器和端口并启用代理');
      return;
    }
    
    try {
      // 保存原始的body样式
      const originalBodyStyle = document.body.style.cssText;
      
      // 显示测试中对话框
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]';
      overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center;';
      
      // 禁止背景滚动
      document.body.style.overflow = 'hidden';
      
      const testingDialog = document.createElement('div');
      testingDialog.className = 'bg-dark-card dark:bg-dark-card bg-light-card rounded-xl p-5 shadow-xl max-w-md w-full mx-4 border border-primary/20 animate-fadeIn';
      testingDialog.style.cssText = 'max-height: 90vh; overflow-y: auto;';
      testingDialog.innerHTML = `
        <div class="flex items-center justify-center space-x-3 py-3">
          <div class="animate-spin h-6 w-6 text-primary">
            <i class="fas fa-circle-notch fa-spin text-xl"></i>
          </div>
          <span class="text-lg font-medium dark:text-foreground text-light-text-primary">正在测试代理连接...</span>
        </div>
      `;
      
      overlay.appendChild(testingDialog);
      document.body.appendChild(overlay);
      
      // 先保存当前代理设置
      const saveResponse = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [SETTINGS_KEYS.PROXY_ENABLED]: String(proxyEnabled),
          [SETTINGS_KEYS.PROXY_SERVER]: proxyServer,
          [SETTINGS_KEYS.PROXY_PORT]: proxyPort,
          [SETTINGS_KEYS.PROXY_USERNAME]: proxyUsername,
          [SETTINGS_KEYS.PROXY_PASSWORD]: proxyPassword,
        }),
      });
      
      if (!saveResponse.ok) {
        document.body.removeChild(overlay);
        throw new Error('保存代理设置失败');
      }
      
      // 测试代理连接
      const testResponse = await fetch('/api/settings/proxy-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://httpbin.org/ip',
          forceUpdateSettings: true
        }),
      });
      
      // 移除测试中对话框并恢复body状态
      document.body.removeChild(overlay);
      
      const testResult = await testResponse.json();
      
      // 创建新的结果对话框
      const resultOverlay = document.createElement('div');
      resultOverlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]';
      resultOverlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center;';

      // 清理函数 - 关闭对话框并恢复body状态
      const cleanup = () => {
        document.body.removeChild(resultOverlay);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.cssText = originalBodyStyle;
      };
      
      // 键盘监听函数
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanup();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      
      // 遮罩层点击处理函数
      resultOverlay.addEventListener('click', (e) => {
        if (e.target === resultOverlay) {
          cleanup();
        }
      });
      
      if (testResult.success) {
        // 创建成功对话框
        const successDialog = document.createElement('div');
        successDialog.className = 'bg-dark-card dark:bg-dark-card bg-light-card rounded-xl shadow-xl max-w-md w-full mx-4 border border-green-500/30 overflow-hidden animate-fadeIn';
        
        // 对话框头部
        const dialogHeader = document.createElement('div');
        dialogHeader.className = 'bg-green-500/10 p-4 border-b border-green-500/20 flex items-center';
        dialogHeader.innerHTML = `
          <div class="w-10 h-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mr-3">
            <i class="fas fa-check-circle text-lg"></i>
          </div>
          <h3 class="text-lg font-medium text-green-500">代理连接成功!</h3>
        `;
        
        // 对话框内容
        const dialogContent = document.createElement('div');
        dialogContent.className = 'p-5 space-y-3';
        dialogContent.innerHTML = `
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-green-500/5 p-3 rounded-lg border border-green-500/10">
              <div class="text-xs text-gray-500 mb-1">响应时间</div>
              <div class="text-lg font-medium text-green-500">${testResult.data.ping}ms</div>
            </div>
            <div class="bg-green-500/5 p-3 rounded-lg border border-green-500/10">
              <div class="text-xs text-gray-500 mb-1">响应状态</div>
              <div class="text-lg font-medium text-green-500">${testResult.data.statusCode}</div>
            </div>
          </div>
          <div class="bg-green-500/5 p-3 rounded-lg border border-green-500/10">
            <div class="text-xs text-gray-500 mb-1">代理服务器</div>
            <div class="font-medium">${testResult.data.proxyServer}:${testResult.data.proxyPort}</div>
          </div>
        `;
        
        // 对话框底部按钮
        const dialogFooter = document.createElement('div');
        dialogFooter.className = 'p-4 bg-green-500/5 border-t border-green-500/20 flex justify-end';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors';
        closeButton.innerText = '关闭';
        closeButton.onclick = cleanup;
        
        dialogFooter.appendChild(closeButton);
        
        // 组装对话框
        successDialog.appendChild(dialogHeader);
        successDialog.appendChild(dialogContent);
        successDialog.appendChild(dialogFooter);
        resultOverlay.appendChild(successDialog);
      } else {
        // 创建失败对话框
        const errorDialog = document.createElement('div');
        errorDialog.className = 'bg-dark-card dark:bg-dark-card bg-light-card rounded-xl shadow-xl max-w-md w-full mx-4 border border-red-500/30 overflow-hidden animate-fadeIn';
        
        // 对话框头部
        const dialogHeader = document.createElement('div');
        dialogHeader.className = 'bg-red-500/10 p-4 border-b border-red-500/20 flex items-center';
        dialogHeader.innerHTML = `
          <div class="w-10 h-10 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mr-3">
            <i class="fas fa-exclamation-circle text-lg"></i>
          </div>
          <h3 class="text-lg font-medium text-red-500">代理连接失败!</h3>
        `;
        
        // 对话框内容
        const dialogContent = document.createElement('div');
        dialogContent.className = 'p-5 space-y-3';
        dialogContent.innerHTML = `
          <div class="bg-red-500/5 p-3 rounded-lg border border-red-500/10">
            <div class="text-xs text-gray-500 mb-1">错误信息</div>
            <div class="font-medium text-red-500">${testResult.error}</div>
          </div>
          <div class="bg-red-500/5 p-3 rounded-lg border border-red-500/10">
            <div class="text-xs text-gray-500 mb-1">代理服务器</div>
            <div class="font-medium">${testResult.proxyServer || proxyServer}:${testResult.proxyPort || proxyPort}</div>
          </div>
          <div class="bg-red-500/5 p-3 rounded-lg border border-red-500/10 text-sm">
            <div class="flex items-center">
              <i class="fas fa-info-circle text-gray-500 mr-2"></i>
              <span>请检查代理服务器地址和端口是否正确，并确保代理服务器已启动且可访问。</span>
            </div>
          </div>
        `;
        
        // 对话框底部按钮
        const dialogFooter = document.createElement('div');
        dialogFooter.className = 'p-4 bg-red-500/5 border-t border-red-500/20 flex justify-end';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors';
        closeButton.innerText = '关闭';
        closeButton.onclick = cleanup;
        
        dialogFooter.appendChild(closeButton);
        
        // 组装对话框
        errorDialog.appendChild(dialogHeader);
        errorDialog.appendChild(dialogContent);
        errorDialog.appendChild(dialogFooter);
        resultOverlay.appendChild(errorDialog);
      }
      
      // 显示结果对话框
      document.body.appendChild(resultOverlay);
      
    } catch (err) {
      console.error('测试代理连接失败:', err);
      
      // 恢复body状态
      document.body.style.overflow = '';
      
      // 创建异常对话框
      const errorOverlay = document.createElement('div');
      errorOverlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]';
      errorOverlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center;';
      
      const errorDialog = document.createElement('div');
      errorDialog.className = 'bg-dark-card dark:bg-dark-card bg-light-card rounded-xl shadow-xl max-w-md w-full mx-4 border border-red-500/30 overflow-hidden animate-fadeIn';
      
      // 清理函数 - 关闭对话框并恢复body状态
      const cleanup = () => {
        document.body.removeChild(errorOverlay);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
      
      // 键盘监听函数
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanup();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      
      // 对话框头部
      const dialogHeader = document.createElement('div');
      dialogHeader.className = 'bg-red-500/10 p-4 border-b border-red-500/20 flex items-center';
      dialogHeader.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mr-3">
          <i class="fas fa-exclamation-triangle text-lg"></i>
        </div>
        <h3 class="text-lg font-medium text-red-500">测试过程发生错误!</h3>
      `;
      
      // 对话框内容
      const dialogContent = document.createElement('div');
      dialogContent.className = 'p-5';
      dialogContent.innerHTML = `
        <div class="bg-red-500/5 p-3 rounded-lg border border-red-500/10">
          <div class="font-medium text-red-500">${err instanceof Error ? err.message : '未知错误，请查看控制台日志'}</div>
        </div>
      `;
      
      // 对话框底部按钮
      const dialogFooter = document.createElement('div');
      dialogFooter.className = 'p-4 bg-red-500/5 border-t border-red-500/20 flex justify-end';
      
      const closeButton = document.createElement('button');
      closeButton.className = 'px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors';
      closeButton.innerText = '关闭';
      closeButton.onclick = cleanup;
      
      dialogFooter.appendChild(closeButton);
      
      // 组装对话框
      errorDialog.appendChild(dialogHeader);
      errorDialog.appendChild(dialogContent);
      errorDialog.appendChild(dialogFooter);
      errorOverlay.appendChild(errorDialog);
      
      // 遮罩层点击处理函数
      errorOverlay.addEventListener('click', (e) => {
        if (e.target === errorOverlay) {
          cleanup();
        }
      });
      
      // 显示错误对话框
      document.body.appendChild(errorOverlay);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary flex flex-col items-center">
          <i className="fas fa-spinner fa-spin fa-2x mb-3"></i>
          <span>正在加载设置...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 flex flex-col items-center bg-red-500/5 p-6 rounded-xl">
          <i className="fas fa-exclamation-circle fa-2x mb-3"></i>
          <span className="font-medium">{error}</span>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all text-sm"
          >
            点击刷新
          </button>
        </div>
      </div>
    );
  }

  return (
    <form id="system-settings-form" ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold dark:text-foreground text-light-text-primary">系统设置</h3>
        <div className="text-xs dark:text-foreground/60 text-light-text-secondary bg-primary/5 px-3 py-1 rounded-full">
          基本配置
        </div>
      </div>
      
      <div className="space-y-6 mt-2">
        {/* 数据保留策略设置 */}
        <div className="bg-dark-nav/30 dark:bg-dark-nav/30 bg-light-nav/30 rounded-xl p-5 border border-primary/10">
          <label className="flex items-center mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mr-3">
              <i className="fas fa-history"></i>
            </div>
            <div>
              <span className="text-sm font-medium dark:text-foreground text-light-text-primary">数据保留策略</span>
              <p className="text-xs dark:text-foreground/60 text-light-text-secondary mt-0.5">
                设置监控历史数据的保留天数
              </p>
            </div>
          </label>
          <div className="flex items-center">
            <input 
              type="range" 
              min="7" 
              max="365" 
              value={dataRetentionDays} 
              onChange={(e) => setDataRetentionDays(parseInt(e.target.value) || 90)}
              className="flex-1 h-2 bg-primary/20 rounded-lg appearance-none cursor-pointer" 
            />
            <div className="w-24 ml-4">
              <input 
                type="number"
                name="dataRetention"
                className="w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-card dark:bg-dark-card bg-light-card dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-center"
                min="7"
                max="365"
                value={dataRetentionDays}
                onChange={(e) => setDataRetentionDays(parseInt(e.target.value) || 90)}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs dark:text-foreground/60 text-light-text-secondary">最少保留7天</span>
            <span className="text-xs dark:text-foreground/80 text-light-text-primary font-medium">
              {dataRetentionDays === 7 ? '最少' : 
               dataRetentionDays >= 180 ? '长期保留' : 
               dataRetentionDays >= 90 ? '标准' : '短期'}
            </span>
            <span className="text-xs dark:text-foreground/60 text-light-text-secondary">最多保留365天</span>
          </div>
          <p className="mt-4 text-xs dark:text-foreground/70 text-light-text-secondary bg-primary/5 p-2 rounded-lg border border-primary/10">
            <i className="fas fa-info-circle mr-1.5"></i>
            超过保留期限的监控历史数据将被自动清除，无法恢复
          </p>
        </div>
        
        {/* 代理设置卡片 */}
        <div className="bg-dark-nav/30 dark:bg-dark-nav/30 bg-light-nav/30 rounded-xl border border-primary/10 overflow-hidden">
          <div className="bg-primary/5 px-5 py-3 border-b border-primary/10 flex items-center">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mr-3">
              <i className="fas fa-network-wired"></i>
            </div>
            <span className="font-medium">HTTP 代理设置</span>
          </div>
          
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between bg-dark-card/50 dark:bg-dark-card/50 bg-light-card/50 p-3 rounded-lg border border-primary/10">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full ${proxyEnabled ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'} flex items-center justify-center mr-3`}>
                  <i className={`fas ${proxyEnabled ? 'fa-check' : 'fa-times'}`}></i>
                </div>
                <div>
                  <span className="text-sm font-medium dark:text-foreground text-light-text-primary">启用 HTTP 代理</span>
                  <p className="text-xs dark:text-foreground/60 text-light-text-secondary mt-0.5">
                    为监控请求使用代理服务器
                  </p>
                </div>
              </div>
              <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
                <input 
                  type="checkbox" 
                  id="proxy-enabled" 
                  className="absolute w-0 h-0 opacity-0"
                  checked={proxyEnabled}
                  onChange={() => {}} // 空的onChange处理，防止React警告
                />
                <label 
                  htmlFor="proxy-enabled" 
                  className="toggle-label block overflow-hidden h-6 rounded-full bg-primary/30 cursor-pointer"
                  onClick={handleProxyToggleClick}
                >
                  <span className={`block h-6 w-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out toggle-dot ${proxyEnabled ? 'translate-x-6' : ''}`}></span>
                </label>
              </div>
            </div>
            
            {proxyEnabled && (
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium dark:text-foreground/80 text-light-text-primary mb-1.5">
                      代理服务器地址
                    </label>
                    <input 
                      type="text" 
                      name="proxyServer"
                      className="w-full px-4 py-2.5 rounded-lg border border-primary/20 bg-dark-card dark:bg-dark-card bg-light-card dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="例如：proxy.example.com"
                      value={proxyServer}
                      onChange={(e) => setProxyServer(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium dark:text-foreground/80 text-light-text-primary mb-1.5">
                      端口
                    </label>
                    <input 
                      type="number" 
                      name="proxyPort"
                      className="w-full px-4 py-2.5 rounded-lg border border-primary/20 bg-dark-card dark:bg-dark-card bg-light-card dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="8080"
                      value={proxyPort}
                      onChange={(e) => setProxyPort(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium dark:text-foreground/80 text-light-text-primary mb-1.5">
                      用户名 (可选)
                    </label>
                    <input 
                      type="text" 
                      name="proxyUsername"
                      className="w-full px-4 py-2.5 rounded-lg border border-primary/20 bg-dark-card dark:bg-dark-card bg-light-card dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="代理认证用户名"
                      value={proxyUsername}
                      onChange={(e) => setProxyUsername(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium dark:text-foreground/80 text-light-text-primary mb-1.5">
                      密码 (可选)
                    </label>
                    <input 
                      type="password" 
                      name="proxyPassword"
                      className="w-full px-4 py-2.5 rounded-lg border border-primary/20 bg-dark-card dark:bg-dark-card bg-light-card dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="代理认证密码"
                      value={proxyPassword}
                      onChange={(e) => setProxyPassword(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <button 
                    type="button"
                    onClick={handleTestProxyConnection}
                    className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all text-sm font-medium flex items-center"
                  >
                    <i className="fas fa-vial mr-2"></i>
                    测试连接
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 密码设置卡片 */}
        <div className="bg-dark-nav/30 dark:bg-dark-nav/30 bg-light-nav/30 rounded-xl border border-primary/10 overflow-hidden">
          <div className="bg-primary/5 px-5 py-3 border-b border-primary/10 flex items-center">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mr-3">
              <i className="fas fa-lock"></i>
            </div>
            <span className="font-medium">管理员密码</span>
          </div>
          
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium dark:text-foreground/80 text-light-text-primary mb-1.5">
                  当前密码
                </label>
                <input 
                  type="password" 
                  className="w-full px-4 py-3 rounded-lg border border-primary/20 bg-dark-card dark:bg-dark-card bg-light-card dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  placeholder="输入当前密码"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-medium dark:text-foreground/80 text-light-text-primary mb-1.5">
                    新密码
                  </label>
                  <input 
                    type="password" 
                    className="w-full px-4 py-3 rounded-lg border border-primary/20 bg-dark-card dark:bg-dark-card bg-light-card dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="设置新密码"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium dark:text-foreground/80 text-light-text-primary mb-1.5">
                    确认新密码
                  </label>
                  <input 
                    type="password" 
                    className="w-full px-4 py-3 rounded-lg border border-primary/20 bg-dark-card dark:bg-dark-card bg-light-card dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="再次输入新密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>
            </div>
            
            {passwordError && (
              <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-lg text-sm flex items-center">
                <i className="fas fa-exclamation-circle mr-2"></i>
                {passwordError}
              </div>
            )}
            
            {passwordSuccess && (
              <div className="bg-green-500/10 text-green-500 px-4 py-3 rounded-lg text-sm flex items-center">
                <i className="fas fa-check-circle mr-2"></i>
                密码已成功更新
              </div>
            )}
            
            <div>
              <button 
                type="button" 
                onClick={handleUpdatePassword}
                className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all text-sm font-medium flex items-center shadow-sm shadow-primary/20 hover:shadow-md"
              >
                <i className="fas fa-key mr-2"></i>
                更新密码
              </button>
            </div>
          </div>
        </div>

      </div>
    </form>
  );
} 