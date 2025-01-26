import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTutorial } from "./TutorialContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function TutorialPrompt() {
  const { hasSeenTutorial, setHasSeenTutorial, openTutorial, resetTutorial } = useTutorial();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Wait for a short delay before showing the prompt
    const timer = setTimeout(() => {
      setIsVisible(!hasSeenTutorial);
    }, 1000);

    console.log("TutorialPrompt mounted, hasSeenTutorial:", hasSeenTutorial);
    return () => clearTimeout(timer);
  }, [hasSeenTutorial]);

  const handleSkip = () => {
    console.log("Tutorial skipped");
    setIsVisible(false);
    setHasSeenTutorial(true);
  };

  const handleStart = () => {
    console.log("Starting tutorial");
    setIsVisible(false);
    openTutorial();
  };

  const handleReset = () => {
    console.log("Resetting tutorial");
    resetTutorial();
    setIsVisible(true);
  };

  // For development/testing, always show reset button
  return (
    <>
      {/* Reset button for testing - always visible */}
      <button
        onClick={handleReset}
        className="fixed top-4 right-4 z-[100] bg-[#D7FF00] text-black px-4 py-2 rounded-lg shadow-lg hover:bg-[#D7FF00]/90"
      >
        Reset Tutorial
      </button>

      {/* Tutorial prompt */}
      {isVisible && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 z-[100]"
          >
            <Card className="w-[400px] bg-[#1A1B21] border-[#2A2B31] shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-white">
                    Welcome to Goated x Goombas VIPs! 🎉
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSkip}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>
                  Would you like a quick tour of our platform?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-[#8A8B91]">
                  Learn how to maximize your rewards and discover all the features
                  available to you.
                </p>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="ghost" onClick={handleSkip}>
                  Maybe Later
                </Button>
                <Button
                  onClick={handleStart}
                  className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90"
                >
                  Start Tour
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}