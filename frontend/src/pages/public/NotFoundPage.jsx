import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-secondary flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-[120px] leading-none font-black text-[#2D31D4]/25">404</h1>
      <h2 className="text-2xl font-bold text-gray-900 mt-2">Page not found</h2>
      <p className="text-gray-500 mt-2">The page you're looking for doesn't exist.</p>
      <Link to="/" className="mt-6 px-5 py-2.5 bg-[#2D31D4] text-white rounded-lg font-semibold hover:bg-blue-800">
        ← Go Home
      </Link>
    </div>
  );
}
