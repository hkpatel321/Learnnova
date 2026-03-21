import { useParams } from 'react-router-dom';

export default function CourseDetailPage() {
  const { courseId } = useParams();
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-heading font-bold mb-4">Course Details</h1>
      <p>Details for course {courseId}</p>
    </div>
  );
}
