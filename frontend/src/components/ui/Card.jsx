// Card.jsx
export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-white border text-gray-900 border-gray-200 rounded-xl shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
