import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-secondary flex flex-col items-center justify-center">
      <h1 className="text-6xl font-heading font-bold text-gray-900 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">Page not found.</p>
      <Link to="/" className="px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark">
        Return Home
      </Link>
    </div>
  );
}
