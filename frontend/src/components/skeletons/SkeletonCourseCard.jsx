import React from 'react';

const SkeletonCourseCard = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden animate-pulse">
      <div className="h-44 rounded-t-2xl bg-gray-200" />
      <div className="p-4">
        <div className="h-3 w-16 rounded bg-gray-200 mt-4" />
        <div className="h-4 w-full rounded bg-gray-200 mt-2" />
        <div className="h-3 w-3/4 rounded bg-gray-200 mt-1" />
        <div className="h-2 w-full rounded bg-gray-200 mt-4" />
        <div className="h-9 w-full rounded bg-gray-200 mt-3" />
      </div>
    </div>
  );
};

export default SkeletonCourseCard;
