import { useState, useEffect } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Gift, LucideLoader, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import type { CreateTypes } from 'canvas-confetti';

// 🎰 Updated premium casino-style segments
const SEGMENTS = [
  { text: "Try Again", type: "none", gradient: ["1A1B21", "2A2B31"], emblem: null, weight: 900 },
  { text: "$0.10 Bonus", type: "bonus", value: "BONUS010", gradient: ["CD7F32", "8B4513"], emblem: "bronze", weight: 200 },
  { text: "Try Again", type: "none", gradient: ["1A1B21", "2A2B31"], emblem: null, weight: 900 },
  { text: "$1 Bonus", type: "bonus", value: "BONUS100", gradient: ["C0C0C0", "A9A9A9"], emblem: "silver", weight: 100 },
  { text: "Try Again", type: "none", gradient: ["1A1B21", "2A2B31"], emblem: null, weight: 900 },
  { text: "$2 Bonus", type: "bonus", value: "BONUS200", gradient: ["D7FF00", "BFDF00"], emblem: "gold", weight: 15 },
  { text: "$25 Bonus", type: "bonus", value: "BONUS2500", gradient: ["FFD700", "DAA520"], emblem: "platinum", weight: 5 },
  { text: "$50 Bonus", type: "bonus", value: "BONUS5000", gradient: ["E5E4E2", "B4C4D4"], emblem: "diamond", weight: 2 },
  { text: "$100 Bonus", type: "bonus", value: "BONUS10000", gradient: ["B9F2FF", "00BFFF"], emblem: "royal", weight: 1 },
  { text: "Try Again", type: "none", gradient: ["1A1B21", "2A2B31"], emblem: null, weight: 900 }
] as const;

export default function WheelChallenge() {
  const { toast } = useToast();
  const [isSpinning, setIsSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(true);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const controls = useAnimation();

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
    if (isSpinning) return;
    setIsSpinning(true);
    setActiveSegment(null);

    try {
      const randomSegment = weightedRandom();
      const extraSpins = 5;
      const targetRotation = 360 * extraSpins + (360 / SEGMENTS.length) * randomSegment;

      // 🚀 Enhanced momentum-based spin physics
      await controls.start({
        rotate: [0, targetRotation + 10, targetRotation],
        transition: {
          duration: 5,
          ease: [0.12, 0, 0.39, 1], // Momentum-like feel
          repeat: 0
        }
      });

      setActiveSegment(randomSegment);
      const reward = SEGMENTS[randomSegment];

      // 🎉 Confetti & Glow Effect on Win
      if (reward.type === "bonus") {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });

        toast({
          title: `🎉 ${reward.emblem?.toUpperCase()} WIN!`,
          description: `You won ${reward.text} Bonus! Use code: ${reward.value}`,
          variant: "default",
          className: "bg-[#D7FF00] text-black font-heading shadow-[0_0_20px_#D7FF00]"
        });
      } else {
        toast({
          description: "Better luck next time! Try again!",
          variant: "default"
        });
      }

      setCanSpin(true);
    } catch (error) {
      console.error("Spin error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSpinning(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#14151A] text-white flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-center mb-6">Daily Bonus Wheel</h1>
        <p className="text-[#8A8B91] mb-4">Spin the wheel for a chance to win bonus codes up to $100!</p>

        {/* Wheel Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative w-[300px] h-[300px] mx-auto mb-6 wheel-container"
        >
          <motion.div
            animate={controls}
            className="absolute inset-0 w-full h-full"
            style={{ transformOrigin: "center center" }}
          >
            <svg viewBox="0 0 300 300" className="w-full h-full">
              <defs>
                {SEGMENTS.map((segment, i) => (
                  <linearGradient
                    key={`gradient-${i}`}
                    id={`segment-gradient-${i}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={`#${segment.gradient[0]}`} />
                    <stop offset="100%" stopColor={`#${segment.gradient[1]}`} />
                  </linearGradient>
                ))}
              </defs>
              <g transform="translate(150,150)">
                {SEGMENTS.map((segment, i) => {
                  const angle = (360 / SEGMENTS.length) * i;
                  const nextAngle = (360 / SEGMENTS.length) * (i + 1);
                  const rad = Math.PI / 180;
                  const x1 = Math.cos(angle * rad) * 140;
                  const y1 = Math.sin(angle * rad) * 140;
                  const x2 = Math.cos(nextAngle * rad) * 140;
                  const y2 = Math.sin(nextAngle * rad) * 140;
                  const largeArcFlag = nextAngle - angle <= 180 ? "0" : "1";

                  return (
                    <g key={i} className="wheel-segment-hover">
                      <path
                        d={`M 0 0 L ${x1} ${y1} A 140 140 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                        fill={`url(#segment-gradient-${i})`}
                        className="transition-all duration-300"
                        filter={activeSegment === i ? "url(#glow)" : "none"}
                      />
                    </g>
                  );
                })}
                {/* Center decoration */}
                <circle
                  r="30"
                  fill="#1A1B21"
                  stroke="#D7FF00"
                  strokeWidth="2"
                  className="wheel-center"
                />
                <circle
                  r="25"
                  fill="none"
                  stroke="#D7FF00"
                  strokeWidth="0.5"
                  className="wheel-ring"
                />
              </g>
            </svg>
          </motion.div>
        </motion.div>

        {/* Spin Button */}
        <Button
          onClick={spinWheel}
          disabled={isSpinning || !canSpin}
          className={`bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 font-heading text-lg px-8 py-6 
                ${isSpinning ? 'animate-pulse' : 'hover:scale-105 transform transition-transform'}
                shadow-[0_0_15px_rgba(215,255,0,0.3)] hover:shadow-[0_0_20px_rgba(215,255,0,0.5)]`}
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
      </div>
    </PageTransition>
  );
}