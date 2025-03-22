/**
 * Utility functions for card effects
 */

/**
 * Initializes mouse tracking for premium cards
 * This function adds event listeners to track mouse position over cards
 * and sets CSS variables for the radial gradient effect
 */
export function initializePremiumCards() {
  // Find all premium cards in the document
  const cards = document.querySelectorAll('.premium-card');
  
  // Add mouse move event listener to each card
  cards.forEach(card => {
    card.addEventListener('mousemove', (e: Event) => {
      const mouseEvent = e as MouseEvent;
      const rect = card.getBoundingClientRect();
      const x = mouseEvent.clientX - rect.left;
      const y = mouseEvent.clientY - rect.top;
      
      // Set CSS variables for the radial gradient effect
      (card as HTMLElement).style.setProperty('--mouse-x', `${x}px`);
      (card as HTMLElement).style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

/**
 * Applies shimmer effect to elements
 * This function adds the shimmer class to elements for loading states
 * @param selector - CSS selector for elements to apply shimmer effect
 * @param isLoading - Whether the shimmer effect should be active
 */
export function applyShimmerEffect(selector: string, isLoading: boolean) {
  const elements = document.querySelectorAll(selector);
  
  elements.forEach(element => {
    if (isLoading) {
      element.classList.add('shimmer');
    } else {
      element.classList.remove('shimmer');
    }
  });
}

/**
 * Applies enhanced table row effects
 * This function adds the enhanced-table-row class to table rows
 */
export function enhanceTableRows() {
  const tableRows = document.querySelectorAll('tbody tr');
  
  tableRows.forEach(row => {
    row.classList.add('enhanced-table-row');
  });
}
