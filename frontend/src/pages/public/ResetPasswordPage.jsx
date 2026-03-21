import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../lib/axios';
import { applyApiFieldErrors, getApiErrorMessage } from '../../lib/apiError';
import Spinner from '../../components/ui/Spinner';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [serverMessage, setServerMessage] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm();

  const password = watch('password');

  const onSubmit = async ({ password: nextPassword }) => {
    setServerMessage('');
    clearErrors('root');

    try {
      const response = await axios.post('/auth/reset-password', {
        token,
        password: nextPassword,
      });

      const message = response.data?.message || 'Password reset successful. You can now sign in.';
      toast.success(message);
      navigate('/login');
    } catch (error) {
      const hasFieldErrors = applyApiFieldErrors(error, setError);
      const message = getApiErrorMessage(error, 'Unable to reset password');

      if (!hasFieldErrors) {
        setServerMessage(message);
      }

      toast.error(message);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EEF2FF] via-white to-[#E0F2FE] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-8 text-center shadow-[0_24px_80px_rgba(45,49,212,0.12)]">
          <h1 className="text-2xl font-bold text-gray-900">Reset link missing</h1>
          <p className="mt-2 text-sm text-gray-500">
            This reset link is incomplete. Request a new password reset email to continue.
          </p>
          <Link
            to="/forgot-password"
            className="mt-6 inline-flex rounded-xl bg-[#2D31D4] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2326a6]"
          >
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF2FF] via-white to-[#E0F2FE] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-8 shadow-[0_24px_80px_rgba(45,49,212,0.12)] backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2D31D4] text-white">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set a new password</h1>
          <p className="mt-2 text-sm text-gray-500">
            Choose a strong password for your Learnova account.
          </p>
        </div>

        {serverMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">New password</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                placeholder="At least 6 characters"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
                className={`block w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none transition ${
                  errors.password
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-[#2D31D4] focus:ring-[#2D31D4]'
                }`}
              />
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Confirm password</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                placeholder="Re-enter your password"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) => value === password || 'Passwords do not match',
                })}
                className={`block w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none transition ${
                  errors.confirmPassword
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-[#2D31D4] focus:ring-[#2D31D4]'
                }`}
              />
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-[#2D31D4] px-4 text-sm font-semibold text-white transition hover:bg-[#2326a6] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? <Spinner size="sm" className="mr-2 [&_svg]:text-white" /> : 'Reset Password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          <Link to="/login" className="font-semibold text-[#2D31D4] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
