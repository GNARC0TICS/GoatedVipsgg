import { createContext, useContext, useState, ReactNode, useEffect } from "react";
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
  allowClose?: boolean; // Only show close button when true
}

// Tutorial steps - easily customizable
export const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Goated x Goombas VIPs! 🎉",
    description: "Let's explore how to maximize your rewards as an affiliate. I'll guide you through our platform's key features.",
    position: "bottom",
  },
  {
    id: "get-started",
    title: "Getting Started",
    description: "Click the GET STARTED dropdown to learn the basics of our platform. You'll find our comprehensive guide under 'How It Works'.",
    element: "#get-started-dropdown",
    position: "bottom",
    action: "click",
  },
  {
    id: "how-it-works",
    title: "Platform Guide",
    description: "Click 'How It Works' to see a detailed guide on linking your account and maximizing your rewards.",
    element: "#how-it-works-button",
    position: "bottom",
    page: "/how-it-works",
  },
  {
    id: "leaderboard",
    title: "Track Your Progress",
    description: "View your ranking and compete with other affiliates on our leaderboards.",
    element: "#leaderboard-nav",
    position: "bottom",
    page: "/leaderboard",
  },
  {
    id: "vip-program",
    title: "VIP Benefits",
    description: "Discover exclusive rewards and perks in our VIP program.",
    element: "#vip-program-link",
    position: "bottom",
    page: "/vip-program",
  },
  {
    id: "telegram",
    title: "Join Our Community",
    description: "Connect with other affiliates and get instant updates on bonus codes through our Telegram channel.",
    element: "#telegram-link",
    position: "bottom",
    page: "/telegram",
  },
  {
    id: "support",
    title: "24/7 Support",
    description: "Need help? Our support team is always here to assist you.",
    element: "#support-button",
    position: "right",
    allowClose: true,
  },
];

interface TutorialState {
  version: number;
  hasSeenTutorial: boolean;
  lastCompletedStep: number;
  lastVisitDate: string;
}

const TUTORIAL_VERSION = 1; // Increment this when tutorial content changes significantly
const TUTORIAL_STORAGE_KEY = 'tutorial_state';

const getInitialTutorialState = (): TutorialState => {
  try {
    const savedState = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      // If saved version is different from current, treat as new
      if (parsed.version !== TUTORIAL_VERSION) {
        return {
          version: TUTORIAL_VERSION,
          hasSeenTutorial: false,
          lastCompletedStep: -1,
          lastVisitDate: new Date().toISOString()
        };
      }
      return parsed;
    }
  } catch (error) {
    console.error('Error reading tutorial state:', error);
  }

  return {
    version: TUTORIAL_VERSION,
    hasSeenTutorial: false,
    lastCompletedStep: -1,
    lastVisitDate: new Date().toISOString()
  };
};

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
  resetTutorial: () => void; // New function to reset tutorial state
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tutorialState, setTutorialState] = useState<TutorialState>(getInitialTutorialState);
  const [, setLocation] = useLocation();

  const saveTutorialState = (newState: Partial<TutorialState>) => {
    const updatedState = {
      ...tutorialState,
      ...newState,
      lastVisitDate: new Date().toISOString()
    };
    setTutorialState(updatedState);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(updatedState));
    console.log('Saved tutorial state:', updatedState);
  };

  // Debug logs
  useEffect(() => {
    console.log("Tutorial State:", { isOpen, currentStep, tutorialState });
  }, [isOpen, currentStep, tutorialState]);

  const openTutorial = () => {
    console.log("Opening tutorial...");
    setIsOpen(true);
    setCurrentStep(0);
  };

  const closeTutorial = () => {
    // Only close if the current step allows it
    if (tutorialSteps[currentStep].allowClose) {
      console.log("Closing tutorial...");
      setIsOpen(false);
      setCurrentStep(0);
      saveTutorialState({
        hasSeenTutorial: true,
        lastCompletedStep: currentStep
      });
    }
  };

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      const nextStep = tutorialSteps[currentStep + 1];
      console.log("Moving to next step:", nextStep.id);
      if (nextStep.page) {
        setLocation(nextStep.page);
      }
      setCurrentStep(currentStep + 1);
      saveTutorialState({ lastCompletedStep: currentStep });
    } else {
      console.log("Tutorial completed");
      setIsOpen(false);
      saveTutorialState({
        hasSeenTutorial: true,
        lastCompletedStep: currentStep
      });
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const prevStep = tutorialSteps[currentStep - 1];
      console.log("Moving to previous step:", prevStep.id);
      if (prevStep.page) {
        setLocation(prevStep.page);
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step < tutorialSteps.length) {
      const targetStep = tutorialSteps[step];
      console.log("Going to step:", targetStep.id);
      if (targetStep.page) {
        setLocation(targetStep.page);
      }
      setCurrentStep(step);
    }
  };

  const resetTutorial = () => {
    console.log("Resetting tutorial state...");
    const initialState = {
      version: TUTORIAL_VERSION,
      hasSeenTutorial: false,
      lastCompletedStep: -1,
      lastVisitDate: new Date().toISOString()
    };
    setTutorialState(initialState);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(initialState));
    setIsOpen(false);
    setCurrentStep(0);
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
        hasSeenTutorial: tutorialState.hasSeenTutorial,
        setHasSeenTutorial: (value) => 
          saveTutorialState({ hasSeenTutorial: value }),
        resetTutorial,
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