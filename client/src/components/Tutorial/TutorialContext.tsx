import { createContext, useContext, useState, ReactNode } from "react";
import { useLocation } from "wouter";

// Define tutorial step interface for easy extensibility
export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  element?: string; // CSS selector for the element to highlight
  position?: "top" | "bottom" | "left" | "right";
  page?: string; // Route to navigate to for this step
  action?: "click" | "hover" | "scroll" | null;
}

// Tutorial steps - easily customizable
export const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Goated Rewards! 🎉",
    description: "Let's take a quick tour of our platform and show you how to maximize your rewards as an affiliate.",
    position: "center",
  },
  {
    id: "get-started",
    title: "Getting Started",
    description: "Click here to learn the basics of our platform, including tips and strategies for success.",
    element: "#get-started-button",
    position: "bottom",
    action: "hover",
  },
  {
    id: "leaderboard",
    title: "Competitive Rankings",
    description: "Track your performance and compete with other affiliates on our leaderboards.",
    element: "#leaderboard-nav",
    position: "bottom",
    page: "/leaderboard",
  },
  {
    id: "vip-program",
    title: "VIP Benefits",
    description: "Discover exclusive rewards and benefits as you progress through our VIP tiers.",
    element: "#vip-program-link",
    position: "bottom",
    page: "/vip-program",
  },
  {
    id: "telegram",
    title: "Join Our Community",
    description: "Connect with other affiliates and stay updated with our latest news on Telegram.",
    element: "#telegram-link",
    position: "bottom",
  },
  {
    id: "support",
    title: "24/7 Support",
    description: "Need help? Our support team is always here to assist you.",
    element: "#support-button",
    position: "right",
  },
  {
    id: "newsletter",
    title: "Stay Updated",
    description: "Subscribe to our newsletter for exclusive offers and updates.",
    element: "#newsletter-form",
    position: "top",
  },
];

interface TutorialContextType {
  isOpen: boolean;
  currentStep: number;
  steps: TutorialStep[];
  openTutorial: () => void;
  closeTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  hasSeenTutorial: boolean;
  setHasSeenTutorial: (value: boolean) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(() => {
    return localStorage.getItem("hasSeenTutorial") === "true";
  });
  const [, setLocation] = useLocation();

  const openTutorial = () => {
    setIsOpen(true);
    setCurrentStep(0);
  };

  const closeTutorial = () => {
    setIsOpen(false);
    setCurrentStep(0);
    setHasSeenTutorial(true);
    localStorage.setItem("hasSeenTutorial", "true");
  };

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      const nextStep = tutorialSteps[currentStep + 1];
      if (nextStep.page) {
        setLocation(nextStep.page);
      }
      setCurrentStep(currentStep + 1);
    } else {
      closeTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const prevStep = tutorialSteps[currentStep - 1];
      if (prevStep.page) {
        setLocation(prevStep.page);
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step < tutorialSteps.length) {
      const targetStep = tutorialSteps[step];
      if (targetStep.page) {
        setLocation(targetStep.page);
      }
      setCurrentStep(step);
    }
  };

  return (
    <TutorialContext.Provider
      value={{
        isOpen,
        currentStep,
        steps: tutorialSteps,
        openTutorial,
        closeTutorial,
        nextStep,
        prevStep,
        goToStep,
        hasSeenTutorial,
        setHasSeenTutorial,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}