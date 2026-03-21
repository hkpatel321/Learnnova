// Button.jsx
import { Loader2 } from 'lucide-react';

export default function Button({
  className = '',
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  children,
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
    secondary: 'bg-secondary text-primary hover:bg-primary-light focus:ring-primary',
    outline: 'border-2 border-primary text-primary hover:bg-primary-light focus:ring-primary',
    ghost: 'text-gray-600 hover:text-primary hover:bg-primary-light focus:ring-primary',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
      {children}
    </button>
  );
}
