import { useState } from 'react';
import { X } from 'lucide-react';

export function SupportWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
      <div className="bg-[#1A1B21]/90 backdrop-blur-sm border border-[#2A2B31] rounded-lg shadow-lg overflow-hidden relative">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
          }}
          className="absolute top-2 left-2 text-black hover:text-[#2A2B31] p-1"
        >
          <X size={14} />
        </button>
        {/* Rest of the SupportWidget content */}
      </div>
    </div>
  );
}

// Placeholder for ScrollToTop component and RaceTimer component.  These need to be defined elsewhere and integrated based on their original implementation.  The ScrollToTop button position should be adjusted as needed.
function ScrollToTop() {
  //Implementation for scrolling to top
  return <button className="fixed bottom-4 left-4">Scroll to Top</button>
}

function RaceTimer() {
  //Implementation for RaceTimer.  A close button needs to be added here similar to SupportWidget.
  return <div>Race Timer</div>
}


//Example usage (you will need to adjust based on your actual app structure)
function App() {
  return (
    <div>
      <ScrollToTop />
      <SupportWidget />
      <RaceTimer />
    </div>
  );
}

export default App;