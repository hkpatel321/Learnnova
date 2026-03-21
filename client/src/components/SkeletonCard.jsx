// Animated pulse skeleton matching CourseCard proportions
export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden
                    animate-pulse">
      {/* Cover image placeholder */}
      <div className="h-44 bg-gray-200" />

      <div className="p-4 space-y-3">
        {/* Tag pills */}
        <div className="flex gap-2">
          <div className="h-5 w-14 rounded-full bg-gray-200" />
          <div className="h-5 w-10 rounded-full bg-gray-200" />
        </div>

        {/* Title */}
        <div className="h-5 w-3/4 rounded bg-gray-200" />
        <div className="h-5 w-1/2 rounded bg-gray-200" />

        {/* Description lines */}
        <div className="space-y-1.5 pt-1">
          <div className="h-3.5 w-full  rounded bg-gray-100" />
          <div className="h-3.5 w-5/6  rounded bg-gray-100" />
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-gray-200 mt-1" />

        {/* Button */}
        <div className="h-9 w-full rounded-lg bg-gray-200 mt-2" />
      </div>
    </div>
  );
}
