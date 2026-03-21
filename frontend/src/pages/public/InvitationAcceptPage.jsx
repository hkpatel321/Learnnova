import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../lib/axios';
import useAuthStore from '../../store/authStore';
import { getApiErrorMessage } from '../../lib/apiError';

const InvitationAcceptPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const acceptInvitationMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post(`/invitations/${token}/accept`);
      return res.data?.data || res.data;
    },
    onSuccess: () => {
      toast.success('Invitation accepted');
      navigate('/my-courses', { replace: true });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to accept invitation'));
    },
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'learner' || !token) return;
    acceptInvitationMutation.mutate();
  }, [acceptInvitationMutation, isAuthenticated, token, user?.role]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Sign in to accept your invitation</h1>
          <p className="mt-2 text-sm text-gray-600">
            This course invitation is tied to your learner account. Sign in first, then reopen this link.
          </p>
          <Link
            to="/login"
            className="mt-5 inline-flex rounded-lg bg-[#2D31D4] px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (user?.role !== 'learner') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Learner account required</h1>
          <p className="mt-2 text-sm text-gray-600">
            Course invitations can only be accepted from a learner account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#2D31D4]" />
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Accepting invitation</h1>
        <p className="mt-2 text-sm text-gray-600">We’re enrolling you in the course now.</p>
      </div>
    </div>
  );
};

export default InvitationAcceptPage;
