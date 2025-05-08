import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { NotificationSettings } from "@/components/settings/notification-settings";

interface NotificationConfig {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  defaultForNewMonitors?: boolean;
  config: Record<string, unknown>;
}

interface MonitorNotificationBinding {
  notificationId: string;
  enabled: boolean;
}

interface NotificationSectionProps {
  initialBindings?: MonitorNotificationBinding[];
  onBindingsChange?: (bindings: MonitorNotificationBinding[]) => void;
  monitorId?: string;
}

export function NotificationSection({ 
  initialBindings = [], 
  onBindingsChange,
  monitorId
}: NotificationSectionProps) {
  const [availableNotifications, setAvailableNotifications] = useState<NotificationConfig[]>([]);
  const [selectedNotifications, setSelectedNotifications] = useState<MonitorNotificationBinding[]>(initialBindings);
  const [isLoading, setIsLoading] = useState(true);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const initialRender = useRef(true);
  const initialBindingsJSON = JSON.stringify(initialBindings);
  const isNewMonitor = !monitorId;
  
  // 只在初始渲染和initialBindings深度变化时更新selectedNotifications
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    
    const currentSelectedJSON = JSON.stringify(selectedNotifications);
    if (initialBindingsJSON !== currentSelectedJSON) {
      setSelectedNotifications(initialBindings);
    }
  }, [initialBindingsJSON]);
  
  // 加载通知方式并处理默认选中（仅新建模式）
  useEffect(() => {
    loadNotifications();
  }, []);
  
  // 当可用通知列表更新时，自动处理默认选中
  useEffect(() => {
    if (isNewMonitor && !isLoading && availableNotifications.length > 0) {
      const defaultNotifications = availableNotifications
        .filter(n => n.enabled && n.defaultForNewMonitors)
        .map(n => ({ notificationId: n.id, enabled: true }));
      
      if (defaultNotifications.length > 0) {
        const currentIds = selectedNotifications.map(n => n.notificationId);
        const newNotifications = defaultNotifications.filter(n => !currentIds.includes(n.notificationId));
        
        if (newNotifications.length > 0) {
          const updatedNotifications = [...selectedNotifications, ...newNotifications];
          setSelectedNotifications(updatedNotifications);
          
          if (onBindingsChange) {
            onBindingsChange(updatedNotifications);
          }
        }
      }
    }
  }, [availableNotifications, isNewMonitor, isLoading, onBindingsChange, selectedNotifications]);
  
  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/notifications');
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setAvailableNotifications(data.data);
          return data.data.length > 0;
        }
      }
      setAvailableNotifications([]);
      return false;
    } catch (error) {
      console.error('加载通知设置失败:', error);
      toast.error('无法加载通知设置');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshNotifications = () => {
    setIsLoading(true);
    fetch('/api/settings/notifications')
      .then(response => response.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          const newNotifications = data.data;
          setAvailableNotifications(newNotifications);
          
          // 找出新添加的通知并自动选中
          if (newNotifications.length > 0) {
            const currentSelectedIds = selectedNotifications.map(n => n.notificationId);
            const newlyAddedNotifications = newNotifications
              .filter(n => !currentSelectedIds.includes(n.id) && n.enabled)
              .map(n => ({ notificationId: n.id, enabled: true }));
            
            if (newlyAddedNotifications.length > 0) {
              const updatedSelectedNotifications = [...selectedNotifications, ...newlyAddedNotifications];
              setSelectedNotifications(updatedSelectedNotifications);
              
              if (onBindingsChange) {
                onBindingsChange(updatedSelectedNotifications);
              }
            }
          }
        }
      })
      .catch(error => {
        console.error('加载通知设置失败:', error);
        toast.error('无法加载通知设置');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  const handleNotificationToggle = (notificationId: string, checked: boolean) => {
    const newSelectedNotifications = [...selectedNotifications];
    const existingIndex = newSelectedNotifications.findIndex(n => n.notificationId === notificationId);
    
    if (existingIndex >= 0) {
      newSelectedNotifications[existingIndex].enabled = checked;
    } else {
      newSelectedNotifications.push({
        notificationId,
        enabled: checked
      });
    }
    
    setSelectedNotifications(newSelectedNotifications);
    
    if (onBindingsChange) {
      onBindingsChange(newSelectedNotifications);
    }
  };
  
  const isNotificationSelected = (notificationId: string): boolean => {
    const binding = selectedNotifications.find(n => n.notificationId === notificationId);
    if (binding) {
      return binding.enabled;
    }
    
    if (isNewMonitor) {
      const notification = availableNotifications.find(n => n.id === notificationId);
      return !!notification?.enabled && !!notification?.defaultForNewMonitors;
    }
    
    return false;
  };
  
  const getIconForType = (type: string): string => {
    switch (type) {
      case "邮件": return "fa-envelope";
      case "Webhook": return "fa-link";
      case "微信推送": return "fa-weixin";
      default: return "fa-bell";
    }
  };
  
  const openManageModal = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsManageModalOpen(true);
  };
  
  const handleCompleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsManageModalOpen(false);
    
    // 从无通知状态添加通知后，确保选中第一个通知
    let needRefresh = true;
    if (availableNotifications.length === 0) {
      needRefresh = false;
      // 当前无通知配置，需要特殊处理
      fetch('/api/settings/notifications')
        .then(response => response.json())
        .then(data => {
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setAvailableNotifications(data.data);
            
            // 自动选中所有启用的通知
            const notificationsToSelect = data.data
              .filter(n => n.enabled)
              .map(n => ({ notificationId: n.id, enabled: true }));
            
            if (notificationsToSelect.length > 0) {
              setSelectedNotifications(notificationsToSelect);
              
              if (onBindingsChange) {
                onBindingsChange(notificationsToSelect);
              }
            }
          }
        })
        .catch(error => {
          console.error('加载通知设置失败:', error);
          toast.error('无法加载通知设置');
          needRefresh = true;
        })
        .finally(() => {
          setIsLoading(false);
          if (needRefresh) refreshNotifications();
        });
    } else {
      refreshNotifications();
    }
  };
  
  const handleCancelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsManageModalOpen(false);
    
    // 与handleCompleteClick保持一致的逻辑
    if (availableNotifications.length === 0) {
      fetch('/api/settings/notifications')
        .then(response => response.json())
        .then(data => {
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setAvailableNotifications(data.data);
            
            // 自动选中所有启用的通知
            const notificationsToSelect = data.data
              .filter(n => n.enabled)
              .map(n => ({ notificationId: n.id, enabled: true }));
            
            if (notificationsToSelect.length > 0) {
              setSelectedNotifications(notificationsToSelect);
              
              if (onBindingsChange) {
                onBindingsChange(notificationsToSelect);
              }
            }
          }
        })
        .catch(error => {
          console.error('加载通知设置失败:', error);
          toast.error('无法加载通知设置');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      refreshNotifications();
    }
  };
  
  const renderNotificationSettings = () => (
    <NotificationSettings 
      onNotificationChange={(hasNotifications) => {
        console.log('通知设置已更改, 是否有通知:', hasNotifications);
      }} 
    />
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="text-primary flex flex-col items-center">
          <i className="fas fa-spinner fa-spin text-xl mb-2"></i>
          <span className="text-sm">正在加载通知设置...</span>
        </div>
      </div>
    );
  }

  if (availableNotifications.length === 0) {
    return (
      <div className="p-5 border border-primary/10 rounded-lg">
        <h3 className="text-lg font-medium mb-4 text-primary">通知设置</h3>
        <div className="flex flex-col items-center justify-center py-6 bg-primary/5 rounded-lg">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
            <i className="fas fa-bell text-xl"></i>
          </div>
          <p className="text-foreground/80 mb-4 text-center">
            尚未配置任何通知方式
          </p>
          <button 
            onClick={(e) => openManageModal(e)}
            className="px-4 py-2 bg-primary text-white rounded-button hover:bg-primary/90 transition-colors text-sm flex items-center"
          >
            <i className="fas fa-plus mr-2"></i>
            添加通知方式
          </button>
        </div>
        
        {/* 通知管理模态框 */}
        {isManageModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4">
            <div className="bg-dark-card dark:bg-dark-card bg-light-card w-full max-w-4xl rounded-xl shadow-2xl border border-primary/25 animate-fadeIn overflow-auto max-h-[90vh]">
              <div className="flex justify-between items-center p-5 border-b border-primary/10 sticky top-0 bg-dark-card dark:bg-dark-card bg-light-card z-10">
                <h3 className="text-lg font-medium dark:text-foreground text-light-text-primary">
                  管理通知方式
                </h3>
                <button 
                  onClick={handleCancelClick}
                  className="p-2 rounded-full hover:bg-primary/10 dark:text-foreground text-light-text-primary transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="p-5">
                {renderNotificationSettings()}
              </div>
              
              <div className="flex justify-end p-5 bg-dark-nav/50 dark:bg-dark-nav/50 bg-light-nav/50 border-t border-primary/10 sticky bottom-0">
                <button 
                  onClick={handleCancelClick}
                  className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors mr-3"
                >
                  取消
                </button>
                <button 
                  onClick={handleCompleteClick}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  完成
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-5 border border-primary/10 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-primary">通知设置</h3>
        <div className="flex items-center space-x-2">
          <button 
            onClick={(e) => openManageModal(e)}
            className="text-primary hover:text-primary/80 text-sm flex items-center"
          >
            <i className="fas fa-cog mr-1"></i>
            管理通知
          </button>
        </div>
      </div>
      
      <p className="text-foreground/70 mb-4">
        选择当前监控项触发告警时要通知的方式
      </p>
      
      <div className="space-y-3">
        {availableNotifications.map((notification) => (
          <div 
            key={notification.id} 
            className={`flex items-center justify-between p-3 border ${
              isNotificationSelected(notification.id)
                ? 'border-primary/30 bg-primary/5' 
                : 'border-primary/10'
            } rounded-lg transition-colors`}
          >
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id={`notification-${notification.id}`}
                className="w-4 h-4 text-primary border-primary/30 focus:ring-primary"
                checked={isNotificationSelected(notification.id)}
                onChange={(e) => handleNotificationToggle(notification.id, e.target.checked)}
                disabled={!notification.enabled}
              />
              <div className={`flex items-center ${!notification.enabled ? 'opacity-50' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                  <i className={`fas ${getIconForType(notification.type)} text-primary`}></i>
                </div>
                <div>
                  <label 
                    htmlFor={`notification-${notification.id}`} 
                    className="font-medium text-foreground/80 cursor-pointer"
                  >
                    {notification.name}
                  </label>
                  <p className="text-xs text-foreground/60">
                    {notification.type}
                    {!notification.enabled && ' (已禁用)'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-xs text-foreground/60 bg-dark-nav/30 p-3 rounded-lg">
        <p className="flex items-center">
          <i className="fas fa-info-circle text-primary mr-2"></i>
          您可以通过&ldquo;管理通知&rdquo;添加、编辑和删除通知配置
        </p>
      </div>
      
      {/* 通知管理模态框 */}
      {isManageModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4">
          <div className="bg-dark-card dark:bg-dark-card bg-light-card w-full max-w-4xl rounded-xl shadow-2xl border border-primary/25 animate-fadeIn overflow-auto max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-primary/10 sticky top-0 bg-dark-card dark:bg-dark-card bg-light-card z-10">
              <h3 className="text-lg font-medium dark:text-foreground text-light-text-primary">
                管理通知方式
              </h3>
              <button 
                onClick={handleCancelClick}
                className="p-2 rounded-full hover:bg-primary/10 dark:text-foreground text-light-text-primary transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="p-5">
              {renderNotificationSettings()}
            </div>
            
            <div className="flex justify-end p-5 bg-dark-nav/50 dark:bg-dark-nav/50 bg-light-nav/50 border-t border-primary/10 sticky bottom-0">
              <button 
                onClick={handleCancelClick}
                className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors mr-3"
              >
                取消
              </button>
              <button 
                onClick={handleCompleteClick}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 