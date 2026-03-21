import React from 'react';

const ErrorState = ({ title, message, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="text-gray-400 mb-4">
        <path
          d="M12 3L2.5 20h19L12 3zm0 5.5v5m0 3h.01"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-md">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-lg bg-[#2D31D4] text-white text-sm font-medium hover:bg-blue-800"
        >
          Try Again
        </button>
      ) : null}
    </div>
  );
};

export default ErrorState;
