"use client";

import { useState } from "react";
import { SystemSettings } from "./settings/system-settings";
import { NotificationSettings } from "./settings/notification-settings";
import { AboutSettings } from "./settings/about-settings";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "系统设置" | "通知设置" | "关于";

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>("系统设置");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);

  if (!isOpen) return null;

  // 处理设置保存
  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      if (activeTab === "系统设置") {
        // 获取表单数据
        const systemSettingsForm = document.getElementById('system-settings-form') as HTMLFormElement;
        if (systemSettingsForm) {
          // 创建一个Promise来等待设置保存完成
          const savePromise = new Promise<boolean>((resolve) => {
            // 为事件添加一次性监听器，捕获处理结果
            const handleSaveResult = (e: Event) => {
              const customEvent = e as CustomEvent;
              const success = customEvent.detail?.success === true;
              resolve(success);
            };
            
            // 添加一次性监听器
            systemSettingsForm.addEventListener('saveSettingsResult', handleSaveResult, { once: true });
            
            // 创建并触发自定义事件
            const saveEvent = new CustomEvent('saveSettings', { 
              bubbles: true,
              cancelable: true,
              detail: { caller: 'settingsDialog' } 
            });
            
            // 分发事件，如果5秒内没有收到结果，则认为保存失败
            systemSettingsForm.dispatchEvent(saveEvent);
            
            // 设置超时，防止永久等待
            setTimeout(() => {
              systemSettingsForm.removeEventListener('saveSettingsResult', handleSaveResult);
              resolve(false);
            }, 5000);
          });
          
          // 等待保存操作完成
          const success = await savePromise;
          
          // 立即关闭对话框
          if (success) {
            onClose(); // 关闭对话框
          } else {
            console.error('保存设置失败');
            // 这里可以添加错误提示逻辑
          }
        } else {
          console.error('未找到系统设置表单');
          // 这里可以添加错误提示逻辑
        }
      } else if (activeTab === "通知设置") {
        // 通知设置已经有自己的保存机制
        onClose(); // 关闭对话框
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      // 这里可以添加错误提示逻辑
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-6">
      <div 
        className="bg-dark-card dark:bg-dark-card bg-light-card w-full max-w-4xl rounded-xl shadow-2xl border border-primary/25 animate-fadeIn overflow-hidden"
        style={{ maxHeight: '85vh' }}
      >
        {/* 标题栏 */}
        <div className="flex justify-between items-center p-6 border-b border-primary/10">
          <h2 className="text-xl font-bold dark:text-foreground text-light-text-primary">设置</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-primary/10 dark:text-foreground text-light-text-primary transition-colors flex items-center justify-center"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="flex h-[calc(85vh-160px)]">
          {/* 侧边标签栏 */}
          <div className="w-64 border-r border-primary/10 p-5 bg-dark-card/50 dark:bg-dark-card/50 bg-light-card/50">
            <nav className="space-y-2">
              {(["系统设置", "通知设置", "关于"] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-5 py-3.5 rounded-lg text-sm flex items-center space-x-3.5 transition-all ${
                    activeTab === tab 
                      ? "bg-primary/15 text-primary font-medium shadow-sm" 
                      : "hover:bg-primary/5 dark:text-foreground text-light-text-primary hover:translate-x-1"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                    activeTab === tab ? "bg-primary/20" : "bg-primary/10"
                  }`}>
                    <i className={`fas fa-${
                      tab === "系统设置" ? "cogs" : 
                      tab === "通知设置" ? "bell" : 
                      "info-circle"
                    }`}></i>
                  </div>
                  <span>{tab}</span>
                </button>
              ))}
            </nav>
          </div>
          
          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto p-7">
            {activeTab === "系统设置" && <SystemSettings />}
            {activeTab === "通知设置" && <NotificationSettings />}
            {activeTab === "关于" && <AboutSettings />}
          </div>
        </div>
        
        {/* 底部操作栏 */}
        <div className="flex justify-end px-6 py-5 bg-dark-nav/50 dark:bg-dark-nav/50 bg-light-nav/50 border-t border-primary/10">
          <div className="flex space-x-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 bg-primary/5 text-primary rounded-lg hover:bg-primary/10 transition-all text-sm font-medium"
            >
              关闭
            </button>
            
            {activeTab !== "关于" && (
              <button 
                onClick={handleSaveSettings}
                disabled={isSaving}
                className={`px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all flex items-center text-sm font-medium ${
                  isSaving ? 'opacity-70 cursor-not-allowed' : 'shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40'
                }`}
              >
                {isSaving ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    <span>保存中...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    <span>保存设置</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 中央提示弹窗 */}
      {saveSuccess !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-[1000] pointer-events-none">
          <div className={`${
            saveSuccess 
              ? 'bg-dark-card dark:bg-dark-card border-success text-success' 
              : 'bg-dark-card dark:bg-dark-card border-error text-error'
            } bg-opacity-95 dark:bg-opacity-95 backdrop-blur-sm py-4 px-6 rounded-lg shadow-xl animate-fadeInUp flex items-center max-w-md border-2`}>
            <div className={`w-10 h-10 rounded-full ${
              saveSuccess ? 'bg-success/20' : 'bg-error/20'
            } flex items-center justify-center mr-3`}>
              <i className={`fas ${saveSuccess ? 'fa-check' : 'fa-exclamation'} text-xl`}></i>
            </div>
            <span className="text-lg font-medium">{saveSuccess ? '设置已成功保存' : '保存失败，请重试'}</span>
          </div>
        </div>
      )}
    </div>
  );
} 