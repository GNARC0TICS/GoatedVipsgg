
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number, max: number) => string;
  className?: string;
  progressClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'success' | 'warning' | 'error';
  animation?: boolean;
}

export function ProgressBar({
  value,
  max,
  label,
  showValue = false,
  formatValue,
  className,
  progressClassName,
  size = 'md',
  color = 'default',
  animation = true,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const displayValue = formatValue 
    ? formatValue(value, max)
    : showValue 
      ? `${value}/${max}` 
      : `${Math.round(percentage)}%`;

  const heightClasses = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6',
  };
  
  const colorClasses = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  };

  return (
    <div className={cn('w-full space-y-1', className)}>
      {(label || showValue) && (
        <div className="flex justify-between text-sm">
          {label && <span className="font-medium text-text-secondary">{label}</span>}
          {showValue && <span className="font-semibold text-white">{displayValue}</span>}
        </div>
      )}
      <div className={cn('w-full bg-border rounded-full overflow-hidden', heightClasses[size])}>
        <motion.div
          className={cn('h-full rounded-full', colorClasses[color], progressClassName)}
          initial={animation ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: animation ? 0.7 : 0, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
