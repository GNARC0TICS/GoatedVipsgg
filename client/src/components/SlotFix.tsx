
import React from 'react';

/**
 * Helper component to wrap multiple children in a fragment
 * when using components with asChild prop
 */
export function SingleChild({ children }: { children: React.ReactNode }) {
  // If there are multiple children, wrap them in a fragment
  const childrenArray = React.Children.toArray(children);
  
  if (childrenArray.length === 0) {
    return null;
  }
  
  if (childrenArray.length === 1) {
    return <>{childrenArray[0]}</>;
  }
  
  // When multiple children, wrap in a span to ensure only one element is passed
  return <span>{children}</span>;
}
