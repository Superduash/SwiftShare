import React from 'react';

/**
 * Highly optimized, hardware-accelerated Spinner.
 * Uses a dedicated wrapper for rotation to prevent SVG painting jitter.
 */
const Spinner = ({ size = 24, className = '', style, ...props }) => {
  return (
    <span
      className={`inline-block ${className}`}
      style={{
        width: size,
        height: size,
        animation: 'ss-spin 0.8s linear infinite',
        willChange: 'transform',
        transform: 'translateZ(0)',
        ...style
      }}
      role="status"
      aria-label="Loading..."
      {...props}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          strokeOpacity="0.2"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M12 2C6.47715 2 2 6.47715 2 12"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
};

export default Spinner;
