import { useState, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Gift, LucideLoader } from "lucide-react";

const SEGMENTS = [
  { text: "Try Again", type: "none", color: "#1A1B21" },
  { text: "50% Bonus", type: "bonus", value: "BONUS50", color: "#D7FF00" },
  { text: "Try Again", type: "none", color: "#1A1B21" },
  { text: "Free Spin", type: "retry", color: "#4CAF50" },
  { text: "Try Again", type: "none", color: "#1A1B21" },
  { text: "25% Bonus", type: "bonus", value: "BONUS25", color: "#D7FF00" },
  { text: "Try Again", type: "none", color: "#1A1B21" },
  { text: "10% Bonus", type: "bonus", value: "BONUS10", color: "#D7FF00" },
] as const;

type SegmentType = typeof SEGMENTS[number];

export default function WheelChallenge() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [isSpinning, setIsSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(true);
  const [lastSpinDate, setLastSpinDate] = useState<string | null>(null);
  const controls = useAnimation();

  useEffect(() => {
    // Check if user has spun today
    const lastSpin = localStorage.getItem("lastWheelSpin");
    setLastSpinDate(lastSpin);

    if (lastSpin) {
      const today = new Date().toDateString();
      const lastSpinDay = new Date(lastSpin).toDateString();
      setCanSpin(today !== lastSpinDay);
    }
  }, []);

  const spinWheel = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please login to spin the wheel",
        variant: "destructive",
      });
      return;
    }

    if (!canSpin) {
      toast({
        title: "Daily Limit Reached",
        description: "You can spin the wheel once per day. Come back tomorrow!",
        variant: "destructive",
      });
      return;
    }

    setIsSpinning(true);
    const randomSegment = Math.floor(Math.random() * SEGMENTS.length);
    const extraSpins = 5; // Number of full rotations before landing
    const targetRotation = 360 * extraSpins + (360 / SEGMENTS.length) * randomSegment;

    // Animate the wheel with spring physics for more natural motion
    await controls.start({
      rotate: targetRotation,
      transition: {
        type: "spring",
        duration: 4,
        bounce: 0.2,
        damping: 20
      },
    });

    // Handle reward
    const reward = SEGMENTS[randomSegment];
    if (reward.type === "bonus") {
      toast({
        title: "🎉 Congratulations!",
        description: `You won a ${reward.text}!\nUse code: ${reward.value}`,
        variant: "default",
        className: "bg-[#D7FF00] text-black font-heading"
      });
    } else if (reward.type === "retry") {
      toast({
        description: "🎲 You won another spin! Try your luck again!",
        variant: "default",
        className: "bg-[#4CAF50] text-white"
      });
      setCanSpin(true);
      setIsSpinning(false);
      return;
    } else {
      toast({
        description: "Better luck next time! Come back tomorrow for another chance!",
        variant: "default"
      });
    }

    // Update last spin date
    const now = new Date().toISOString();
    localStorage.setItem("lastWheelSpin", now);
    setLastSpinDate(now);
    setCanSpin(false);
    setIsSpinning(false);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#14151A] text-white">
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-heading mb-8"
            >
              Daily Bonus Wheel
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-[#8A8B91] mb-8"
            >
              Spin the wheel once daily for a chance to win bonus codes and special rewards!
            </motion.p>

            {/* Wheel Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="relative w-[300px] h-[300px] mx-auto mb-8"
            >
              {/* Wheel */}
              <motion.div
                animate={controls}
                className="absolute inset-0 w-full h-full"
                style={{ transformOrigin: "center center" }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {SEGMENTS.map((segment, i) => {
                    const angle = (360 / SEGMENTS.length) * i;
                    const endAngle = (360 / SEGMENTS.length) * (i + 1);
                    const startCoord = {
                      x: 50 + 45 * Math.cos((angle * Math.PI) / 180),
                      y: 50 + 45 * Math.sin((angle * Math.PI) / 180),
                    };
                    const endCoord = {
                      x: 50 + 45 * Math.cos((endAngle * Math.PI) / 180),
                      y: 50 + 45 * Math.sin((endAngle * Math.PI) / 180),
                    };

                    return (
                      <g key={i}>
                        <path
                          d={`M 50 50 L ${startCoord.x} ${startCoord.y} A 45 45 0 0 1 ${endCoord.x} ${endCoord.y} Z`}
                          fill={segment.color}
                          stroke="#2A2B31"
                          strokeWidth="0.5"
                          className="transition-all duration-300 hover:brightness-110"
                        />
                        <text
                          x="50"
                          y="50"
                          dy="-25"
                          fill={segment.color === "#1A1B21" ? "#8A8B91" : "white"}
                          fontSize="4"
                          fontWeight="bold"
                          textAnchor="middle"
                          transform={`rotate(${angle + (360 / SEGMENTS.length) / 2} 50 50)`}
                          className="select-none pointer-events-none"
                        >
                          {segment.text}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </motion.div>

              {/* Center Point with Glow */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 bg-[#D7FF00] rounded-full shadow-[0_0_10px_rgba(215,255,0,0.5)]" />
              </div>

              {/* Pointer */}
              <div className="absolute top-0 left-1/2 -ml-3 -mt-2 w-6 h-6">
                <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[24px] border-l-transparent border-r-transparent border-b-[#D7FF00] filter drop-shadow-[0_0_5px_rgba(215,255,0,0.5)]" />
              </div>
            </motion.div>

            <Button
              onClick={spinWheel}
              disabled={isSpinning || !canSpin}
              className={`bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 font-heading text-lg px-8 py-6 ${isSpinning ? 'animate-pulse' : ''}`}
            >
              {isSpinning ? (
                <>
                  <LucideLoader className="w-4 h-4 animate-spin mr-2" />
                  Spinning...
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4 mr-2" />
                  SPIN THE WHEEL
                </>
              )}
            </Button>

            {lastSpinDate && !canSpin && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[#8A8B91] mt-4"
              >
                Next spin available tomorrow at {new Date(lastSpinDate).toLocaleTimeString()}
              </motion.p>
            )}
          </div>
        </main>
      </div>
    </PageTransition>
  );
}