import React from 'react';

const SkeletonLessonRow = () => {
  return (
    <div className="h-14 rounded-lg bg-gray-100 animate-pulse flex items-center px-3 gap-3">
      <div className="w-4 h-4 rounded-full bg-gray-200" />
      <div className="h-3 w-16 rounded bg-gray-200" />
      <div className="h-3 flex-1 rounded bg-gray-200" />
      <div className="h-3 w-12 rounded bg-gray-200" />
    </div>
  );
};

export default SkeletonLessonRow;
