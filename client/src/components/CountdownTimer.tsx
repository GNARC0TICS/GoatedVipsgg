import { useEffect, useState } from "react";
import { differenceInSeconds } from "date-fns";

interface CountdownTimerProps {
  endDate: string;
  onComplete?: () => void;
}

export function CountdownTimer({ endDate, onComplete }: CountdownTimerProps) {
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
    <div className="font-mono text-lg flex items-center gap-2">
      {timeLeft.days > 0 && (
        <>
          <span className="font-bold">{timeLeft.days}d</span>
          <span className="text-muted-foreground">:</span>
        </>
      )}
      <span className="font-bold">
        {String(timeLeft.hours).padStart(2, "0")}h
      </span>
      <span className="text-muted-foreground">:</span>
      <span className="font-bold">
        {String(timeLeft.minutes).padStart(2, "0")}m
      </span>
      <span className="text-muted-foreground">:</span>
      <span className="font-bold">
        {String(timeLeft.seconds).padStart(2, "0")}s
      </span>
    </div>
  );
}
