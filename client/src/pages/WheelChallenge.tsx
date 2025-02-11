import { useState, useEffect } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Gift, LucideLoader, Sparkles } from "lucide-react";

// Updated segments with premium casino-style gradients and emblems
const SEGMENTS = [
  { text: "Try Again", type: "none", gradient: ["1A1B21", "2A2B31"], emblem: null, weight: 850 },
  { text: "$0.10", type: "bonus", value: "BONUS010", gradient: ["CD7F32", "8B4513"], emblem: "copper", weight: 200 },
  { text: "Try Again", type: "none", gradient: ["1A1B21", "2A2B31"], emblem: null, weight: 850 },
  { text: "$1.00", type: "bonus", value: "BONUS100", gradient: ["C0C0C0", "A9A9A9"], emblem: "silver", weight: 100 },
  { text: "Try Again", type: "none", gradient: ["1A1B21", "2A2B31"], emblem: null, weight: 850 },
  { text: "$2.00", type: "bonus", value: "BONUS200", gradient: ["D7FF00", "BFDF00"], emblem: "gold", weight: 5 },
  { text: "$25.00", type: "bonus", value: "BONUS2500", gradient: ["FFD700", "DAA520"], emblem: "platinum", weight: 1 },
  { text: "$50.00", type: "bonus", value: "BONUS5000", gradient: ["E5E4E2", "B4C4D4"], emblem: "diamond", weight: 0.4 },
  { text: "$100.00", type: "bonus", value: "BONUS10000", gradient: ["B9F2FF", "00BFFF"], emblem: "royal", weight: 0.2 },
  { text: "Try Again", type: "none", gradient: ["1A1B21", "2A2B31"], emblem: null, weight: 850 }
] as const;

type SegmentType = typeof SEGMENTS[number];

export default function WheelChallenge() {
  const { toast } = useToast();
  const [isSpinning, setIsSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(true);
  const [sparkles, setSparkles] = useState<{ x: number; y: number }[]>([]);
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

  const createSparkles = (x: number, y: number) => {
    const newSparkles = Array.from({ length: 15 }, () => ({
      x: x + (Math.random() - 0.5) * 150,
      y: y + (Math.random() - 0.5) * 150
    }));
    setSparkles(newSparkles);
  };

  const spinWheel = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setSparkles([]);
    setActiveSegment(null);

    try {
      const randomSegment = weightedRandom();
      const extraSpins = 5;
      const targetRotation = 360 * extraSpins + (360 / SEGMENTS.length) * randomSegment;

      // Enhanced spin animation with spring physics and bounce
      await controls.start({
        rotate: [0, targetRotation + 10, targetRotation],
        transition: {
          duration: 4.5,
          ease: [0.2, 0, 0.2, 1],
          times: [0, 0.9, 1]
        }
      });

      setActiveSegment(randomSegment);
      const reward = SEGMENTS[randomSegment];

      // Enhanced win effects
      if (reward.type === "bonus") {
        const wheelElement = document.querySelector(".wheel-container");
        if (wheelElement) {
          const rect = wheelElement.getBoundingClientRect();
          createSparkles(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }

        toast({
          title: `🎉 ${reward.emblem?.toUpperCase()} WIN!`,
          description: `You won ${reward.text} Bonus!\nClaim code: ${reward.value}`,
          variant: "default",
          className: `bg-gradient-to-r from-[#${reward.gradient[0]}] to-[#${reward.gradient[1]}] text-black font-heading animate-pop shadow-glow`
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

  const renderWheel = () => {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
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
              <stop offset="0%" style={{ stopColor: `#${segment.gradient[0]}` }} />
              <stop offset="100%" style={{ stopColor: `#${segment.gradient[1]}` }} />
            </linearGradient>
          ))}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="center-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#DAA520" />
          </linearGradient>
        </defs>

        {SEGMENTS.map((segment, i) => {
          const angle = (360 / SEGMENTS.length) * i;
          const endAngle = (360 / SEGMENTS.length) * (i + 1);
          const midAngle = (angle + endAngle) / 2;
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
              <motion.path
                d={`M 50 50 L ${startCoord.x} ${startCoord.y} A 45 45 0 0 1 ${endCoord.x} ${endCoord.y} Z`}
                fill={`url(#segment-gradient-${i})`}
                stroke="#2A2B31"
                strokeWidth="0.5"
                className={`wheel-segment-hover ${isSpinning ? 'animate-none' : ''}`}
                whileHover={!isSpinning ? { scale: 1.02 } : {}}
                animate={activeSegment === i ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.3 }}
                filter={segment.type === "bonus" ? "url(#glow)" : undefined}
              />

              {/* Enhanced Text Rendering with better positioning */}
              <g transform={`rotate(${midAngle} 50 50)`}>
                <text
                  x="50"
                  y="22"
                  textAnchor="middle"
                  fill={segment.type === "none" ? "#8A8B91" : "white"}
                  fontSize="3.2"
                  fontWeight="bold"
                  className="select-none pointer-events-none wheel-text"
                >
                  {segment.text}
                </text>

                {segment.emblem && (
                  <text
                    x="50"
                    y="28"
                    textAnchor="middle"
                    fill="#FFD700"
                    fontSize="2.2"
                    fontWeight="bold"
                    className="select-none pointer-events-none wheel-emblem"
                  >
                    {segment.emblem.toUpperCase()}
                  </text>
                )}
              </g>
            </g>
          );
        })}

        {/* Enhanced center decoration with inner glow */}
        <circle
          cx="50"
          cy="50"
          r="5"
          fill="url(#center-gradient)"
          className="wheel-center"
          filter="url(#glow)"
        />

        {/* Inner ring decoration */}
        <circle
          cx="50"
          cy="50"
          r="6"
          fill="none"
          stroke="#FFD700"
          strokeWidth="0.5"
          className="wheel-ring"
        />
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
              Spin the wheel for a chance to win bonus codes worth up to $100!
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="relative w-[300px] h-[300px] mx-auto mb-8 wheel-container"
            >
              <motion.div
                animate={controls}
                className="absolute inset-0 w-full h-full"
                style={{ transformOrigin: "center center" }}
              >
                {renderWheel()}
              </motion.div>

              {/* Sparkles Animation */}
              <AnimatePresence>
                {sparkles.map((sparkle, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 1, scale: 0 }}
                    animate={{ opacity: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute sparkle"
                    style={{
                      left: sparkle.x,
                      top: sparkle.y,
                      pointerEvents: "none"
                    }}
                  >
                    <Sparkles className="text-[#D7FF00] w-4 h-4" />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Center Point with Enhanced Glow */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-4 h-4 bg-[#D7FF00] rounded-full wheel-glow" />
              </div>

              {/* Enhanced Pointer */}
              <div className="absolute top-0 left-1/2 -ml-3 -mt-2 w-6 h-6 pointer-events-none">
                <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[24px] border-l-transparent border-r-transparent border-b-[#D7FF00] filter wheel-glow" />
              </div>
            </motion.div>

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
        </main>
      </div>
    </PageTransition>
  );
}