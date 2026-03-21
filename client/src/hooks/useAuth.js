import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { clearToken, isLoggedIn } from '../lib/auth';

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
    enabled: isLoggedIn(),       // only fetch if a token exists
    staleTime: 5 * 60 * 1000,   // 5 minutes
    retry: false,                // don't retry on 401
  });

  function logout() {
    clearToken();
    queryClient.clear();
    navigate('/login');
  }

  return {
    user: data ?? null,
    isLoading,
    isLoggedIn: isLoggedIn(),
    logout,
  };
}
