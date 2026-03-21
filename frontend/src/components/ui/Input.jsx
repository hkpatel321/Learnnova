// Input.jsx
import { forwardRef } from 'react';

const Input = forwardRef(({ label, error, icon: Icon, className = '', id, ...props }, ref) => {
  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label htmlFor={id} className="mb-1 text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Icon size={18} />
          </div>
        )}
        <input
          ref={ref}
          id={id}
          className={`
            block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2
            ${Icon ? 'pl-10' : ''}
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500 placeholder-red-300' 
              : 'border-gray-300 focus:border-primary focus:ring-primary placeholder-gray-400'}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
