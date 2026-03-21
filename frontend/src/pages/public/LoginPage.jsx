import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../lib/axios';
import useAuthStore from '../../store/authStore';
import Spinner from '../../components/ui/Spinner';

const LoginPage = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const onSubmit = async (data) => {
    try {
      const response = await axios.post('/auth/login', data);
      const { accessToken, user } = response.data.data;
      
      setAuth(user, accessToken);
      toast.success(`Welcome back, ${user?.name || 'learner'}! 👋`);
      
      if (user.role === 'admin' || user.role === 'instructor') {
        navigate('/backoffice/courses');
      } else {
        navigate('/my-courses');
      }
    } catch {
      toast.error('Invalid email or password');
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white">
      {/* Left Panel */}
      <div className="md:w-1/2 bg-[#2D31D4] text-white p-8 md:p-16 flex flex-col relative overflow-hidden hidden md:flex justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 z-10">
          <GraduationCap className="w-8 h-8 text-white" />
          <span className="text-2xl font-bold font-plus-jakarta-sans tracking-tight">Learnova</span>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-center mt-12 md:mt-0 z-10">
          <h1 className="text-4xl md:text-[48px] font-extrabold font-plus-jakarta-sans mb-4 leading-tight text-white">
            Learn Without Limits
          </h1>
          <p className="text-[18px] text-white/80 mb-10 max-w-md font-inter">
            Join thousands of learners building real skills.
          </p>

          <div className="space-y-4">
            {[
              'Expert-crafted courses',
              'Learn at your own pace',
              'Earn badges as you grow'
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-white bg-transparent rounded-full" />
                <span className="text-lg font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Abstract Wave Background */}
        <svg
          className="absolute bottom-0 right-0 w-full h-auto text-[#1E2299] opacity-40 pointer-events-none"
          viewBox="0 0 400 300"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0,300 C100,200 200,350 400,100 L400,300 Z" />
        </svg>
      </div>
      
      {/* Mobile Header (Only visible on mobile) */}
      <div className="md:hidden bg-[#2D31D4] text-white p-6 flex flex-col items-center justify-center relative overflow-hidden">
         <div className="flex items-center gap-2 z-10">
          <GraduationCap className="w-8 h-8 text-white" />
          <span className="text-2xl font-bold font-plus-jakarta-sans tracking-tight">Learnova</span>
        </div>
      </div>

      {/* Right Panel */}
      <div className="md:w-1/2 flex items-center justify-center p-8 md:p-16 bg-white w-full">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center md:text-left">
            <h2 className="text-2xl md:text-[28px] font-bold font-plus-jakarta-sans text-gray-900 mb-2">
              Welcome back
            </h2>
            <p className="text-[14px] text-gray-500">
              Sign in to continue learning
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className={`block w-full pl-10 pr-3 py-2.5 border ${
                    errors.email ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-[#2D31D4] focus:border-[#2D31D4]'
                  } rounded-lg text-sm transition-colors outline-none`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                 <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
              </div>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { required: 'Password is required' })}
                  className={`block w-full pl-10 pr-10 py-2.5 border ${
                    errors.password ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-[#2D31D4] focus:border-[#2D31D4]'
                  } rounded-lg text-sm transition-colors outline-none`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              
               <div className="flex justify-between items-center mt-1">
                 {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
                {!errors.password && <div></div>}
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-[#2D31D4] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center h-11 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#2D31D4] hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2D31D4] disabled:opacity-70 disabled:cursor-not-allowed transition-colors font-semibold mt-2"
            >
              {isSubmitting ? (
                <Spinner size="sm" className="mr-2 [&_svg]:text-white" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Don't have an account? </span>
            <Link
              to="/register"
              className="font-medium text-[#2D31D4] hover:underline"
            >
              Create one →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
