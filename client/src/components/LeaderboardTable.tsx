
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { useState } from "react";

type TimePeriod = 'today' | 'weekly' | 'monthly' | 'all_time';

type APIResponse = {
  success: boolean;
  data: Array<{
    uid: string;
    name: string;
    wagered: {
      today: number;
      this_week: number;
      this_month: number;
      all_time: number;
    };
  }>;
};

export function LeaderboardTable() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all_time');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<APIResponse['data'][0] | null>(null);

  const { data: response, isLoading } = useQuery<APIResponse>({
    queryKey: ['/api/affiliate/stats'],
  });

  const transformedData = response?.data
    ? response.data
        .map((entry) => ({
          ...entry,
          totalWager: timePeriod === 'today' ? entry.wagered.today :
                     timePeriod === 'weekly' ? entry.wagered.this_week :
                     timePeriod === 'monthly' ? entry.wagered.this_month :
                     entry.wagered.all_time,
        }))
        .sort((a, b) => b.totalWager - a.totalWager)
        .map((entry, index) => ({ ...entry, rank: index + 1 }))
    : [];

  const filteredData = transformedData.filter(entry => 
    entry.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="w-full space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-12" />
        ))}
      </div>
    );
  }

  if (!response?.success || !Array.isArray(response?.data)) {
    return (
      <div className="text-center py-8 text-[#8A8B91]">
        No data available
      </div>
    );
  }

  const USERS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredData.length / USERS_PER_PAGE);
  const startIndex = (currentPage - 1) * USERS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, startIndex + USERS_PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Search users..."
          className="w-full p-2 rounded-lg bg-[#1A1B21] border border-[#2A2B31] text-white"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex gap-2 justify-center">
          <Button
            variant={timePeriod === 'today' ? 'default' : 'outline'}
            onClick={() => setTimePeriod('today')}
            className="font-heading tracking-tight"
          >
            TODAY
          </Button>
          <Button
            variant={timePeriod === 'weekly' ? 'default' : 'outline'}
            onClick={() => setTimePeriod('weekly')}
            className="font-heading tracking-tight"
          >
            WEEKLY
          </Button>
          <Button
            variant={timePeriod === 'monthly' ? 'default' : 'outline'}
            onClick={() => setTimePeriod('monthly')}
            className="font-heading tracking-tight"
          >
            MONTHLY
          </Button>
          <Button
            variant={timePeriod === 'all_time' ? 'default' : 'outline'}
            onClick={() => setTimePeriod('all_time')}
            className="font-heading tracking-tight"
          >
            ALL TIME
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 font-heading text-[#D7FF00]">RANK</TableHead>
              <TableHead className="font-heading text-[#D7FF00]">USERNAME</TableHead>
              <TableHead className="text-right font-heading text-[#D7FF00]">TOTAL WAGER</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {paginatedData.map((entry) => (
                <motion.tr
                  key={entry.uid}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#1A1B21]/50 backdrop-blur-sm hover:bg-[#1A1B21] cursor-pointer transition-colors"
                  onClick={() => setSelectedUser(entry)}
                >
                  <TableCell className="font-heading text-white">{entry.rank}</TableCell>
                  <TableCell className="font-sans text-white flex items-center gap-2">
                    <User className="h-4 w-4 text-[#D7FF00]" />
                    <Tooltip>
                      <TooltipTrigger>
                        {entry.name}
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p>Today: ${entry.wagered.today.toLocaleString()}</p>
                          <p>Weekly: ${entry.wagered.this_week.toLocaleString()}</p>
                          <p>Monthly: ${entry.wagered.this_month.toLocaleString()}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right font-sans text-white">
                    ${entry.totalWager.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        <div className="flex justify-between items-center pt-4">
          <div className="text-sm text-[#8A8B91]">
            Showing {startIndex + 1}-{Math.min(startIndex + USERS_PER_PAGE, filteredData.length)} of {filteredData.length}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* User Profile Dialog */}
        {selectedUser && (
          <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
            <DialogContent className="sm:max-w-[425px] bg-[#1A1B21] text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <User className="h-5 w-5 text-[#D7FF00]" />
                  {selectedUser.name}'s Profile
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-heading text-sm text-[#8A8B91]">TODAY'S WAGER</h4>
                    <p className="text-2xl font-bold">${selectedUser.wagered.today.toLocaleString()}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-heading text-sm text-[#8A8B91]">THIS WEEK'S WAGER</h4>
                    <p className="text-2xl font-bold">${selectedUser.wagered.this_week.toLocaleString()}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-heading text-sm text-[#8A8B91]">THIS MONTH'S WAGER</h4>
                    <p className="text-2xl font-bold">${selectedUser.wagered.this_month.toLocaleString()}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-heading text-sm text-[#8A8B91]">ALL TIME WAGER</h4>
                    <p className="text-2xl font-bold">${selectedUser.wagered.all_time.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
