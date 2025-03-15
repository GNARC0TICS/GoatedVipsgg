import { useState, useEffect } from "react";
import { differenceInSeconds } from "date-fns";

interface CountdownTimerProps {
  endDate: string;
  large?: boolean;
  onComplete?: () => void; // Make onComplete optional
}

export function CountdownTimer({
  endDate,
  large = false,
  onComplete,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      const end = new Date(endDate);
      const now = new Date();
      const totalSeconds = Math.max(0, differenceInSeconds(end, now));

      if (totalSeconds === 0 && onComplete) {
        onComplete();
        clearInterval(interval);
      }

      const days = Math.floor(totalSeconds / (24 * 60 * 60));
      const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = Math.floor(totalSeconds % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [endDate, onComplete]);

  return (
    <div
      className={`grid grid-cols-4 gap-2 ${large ? "text-4xl" : "text-2xl"} font-bold`}
    >
      <div className="text-center">
        <div className="bg-[#1A1B21]/50 backdrop-blur-sm p-2 rounded-lg border border-[#2A2B31]">
          {timeLeft.days}
        </div>
        <div className="text-xs mt-1 text-[#8A8B91]">DAYS</div>
      </div>
      <div className="text-center">
        <div className="bg-[#1A1B21]/50 backdrop-blur-sm p-2 rounded-lg border border-[#2A2B31]">
          {timeLeft.hours}
        </div>
        <div className="text-xs mt-1 text-[#8A8B91]">HOURS</div>
      </div>
      <div className="text-center">
        <div className="bg-[#1A1B21]/50 backdrop-blur-sm p-2 rounded-lg border border-[#2A2B31]">
          {timeLeft.minutes}
        </div>
        <div className="text-xs mt-1 text-[#8A8B91]">MINUTES</div>
      </div>
      <div className="text-center">
        <div className="bg-[#1A1B21]/50 backdrop-blur-sm p-2 rounded-lg border border-[#2A2B31]">
          {timeLeft.seconds}
        </div>
        <div className="text-xs mt-1 text-[#8A8B91]">SECONDS</div>
      </div>
    </div>
  );
}
