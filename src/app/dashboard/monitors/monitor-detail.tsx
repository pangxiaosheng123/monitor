import { useState, useEffect, useRef } from "react";
import * as echarts from 'echarts/core';
import {
  LineChart,
  LineSeriesOption
} from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  GridComponentOption,
  TooltipComponentOption,
  TitleComponentOption,
  ToolboxComponent,
  LegendComponent
} from 'echarts/components';
import {
  CanvasRenderer
} from 'echarts/renderers';
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MonitorForm } from "./monitor-form";

// 注册必须的组件
echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  CanvasRenderer,
  ToolboxComponent,
  LegendComponent
]);

// 图表配置类型
type ECOption = echarts.ComposeOption<
  LineSeriesOption | 
  GridComponentOption | 
  TooltipComponentOption |
  TitleComponentOption
>;

// 监控历史记录接口
interface MonitorHistoryRecord {
  id: string;
  status: number;
  message?: string;
  ping?: number;
  timestamp: string;
}

// 监控详情接口
interface MonitorDetailInfo {
  id: string;
  name: string;
  type: string;
  active: boolean;
  config: Record<string, string | number | boolean | null>;
  interval: number;
  lastStatus?: number;
  lastCheckAt?: string;
  statusHistory: MonitorHistoryRecord[];
  createdAt?: string;
}

type MonitorDetailProps = {
  id: string;
  name: string;
  type: string;
  // 扩展的详细信息
  status?: string;
  uptime?: string;
  availability?: string;
  responseTime?: string;
  url?: string;
  message?: string;
};

export function MonitorDetail({ 
  id, 
  name, 
  type, 
  status = "正常", 
  uptime = "99.9%", 
  availability = "100%", 
  responseTime = "2ms"
}: MonitorDetailProps) {
  const [timeRange, setTimeRange] = useState("2h");
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [monitorDetails, setMonitorDetails] = useState<MonitorDetailInfo | null>(null);
  const [historyData, setHistoryData] = useState<MonitorHistoryRecord[]>([]);
  const [statusPoints, setStatusPoints] = useState<string[]>([]);
  const [maxStatusPoints, setMaxStatusPoints] = useState(20); // 默认状态点数量
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [calculatedUptime, setCalculatedUptime] = useState(uptime);
  const [calculatedAvailability, setCalculatedAvailability] = useState(availability);
  const router = useRouter();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);
  const statusContainerRef = useRef<HTMLDivElement>(null);
  
  // 状态圆点样式
  const getStatusDotClass = (status: string) => {
    switch (status) {
      case "success": 
        return "bg-success";
      case "error": 
        return "bg-error";
      case "warning": 
        return "bg-warning";
      case "primary": 
        return "bg-primary";
      default: 
        return "bg-foreground/50";
    }
  };

  // 获取监控项的状态样式
  const getMonitorStatusClass = (status: string) => {
    switch (status) {
      case "正常":
        return "text-success";
      case "故障":
        return "text-error";
      case "维护":
        return "text-primary";
      case "未知":
        return "text-warning";
      case "暂停":
        return "text-foreground/50";
      default:
        return "text-foreground/50";
    }
  };

  // 获取监控项的状态点颜色
  const getMonitorStatusDotClass = (status: string) => {
    switch (status) {
      case "正常":
        return "bg-success";
      case "故障":
        return "bg-error";
      case "维护":
        return "bg-primary";
      case "未知":
        return "bg-warning";
      case "暂停":
        return "bg-foreground/50";
      default:
        return "bg-foreground/50";
    }
  };

  // 生成图表数据
  const prepareChartData = (history: MonitorHistoryRecord[], range: string) => {
    if (!history || history.length === 0) {
      // 如果没有历史数据，返回空数据
      return {
        data: [],
        labels: []
      };
    }

    // 根据时间范围过滤历史数据
    const now = new Date();
    let filteredHistory = [...history].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    let timeAgo: Date;
    switch(range) {
      case "2h":
        timeAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        break;
      case "24h":
        timeAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        timeAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        timeAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    }
    
    filteredHistory = filteredHistory.filter(item => 
      new Date(item.timestamp) >= timeAgo
    );
    
    // 如果过滤后没有数据，返回空数据
    if (filteredHistory.length === 0) {
      return {
        data: [],
        labels: []
      };
    }
    
    // 准备数据
    const data = filteredHistory.map(item => item.ping || 0);
    const labels = filteredHistory.map(item => {
      const date = new Date(item.timestamp);
      
      if (range === "2h" || range === "24h") {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      } else {
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }
    });
    
    return { data, labels };
  };

  // 计算在线时间率
  const calculateUptime = (history: MonitorHistoryRecord[]) => {
    if (!history || history.length === 0) {
      return "100%";
    }
    
    // 统计成功的检查次数
    const totalChecks = history.length;
    const successChecks = history.filter(record => record.status === 1).length;
    
    // 计算在线率，如果有监控记录但没有失败记录，则返回100%
    if (successChecks === totalChecks) {
      return "100%";
    }
    
    // 计算在线率百分比
    const uptimePercentage = (successChecks / totalChecks) * 100;
    return uptimePercentage.toFixed(1) + "%";
  };

  // 计算可用性（考虑最近24小时的检查）
  const calculateAvailability = (history: MonitorHistoryRecord[]) => {
    if (!history || history.length === 0) {
      return "100%";
    }
    
    // 获取最近24小时的历史记录
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentHistory = history.filter(item => 
      new Date(item.timestamp) >= oneDayAgo
    );
    
    if (recentHistory.length === 0) {
      return "100%";
    }
    
    // 统计成功的检查次数
    const totalChecks = recentHistory.length;
    const successChecks = recentHistory.filter(record => record.status === 1).length;
    
    // 计算可用性百分比
    if (successChecks === totalChecks) {
      return "100%";
    }
    
    const availabilityPercentage = (successChecks / totalChecks) * 100;
    return availabilityPercentage.toFixed(1) + "%";
  };

  // 根据屏幕宽度调整状态点数量
  useEffect(() => {
    const updateStatusPointsCount = () => {
      const containerWidth = statusContainerRef.current?.clientWidth || 0;
      // 每个状态点占据的空间 (点的宽度 + 间距)
      const pointSpace = 18; // 2.5px宽度 + 约15.5px间距
      // 计算可以容纳的最大点数量
      const maxPoints = Math.floor(containerWidth / pointSpace);
      // 设置最小显示5个点，最大不超过30个
      setMaxStatusPoints(Math.max(5, Math.min(30, maxPoints)));
    };

    // 初始计算
    updateStatusPointsCount();
    
    // 监听窗口大小变化
    window.addEventListener('resize', updateStatusPointsCount);
    
    return () => {
      window.removeEventListener('resize', updateStatusPointsCount);
    };
  }, []);

  // 获取监控项详情和历史数据
  const fetchMonitorHistory = async (range: string) => {
    if (!id) return;
    
    try {
      const response = await fetch(`/api/monitors/${id}/history?range=${range}`);
      if (response.ok) {
        const data = await response.json();
        setHistoryData(data);
        
        // 更新状态点，限制数量为当前计算的最大值
        const statusPoints = data.slice(0, maxStatusPoints).map((record: MonitorHistoryRecord) => 
          record.status === 1 ? "success" : "error"
        ).reverse();
        setStatusPoints(statusPoints);
        
        // 计算在线时间和可用性
        setCalculatedUptime(calculateUptime(data));
        setCalculatedAvailability(calculateAvailability(data));
        
        // 更新图表
        updateChart(data, range);
      }
    } catch (error) {
      console.error("获取监控历史数据失败", error);
    }
  };

  // 更新图表数据
  const updateChart = (history: MonitorHistoryRecord[], range: string) => {
    if (!chartInstance.current || !chartRef.current) return;
    
    const { data, labels } = prepareChartData(history, range);
    
    const option: ECOption = {
      animation: false,
      grid: {
        top: 20,
        right: 20,
        bottom: 40,
        left: 60,
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        formatter: '{b}<br />{a}: {c} ms',
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        borderColor: 'rgba(99, 102, 241, 0.3)',
        textStyle: {
          color: '#f1f5f9'
        }
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels,
        axisLine: {
          lineStyle: {
            color: 'rgba(203, 213, 225, 0.2)'
          }
        },
        axisLabel: {
          color: 'rgba(203, 213, 225, 0.6)',
          rotate: range === '30d' ? 45 : 0,
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        axisLine: {
          lineStyle: {
            color: 'rgba(203, 213, 225, 0.2)'
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(203, 213, 225, 0.1)'
          }
        },
        axisLabel: {
          color: 'rgba(203, 213, 225, 0.6)',
          formatter: '{value} ms'
        }
      },
      series: [{
        name: '响应时间',
        data: data,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: '#6366F1'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
            offset: 0,
            color: 'rgba(99, 102, 241, 0.3)'
          }, {
            offset: 1,
            color: 'rgba(99, 102, 241, 0)'
          }])
        }
      }]
    };
    
    chartInstance.current.setOption(option);
  };

  // 初始化定时刷新
  useEffect(() => {
    // 清除之前的定时器
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
    }
    
    // 设置新的定时器
    refreshTimer.current = setInterval(() => {
      fetchMonitorHistory(timeRange);
    }, 60000); // 每60秒刷新一次
    
    // 组件卸载时清除定时器
    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, [id, timeRange]);

  // 初始化图表
  useEffect(() => {
    if (chartRef.current && !isEditFormOpen) {
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
      
      chartInstance.current = echarts.init(chartRef.current);
      fetchMonitorHistory(timeRange);
    }
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
    };
  }, [id, isEditFormOpen]);

  // 处理时间范围切换
  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    fetchMonitorHistory(range);
  };

  // 当最大点数变化时更新状态点
  useEffect(() => {
    if (historyData.length > 0) {
      const statusPoints = historyData.slice(0, maxStatusPoints).map((record: MonitorHistoryRecord) => 
        record.status === 1 ? "success" : "error"
      ).reverse();
      setStatusPoints(statusPoints);
    }
  }, [maxStatusPoints, historyData]);

  // 获取监控项详情和历史数据
  useEffect(() => {
    const fetchMonitorDetails = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/monitors/${id}`);
        if (response.ok) {
          const data = await response.json();
          setMonitorDetails(data);
          setIsPaused(!data.active);
          
          // 设置历史记录
          if (data.statusHistory && data.statusHistory.length > 0) {
            setHistoryData(data.statusHistory);
            
            // 生成状态点数据，使用当前计算的最大值
            const statusPoints = data.statusHistory.slice(0, maxStatusPoints).map((record: MonitorHistoryRecord) => 
              record.status === 1 ? "success" : "error"
            ).reverse();
            
            setStatusPoints(statusPoints);
            
            // 计算在线时间和可用性
            setCalculatedUptime(calculateUptime(data.statusHistory));
            setCalculatedAvailability(calculateAvailability(data.statusHistory));
          } else {
            // 如果没有历史记录，使用空数组
            setStatusPoints([]);
          }
        } else {
          const errorData = await response.json();
          toast.error(`获取监控详情失败: ${errorData.error || '未知错误'}`);
        }
      } catch (error) {
        console.error("获取监控详情失败", error);
        toast.error("获取监控详情失败，请稍后重试");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMonitorDetails();
  }, [id, maxStatusPoints]);

  // 处理窗口大小变化，重新调整图表大小
  useEffect(() => {
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // 处理暂停/恢复监控
  const handlePauseToggle = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/monitors/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: isPaused }), // 如果当前是暂停状态，则激活；反之则暂停
      });
      
      if (response.ok) {
        setIsPaused(!isPaused);
        
        // 更新monitorDetails中的active状态
        if (monitorDetails) {
          setMonitorDetails({
            ...monitorDetails,
            active: isPaused
          });
        }
        
        toast.success(isPaused ? '监控已恢复' : '监控已暂停');
        
        // 刷新监控详情
        setTimeout(() => {
          fetch(`/api/monitors/${id}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              if (data) {
                setMonitorDetails(data);
              }
            })
            .catch(err => console.error('刷新监控详情失败', err));
        }, 500);
      } else {
        const error = await response.json();
        toast.error(`操作失败: ${error.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('更新监控状态失败:', error);
      toast.error('操作失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 处理编辑监控
  const handleEdit = () => {
    if (!id) return;
    
    // 打开编辑表单前，销毁图表实例
    if (chartInstance.current) {
      chartInstance.current.dispose();
      chartInstance.current = null;
    }
    
    // 打开编辑表单
    setIsEditFormOpen(true);
  };
  
  // 处理删除监控
  const handleDelete = async () => {
    // 在打开确认对话框前，销毁图表实例
    if (chartInstance.current) {
      chartInstance.current.dispose();
      chartInstance.current = null;
    }
    
    // 打开确认对话框
    setShowDeleteDialog(true);
  };
  
  // 处理取消删除
  const handleCancelDelete = () => {
    // 关闭确认对话框
    setShowDeleteDialog(false);
    
    // 重新初始化图表
    setTimeout(() => {
      if (chartRef.current && !chartInstance.current) {
        const { data, labels } = prepareChartData(historyData, timeRange);
        chartInstance.current = echarts.init(chartRef.current);
        
        const option: ECOption = {
          animation: false,
          grid: {
            top: 20,
            right: 20,
            bottom: 40,
            left: 60,
            containLabel: true
          },
          tooltip: {
            trigger: 'axis',
            formatter: '{b}<br />{a}: {c} ms',
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            borderColor: 'rgba(99, 102, 241, 0.3)',
            textStyle: {
              color: '#f1f5f9'
            }
          },
          xAxis: {
            type: 'category',
            boundaryGap: false,
            data: labels,
            axisLine: {
              lineStyle: {
                color: 'rgba(203, 213, 225, 0.2)'
              }
            },
            axisLabel: {
              color: 'rgba(203, 213, 225, 0.6)',
              rotate: timeRange === '30d' ? 45 : 0,
              fontSize: 10
            }
          },
          yAxis: {
            type: 'value',
            min: 0,
            axisLine: {
              lineStyle: {
                color: 'rgba(203, 213, 225, 0.2)'
              }
            },
            splitLine: {
              lineStyle: {
                color: 'rgba(203, 213, 225, 0.1)'
              }
            },
            axisLabel: {
              color: 'rgba(203, 213, 225, 0.6)',
              formatter: '{value} ms'
            }
          },
          series: [{
            name: '响应时间',
            data: data,
            type: 'line',
            smooth: true,
            symbol: 'none',
            lineStyle: {
              color: '#6366F1'
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                offset: 0,
                color: 'rgba(99, 102, 241, 0.3)'
              }, {
                offset: 1,
                color: 'rgba(99, 102, 241, 0)'
              }])
            }
          }]
        };
        
        chartInstance.current.setOption(option);
      }
    }, 300);
  };
  
  // 确认删除
  const confirmDelete = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/monitors/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast.success('监控项已删除');
        
        // 关闭确认对话框
        setShowDeleteDialog(false);
        
        // 短暂延迟后跳转，让用户有时间看到成功提示
        setTimeout(() => {
          router.push('/dashboard'); // 删除成功后返回仪表板
          
          // 强制刷新页面，确保数据重新加载
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }, 500);
      } else {
        const error = await response.json();
        toast.error(`删除失败: ${error.error || '未知错误'}`);
        setShowDeleteDialog(false);
      }
    } catch (error) {
      console.error('删除监控项失败:', error);
      toast.error('删除失败，请稍后重试');
      setShowDeleteDialog(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 处理表单关闭
  const handleFormClose = () => {
    setIsEditFormOpen(false);
    
    // 重新初始化图表
    setTimeout(() => {
      if (chartRef.current && chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = echarts.init(chartRef.current);
        const { data, labels } = prepareChartData(historyData, timeRange);
        
        // 重新设置图表配置
        const option = {
          animation: false,
          grid: {
            top: 20,
            right: 20,
            bottom: 40,
            left: 60,
            containLabel: true
          },
          tooltip: {
            trigger: 'axis',
            formatter: '{b}<br />{a}: {c} ms',
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            borderColor: 'rgba(99, 102, 241, 0.3)',
            textStyle: {
              color: '#f1f5f9'
            }
          },
          xAxis: {
            type: 'category',
            boundaryGap: false,
            data: labels,
            axisLine: {
              lineStyle: {
                color: 'rgba(203, 213, 225, 0.2)'
              }
            },
            axisLabel: {
              color: 'rgba(203, 213, 225, 0.6)',
              rotate: timeRange === '30d' ? 45 : 0,
              fontSize: 10
            }
          },
          yAxis: {
            type: 'value',
            min: 0,
            axisLine: {
              lineStyle: {
                color: 'rgba(203, 213, 225, 0.2)'
              }
            },
            splitLine: {
              lineStyle: {
                color: 'rgba(203, 213, 225, 0.1)'
              }
            },
            axisLabel: {
              color: 'rgba(203, 213, 225, 0.6)',
              formatter: '{value} ms'
            }
          },
          series: [{
            name: '响应时间',
            data: data,
            type: 'line',
            smooth: true,
            symbol: 'none',
            lineStyle: {
              color: '#6366F1'
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                offset: 0,
                color: 'rgba(99, 102, 241, 0.3)'
              }, {
                offset: 1,
                color: 'rgba(99, 102, 241, 0)'
              }])
            }
          }]
        };
        
        chartInstance.current.setOption(option);
      }
    }, 300);
  };

  // 计算平均响应时间
  const calculateAverageResponseTime = () => {
    if (!historyData || historyData.length === 0) return responseTime;
    
    const successfulRequests = historyData.filter(record => record.status === 1 && record.ping);
    if (successfulRequests.length === 0) return "N/A";
    
    const sum = successfulRequests.reduce((acc, record) => acc + (record.ping || 0), 0);
    const avg = sum / successfulRequests.length;
    
    return `${avg.toFixed(2)}ms`;
  };

  // 格式化监控类型显示
  const formatMonitorType = (type: string) => {
    switch(type) {
      case 'http': return 'HTTP/HTTPS网址';
      case 'keyword': return '关键字监控';
      case 'port': return '端口监控';
      case 'mysql': return 'MySQL 数据库';
      case 'postgres': return 'PostgreSQL 数据库';
      case 'sqlserver': return 'SQL Server 数据库';
      case 'redis': return 'Redis 数据库';
      case 'push': return '推送监控';
      default: return type;
    }
  };

  // 获取检测间隔
  const getCheckInterval = () => {
    if (monitorDetails?.interval) {
      return monitorDetails.interval > 60 
        ? `${Math.floor(monitorDetails.interval / 60)} 分钟` 
        : `${monitorDetails.interval} 秒`;
    }
    return '60 秒';
  };

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-medium">{name}</h2>
          <div className="text-sm text-foreground/60 mt-1">
            {formatMonitorType(type)}
            {monitorDetails?.config?.url && (
              <span className="ml-2">· {monitorDetails.config.url}</span>
            )}
          </div>
        </div>
        <div className="flex space-x-3">
          <button 
            className={`!rounded-button px-4 py-2 border ${isPaused 
              ? 'border-primary text-primary hover:bg-primary/5' 
              : 'border-primary/20 hover:bg-primary/5'} transition-colors`}
            onClick={handlePauseToggle}
            disabled={isLoading}
          >
            {isLoading ? (
              <i className="fas fa-spinner fa-spin mr-2"></i>
            ) : (
              <i className={`fas ${isPaused ? 'fa-play' : 'fa-pause'} mr-2`}></i>
            )}
            {isPaused ? '恢复' : '暂停'}
          </button>
          <button 
            className="!rounded-button px-4 py-2 border border-primary/20 hover:bg-primary/5 transition-colors"
            onClick={handleEdit}
            disabled={isLoading}
          >
            <i className="fas fa-edit mr-2"></i>
            编辑
          </button>
          <button 
            className="!rounded-button px-4 py-2 border border-error/20 text-error hover:bg-error/5 transition-colors"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? (
              <i className="fas fa-spinner fa-spin mr-2"></i>
            ) : (
              <i className="fas fa-trash mr-2"></i>
            )}
            删除
          </button>
        </div>
      </div>
      
      {/* 监控状态卡片 */}
      <div className="dark:bg-dark-card bg-light-card rounded-lg border border-primary/15 hover:border-primary/30 transition-all shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div style={{ width: '100%' }}>
            <h3 className="text-lg font-medium">监控状态</h3>
            <div 
              ref={statusContainerRef}
              className="flex space-x-3 mt-4 items-center flex-nowrap" 
              style={{ width: '100%' }}
            >
              {statusPoints.map((status, index) => (
                <div key={index} className={`h-2.5 w-2.5 rounded-full ${getStatusDotClass(status)}`}></div>
              ))}
            </div>
            <div className="text-xs text-foreground/50 mt-2">检测频率 {getCheckInterval()}</div>
          </div>
          <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
            <div className={`w-3 h-3 rounded-full ${getMonitorStatusDotClass(status)}`}></div>
            <span className={getMonitorStatusClass(status)}>{status}</span>
          </div>
        </div>
      </div>
      
      {/* 状态指标卡片组 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="dark:bg-dark-card bg-light-card rounded-lg border border-primary/15 hover:border-primary/30 transition-all p-4">
          <div className="text-sm text-foreground/60">最近响应</div>
          <div className="text-2xl font-medium mt-1">
            {historyData.length > 0 && historyData[0].ping ? `${historyData[0].ping}ms` : responseTime}
          </div>
          <div className="text-xs text-foreground/50 mt-1">最近一次检测</div>
        </div>
        
        <div className="dark:bg-dark-card bg-light-card rounded-lg border border-primary/15 hover:border-primary/30 transition-all p-4">
          <div className="text-sm text-foreground/60">平均响应</div>
          <div className="text-2xl font-medium mt-1">{calculateAverageResponseTime()}</div>
          <div className="text-xs text-foreground/50 mt-1">24小时平均</div>
        </div>
        
        <div className="dark:bg-dark-card bg-light-card rounded-lg border border-primary/15 hover:border-primary/30 transition-all p-4">
          <div className="text-sm text-foreground/60">在线时间</div>
          <div className="text-2xl font-medium mt-1">{calculatedUptime}</div>
          <div className="text-xs text-foreground/50 mt-1">30天统计</div>
        </div>
        
        <div className="dark:bg-dark-card bg-light-card rounded-lg border border-primary/15 hover:border-primary/30 transition-all p-4">
          <div className="text-sm text-foreground/60">可用性</div>
          <div className="text-2xl font-medium mt-1">{calculatedAvailability}</div>
          <div className="text-xs text-foreground/50 mt-1">30天统计</div>
        </div>
      </div>
      
      {/* 响应时间趋势图表 */}
      <div className="dark:bg-dark-card bg-light-card rounded-lg border border-primary/15 hover:border-primary/30 transition-all p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">响应时间趋势</h3>
          <select 
            value={timeRange}
            onChange={(e) => handleTimeRangeChange(e.target.value)}
            className="!rounded-button dark:bg-dark-nav bg-light-nav border border-primary/20 px-4 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="2h">最近 2 小时</option>
            <option value="24h">最近 24 小时</option>
            <option value="7d">最近 7 天</option>
            <option value="30d">最近 30 天</option>
          </select>
        </div>
        <div ref={chartRef} className="w-full h-[400px] relative" style={{ zIndex: 1 }}></div>
      </div>
      
      {/* 历史事件 */}
      <div className="dark:bg-dark-card bg-light-card rounded-lg border border-primary/15 hover:border-primary/30 transition-all p-6">
        <h3 className="text-lg font-medium mb-4">历史事件</h3>
        <div className="space-y-4">
          {historyData.length === 0 ? (
            <div className="text-center py-8 text-foreground/60">
              暂无历史记录
            </div>
          ) : (
            historyData.slice(0, 20).map((record) => {
              const recordStatus = record.status === 1 ? "success" : "error";
              const statusText = record.status === 1 ? "服务正常" : "服务故障";
              const date = new Date(record.timestamp).toLocaleString();
              
              return (
                <div key={record.id} className="flex items-start space-x-3 pb-4 border-b border-primary/10">
                  <div className={`w-3 h-3 rounded-full ${getStatusDotClass(recordStatus)} mt-1.5`}></div>
                  <div>
                    <div className="text-foreground/90">{statusText}</div>
                    <div className="text-xs text-foreground/50 mt-1">{date}</div>
                    <div className="text-sm text-foreground/70 mt-1">
                      {record.status === 1
                        ? `响应时间: ${record.ping || 'N/A'}ms`
                        : record.message || '连接失败'
                      }
                    </div>
                    {record.message && record.status === 1 && (
                      <div className="text-sm text-foreground/60 mt-1">
                        {record.message}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          
          {/* 创建事件（固定显示） */}
          {monitorDetails && (
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 rounded-full bg-primary mt-1.5"></div>
              <div>
                <div className="text-foreground/90">监控创建</div>
                <div className="text-xs text-foreground/50 mt-1">
                  {new Date(monitorDetails.createdAt || Date.now()).toLocaleString()}
                </div>
                <div className="text-sm text-foreground/70 mt-1">监控项已创建并开始检测</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 确认删除对话框 */}
      <ConfirmDialog 
        isOpen={showDeleteDialog}
        title="删除监控项"
        message="确定要删除此监控项吗？此操作不可恢复。"
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDelete}
        onCancel={handleCancelDelete}
        isDestructive={true}
      />
      
      {/* 编辑监控表单 */}
      {isEditFormOpen && monitorDetails && (
        <MonitorForm 
          isOpen={isEditFormOpen}
          onClose={handleFormClose}
          editMode={true}
          initialData={monitorDetails}
        />
      )}
    </div>
  );
} 