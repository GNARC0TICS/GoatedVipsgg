import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Search, X, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { debounce } from '@/utils/request-helpers';

type Player = {
  uid: string;
  name: string;
  wagered?: {
    today: number;
    this_week: number;
    this_month: number;
    all_time: number;
  };
};

export function PlayerSearch() {
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Debounce search function
  const debouncedSearch = debounce((query: string) => {
    setSearchQuery(query);
  }, 300);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Query leaderboard data to search for players
  const { data: leaderboardData } = useQuery({
    queryKey: ['/api/affiliate/stats'],
    enabled: isOpen && searchQuery.length > 0,
    staleTime: 30000,
  });

  // Search all periods for the player
  const searchResults = leaderboardData ? getSearchResults(leaderboardData, searchQuery) : [];

  // Handle selecting a player
  const handleSelectPlayer = (player: Player) => {
    navigate(`/user/${player.uid}`);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="relative group"
      >
        <div className="absolute inset-0 bg-[#2A2B31]/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
        <Search className="h-5 w-5 md:h-6 md:w-6 text-[#8A8B91] group-hover:text-white transition-colors duration-300" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-[#1A1B21] border-[#2A2B31] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Search Players</DialogTitle>
          </DialogHeader>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8B91]" />
            <Input
              ref={inputRef}
              placeholder="Type a player's name..."
              onChange={handleInputChange}
              className="pl-10 bg-[#14151A] border-[#2A2B31] text-white placeholder:text-[#8A8B91]"
              autoComplete="off"
            />
            {searchQuery && (
              <X 
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8B91] cursor-pointer hover:text-white transition-colors duration-200"
                onClick={() => {
                  setSearchQuery('');
                  if (inputRef.current) {
                    inputRef.current.value = '';
                    inputRef.current.focus();
                  }
                }}
              />
            )}
          </div>

          {searchQuery.length > 0 && (
            <ScrollArea className="max-h-[300px] overflow-y-auto mt-4">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((player) => (
                    <div 
                      key={player.uid}
                      className="flex items-center justify-between p-3 bg-[#14151A] hover:bg-[#2A2B31] rounded-lg cursor-pointer transition-colors duration-200"
                      onClick={() => handleSelectPlayer(player)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#2A2B31] flex items-center justify-center">
                          <User className="h-4 w-4 text-[#D7FF00]" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{player.name}</p>
                          {player.wagered && (
                            <p className="text-xs text-[#8A8B91]">
                              Total Wagered: ${player.wagered.all_time.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[#8A8B91]" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-[#8A8B91]">
                  No players found matching "{searchQuery}"
                </div>
              )}
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper function to search for players in all time periods
function getSearchResults(data: any, query: string): Player[] {
  const periodKeys = ['all_time', 'monthly', 'weekly', 'today'];
  const results = new Map<string, Player>();
  
  // Convert search query to lowercase for case-insensitive search
  const lowercaseQuery = query.toLowerCase();
  
  // Search through all periods
  for (const period of periodKeys) {
    const periodData = data.data[period].data || [];
    
    for (const player of periodData) {
      // Check if the name contains the search query (case insensitive)
      if (player.name.toLowerCase().includes(lowercaseQuery)) {
        // Use Map to deduplicate results by uid
        results.set(player.uid, player);
      }
    }
  }
  
  // Convert map values to array and limit to first 10 results
  return Array.from(results.values()).slice(0, 10);
}