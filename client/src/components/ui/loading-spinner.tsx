import * as React from "react";

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D7FF00]"></div>
    </div>
  );
}
