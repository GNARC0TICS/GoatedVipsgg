import { useState, useEffect } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Gift, LucideLoader, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

// 🎰 Premium Casino-Style Segments
const SEGMENTS = [
  { text: "Try Again", type: "none", gradient: ["1A1B21", "2A2B31"], weight: 2500 },
  { text: "$0.10 Bonus", type: "bonus", value: "BONUS010", gradient: ["CD7F32", "8B4513"], weight: 100 },
  { text: "Try Again", type: "none", gradient: ["1A1B21", "2A2B31"], weight: 2500 },
  { text: "$1 Bonus", type: "bonus", value: "BONUS100", gradient: ["C0C0C0", "A9A9A9"], weight: 50 },
  { text: "Try Again", type: "none", gradient: ["1A1B21", "2A2B31"], weight: 2500 },
  { text: "$2 Bonus", type: "bonus", value: "BONUS200", gradient: ["D7FF00", "BFDF00"], weight: 10 },
  { text: "$25 Bonus", type: "bonus", value: "BONUS2500", gradient: ["FFD700", "DAA520"], weight: 3 },
  { text: "$50 Bonus", type: "bonus", value: "BONUS5000", gradient: ["E5E4E2", "B4C4D4"], weight: 2 },
  { text: "$100 Bonus", type: "bonus", value: "BONUS10000", gradient: ["B9F2FF", "00BFFF"], weight: 1 },
  { text: "Try Again", type: "none", gradient: ["1A1B21", "2A2B31"], weight: 2500 }
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
      const chosenSegment = weightedRandom();
      const segmentAngle = 360 / SEGMENTS.length;
      // Adjust offset to ensure pointer aligns with segment center
      const offset = 0; // Remove randomness to ensure precise alignment
      const totalRotations = 5;
      // Adjust rotation to align with pointer at top center
      const targetRotation = 360 * totalRotations + (segmentAngle * chosenSegment) - (segmentAngle / 2);

      // 🚀 More Realistic Spin Animation
      await controls.start({
        rotate: [0, targetRotation + 10, targetRotation, targetRotation - 5, targetRotation],
        transition: {
          duration: 5,
          ease: [0.17, 0.67, 0.83, 0.67], // Smooth momentum effect
        }
      });

      setActiveSegment(chosenSegment);
      const reward = SEGMENTS[chosenSegment];

      // 🎉 Confetti & Glow Effect on Win
      if (reward.type === "bonus") {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });

        toast({
          title: `🎉 You Won!`,
          description: `Bonus Code: ${reward.value}`,
          variant: "default",
          className: "bg-[#D7FF00] text-black font-heading shadow-glow"
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
      <div className="min-h-screen bg-[#14151A] text-white flex flex-col items-center pt-20">
        <h1 className="text-4xl font-bold text-center mb-6">Daily Bonus Wheel</h1>
        <p className="text-[#8A8B91] mb-12">Spin for a chance to win bonus codes up to $100!</p>

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
                        fill={`#${segment.gradient[0]}`}
                      />
                    </g>
                  );
                })}
                <circle r="30" fill="#1A1B21" stroke="#D7FF00" strokeWidth="2" className="wheel-center"/>
              </g>
            </svg>
          </motion.div>
          
          {/* Fixed Pointer Arrow */}
          <div className="absolute top-0 left-1/2 -ml-3 -mt-4 w-6 h-6 pointer-events-none z-10">
            <div className="w-6 h-6 bg-[#D7FF00] transform rotate-45 filter wheel-glow" />
          </div>
        </motion.div>

        {/* Spin Button */}
        <Button onClick={spinWheel} disabled={isSpinning || !canSpin} className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90 text-lg px-8 py-6 mb-8">
          {isSpinning ? <LucideLoader className="w-4 h-4 animate-spin mr-2" /> : <Gift className="w-4 h-4 mr-2" />}
          {isSpinning ? "Spinning..." : "SPIN THE WHEEL"}
        </Button>

        {/* Prize Legend */}
        <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3" style={{backgroundColor: '#B9F2FF'}}></div>
            <span>Diamond - $100 Bonus</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3" style={{backgroundColor: '#E5E4E2'}}></div>
            <span>Platinum - $50 Bonus</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3" style={{backgroundColor: '#FFD700'}}></div>
            <span>Gold - $25 Bonus</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3" style={{backgroundColor: '#D7FF00'}}></div>
            <span>Silver - $2 Bonus</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3" style={{backgroundColor: '#C0C0C0'}}></div>
            <span>Bronze - $1 Bonus</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3" style={{backgroundColor: '#CD7F32'}}></div>
            <span>Copper - $0.10 Bonus</span>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}