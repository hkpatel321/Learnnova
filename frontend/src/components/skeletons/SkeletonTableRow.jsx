import React from 'react';

const SkeletonTableRow = () => {
  return (
    <tr className="border-t border-gray-100 animate-pulse">
      <td className="px-4 py-3"><div className="h-3 w-6 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-3 w-28 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-3 w-24 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-3 w-20 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-3 w-20 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-3 w-16 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-3 w-24 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-3 w-20 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-5 w-20 bg-gray-200 rounded-full" /></td>
    </tr>
  );
};

export default SkeletonTableRow;
