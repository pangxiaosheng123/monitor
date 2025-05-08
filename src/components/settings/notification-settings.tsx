"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

type NotificationType = "邮件" | "Webhook" | "微信推送";

interface NotificationConfig {
  id: string;
  type: NotificationType;
  name: string;
  enabled: boolean;
  defaultForNewMonitors: boolean;
  config: Record<string, unknown>;
}

interface NotificationSettingsProps {
  onNotificationChange?: (hasNotifications: boolean) => void;
}

export function NotificationSettings({ onNotificationChange }: NotificationSettingsProps) {
  const [notifications, setNotifications] = useState<NotificationConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentEditingNotification, setCurrentEditingNotification] = useState<NotificationConfig | null>(null);
  const [selectedType, setSelectedType] = useState<NotificationType>("邮件");
  const [notificationName, setNotificationName] = useState<string>("");
  
  // 从服务器加载通知设置
  useEffect(() => {
    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/settings/notifications');
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            setNotifications(data.data);
            // 通知父组件是否有通知方式
            if (onNotificationChange) {
              onNotificationChange(data.data.length > 0);
            }
          } else {
            // 如果API返回错误或没有数据，设置为默认值
            setNotifications([
              {
                id: "1",
                type: "邮件",
                name: "系统邮件通知",
                enabled: true,
                defaultForNewMonitors: true,
                config: {
                  email: "",
                  smtpServer: "smtp.example.com",
                  smtpPort: "587",
                  username: "",
                  password: ""
                }
              }
            ]);
            // 通知父组件有默认通知方式
            if (onNotificationChange) {
              onNotificationChange(true);
            }
          }
        } else {
          console.error('加载通知设置失败');
          if (onNotificationChange) {
            onNotificationChange(false);
          }
        }
      } catch (error) {
        console.error('加载通知设置出错:', error);
        if (onNotificationChange) {
          onNotificationChange(false);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadNotifications();
  }, [onNotificationChange]);
  
  // 新增通知配置
  const handleAddNotification = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!notificationName.trim()) {
      toast.error("请输入通知名称");
      return;
    }

    try {
      const config = getFormConfig(selectedType as NotificationType);
      const defaultForNewMonitors = document.getElementById('defaultForNewMonitors') as HTMLInputElement;
      const newNotification: Omit<NotificationConfig, 'id'> = {
        name: notificationName,
        type: selectedType as NotificationType,
        enabled: true,
        defaultForNewMonitors: defaultForNewMonitors?.checked || false,
        config,
      };

      // 发送到服务器
      const response = await fetch('/api/settings/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newNotification),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // 添加到本地状态
          const updatedNotifications = [...notifications, data.data];
          setNotifications(updatedNotifications);
          setIsAddModalOpen(false);
          
          // 重置表单
          resetForm();
          setNotificationName("");
          setSelectedType("邮件");
          
          toast.success("通知添加成功");
          
          // 通知父组件通知方式已添加
          if (onNotificationChange) {
            onNotificationChange(true);
          }
        } else {
          toast.error("添加通知失败：" + (data.message || "未知错误"));
        }
      } else {
        toast.error("添加通知失败：" + await response.text());
      }
    } catch (error) {
      console.error("添加通知失败:", error);
      toast.error("添加通知失败");
    }
  };
  
  // 编辑通知配置
  const handleEditNotification = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!notificationName.trim() || !currentEditingNotification) {
      toast.error("请输入通知名称");
      return;
    }

    try {
      const config = getFormConfig(selectedType as NotificationType);
      const defaultForNewMonitors = document.getElementById('defaultForNewMonitors') as HTMLInputElement;
      const updatedNotification: NotificationConfig = {
        ...currentEditingNotification,
        name: notificationName,
        type: selectedType as NotificationType,
        defaultForNewMonitors: defaultForNewMonitors?.checked || false,
        config,
      };

      // 发送到服务器
      const response = await fetch(`/api/settings/notifications/${currentEditingNotification.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedNotification),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // 更新本地状态
          const updatedNotifications = notifications.map(n => 
            (n.id === data.data.id ? data.data : n)
          );
          setNotifications(updatedNotifications);
          setCurrentEditingNotification(null);
          
          // 重置表单
          resetForm();
          setNotificationName("");
          setSelectedType("邮件");
          
          toast.success("通知更新成功");
          
          // 通知父组件通知方式仍然存在
          if (onNotificationChange) {
            onNotificationChange(updatedNotifications.length > 0);
          }
        } else {
          toast.error("更新通知失败：" + (data.message || "未知错误"));
        }
      } else {
        toast.error("更新通知失败：" + await response.text());
      }
    } catch (error) {
      console.error("更新通知失败:", error);
      toast.error("更新通知失败");
    }
  };
  
  // 获取表单配置
  const getFormConfig = (type: NotificationType): Record<string, unknown> => {
    // 从表单获取相应的值
    const form = document.getElementById('notification-form') as HTMLFormElement;
    if (!form) return getDefaultConfig(type);
    
    switch (type) {
      case "邮件": {
        const email = form.querySelector('input[name="email"]') as HTMLInputElement;
        const smtpServer = form.querySelector('input[name="smtpServer"]') as HTMLInputElement;
        const smtpPort = form.querySelector('input[name="smtpPort"]') as HTMLInputElement;
        const username = form.querySelector('input[name="username"]') as HTMLInputElement;
        const password = form.querySelector('input[name="password"]') as HTMLInputElement;
        
        return {
          email: email?.value || "",
          smtpServer: smtpServer?.value || "smtp.example.com",
          smtpPort: smtpPort?.value || "587",
          username: username?.value || "",
          password: password?.value || ""
        };
      }
      case "Webhook": {
        const url = form.querySelector('input[name="webhookUrl"]') as HTMLInputElement;
        return {
          url: url?.value || ""
        };
      }
      case "微信推送": {
        const pushUrl = form.querySelector('input[name="pushUrl"]') as HTMLInputElement;
        return {
          pushUrl: pushUrl?.value || "",
          titleTemplate: "酷监控 - {monitorName} 状态变更",
          contentTemplate: "## 监控状态变更通知\n\n- **监控名称**: {monitorName}\n- **监控类型**: {monitorType}\n- **当前状态**: {status}\n- **变更时间**: {time}\n\n{message}"
        };
      }
      default:
        return {};
    }
  };
  
  // 获取默认配置
  const getDefaultConfig = (type: NotificationType): Record<string, unknown> => {
    switch (type) {
      case "邮件":
        return {
          email: "",
          smtpServer: "smtp.example.com",
          smtpPort: "587",
          username: "",
          password: ""
        };
      case "Webhook":
        return {
          url: ""
        };
      case "微信推送":
        return {
          pushUrl: "",
          titleTemplate: "酷监控 - {monitorName} 状态变更",
          contentTemplate: "## 监控状态变更通知\n\n- **监控名称**: {monitorName}\n- **监控类型**: {monitorType}\n- **当前状态**: {status}\n- **变更时间**: {time}\n\n{message}"
        };
      default:
        return {};
    }
  };
  
  // 打开编辑模态框
  const openEditModal = (notification: NotificationConfig) => {
    setCurrentEditingNotification(notification);
    setSelectedType(notification.type);
    setNotificationName(notification.name);
  };
  
  // 删除通知配置
  const handleDeleteNotification = async (id: string) => {
    try {
      // 发送删除请求到服务器
      const response = await fetch(`/api/settings/notifications/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // 从本地状态中移除
        const updatedNotifications = notifications.filter(n => n.id !== id);
        setNotifications(updatedNotifications);
        console.log('通知渠道删除成功');
        
        // 通知父组件通知方式是否还存在
        if (onNotificationChange) {
          onNotificationChange(updatedNotifications.length > 0);
        }
      } else {
        console.error('删除通知渠道失败:', await response.text());
      }
    } catch (error) {
      console.error('删除通知渠道时出错:', error);
    }
  };
  
  // 切换通知开关
  const toggleNotificationEnabled = async (id: string) => {
    try {
      // 在本地更新状态
      const updatedNotifications = notifications.map(n => 
        n.id === id ? { ...n, enabled: !n.enabled } : n
      );
      setNotifications(updatedNotifications);
      
      // 发送到服务器
      const response = await fetch(`/api/settings/notifications/${id}`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        // 如果请求失败，恢复为原来的状态
        setNotifications(notifications);
        console.error('切换通知状态失败:', await response.text());
      }
    } catch (error) {
      // 如果出错，恢复为原来的状态
      setNotifications(notifications);
      console.error('切换通知状态时出错:', error);
    }
  };
  
  // 切换通知为默认选项
  const toggleDefaultForNewMonitors = async (id: string) => {
    try {
      // 在本地更新状态
      const updatedNotifications = notifications.map(n => {
        if (n.id === id) {
          return { ...n, defaultForNewMonitors: !n.defaultForNewMonitors };
        }
        // 可选：如果你希望同时只有一个默认通知，则取消其他通知的默认状态
        // if (n.defaultForNewMonitors && n.id !== id) {
        //   return { ...n, defaultForNewMonitors: false };
        // }
        return n;
      });
      setNotifications(updatedNotifications);
      
      // 发送到服务器
      const response = await fetch(`/api/settings/notifications/${id}/default`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        // 如果请求失败，恢复为原来的状态
        setNotifications(notifications);
        console.error('设置默认通知状态失败:', await response.text());
      }
    } catch (error) {
      // 如果出错，恢复为原来的状态
      setNotifications(notifications);
      console.error('设置默认通知状态时出错:', error);
    }
  };
  
  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setCurrentEditingNotification(null);
    setNotificationName("");
    setSelectedType("邮件");
    resetForm();
  };
  
  // 重置表单字段值
  const resetForm = () => {
    const form = document.getElementById('notification-form') as HTMLFormElement;
    if (!form) return;
    
    // 重置邮件表单
    const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement;
    if (emailInput) emailInput.value = "";
    
    const smtpServerInput = form.querySelector('input[name="smtpServer"]') as HTMLInputElement;
    if (smtpServerInput) smtpServerInput.value = "";
    
    const smtpPortInput = form.querySelector('input[name="smtpPort"]') as HTMLInputElement;
    if (smtpPortInput) smtpPortInput.value = "";
    
    const usernameInput = form.querySelector('input[name="username"]') as HTMLInputElement;
    if (usernameInput) usernameInput.value = "";
    
    const passwordInput = form.querySelector('input[name="password"]') as HTMLInputElement;
    if (passwordInput) passwordInput.value = "";
    
    // 重置Webhook表单
    const webhookUrlInput = form.querySelector('input[name="webhookUrl"]') as HTMLInputElement;
    if (webhookUrlInput) webhookUrlInput.value = "";
    
    // 重置微信推送表单
    const pushUrlInput = form.querySelector('input[name="pushUrl"]') as HTMLInputElement;
    if (pushUrlInput) pushUrlInput.value = "";
  };
  
  // 新增一个测试通知的函数
  const testNotification = async (notification: NotificationConfig) => {
    try {
      toast.loading("正在发送测试通知...");
      
      // 发送到服务器
      const response = await fetch(`/api/settings/notifications/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });
      
      toast.dismiss();
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success("测试通知发送成功！");
        } else {
          toast.error("测试通知失败：" + (data.message || "未知错误"));
        }
      } else {
        toast.error("测试通知失败：" + await response.text());
      }
    } catch (error) {
      toast.dismiss();
      console.error("测试通知失败:", error);
      toast.error("测试通知失败");
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-primary flex flex-col items-center">
          <i className="fas fa-spinner fa-spin fa-2x mb-3"></i>
          <span>正在加载通知设置...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold dark:text-foreground text-light-text-primary">通知设置</h3>
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCloseModal();
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center text-sm font-medium"
        >
          <i className="fas fa-plus mr-2"></i>
          添加通知方式
        </button>
      </div>
      
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-primary/20 rounded-lg bg-primary/5">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <i className="fas fa-bell text-2xl"></i>
          </div>
          <p className="text-sm dark:text-foreground/80 text-light-text-secondary mb-4">
            暂无通知配置，点击上方按钮添加通知方式
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div 
              key={notification.id} 
              className="border border-primary/10 rounded-lg p-4 bg-dark-nav/30 dark:bg-dark-nav/30 bg-light-nav/30 transition-all hover:border-primary/20"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full ${notification.enabled ? 'bg-primary/20' : 'bg-gray-500/20'} flex items-center justify-center mr-3`}>
                    <i className={`fas ${
                      notification.type === "邮件" ? "fa-envelope" :
                      notification.type === "Webhook" ? "fa-link" :
                      notification.type === "微信推送" ? "fa-weixin" :
                      "fa-paper-plane"
                    } ${notification.enabled ? 'text-primary' : 'text-gray-500'}`}></i>
                  </div>
                  <div>
                    <h4 className="text-md font-medium dark:text-foreground text-light-text-primary">{notification.name}</h4>
                    <p className="text-xs dark:text-foreground/60 text-light-text-secondary">
                      {notification.type}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      testNotification(notification);
                    }}
                    className="p-2 rounded-full hover:bg-green-500/10 text-green-400 transition-colors"
                    title="测试通知"
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleDefaultForNewMonitors(notification.id);
                    }}
                    className={`p-2 rounded-full transition-colors ${
                      notification.defaultForNewMonitors 
                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                        : 'hover:bg-yellow-500/10 text-gray-400'
                    }`}
                    title={notification.defaultForNewMonitors ? "默认选中" : "设为默认选中"}
                  >
                    <i className="fas fa-star"></i>
                  </button>
                  
                  <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
                    <input 
                      type="checkbox" 
                      id={`notification-${notification.id}`} 
                      className="absolute w-0 h-0 opacity-0"
                      checked={notification.enabled}
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleNotificationEnabled(notification.id);
                      }}
                    />
                    <label 
                      htmlFor={`notification-${notification.id}`} 
                      className="toggle-label block overflow-hidden h-6 rounded-full bg-primary/30 cursor-pointer"
                    >
                      <span className={`block h-6 w-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out toggle-dot ${notification.enabled ? 'translate-x-6' : ''}`}></span>
                    </label>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openEditModal(notification);
                    }}
                    className="p-2 rounded-full hover:bg-primary/10 dark:text-foreground text-light-text-primary transition-colors"
                  >
                    <i className="fas fa-cog"></i>
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteNotification(notification.id);
                    }}
                    className="p-2 rounded-full hover:bg-red-500/10 text-red-400 transition-colors"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              
              {notification.enabled && notification.type === "邮件" && (
                <div className="mt-3 pl-11 text-sm dark:text-foreground/80 text-light-text-secondary bg-primary/5 p-2 rounded-lg">
                  <p>SMTP: {String(notification.config.smtpServer)}:{String(notification.config.smtpPort)}</p>
                  <p>
                    接收邮箱: {String(notification.config.email) || "未设置"}
                  </p>
                  {notification.defaultForNewMonitors && (
                    <p className="mt-1 text-xs text-yellow-400 flex items-center">
                      <i className="fas fa-star mr-1"></i>
                      新增监控项时默认选中此通知
                    </p>
                  )}
                </div>
              )}
              
              {notification.enabled && notification.type === "Webhook" && (
                <div className="mt-3 pl-11 text-sm dark:text-foreground/80 text-light-text-secondary bg-primary/5 p-2 rounded-lg">
                  <p>Webhook URL: {String(notification.config.url) || "未设置"}</p>
                  {notification.defaultForNewMonitors && (
                    <p className="mt-1 text-xs text-yellow-400 flex items-center">
                      <i className="fas fa-star mr-1"></i>
                      新增监控项时默认选中此通知
                    </p>
                  )}
                </div>
              )}
              
              {notification.enabled && notification.type === "微信推送" && (
                <div className="mt-3 pl-11 text-sm dark:text-foreground/80 text-light-text-secondary bg-primary/5 p-2 rounded-lg">
                  <p>推送地址: <span className="font-mono text-xs">{String(notification.config.pushUrl) || "未设置"}</span></p>
                  <p className="mt-1 text-xs dark:text-foreground/60 text-light-text-secondary flex items-center">
                    <i className="fas fa-info-circle mr-1 text-primary"></i>
                    消息将以 Markdown 格式推送到 ShowDoc 推送服务
                  </p>
                  {notification.defaultForNewMonitors && (
                    <p className="mt-1 text-xs text-yellow-400 flex items-center">
                      <i className="fas fa-star mr-1"></i>
                      新增监控项时默认选中此通知
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* 添加/编辑通知方式模态框 */}
      {(isAddModalOpen || currentEditingNotification) && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4">
          <div className="bg-dark-card dark:bg-dark-card bg-light-card w-full max-w-xl rounded-xl shadow-2xl border border-primary/25 animate-fadeIn">
            <div className="flex justify-between items-center p-5 border-b border-primary/10">
              <h3 className="text-lg font-medium dark:text-foreground text-light-text-primary">
                {currentEditingNotification ? "编辑通知方式" : "添加通知方式"}
              </h3>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCloseModal();
                }}
                className="p-2 rounded-full hover:bg-primary/10 dark:text-foreground text-light-text-primary transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div id="notification-form" className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium dark:text-foreground text-light-text-primary">通知类型</label>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {(["邮件", "Webhook", "微信推送"] as NotificationType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedType(type);
                      }}
                      className={`px-4 py-2 rounded-lg flex items-center justify-center transition-all ${
                        selectedType === type 
                          ? "bg-primary text-white shadow-md" 
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      }`}
                    >
                      <i className={`fas ${
                        type === "邮件" ? "fa-envelope" :
                        type === "Webhook" ? "fa-link" :
                        "fa-weixin"
                      } mr-2`}></i>
                      <span>{type}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium dark:text-foreground text-light-text-primary">通知名称</label>
                <input 
                  type="text" 
                  name="notificationName"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  placeholder="例如: 系统邮件通知"
                  value={notificationName}
                  onChange={(e) => setNotificationName(e.target.value)}
                />
                <p className="mt-1 text-xs dark:text-foreground text-light-text-secondary">
                  通知名称将显示在列表中，便于识别不同的通知方式
                </p>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox"
                  id="defaultForNewMonitors"
                  className="w-4 h-4 text-primary bg-dark-nav dark:bg-dark-nav bg-light-nav border-primary/30 rounded focus:ring-primary/30"
                  defaultChecked={currentEditingNotification?.defaultForNewMonitors || true}
                />
                <label 
                  htmlFor="defaultForNewMonitors" 
                  className="ml-2 text-sm dark:text-foreground text-light-text-primary"
                >
                  新增监控项时默认开启此通知
                </label>
              </div>
              
              {/* 邮件通知配置项 */}
              {selectedType === "邮件" && (
                <>
                  <div>
                    <label className="text-xs font-medium dark:text-foreground text-light-text-primary">接收邮箱地址</label>
                    <input 
                      type="email" 
                      name="email"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="example@domain.com"
                      defaultValue={currentEditingNotification?.config?.email as string || ""}
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium dark:text-foreground text-light-text-primary">SMTP 服务器</label>
                    <input 
                      type="text" 
                      name="smtpServer"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="smtp.example.com"
                      defaultValue={currentEditingNotification?.config?.smtpServer as string || ""}
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium dark:text-foreground text-light-text-primary">SMTP 端口</label>
                    <input 
                      type="text" 
                      name="smtpPort"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="587"
                      defaultValue={currentEditingNotification?.config?.smtpPort as string || ""}
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium dark:text-foreground text-light-text-primary">SMTP 用户名</label>
                    <input 
                      type="text" 
                      name="username"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="username"
                      defaultValue={currentEditingNotification?.config?.username as string || ""}
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium dark:text-foreground text-light-text-primary">SMTP 密码</label>
                    <input 
                      type="password" 
                      name="password"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="••••••••"
                      defaultValue={currentEditingNotification?.config?.password as string || ""}
                    />
                  </div>
                </>
              )}
              
              {/* Webhook类型配置表单 */}
              {selectedType === "Webhook" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium dark:text-foreground text-light-text-primary">Webhook URL</label>
                    <input 
                      type="url" 
                      name="webhookUrl"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="https://example.com/webhook"
                      defaultValue={currentEditingNotification?.config?.url as string || ""}
                    />
                    <p className="mt-1 text-xs dark:text-foreground text-light-text-secondary">
                      接收通知的URL地址
                    </p>
                  </div>
                  
                  {/* 添加Webhook数据格式说明 */}
                  <div className="mt-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <h3 className="text-sm font-medium mb-3 dark:text-foreground text-light-text-primary">Webhook通知数据格式</h3>
                    <div className="overflow-x-auto">
                      <pre className="text-xs bg-dark-nav/70 dark:bg-dark-nav/70 bg-light-nav/70 p-3 rounded-md whitespace-pre">
{`{
  "event": "status_change",
  "timestamp": "2093-09-28T08:15:30.123Z",
  "monitor": {
    "name": "监控项名称",
    "type": "http",
    "status": "UP",             // 英文状态: UP, DOWN, PENDING
    "status_text": "正常",       // 中文状态: 正常, 异常, 等待
    "time": "2093-09-28 16:15:30",
    "message": "监控详细信息"
  },
  "failure_info": {              // 仅在状态为DOWN时存在
    "count": 5,                  // 失败次数
    "first_failure_time": "2093-09-28 16:00:30",
    "last_failure_time": "2093-09-28 16:15:30",
    "duration_minutes": 15       // 失败持续时间(分钟)
  }
}`}
                      </pre>
                    </div>
                    <p className="text-xs mt-3 dark:text-foreground/60 text-light-text-secondary">系统通过POST请求发送JSON格式数据，Content-Type为application/json</p>
                  </div>
                </div>
              )}
              
              {/* 微信推送配置项 */}
              {selectedType === "微信推送" && (
                <div>
                  <label className="text-xs font-medium dark:text-foreground text-light-text-primary">微信推送URL</label>
                  <input 
                    type="url" 
                    name="pushUrl"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="https://push.showdoc.com.cn/xxxxxx"
                    defaultValue={currentEditingNotification?.config?.pushUrl as string || ""}
                  />
                  <p className="mt-1 text-xs dark:text-foreground text-light-text-secondary">
                    请输入您的ShowDoc推送服务专属URL
                  </p>
                  <div className="mt-3 p-3 rounded-lg bg-primary/5">
                    <div className="flex items-center text-xs dark:text-foreground/70 text-light-text-secondary mb-2">
                      <i className="fas fa-info-circle text-primary mr-2"></i>
                      <span>ShowDoc推送服务使用说明</span>
                    </div>
                    <ol className="text-xs dark:text-foreground/70 text-light-text-secondary list-decimal pl-5 space-y-1">
                      <li>前往 <a href="https://push.showdoc.com.cn" target="_blank" className="text-primary hover:underline">https://push.showdoc.com.cn</a> 获取您的专属推送地址</li>
                      <li>将完整URL复制到上方输入框中</li>
                      <li>系统将通过该URL推送监控告警信息到您的微信</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end p-5 bg-dark-nav/50 dark:bg-dark-nav/50 bg-light-nav/50 border-t border-primary/10">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCloseModal();
                }}
                className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors mr-3"
              >
                取消
              </button>
              
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const config = getFormConfig(selectedType as NotificationType);
                  const testNotificationObj: NotificationConfig = {
                    id: currentEditingNotification?.id || "temp-" + Date.now(),
                    name: notificationName || "测试通知",
                    type: selectedType as NotificationType,
                    enabled: true,
                    defaultForNewMonitors: currentEditingNotification?.defaultForNewMonitors || true,
                    config,
                  };
                  testNotification(testNotificationObj);
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors mr-3 flex items-center"
                disabled={!notificationName.trim()}
              >
                <i className="fas fa-paper-plane mr-2"></i>
                测试通知
              </button>
              
              <button 
                onClick={currentEditingNotification ? handleEditNotification : handleAddNotification}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {currentEditingNotification ? "保存更改" : "添加通知"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 