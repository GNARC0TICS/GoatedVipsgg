// Header styling
export const headerClasses = {
  container: "fixed top-0 left-0 right-0 z-50 bg-[#14151A]/80 backdrop-blur-xl border-b border-[#2A2B31]/50 shadow-sm transition-all duration-300",
  nav: "container mx-auto h-16 px-4 flex items-center justify-between",
  logo: "h-8 w-auto relative z-10 transition-all duration-300 hover:scale-105 hover:brightness-110",
  menuButton: "md:hidden relative overflow-hidden group",
  desktopNav: "hidden md:flex items-center space-x-6",
  userSection: "flex items-center space-x-4",
};

// Dropdown styling
export const dropdownClasses = {
  content: "w-56 bg-[#1A1B21]/95 backdrop-blur-xl border border-[#2A2B31] rounded-xl shadow-2xl py-2 px-1",
  item: "px-4 py-2 font-medium text-white hover:text-[#D7FF00] hover:bg-[#2A2B31]/50 rounded-lg transition-colors duration-200 cursor-pointer",
};

// Footer styling
export const footerClasses = {
  wrapper: "bg-[#D7FF00] relative mt-auto border-t-4 border-[#2A2B31]",
  container: "container mx-auto px-4 py-16",
  grid: "grid grid-cols-1 md:grid-cols-2 gap-12",
  heading: "font-heading text-[#14151A] text-2xl font-bold",
};

// Animation variants
export const hoverVariants = {
  initial: { x: 0 },
  hover: { x: 5, transition: { duration: 0.3 } },
};
