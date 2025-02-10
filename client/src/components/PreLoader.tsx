
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface PreLoaderProps {
  onLoadComplete: () => void;
}

export function PreLoader({ onLoadComplete }: PreLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // Create artificial loading stages
    const stages = [
      { target: 30, duration: 500 },
      { target: 60, duration: 800 },
      { target: 85, duration: 500 },
      { target: 100, duration: 700 }
    ];

    let currentStage = 0;
    
    // Preload the image
    const img = new Image();
    img.src = "/images/preload.PNG";
    img.onload = () => setImageLoaded(true);

    const animateStage = () => {
      if (currentStage >= stages.length) return;
      
      const stage = stages[currentStage];
      const startProgress = currentStage > 0 ? stages[currentStage - 1].target : 0;
      const increment = (stage.target - startProgress) / (stage.duration / 50);
      let currentProgress = startProgress;

      const interval = setInterval(() => {
        if (currentProgress >= stage.target) {
          clearInterval(interval);
          currentStage++;
          if (currentStage < stages.length) {
            setTimeout(animateStage, 200); // Add slight pause between stages
          } else if (imageLoaded) {
            setTimeout(onLoadComplete, 500);
          }
        } else {
          currentProgress = Math.min(currentProgress + increment, stage.target);
          setProgress(Math.floor(currentProgress));
        }
      }, 50);
    };

    animateStage();
  }, [onLoadComplete, imageLoaded]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#14151A] z-50 flex flex-col items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center gap-8"
      >
        <img
          src="/images/preload.PNG"
          alt="Goated Preloader"
          className="w-64 h-64 object-contain animate-pulse-subtle"
        />
        <div className="w-64 h-1 bg-[#2A2B31] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#D7FF00]"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
        <p className="text-[#D7FF00] font-heading text-xl">
          {progress}%
        </p>
      </motion.div>
    </motion.div>
  );
}
