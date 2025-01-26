import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTutorial } from "./TutorialContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronLeft, ChevronRight, X, MousePointerClick } from "lucide-react";

export function TutorialOverlay() {
  const {
    isOpen,
    currentStep,
    steps,
    closeTutorial,
    nextStep,
    prevStep,
  } = useTutorial();

  const [highlightPosition, setHighlightPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    console.log("TutorialOverlay state:", { isOpen, currentStep });

    if (isOpen && steps[currentStep].element) {
      const element = document.querySelector(steps[currentStep].element!);
      if (element) {
        const rect = element.getBoundingClientRect();
        console.log("Found element:", steps[currentStep].element, rect);
        setHighlightPosition({
          top: rect.top + window.scrollY,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });

        // Scroll element into view if needed
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        // If it's a clickable element, add click handler
        if (steps[currentStep].highlightStyle === "click") {
          const handleClick = () => {
            nextStep();
          };
          element.addEventListener("click", handleClick);
          return () => element.removeEventListener("click", handleClick);
        }
      } else {
        console.log("Element not found:", steps[currentStep].element);
      }
    }
  }, [currentStep, isOpen, steps]);

  if (!isOpen) return null;

  const currentTutorialStep = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center">
        {/* Semi-transparent backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
        />

        {/* Highlight box for current element */}
        {currentTutorialStep.element && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute z-[210] rounded-lg transition-all duration-300 ${
              currentTutorialStep.highlightStyle === "click"
                ? "border-4 border-[#D7FF00] shadow-[0_0_30px_rgba(215,255,0,0.3)]"
                : "border-2 border-white/50"
            }`}
            style={{
              top: highlightPosition.top,
              left: highlightPosition.left,
              width: highlightPosition.width,
              height: highlightPosition.height,
              // Clear the area around the highlighted element
              boxShadow: `0 0 0 9999px ${
                currentTutorialStep.highlightStyle === "click"
                  ? "rgba(0, 0, 0, 0.7)"
                  : "rgba(0, 0, 0, 0.85)"
              }`,
            }}
          >
            {/* Click indicator for clickable elements */}
            {currentTutorialStep.highlightStyle === "click" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-[#D7FF00] text-black px-3 py-1 rounded-full text-sm font-medium"
              >
                <MousePointerClick className="h-4 w-4" />
                Click here
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Tutorial card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="relative z-[220]"
          style={{
            position: "absolute",
            ...(currentTutorialStep.position === "bottom"
              ? { top: highlightPosition.top + highlightPosition.height + 20 }
              : currentTutorialStep.position === "top"
              ? { bottom: window.innerHeight - highlightPosition.top + 20 }
              : { top: "50%" }),
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <Card className="w-[400px] bg-[#1A1B21] border-[#2A2B31] shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-white">
                  {currentTutorialStep.title}
                </CardTitle>
                {currentTutorialStep.allowClose && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeTutorial}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <CardDescription className="text-[#8A8B91]">
                Step {currentStep + 1} of {steps.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-white">{currentTutorialStep.description}</p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="ghost"
                onClick={prevStep}
                disabled={isFirstStep}
                className={`${isFirstStep ? "invisible" : ""} text-white hover:text-[#D7FF00]`}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                onClick={nextStep}
                className="bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90"
              >
                {isLastStep ? "Finish" : "Next"}
                {!isLastStep && <ChevronRight className="h-4 w-4 ml-2" />}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}