import { useParams } from 'react-router-dom';

export default function LessonPlayerPage() {
  const { courseId, lessonId } = useParams();
  
  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b px-6 py-4">
        <h1 className="font-heading font-bold">Lesson Player</h1>
      </header>
      <div className="flex-1 overflow-hidden bg-black text-white flex items-center justify-center">
        Video Player {lessonId} for Course {courseId}
      </div>
    </div>
  );
}
