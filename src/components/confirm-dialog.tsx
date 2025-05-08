"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "确认",
  cancelText = "取消",
  onConfirm,
  onCancel,
  isDestructive = false
}: ConfirmDialogProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    if (isOpen) {
      // 打开对话框时禁止背景滚动
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      // 关闭对话框时恢复背景滚动
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  // 客户端环境检查
  if (!isMounted || !isOpen) return null;

  const dialog = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />
      
      {/* 对话框内容 */}
      <div className="relative max-w-md w-full mx-4 dark:bg-dark-card bg-light-card rounded-lg shadow-lg border border-primary/15 overflow-hidden transform transition-all">
        <div className="p-6">
          <h3 className="text-lg font-medium mb-2">{title}</h3>
          <p className="text-foreground/70">{message}</p>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              className="px-4 py-2 rounded-button border border-primary/20 hover:bg-primary/5 transition-colors"
              onClick={onCancel}
            >
              {cancelText}
            </button>
            <button
              className={`px-4 py-2 rounded-button ${
                isDestructive 
                  ? "bg-error hover:bg-error/90 text-white" 
                  : "bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90"
              } transition-colors`}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // 使用 portal 将对话框渲染到 body 中
  return createPortal(dialog, document.body);
} 