
"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type MVPType = "daily" | "weekly" | "monthly" | "alltime";

interface MVPCardProps {
  type: MVPType;
  username: string;
  avatar?: string;
  wagerAmount: number;
  position: number;
  className?: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

export function MVPCard({ 
  type, 
  username, 
  avatar, 
  wagerAmount, 
  position,
  className 
}: MVPCardProps) {
  const typeTitleMap: Record<MVPType, string> = {
    daily: "DAILY MVP",
    weekly: "WEEKLY MVP",
    monthly: "MONTHLY MVP",
    alltime: "ALL-TIME MVP"
  };
  
  const typeColorMap: Record<MVPType, { border: string, background: string, glow: string }> = {
    daily: {
      border: "from-mvp-daily-primary to-mvp-daily-accent",
      background: "bg-gradient-to-br from-mvp-daily-primary/10 to-mvp-daily-accent/20",
      glow: "0 0 20px rgba(139, 92, 246, 0.3)"
    },
    weekly: {
      border: "from-mvp-weekly-primary to-mvp-weekly-accent",
      background: "bg-gradient-to-br from-mvp-weekly-primary/10 to-mvp-weekly-accent/20",
      glow: "0 0 20px rgba(16, 185, 129, 0.3)"
    },
    monthly: {
      border: "from-mvp-monthly-primary to-mvp-monthly-accent",
      background: "bg-gradient-to-br from-mvp-monthly-primary/10 to-mvp-monthly-accent/20",
      glow: "0 0 20px rgba(245, 158, 11, 0.3)"
    },
    alltime: {
      border: "from-mvp-alltime-primary to-mvp-alltime-accent",
      background: "bg-gradient-to-br from-mvp-alltime-primary/10 to-mvp-alltime-accent/20",
      glow: "0 0 20px rgba(236, 72, 153, 0.3)"
    }
  };

  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-lg p-0.5",
        `bg-gradient-to-br ${typeColorMap[type].border}`,
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ 
        scale: 1.02, 
        boxShadow: typeColorMap[type].glow,
        transition: { duration: 0.2 } 
      }}
    >
      <div className={cn(
        "h-full rounded-lg p-5 backdrop-blur-sm",
        typeColorMap[type].background
      )}>
        <div className="flex items-center justify-between mb-4">
          <span className={cn(
            "text-xs font-bold uppercase tracking-wider",
            type === "daily" ? "text-mvp-daily-primary" : 
            type === "weekly" ? "text-mvp-weekly-primary" : 
            type === "monthly" ? "text-mvp-monthly-primary" : 
            "text-mvp-alltime-primary"
          )}>
            {typeTitleMap[type]}
          </span>
          <div className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            type === "daily" ? "bg-mvp-daily-primary/20 text-mvp-daily-shine" : 
            type === "weekly" ? "bg-mvp-weekly-primary/20 text-mvp-weekly-shine" : 
            type === "monthly" ? "bg-mvp-monthly-primary/20 text-mvp-monthly-shine" : 
            "bg-mvp-alltime-primary/20 text-mvp-alltime-shine"
          )}>
            #{position}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {avatar ? (
            <div className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-white/10">
              <img 
                src={avatar} 
                alt={username} 
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className={cn(
              "flex items-center justify-center h-14 w-14 rounded-full text-xl font-bold",
              type === "daily" ? "bg-mvp-daily-primary/30 text-mvp-daily-shine" : 
              type === "weekly" ? "bg-mvp-weekly-primary/30 text-mvp-weekly-shine" : 
              type === "monthly" ? "bg-mvp-monthly-primary/30 text-mvp-monthly-shine" : 
              "bg-mvp-alltime-primary/30 text-mvp-alltime-shine"
            )}>
              {username.charAt(0).toUpperCase()}
            </div>
          )}
          
          <div className="flex-1">
            <h3 className="font-heading text-lg font-bold text-white truncate">
              {username}
            </h3>
            <p className={cn(
              "text-sm font-medium",
              type === "daily" ? "text-mvp-daily-shine" : 
              type === "weekly" ? "text-mvp-weekly-shine" : 
              type === "monthly" ? "text-mvp-monthly-shine" : 
              "text-mvp-alltime-shine"
            )}>
              {formatCurrency(wagerAmount)}
            </p>
          </div>
        </div>
        
        <div className={cn(
          "mt-4 h-1 w-full rounded-full overflow-hidden bg-white/10",
        )}>
          <motion.div 
            className={cn(
              "h-full rounded-full",
              type === "daily" ? "bg-mvp-daily-primary" : 
              type === "weekly" ? "bg-mvp-weekly-primary" : 
              type === "monthly" ? "bg-mvp-monthly-primary" : 
              "bg-mvp-alltime-primary"
            )}
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1, delay: 0.2 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
