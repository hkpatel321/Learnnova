import { useParams } from 'react-router-dom';

export default function CourseFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-heading font-bold mb-6">
        {isEditing ? 'Edit Course' : 'Create New Course'}
      </h1>
      <p>Form content</p>
    </div>
  );
}
