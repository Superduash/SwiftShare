import React from 'react';

/**
 * A lightweight, theme-independent loading spinner.
 * Uses `currentColor` to automatically inherit the text color of its parent container,
 * ensuring perfect visibility across light, dark, and custom themes.
 */
const Spinner = ({ size = 24, className = '', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`animate-spin ${className}`}
      role="status"
      aria-label="Loading..."
      {...props}
    >
      {/* Background Track (Subtle) */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.2"
      />
      {/* Active Spinning Arch */}
      <path
        d="M12 2C6.47715 2 2 6.47715 2 12"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default Spinner;
