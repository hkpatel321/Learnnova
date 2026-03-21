import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourse, updateCourse, publishCourse, getUsers } from '../../services/adminService';
import AddAttendeesModal from '../../components/admin/AddAttendeesModal';
import AdminCourseContent from '../../components/admin/AdminCourseContent';
import AdminCourseQuiz from '../../components/admin/AdminCourseQuiz';

// ── Icons ────────────────────────────────────────────────────────────────────
const ArrowLeftIcon = () => (
  <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-6 h-6 text-brand mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const ImageIcon = () => (
  <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

// ── Image Helper ─────────────────────────────────────────────────────────────
function getImageUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${url}`;
}

// ── Main Page Component ──────────────────────────────────────────────────────
export default function AdminCourseForm() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('content');
  const [formData, setFormData] = useState({
    title: '',
    short_desc: '',
    description: '',
    tags: [],
    website_url: '',
    cover_image_url: '',
    responsible_id: '',
    visibility: 'everyone',
    access_rule: 'open',
    price: 0,
  });
  const [tagInput, setTagInput] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: courseData, isLoading } = useQuery({
    queryKey: ['admin-course', id],
    queryFn: () => getCourse(id),
    enabled: !!id,
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => getUsers(''),
  });

  const course = courseData?.course;
  const users = usersData?.users || [];

  // Update form state when data arrives
  useEffect(() => {
    if (course) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        title: course.title || '',
        short_desc: course.short_desc || '',
        description: course.description || '',
        tags: course.tags || [],
        website_url: course.website_url || '',
        cover_image_url: course.cover_image_url || '',
        responsible_id: course.responsible_id || '',
        visibility: course.visibility || 'everyone',
        access_rule: course.access_rule || 'open',
        price: course.price || 0,
      });
    }
  }, [course]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (data) => updateCourse(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-course', id], old => ({
        ...old,
        course: { ...old.course, ...data.course }
      }));
      // Basic toast stand-in
      const el = document.createElement('div');
      el.className = 'fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in';
      el.textContent = 'Course saved successfully!';
      document.body.appendChild(el);
      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.3s ease';
        setTimeout(() => el.remove(), 300);
      }, 2500);
    },
    onError: (err) => {
      alert(`Failed to save: ${err.response?.data?.error || err.message}`);
    }
  });

  const publishMutation = useMutation({
    mutationFn: (publish) => publishCourse(id, publish),
    onSuccess: (data) => {
      // Backend returns { is_published, published_at } directly (not wrapped in .course)
      const newPublished = data?.is_published ?? data?.course?.is_published;
      queryClient.setQueryData(['admin-course', id], old => ({
        ...old,
        course: { ...old.course, is_published: newPublished }
      }));
      setPublishError('');
    },
    onError: (err) => {
      alert(`Failed to change publish status: ${err.response?.data?.error || err.message}`);
    }
  });

  // ── Event Handlers ─────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setPublishError(''); // clear error when typing
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = tagInput.trim();
      if (val && !formData.tags.includes(val)) {
        setFormData(prev => ({ ...prev, tags: [...prev.tags, val] }));
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      alert('Course title is required.');
      return;
    }
    updateMutation.mutate(formData);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (formData.title.trim() && formData.title !== course?.title) {
      handleSave();
    }
  };

  const togglePublish = () => {
    if (!course?.is_published) {
      publishMutation.mutate(true);
    } else {
      if (window.confirm('Are you sure you want to unpublish this course? It will be hidden from learners.')) {
        publishMutation.mutate(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return <div className="p-6 text-gray-500">Course not found.</div>;
  }

  return (
    <div className="animate-fade-in pb-20 max-w-5xl mx-auto">
      
      {/* ── Sticky Header ────────────────────────────────────────────────── */}
      <div className="sticky top-[60px] z-10 bg-white/90 backdrop-blur-md border-b border-gray-200 px-6 py-4 -mx-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        
        <div className="flex flex-col">
          <Link to="/admin/courses" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-brand mb-1 transition-colors">
            <ArrowLeftIcon /> Back to Courses
          </Link>
          
          <div className="flex items-center gap-3">
             {isEditingTitle ? (
               <input 
                 type="text" 
                 name="title"
                 value={formData.title} 
                 onChange={handleChange}
                 onBlur={handleTitleBlur}
                 onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
                 autoFocus
                 className="text-2xl font-bold text-gray-900 border-b-2 border-brand focus:outline-none bg-transparent"
                 style={{ fontFamily: "'Fraunces', serif" }}
               />
             ) : (
               <h2 
                 onClick={() => setIsEditingTitle(true)}
                 className="text-2xl font-bold text-gray-900 cursor-text hover:bg-gray-50 px-1 -ml-1 rounded transition-colors"
                 style={{ fontFamily: "'Fraunces', serif" }}
                 title="Click to edit title"
               >
                 {formData.title || 'Untitled Course'}
               </h2>
             )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {publishError && (
             <span className="text-sm font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-md border border-red-100">
               {publishError}
             </span>
          )}
          
          <button 
            onClick={togglePublish}
            disabled={publishMutation.isPending}
            className={`flex items-center justify-center min-w-[120px] px-4 py-2 text-sm font-bold rounded-lg transition-all border-2 disabled:opacity-50
              ${course.is_published 
                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                : 'bg-transparent text-brand border-brand hover:bg-brand hover:text-white'
              }`}
          >
            {publishMutation.isPending 
               ? 'Updating...' 
               : course.is_published 
                  ? <><CheckIcon /> Published ✓</>
                  : 'Publish'
            }
          </button>
          
          <Link 
             to={`/courses/${id}`}
             target="_blank"
             rel="noopener noreferrer"
             className="p-2.5 text-gray-500 hover:text-brand bg-gray-100 hover:bg-brand/10 rounded-lg transition-colors shadow-sm"
             title="Preview Course"
          >
            <EyeIcon />
          </Link>
          
          <div className="h-6 w-px bg-gray-200 mx-1"></div>
          
          <button 
             onClick={() => setIsAttendeesModalOpen(true)}
             className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-sm transition-colors"
          >
            Add Attendees
          </button>
          
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-sm transition-colors">
            Contact
          </button>
        </div>
      </div>

      {/* ── Main Form Area ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Cover Image */}
        <div className="lg:col-span-1">
          <label className="block text-sm justify-between font-bold text-gray-700 mb-2">
            Cover Image (URL for Hackathon)
          </label>
          <div className="group relative w-full aspect-video rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center overflow-hidden transition-all hover:border-brand hover:bg-brand/5">
            {formData.cover_image_url ? (
              <img 
                src={getImageUrl(formData.cover_image_url)} 
                alt="Cover Preview" 
                className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" 
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400 group-hover:text-brand transition-colors p-6 text-center">
                <ImageIcon />
                <span className="text-sm font-medium mt-2">No cover image</span>
              </div>
            )}
            
            {/* Overlay Input Container */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-transparent group-hover:bg-white/80 opacity-0 group-hover:opacity-100 transition-all p-4">
               <UploadIcon />
               <input 
                 type="text" 
                 name="cover_image_url"
                 value={formData.cover_image_url}
                 onChange={handleChange}
                 onBlur={handleSave}
                 placeholder="Paste image URL here..."
                 className="w-full max-w-[200px] mt-2 px-3 py-1.5 text-xs text-center border shadow-sm rounded-md focus:outline-none focus:ring-1 focus:ring-brand border-gray-300"
               />
               <span className="text-[10px] text-gray-500 mt-2 font-medium">Auto-saves on blur</span>
            </div>
          </div>
        </div>

        {/* Basic Info Fields */}
        <div className="lg:col-span-2 space-y-5 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          
          {/* Tags */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand/10 text-brand text-sm font-medium">
                  {tag}
                  <button onClick={() => { removeTag(tag); setTimeout(handleSave, 100); }} className="hover:text-brand-dark focus:outline-none">
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <input 
              type="text" 
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Type a tag and press Enter..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Website URL */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                Website URL
                {!course.is_published && <span className="text-xs font-normal text-gray-400 ml-auto">(Required to publish)</span>}
              </label>
              <input 
                type="text" 
                name="website_url"
                value={formData.website_url}
                onChange={handleChange}
                onBlur={handleSave}
                placeholder="https://..."
                className={`w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors ${!course.is_published && !formData.website_url && publishError ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
            </div>

            {/* Responsible (Instructor) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Instructor (Responsible)
              </label>
              <select 
                name="responsible_id"
                value={formData.responsible_id}
                onChange={(e) => { handleChange(e); setTimeout(handleSave, 100); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand bg-white"
              >
                <option value="" disabled>Select User</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="pt-2 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Details'}
            </button>
          </div>
          
        </div>
      </div>

      {/* ── Tabs Area ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="flex border-b border-gray-200 bg-gray-50/50 px-2 pt-2">
           {[
             { id: 'content', label: 'Content (Lessons)' },
             { id: 'description', label: 'Description' },
             { id: 'options', label: 'Options/Visibility' },
             { id: 'quiz', label: 'Quiz' }
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors
                 ${activeTab === tab.id 
                    ? 'border-brand text-brand bg-white rounded-t-lg' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                 }`}
             >
               {tab.label}
             </button>
           ))}
        </div>
        
        <div className="p-6">
           {activeTab === 'content' && (
             <AdminCourseContent 
               courseId={id} 
               lessons={course.lessons}
             />
           )}
           {activeTab === 'description' && (
             <div className="max-w-4xl animate-fade-in space-y-6 py-4">
               
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1.5">
                   Short Summary (Subtitle)
                 </label>
                 <input 
                   type="text"
                   name="short_desc"
                   value={formData.short_desc}
                   onChange={handleChange}
                   placeholder="A catchy one-liner for the course card..."
                   className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                   maxLength={150}
                 />
                 <p className="text-xs text-gray-500 mt-1 flex justify-end">{formData.short_desc.length}/150</p>
               </div>

               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                   <span>Full Course Description</span>
                   <span className="text-xs font-normal text-gray-400">Markdown supported</span>
                 </label>
                 <textarea 
                   name="description"
                   value={formData.description}
                   onChange={handleChange}
                   placeholder="# What you will learn...&#10;&#10;In this course, we will cover..."
                   className="w-full h-[400px] p-4 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand resize-y"
                 />
               </div>

               <div className="pt-4 flex justify-end">
                 <button 
                   onClick={handleSave}
                   disabled={updateMutation.isPending}
                   className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                 >
                   {updateMutation.isPending ? 'Saving...' : 'Save Description'}
                 </button>
               </div>
             </div>
           )}
           {activeTab === 'options' && (
             <div className="max-w-3xl animate-fade-in space-y-10 py-2">
               
               {/* SECTION 1 — Visibility */}
               <section>
                 <div className="mb-4">
                   <h3 className="text-base font-bold text-gray-900">Who can see this course?</h3>
                   <p className="text-sm text-gray-500">Show course to</p>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <label className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all
                     ${formData.visibility === 'everyone' ? 'border-brand bg-brand-light/50' : 'border-gray-200 bg-white hover:border-brand/30'}`}>
                     <div className="flex items-start gap-3">
                       <input 
                         type="radio" 
                         name="visibility" 
                         value="everyone"
                         checked={formData.visibility === 'everyone'}
                         onChange={handleChange}
                         className="mt-1 flex-shrink-0 text-brand focus:ring-brand w-4 h-4 cursor-pointer"
                       />
                       <div>
                         <span className="block text-sm font-bold text-gray-900 mb-0.5">Everyone</span>
                         <span className="block text-xs text-gray-500">Anyone can browse and find this course</span>
                       </div>
                     </div>
                   </label>
                   
                   <label className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all
                     ${formData.visibility === 'signed_in' ? 'border-brand bg-brand-light/50' : 'border-gray-200 bg-white hover:border-brand/30'}`}>
                     <div className="flex items-start gap-3">
                       <input 
                         type="radio" 
                         name="visibility" 
                         value="signed_in"
                         checked={formData.visibility === 'signed_in'}
                         onChange={handleChange}
                         className="mt-1 flex-shrink-0 text-brand focus:ring-brand w-4 h-4 cursor-pointer"
                       />
                       <div>
                         <span className="block text-sm font-bold text-gray-900 mb-0.5">Signed In</span>
                         <span className="block text-xs text-gray-500">Course hidden from guests</span>
                       </div>
                     </div>
                   </label>
                 </div>
               </section>

               <div className="h-px bg-gray-200 w-full" />

               {/* SECTION 2 — Access Rule */}
               <section>
                 <div className="mb-4">
                   <h3 className="text-base font-bold text-gray-900">How can learners access this course?</h3>
                   <p className="text-sm text-gray-500">Who can start learning</p>
                 </div>
                 <div className="grid grid-cols-1 gap-4">
                   <label className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all
                     ${formData.access_rule === 'open' ? 'border-brand bg-brand-light/50' : 'border-gray-200 bg-white hover:border-brand/30'}`}>
                     <div className="flex items-start gap-3">
                       <input 
                         type="radio" 
                         name="access_rule" 
                         value="open"
                         checked={formData.access_rule === 'open'}
                         onChange={handleChange}
                         className="mt-1 flex-shrink-0 text-brand focus:ring-brand w-4 h-4 cursor-pointer"
                       />
                       <div>
                         <span className="block text-sm font-bold text-gray-900 mb-0.5">Open</span>
                         <span className="block text-xs text-gray-500">Anyone who can see the course can start immediately</span>
                       </div>
                     </div>
                   </label>
                   
                   <label className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all
                     ${formData.access_rule === 'invitation' ? 'border-brand bg-brand-light/50' : 'border-gray-200 bg-white hover:border-brand/30'}`}>
                     <div className="flex items-start gap-3">
                       <input 
                         type="radio" 
                         name="access_rule" 
                         value="invitation"
                         checked={formData.access_rule === 'invitation'}
                         onChange={handleChange}
                         className="mt-1 flex-shrink-0 text-brand focus:ring-brand w-4 h-4 cursor-pointer"
                       />
                       <div>
                         <span className="block text-sm font-bold text-gray-900 mb-0.5">On Invitation</span>
                         <span className="block text-xs text-gray-500">Only invited/enrolled learners can access lessons</span>
                       </div>
                     </div>
                   </label>

                   <label className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all
                     ${formData.access_rule === 'payment' ? 'border-brand bg-brand-light/50' : 'border-gray-200 bg-white hover:border-brand/30'}`}>
                     <div className="flex items-start gap-3 w-full">
                       <input 
                         type="radio" 
                         name="access_rule" 
                         value="payment"
                         checked={formData.access_rule === 'payment'}
                         onChange={handleChange}
                         className="mt-1 flex-shrink-0 text-brand focus:ring-brand w-4 h-4 cursor-pointer"
                       />
                       <div className="w-full">
                         <span className="block text-sm font-bold text-gray-900 mb-0.5">On Payment</span>
                         <span className="block text-xs text-gray-500">Learners must pay before accessing</span>
                         
                         {formData.access_rule === 'payment' && (
                           <div className="mt-4 pt-4 border-t border-brand/20">
                             <label className="block text-xs font-bold text-gray-700 mb-1.5">
                               Course Price (INR) <span className="text-red-500">*</span>
                             </label>
                             <div className="relative max-w-[200px]">
                               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">₹</span>
                               <input 
                                 type="number"
                                 name="price"
                                 min="1"
                                 required
                                 value={formData.price}
                                 onChange={handleChange}
                                 className="w-full pl-7 pr-3 py-1.5 text-sm border-2 border-brand/40 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand bg-white"
                                 placeholder="1000"
                               />
                             </div>
                           </div>
                         )}
                       </div>
                     </div>
                   </label>
                 </div>
               </section>

               <div className="h-px bg-gray-200 w-full" />

               {/* SECTION 3 — Course Admin */}
               <section>
                 <div className="mb-4">
                   <h3 className="text-base font-bold text-gray-900">Course Responsible</h3>
                   <p className="text-sm text-gray-500 mb-3">This person receives notifications and manages the course</p>
                   
                   <div className="max-w-md">
                     <select 
                       name="responsible_id"
                       value={formData.responsible_id}
                       onChange={handleChange}
                       className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand bg-white mb-3"
                     >
                       <option value="" disabled>Select User</option>
                       {users.map(u => (
                         <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                       ))}
                     </select>
                     
                     {formData.responsible_id && (
                       <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                         {(() => {
                           const selectedUser = users.find(u => u.id === formData.responsible_id);
                           if (!selectedUser) return null;
                           return (
                             <>
                               <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center font-bold text-sm shadow-inner flex-shrink-0">
                                 {selectedUser.name?.charAt(0).toUpperCase()}
                               </div>
                               <div className="flex flex-col min-w-0">
                                 <span className="text-sm font-bold text-gray-900 leading-tight">
                                   {selectedUser.name}
                                 </span>
                                 <span className="text-xs text-gray-500 truncate">
                                   {selectedUser.email}
                                 </span>
                               </div>
                             </>
                           );
                         })()}
                       </div>
                     )}
                   </div>
                 </div>
               </section>

               {/* Save Button */}
               <div className="pt-4 flex justify-start">
                 <button 
                   onClick={handleSave}
                   disabled={updateMutation.isPending || (formData.access_rule === 'payment' && !formData.price)}
                   className="px-6 py-2.5 bg-brand text-white text-sm font-bold rounded-lg hover:bg-brand-dark transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {updateMutation.isPending ? 'Saving...' : 'Save Options'}
                 </button>
               </div>

             </div>
           )}
           {activeTab === 'quiz' && (
             <AdminCourseQuiz 
               courseId={id} 
               quizzes={course.quizzes || []} 
             />
           )}
        </div>
      </div>

      <AddAttendeesModal 
        isOpen={isAttendeesModalOpen}
        onClose={() => setIsAttendeesModalOpen(false)}
        courseId={id}
      />

    </div>
  );
}
