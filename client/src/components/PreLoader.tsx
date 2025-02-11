import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";

interface PreLoaderProps {
  onLoadComplete: () => void;
}

export function PreLoader({ onLoadComplete }: PreLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);

  // Track asset loading with improved error handling
  const checkAssetsLoading = useCallback(async () => {
    try {
      // Critical assets that must be loaded before showing the app
      const criticalAssets = [
        '/images/preload.PNG',
        '/images/FINAL.mp4',
        '/images/RACEFLAG.MP4',
        // Add other critical assets here
      ];

      const loadPromises = criticalAssets.map(src => {
        if (src.endsWith('.mp4')) {
          return new Promise((resolve) => {
            const video = document.createElement('video');
            video.onloadeddata = () => resolve(true);
            video.onerror = () => {
              console.error(`Failed to load video: ${src}`);
              resolve(false);
            };
            video.src = src;
          });
        } else {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => {
              console.error(`Failed to load image: ${src}`);
              resolve(false);
            };
            img.src = src;
          });
        }
      });

      // Track loading progress
      let loaded = 0;
      const total = loadPromises.length;

      await Promise.all(
        loadPromises.map(p => 
          p.then(() => {
            loaded++;
            // Update progress based on actual asset loading
            setProgress(prev => Math.max(prev, (loaded / total) * 100));
          })
        )
      );

      setAssetsLoaded(true);
    } catch (error) {
      console.error('Error loading assets:', error);
      setAssetsLoaded(true); // Continue anyway to prevent blocking
    }
  }, []);

  useEffect(() => {
    checkAssetsLoading();

    const duration = 2500; // 2.5 seconds total
    const interval = 16; // ~60fps for smooth animation
    const steps = duration / interval;
    const increment = 100 / steps;

    let currentProgress = 0;
    const timer = setInterval(() => {
      if (currentProgress >= 100) {
        clearInterval(timer);
        if (assetsLoaded) {
          setIsAnimating(false);
          setTimeout(() => {
            onLoadComplete();
          }, 500);
        }
        return;
      }

      // Smooth progress animation with easing
      const remainingProgress = 100 - currentProgress;
      const step = Math.min(increment, remainingProgress * 0.1);

      currentProgress += step;
      setProgress(prev => Math.max(prev, currentProgress));
    }, interval);

    return () => {
      clearInterval(timer);
    };
  }, [onLoadComplete, assetsLoaded]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-[#14151A] z-50 flex flex-col items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center gap-8"
      >
        <motion.img
          src="/images/preload.PNG"
          alt="Goated Preloader"
          className="w-64 h-64 object-contain"
          animate={{
            scale: [1, 1.02, 1],
            opacity: [0.9, 1, 0.9],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="w-64 h-1 bg-[#2A2B31] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#D7FF00]"
            initial={{ width: "0%" }}
            animate={{ 
              width: `${Math.floor(progress)}%`,
              transition: { duration: 0.3, ease: "easeOut" }
            }}
          />
        </div>

        <motion.p 
          className="text-[#D7FF00] font-heading text-xl"
          animate={{
            opacity: [1, 0.7, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {Math.floor(progress)}%
        </motion.p>
      </motion.div>
    </motion.div>
  );
}