import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, BookOpen } from 'lucide-react';
import axios from '../../lib/axios';
import CourseCard from '../../components/course/CourseCard';
import useAuthStore from '../../store/authStore';

export default function CourseCatalogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { isAuthenticated } = useAuthStore();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['catalog', searchQuery],
    queryFn: async () => {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await axios.get('/courses/catalog', { params });
      return res.data?.data?.courses || [];
    },
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold font-plus-jakarta-sans text-gray-900">
          Explore Courses
        </h1>
        <p className="mt-2 text-gray-500 text-lg">
          Find the perfect course to level up your skills
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl text-sm focus:ring-[#2D31D4] focus:border-[#2D31D4] outline-none bg-white shadow-sm"
          />
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="h-44 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-gray-200 rounded-full" />
                  <div className="h-5 w-12 bg-gray-200 rounded-full" />
                </div>
                <div className="h-5 w-3/4 bg-gray-200 rounded" />
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-10 w-full bg-gray-200 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-200 border-dashed">
          <div className="w-24 h-24 bg-[#EEF0FF] rounded-full flex items-center justify-center mb-4">
            <BookOpen className="w-10 h-10 text-[#2D31D4] opacity-50" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2 font-plus-jakarta-sans">
            {searchQuery ? 'No courses found' : 'No courses available yet'}
          </h2>
          <p className="text-gray-500">
            {searchQuery
              ? 'Try adjusting your search terms.'
              : 'Check back soon — new courses are added regularly!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={{
                ...course,
                coverImage: course.coverImageUrl,
                published: course.isPublished,
              }}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
