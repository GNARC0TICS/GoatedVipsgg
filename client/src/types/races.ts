
export interface Race {
  id: string;
  status: 'upcoming' | 'live' | 'completed';
  startDate: string;
  endDate: string;
  prizePool: number;
  participants: Array<{
    uid: string;
    name: string;
    wagered: number;
    position: number;
  }>;
}
