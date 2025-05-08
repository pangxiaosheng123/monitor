'use client';

import { useState, useEffect } from 'react';

interface LoginRecord {
  id: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  time: string;
}

interface PaginationData {
  total: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

export default function LoginRecordsTable() {
  const [records, setRecords] = useState<LoginRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    currentPage: 1,
    pageSize: 10,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 加载登录记录
  const loadRecords = async (page = 1, limit = 10) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/user/login-records?page=${page}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('获取登录记录失败');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setRecords(data.data.records);
        setPagination(data.data.pagination);
      } else {
        setError(data.error || '获取登录记录失败');
      }
    } catch (err) {
      setError('获取登录记录时发生错误');
      console.error('加载登录记录错误:', err);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadRecords(pagination.currentPage, pagination.pageSize);
  }, []);

  // 处理分页变化
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    loadRecords(newPage, pagination.pageSize);
  };

  // 获取设备类型
  const getDeviceType = (userAgent: string) => {
    if (!userAgent || userAgent === '未知') return '未知设备';
    
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return '移动设备';
    } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
      return '平板设备';
    } else {
      return '桌面设备';
    }
  };

  // 格式化日期时间
  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      // 使用原生日期格式化方法替代date-fns，避免依赖问题
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (_) {
      return dateStr;
    }
  };

  if (loading && records.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        <span className="ml-2">加载中...</span>
      </div>
    );
  }

  if (error && records.length === 0) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
        <p>{error}</p>
        <button 
          onClick={() => loadRecords(pagination.currentPage, pagination.pageSize)}
          className="mt-2 px-4 py-2 bg-red-100 dark:bg-red-800/30 rounded-md hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">暂无登录记录</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                登录时间
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                状态
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                IP地址
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                设备类型
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
            {records.map(record => (
              <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDateTime(record.time)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {record.success ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                      成功
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                      失败
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {record.ipAddress}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {getDeviceType(record.userAgent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页控件 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            共 {pagination.total} 条记录，第 {pagination.currentPage} / {pagination.totalPages} 页
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              上一页
            </button>
            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 