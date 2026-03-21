import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import AppRouter from './router/AppRouter';
import useAuthStore from './store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="animate-fadeIn">
          <AppRouter />
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            success: {
              duration: 3000,
              style: { background: '#10B981', color: 'white' },
            },
            error: {
              duration: 4000,
              style: { background: '#EF4444', color: 'white' },
            },
            loading: {
              style: { background: '#2D31D4', color: 'white' },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
