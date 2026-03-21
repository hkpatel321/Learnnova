import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, GraduationCap, User } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../lib/axios';
import useAuthStore from '../../store/authStore';

const RegisterPage = () => {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('learner');
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const password = watch('password', '');

  const getPasswordStrength = () => {
    if (!password) return { color: 'bg-gray-200', text: '' };
    if (password.length < 6) return { color: 'bg-red-500 w-1/3', text: 'Weak' };
    
    // Check for symbols/numbers for strong password
    const hasSymbolOrNumber = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?0-9]+/.test(password);
    
    if (password.length >= 10 && hasSymbolOrNumber) {
      return { color: 'bg-green-500 w-full', text: 'Strong' };
    }
    
    return { color: 'bg-amber-500 w-2/3', text: 'Good' };
  };

  const strength = getPasswordStrength();

  const onSubmit = async (data) => {
    try {
      // API call to register endpoint
      const response = await axios.post('/api/auth/register', {
        ...data,
        role: selectedRole
      });
      
      const { token, user } = response.data;
      
      // Auto-login on success
      setAuth(user, token);
      
      toast.success('Account created successfully!');
      
      if (user.role === 'admin' || user.role === 'instructor') {
        navigate('/instructor/courses');
      } else {
        navigate('/my-courses');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white font-inter">
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
      <div className="md:w-1/2 flex items-center justify-center p-8 md:p-12 overflow-y-auto w-full bg-white">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center md:text-left">
            <h2 className="text-2xl md:text-[28px] font-bold font-plus-jakarta-sans text-gray-900 mb-2">
              Create your account
            </h2>
            <p className="text-[14px] text-gray-500">
              Start learning today
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
             {/* Role Selector */}
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedRole('learner')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    selectedRole === 'learner' 
                      ? 'border-[#2D31D4] bg-[#EEF0FF]' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl mb-1">🎓</span>
                  <span className="text-sm font-medium text-gray-800">Learner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('instructor')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    selectedRole === 'instructor' 
                      ? 'border-[#2D31D4] bg-[#EEF0FF]' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl mb-1">👨‍🏫</span>
                  <span className="text-sm font-medium text-gray-800">Instructor</span>
                </button>
              </div>
            </div>

            {/* Full Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  {...register('name', { required: 'Full name is required' })}
                  className={`block w-full pl-10 pr-3 py-2.5 border ${
                    errors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-[#2D31D4] focus:border-[#2D31D4]'
                  } rounded-lg text-sm transition-colors outline-none`}
                  placeholder="John Doe"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-[12px] text-red-500">{errors.name.message}</p>
              )}
            </div>

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
                    errors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-[#2D31D4] focus:border-[#2D31D4]'
                  } rounded-lg text-sm transition-colors outline-none`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-[12px] text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { 
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                  className={`block w-full pl-10 pr-10 py-2.5 border ${
                    errors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-[#2D31D4] focus:border-[#2D31D4]'
                  } rounded-lg text-sm transition-colors outline-none`}
                  placeholder="Create a password"
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
              
              {/* Password Strength Indicator */}
              <div className="mt-2 h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                 <div 
                  className={`h-full transition-all duration-300 ${strength.color}`}
                 ></div>
              </div>
              
              <div className="flex justify-between items-center mt-1">
                 {errors.password ? (
                  <p className="text-[12px] text-red-500">{errors.password.message}</p>
                ) : (
                  <p className="text-[12px] text-gray-500">{strength.text}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center h-11 py-2 px-4 shadow-sm text-sm font-medium text-white bg-[#2D31D4] hover:bg-blue-800 disabled:opacity-70 disabled:cursor-not-allowed rounded-lg transition-colors font-semibold mt-4"
            >
              {isSubmitting ? (
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link
              to="/login"
              className="font-medium text-[#2D31D4] hover:underline"
            >
              Sign In →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;