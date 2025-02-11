import { useState, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Gift, LucideLoader } from "lucide-react";

// Updated segments based on the specified probabilities
const SEGMENTS = [
  { text: "Try Again", type: "none", color: "#1A1B21", weight: 850 }, // ~85% chance
  { text: "$0.10 Bonus", type: "bonus", value: "BONUS010", color: "#D7FF00", weight: 200 }, // ~1 in 5
  { text: "Try Again", type: "none", color: "#1A1B21", weight: 850 },
  { text: "$1 Bonus", type: "bonus", value: "BONUS100", color: "#4CAF50", weight: 100 }, // ~1 in 10
  { text: "Try Again", type: "none", color: "#1A1B21", weight: 850 },
  { text: "$2 Bonus", type: "bonus", value: "BONUS200", color: "#D7FF00", weight: 5 }, // ~1 in 200
  { text: "$25 Bonus", type: "bonus", value: "BONUS2500", color: "#FFD700", weight: 1 }, // ~1 in 1000
  { text: "$50 Bonus", type: "bonus", value: "BONUS5000", color: "#FFA500", weight: 0.4 }, // ~1 in 2500
  { text: "$100 Bonus", type: "bonus", value: "BONUS10000", color: "#FF4500", weight: 0.2 }, // ~1 in 5000
  { text: "Try Again", type: "none", color: "#1A1B21", weight: 850 },
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
    const checkSpinEligibility = async () => {
      try {
        const response = await fetch("/api/wheel/check-eligibility");
        const data = await response.json();
        setCanSpin(data.canSpin);
        setLastSpinDate(data.lastSpin);
      } catch (error) {
        console.error("Failed to check spin eligibility:", error);
      }
    };

    if (isAuthenticated) {
      checkSpinEligibility();
    }
  }, [isAuthenticated]);

  const weightedRandom = () => {
    const totalWeight = SEGMENTS.reduce((acc, segment) => acc + segment.weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < SEGMENTS.length; i++) {
      random -= SEGMENTS[i].weight;
      if (random <= 0) {
        return i;
      }
    }
    return SEGMENTS.length - 1;
  };

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

    try {
      const randomSegment = weightedRandom();
      const extraSpins = 5;
      const targetRotation = 360 * extraSpins + (360 / SEGMENTS.length) * randomSegment;

      await controls.start({
        rotate: targetRotation,
        transition: {
          type: "spring",
          duration: 4,
          bounce: 0.2,
          damping: 20
        },
      });

      const reward = SEGMENTS[randomSegment];

      // Record the spin result
      const response = await fetch("/api/wheel/record-spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segmentIndex: randomSegment,
          reward: reward.type === "bonus" ? reward.value : null
        }),
      });

      if (!response.ok) throw new Error("Failed to record spin");

      if (reward.type === "bonus") {
        toast({
          title: "🎉 Congratulations!",
          description: `You won a ${reward.text}!\nUse code: ${reward.value}`,
          variant: "default",
          className: "bg-[#D7FF00] text-black font-heading"
        });
      } else {
        toast({
          description: "Better luck next time! Come back tomorrow for another chance!",
          variant: "default"
        });
      }

      setCanSpin(false);
      const now = new Date().toISOString();
      setLastSpinDate(now);
    } catch (error) {
      console.error("Spin error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSpinning(false);
    }
  };

  const renderWheel = () => {
    return (
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
    );
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
              Spin the wheel once daily for a chance to win bonus codes worth up to $100!
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="relative w-[300px] h-[300px] mx-auto mb-8"
            >
              <motion.div
                animate={controls}
                className="absolute inset-0 w-full h-full"
                style={{ transformOrigin: "center center" }}
              >
                {renderWheel()}
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
              disabled={isSpinning || !canSpin || !isAuthenticated}
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
                  {isAuthenticated ? 'SPIN THE WHEEL' : 'LOGIN TO SPIN'}
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