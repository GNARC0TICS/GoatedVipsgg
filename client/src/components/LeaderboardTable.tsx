import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Crown,
  Medal,
  Award,
  Star,
  TrendingUp,
  CircleDot,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import React from "react";
import { useLeaderboard, type TimePeriod } from "@/hooks/use-leaderboard";
import { getTierFromWager, getTierIcon } from "@/lib/tier-utils";
import { QuickProfile } from "@/components/QuickProfile";
import { motion } from "framer-motion";
import { formatNumber } from "@/lib/utils";

const ITEMS_PER_PAGE = 10;

// This interface needs to be adjusted to match the data returned by useLeaderboard
interface LeaderboardEntry {
  rank: number;
  username: string;
  wagered: number;
}

interface LeaderboardTableProps {
  data: Array<LeaderboardEntry>;
  period: TimePeriod;
}


export function LeaderboardTable({ data, period }: LeaderboardTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No leaderboard data available
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-20 font-heading text-[#D7FF00]">
              RANK
            </TableHead>
            <TableHead className="font-heading text-[#D7FF00]">
              USERNAME
            </TableHead>
            <TableHead className="text-right font-heading text-[#D7FF00]">
              WAGER
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((entry, index) => (
            <TableRow key={`${entry.username}-${index}`}>
              <TableCell className="font-mono">{entry.rank}</TableCell>
              <TableCell>{entry.username}</TableCell>
              <TableCell className="text-right font-mono">
                ${formatNumber(entry.wagered)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}