import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { GraduationCap, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../lib/axios';
import { applyApiFieldErrors, getApiErrorMessage } from '../../lib/apiError';
import Spinner from '../../components/ui/Spinner';

const ForgotPasswordPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
    clearErrors,
  } = useForm();
  const [serverMessage, setServerMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const onSubmit = async (data) => {
    setServerMessage('');
    setSuccessMessage('');
    clearErrors('root');

    try {
      const response = await axios.post('/auth/forgot-password', data);
      const message = response.data?.message || 'If that email is registered, a password reset link has been sent.';
      setSuccessMessage(message);
      toast.success(message);
      reset();
    } catch (error) {
      const hasFieldErrors = applyApiFieldErrors(error, setError);
      const message = getApiErrorMessage(error, 'Unable to send reset email');

      if (!hasFieldErrors) {
        setServerMessage(message);
      }

      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF2FF] via-white to-[#E0F2FE] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-8 shadow-[0_24px_80px_rgba(45,49,212,0.12)] backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2D31D4] text-white">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Forgot your password?</h1>
          <p className="mt-2 text-sm text-gray-500">
            Enter your email address and we'll send you a reset link.
          </p>
        </div>

        {successMessage && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {serverMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                className={`block w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none transition ${
                  errors.email
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-[#2D31D4] focus:ring-[#2D31D4]'
                }`}
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-[#2D31D4] px-4 text-sm font-semibold text-white transition hover:bg-[#2326a6] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? <Spinner size="sm" className="mr-2 [&_svg]:text-white" /> : 'Send Reset Link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Remembered it?{' '}
          <Link to="/login" className="font-semibold text-[#2D31D4] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
