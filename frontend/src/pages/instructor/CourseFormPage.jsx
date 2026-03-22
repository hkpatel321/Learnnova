import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Upload, Loader2, X,
  Globe, Lock, Shield, Mail, CreditCard 
} from 'lucide-react';
import toast from 'react-hot-toast';
import debounce from 'lodash.debounce';
import axios from '../../lib/axios';
import { resolveMediaUrl } from '../../lib/media';
import { getApiErrorMessage } from '../../lib/apiError';
import useAuthStore from '../../store/authStore';

import Modal from '../../components/ui/Modal';
import LessonsTab from '../../components/course/LessonsTab';
import QuizTab from '../../components/course/QuizTab';

const CourseFormPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState('content');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'unsaved'
  const [formData, setFormData] = useState({
    title: '',
    tags: [],
    websiteUrl: '',
    visibility: 'everyone',
    accessRule: 'open',
    price: '',
    description: '',
    responsibleUserId: ''
  });
  const [tagInput, setTagInput] = useState('');
  
  // Modals state
  const [isAddAttendeesOpen, setIsAddAttendeesOpen] = useState(false);
  const [attendeeEmails, setAttendeeEmails] = useState('');
  
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [coverLoadFailed, setCoverLoadFailed] = useState(false);

  // Fetch course data
  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      // In a real scenario, this would fetch from /api/courses/${courseId}
      // Assuming successful response maps properly:
      try {
           const response = await axios.get(`/courses/${courseId}`);
           const courseData = response.data?.data?.course || response.data?.course || response.data;
           if (courseData) {
             courseData.published = courseData.isPublished;
             courseData.coverImage = courseData.coverImageUrl;
             courseData.responsibleUserId = courseData.responsibleUserId || courseData.responsibleId || '';
           }
           return courseData;
      } catch {
           return {
              id: courseId,
              title: 'Untitled Course',
              tags: [],
              websiteUrl: '',
              visibility: 'everyone',
              accessRule: 'open',
              price: 0,
              description: '',
              published: false,
              coverImage: null
           }
      }
    },
    onSuccess: (data) => {
      // Initialize form data
      setFormData({
        title: data.title || '',
        tags: data.tags || [],
        websiteUrl: data.websiteUrl || '',
        visibility: data.visibility || 'everyone',
        accessRule: data.accessRule || 'open',
        price: data.price || '',
        description: data.description || '',
        responsibleUserId: data.responsibleUserId || ''
      });
    }
  });
  
  // Initialize form when course data loads via useQuery (React Query v5 standard approach)
  useEffect(() => {
    if (course) {
        setFormData({
            title: course.title || '',
            tags: course.tags || [],
            websiteUrl: course.websiteUrl || '',
            visibility: course.visibility || 'everyone',
            accessRule: course.accessRule || 'open',
            price: course.price || '',
            description: course.description || '',
            responsibleUserId: course.responsibleUserId || ''
        });
    }
  }, [course]);

  const { data: users = [] } = useQuery({
    queryKey: ['course-users'],
    enabled: user?.role === 'admin',
    queryFn: async () => {
      try {
        const res = await axios.get('/users');
        const data = res.data?.data?.users || res.data?.users || res.data;
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
  });

  const coverImageSrc = resolveMediaUrl(course?.coverImage || course?.coverImageUrl);

  const availableUsers = useMemo(() => {
    if (user?.role === 'admin') return users;
    if (!user) return [];
    return [
      {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    ];
  }, [user, users]);

  // Auto-save mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        websiteUrl: data.websiteUrl?.trim() ? data.websiteUrl.trim() : null,
        responsibleId: data.responsibleUserId?.trim() ? data.responsibleUserId.trim() : null,
        price: data.accessRule === 'payment' && data.price !== '' && data.price !== null ? data.price : null,
      };
      delete payload.responsibleUserId;
      return axios.put(`/courses/${courseId}`, payload);
    },
    onMutate: () => setSaveStatus('saving'),
    onSuccess: () => {
      setSaveStatus('saved');
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    },
    onError: (error) => {
      setSaveStatus('unsaved');
      toast.error(getApiErrorMessage(error, 'Failed to save changes'));
    }
  });

  // Debounced save
  const debouncedSave = useMemo(
    () => debounce((data) => {
      saveMutation.mutate(data);
    }, 1500),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [courseId]
  );

  // Handle form changes
  const handleChange = (field, value) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    setSaveStatus('unsaved');
    debouncedSave(updatedData);
  };

  const preventEnterSubmit = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  // Tag Handling
  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.tags.includes(tagInput.trim())) {
        handleChange('tags', [...formData.tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    handleChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  // Publish toggle
  const publishMutation = useMutation({
    mutationFn: async (isPublishing) => {
      return axios.patch(`/courses/${courseId}/publish`, { published: isPublishing });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      toast.success(course?.published ? 'Course hidden from learners' : 'Your course is now live! 🚀');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to update status'))
  });

  const handleTogglePublish = async () => {
    if (!course?.published && !formData.websiteUrl.trim()) {
      toast('Add a website URL first', { icon: '⚠️' });
      return;
    }

    const latestFormData = {
      ...formData,
      websiteUrl: formData.websiteUrl.trim(),
    };

    try {
      await saveMutation.mutateAsync(latestFormData);
      publishMutation.mutate(!course?.published);
    } catch {
      // saveMutation already surfaces the specific error message
    }
  };

  // Image Upload
  const uploadCoverMutation = useMutation({
    mutationFn: async (file) => {
      const formDataUpload = new FormData();
      formDataUpload.append('cover', file);
      return axios.post(`/courses/${courseId}/cover`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: (res) => {
      const uploadedUrl = res?.data?.data?.coverImageUrl;
      if (uploadedUrl) {
        queryClient.setQueryData(['course', courseId], (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            coverImageUrl: uploadedUrl,
            coverImage: uploadedUrl,
          };
        });
      }
      setCoverLoadFailed(false);
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      toast.success('Cover image updated');
    },
    onError: () => toast.error('Failed to upload image')
  });

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverLoadFailed(false);
      uploadCoverMutation.mutate(file);
    }
  };

  // Modals Submit Handlers
  const addAttendeesMutation = useMutation({
    mutationFn: async (emails) => {
      return axios.post(`/courses/${courseId}/attendees`, { emails: emails.split(/[\n,]+/).map(e => e.trim()).filter(Boolean) });
    },
    onSuccess: (res) => {
      const invited = res.data?.data?.invited ?? 0;
      const emailsSent = res.data?.data?.emailsSent ?? 0;
      toast.success(
        emailsSent > 0
          ? `${emailsSent} attendee email${emailsSent === 1 ? '' : 's'} sent`
          : `${invited} attendee${invited === 1 ? '' : 's'} added`
      );
      setIsAddAttendeesOpen(false);
      setAttendeeEmails('');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to add attendees'))
  });

  const contactMutation = useMutation({
    mutationFn: async (data) => {
      return axios.post(`/courses/${courseId}/contact`, data);
    },
    onSuccess: (res) => {
      const sent = res.data?.data?.sent ?? 0;
      toast.success(`Message sent to ${sent} attendee${sent === 1 ? '' : 's'}`);
      setIsContactOpen(false);
      setContactSubject('');
      setContactMessage('');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to send message'))
  });

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#2D31D4]" /></div>;
  }

  return (
    <div className="pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 border-b border-gray-200 px-4 md:px-6 py-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between shadow-sm">
        <div className="flex min-w-0 items-center gap-3 md:gap-4 flex-1">
          <button 
            onClick={() => navigate('/backoffice/courses')}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="hidden sm:block w-px h-6 bg-gray-200 mx-1 md:mx-2"></div>
          
          <input 
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            onKeyDown={preventEnterSubmit}
            className="min-w-0 flex-1 text-[18px] font-bold text-gray-900 border-none px-0 py-1 hover:bg-gray-50 focus:bg-white focus:ring-0 w-full max-w-lg rounded transition-colors bg-transparent outline-none"
            placeholder="Course Title"
          />
        </div>

        <div className="flex w-full flex-col gap-3 xl:w-auto xl:flex-row xl:items-center xl:justify-end xl:gap-4">
          <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5 xl:w-24 xl:justify-end">
            {saveStatus === 'saving' && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>}
            {saveStatus === 'saved' && <span className="text-green-600">Saved ✓</span>}
            {saveStatus === 'unsaved' && <span>Unsaved</span>}
          </div>

          <button
            onClick={handleTogglePublish}
            disabled={publishMutation.isPending}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
              course?.published 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {course?.published ? '✓ Published' : 'Unpublished'}
          </button>

          <div className="flex flex-wrap items-center gap-2 xl:border-l xl:pl-4 xl:border-gray-200">
            <button 
              onClick={() => window.open(`/courses/${courseId}`, '_blank')}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              Preview
            </button>
            <button 
              onClick={() => setIsAddAttendeesOpen(true)}
              className="px-3 py-1.5 text-sm font-medium text-[#2D31D4] border border-[#2D31D4] rounded-lg hover:bg-[#EEF0FF] transition-colors whitespace-nowrap"
            >
              Add Attendees
            </button>
            <button 
              onClick={() => setIsContactOpen(true)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-[#2D31D4] rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
            >
              Contact Attendees
            </button>
          </div>
        </div>
      </div>

      {/* Cover Image Area */}
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div 
          className={`relative w-full h-48 rounded-xl overflow-hidden group cursor-pointer transition-all ${
            !course?.coverImage ? 'border-2 border-dashed border-[#2D31D4]/30 bg-[#EEF0FF] hover:bg-[#E0E4FF]' : ''
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleImageUpload}
          />
          
          {uploadCoverMutation.isPending ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10">
               <Loader2 className="w-8 h-8 text-[#2D31D4] animate-spin mb-2" />
               <span className="text-sm font-medium text-gray-700">Uploading...</span>
             </div>
          ) : coverImageSrc && !coverLoadFailed ? (
            <>
              <img
                src={coverImageSrc}
                alt="Cover"
                className="w-full h-full object-cover"
                onError={() => setCoverLoadFailed(true)}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white font-medium flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Change Image
                </span>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[#2D31D4]">
              <div className="w-12 h-12 rounded-full bg-white/60 flex items-center justify-center mb-3 shadow-sm">
                <Upload className="w-6 h-6" />
              </div>
              <span className="font-medium">Click to upload cover image</span>
              <span className="text-xs opacity-70 mt-1">1920x1080 recommended</span>
            </div>
          )}
        </div>
      </div>

      {/* Course Fields */}
      <div className="px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-6">
        {/* Col 1 */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              onKeyDown={preventEnterSubmit}
              className="w-full px-4 py-2.5 text-lg border border-gray-300 rounded-lg focus:ring-[#2D31D4] focus:border-[#2D31D4] outline-none"
              placeholder="e.g. Advanced Node.js"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag, idx) => (
                <span key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-[#EEF0FF] text-[#2D31D4] text-sm font-medium rounded-full">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-blue-800 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#2D31D4] focus:border-[#2D31D4] outline-none"
              placeholder="Type tag and press Enter"
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
              Website URL
              <span className="text-gray-400 text-xs font-normal font-inter">Required when publishing</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Globe className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={formData.websiteUrl}
                onChange={(e) => handleChange('websiteUrl', e.target.value)}
                onKeyDown={preventEnterSubmit}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#2D31D4] focus:border-[#2D31D4] outline-none"
                placeholder="e.g. advanced-nodejs-masterclass"
              />
            </div>
             <p className="mt-1 text-xs text-gray-400">Your course will be available at: /courses/{formData.websiteUrl || '{url}'}</p>
          </div>
        </div>

        {/* Col 2 */}
        <div className="space-y-6">
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsible User</label>
            <select
              value={formData.responsibleUserId}
              onChange={(e) => handleChange('responsibleUserId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#2D31D4] focus:border-[#2D31D4] outline-none bg-white"
              disabled={user?.role !== 'admin'}
            >
              <option value="">{user?.role === 'admin' ? 'Select an instructor...' : 'Assigned instructor'}</option>
              {availableUsers.map((optionUser) => (
                <option key={optionUser.id} value={optionUser.id}>
                  {optionUser.name || optionUser.email || `User ${optionUser.id}`}
                </option>
              ))}
            </select>
            {user?.role !== 'admin' && (
              <p className="mt-1 text-xs text-gray-400">Only admins can reassign the responsible instructor.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${formData.visibility === 'everyone' ? 'border-[#2D31D4] bg-[#EEF0FF]' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" className="hidden" checked={formData.visibility === 'everyone'} onChange={() => handleChange('visibility', 'everyone')} />
                <Globe className={`w-5 h-5 mr-3 ${formData.visibility === 'everyone' ? 'text-[#2D31D4]' : 'text-gray-400'}`} />
                <span className="text-sm font-medium text-gray-900">Everyone</span>
              </label>
              <label className={`flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${formData.visibility === 'signed_in' ? 'border-[#2D31D4] bg-[#EEF0FF]' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" className="hidden" checked={formData.visibility === 'signed_in'} onChange={() => handleChange('visibility', 'signed_in')} />
                <Shield className={`w-5 h-5 mr-3 ${formData.visibility === 'signed_in' ? 'text-[#2D31D4]' : 'text-gray-400'}`} />
                <span className="text-sm font-medium text-gray-900">Signed In Only</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Access Rule</label>
            <div className="grid grid-cols-3 gap-3">
              <label className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${formData.accessRule === 'open' ? 'border-[#2D31D4] bg-[#EEF0FF]' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" className="hidden" checked={formData.accessRule === 'open'} onChange={() => handleChange('accessRule', 'open')} />
                <Lock className={`w-5 h-5 mb-1.5 ${formData.accessRule === 'open' ? 'text-[#2D31D4]' : 'text-gray-400'}`} />
                <span className="text-xs font-medium text-gray-900 text-center">Open</span>
              </label>
              <label className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${formData.accessRule === 'invitation' ? 'border-[#2D31D4] bg-[#EEF0FF]' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" className="hidden" checked={formData.accessRule === 'invitation'} onChange={() => handleChange('accessRule', 'invitation')} />
                <Mail className={`w-5 h-5 mb-1.5 ${formData.accessRule === 'invitation' ? 'text-[#2D31D4]' : 'text-gray-400'}`} />
                <span className="text-xs font-medium text-gray-900 text-center">On Invitation</span>
              </label>
              <label className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${formData.accessRule === 'payment' ? 'border-[#2D31D4] bg-[#EEF0FF]' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" className="hidden" checked={formData.accessRule === 'payment'} onChange={() => handleChange('accessRule', 'payment')} />
                <CreditCard className={`w-5 h-5 mb-1.5 ${formData.accessRule === 'payment' ? 'text-[#2D31D4]' : 'text-gray-400'}`} />
                <span className="text-xs font-medium text-gray-900 text-center">On Payment</span>
              </label>
            </div>

            {/* Expandable Price Input */}
            <div className={`mt-3 overflow-hidden transition-all duration-300 ${formData.accessRule === 'payment' ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm font-medium font-inter">₹</span>
                </div>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                  onKeyDown={preventEnterSubmit}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#2D31D4] focus:border-[#2D31D4] outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="px-6 max-w-7xl mx-auto mt-10">
        <div className="flex items-center gap-6 md:gap-8 border-b border-gray-200 overflow-x-auto whitespace-nowrap pb-1 scrollbar-hide">
          {[
            { id: 'content', label: '📚 Content' },
            { id: 'description', label: '📝 Description' },
            { id: 'options', label: '⚙️ Options' },
            { id: 'quiz', label: '❓ Quiz' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 font-inter ${
                activeTab === tab.id 
                  ? 'border-[#2D31D4] text-[#2D31D4]' 
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Panels */}
        <div className="py-6">
          {activeTab === 'content' && <LessonsTab courseId={courseId} />}
          
          {activeTab === 'description' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="block text-sm font-medium text-gray-700 mb-2">Detailed Course Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="This description is shown to learners on the course page. Write a comprehensive overview of what learners will get out of this course..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl min-h-[16rem] text-sm focus:ring-2 focus:ring-[#2D31D4]/20 focus:border-[#2D31D4] outline-none resize-y"
              />
            </div>
          )}

          {activeTab === 'options' && (
            <div className="p-6 bg-white border border-gray-200 rounded-xl max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <p className="text-sm text-gray-500 mb-4 pb-4 border-b border-gray-100">
                These settings are mapped directly from the main layout structure above for convenience.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
                <select 
                  value={formData.visibility}
                  onChange={(e) => handleChange('visibility', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                >
                  <option value="everyone">Everyone</option>
                  <option value="signed_in">Signed In Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Access Rule</label>
                <select 
                  value={formData.accessRule}
                  onChange={(e) => handleChange('accessRule', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                >
                  <option value="open">Open Availability</option>
                  <option value="invitation">On Invitation</option>
                  <option value="payment">On Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Admin</label>
                <select
                  value={formData.responsibleUserId}
                  onChange={(e) => handleChange('responsibleUserId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                  disabled={user?.role !== 'admin'}
                >
                  <option value="">{user?.role === 'admin' ? 'Select an instructor...' : 'Assigned instructor'}</option>
                  {availableUsers.map((optionUser) => (
                    <option key={optionUser.id} value={optionUser.id}>
                      {optionUser.name || optionUser.email || `User ${optionUser.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'quiz' && <QuizTab courseId={courseId} />}
        </div>
      </div>

      {/* Modals */}
      <Modal open={isAddAttendeesOpen} onOpenChange={setIsAddAttendeesOpen} title="Add Attendees">
        <form onSubmit={(e) => { e.preventDefault(); addAttendeesMutation.mutate(attendeeEmails); }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email addresses</label>
              <textarea
                required
                value={attendeeEmails}
                onChange={(e) => setAttendeeEmails(e.target.value)}
                placeholder="Enter email addresses separated by commas or new lines"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2D31D4] focus:border-[#2D31D4] outline-none min-h-[8rem] text-sm"
              />
              <p className="mt-2 text-xs text-gray-500">Learners will receive an invitation to join this course.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
             <button
              type="button"
              onClick={() => setIsAddAttendeesOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addAttendeesMutation.isPending || !attendeeEmails.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-[#2D31D4] hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {addAttendeesMutation.isPending ? 'Sending...' : 'Send Invitations'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={isContactOpen} onOpenChange={setIsContactOpen} title="Contact Attendees">
        <form onSubmit={(e) => { e.preventDefault(); contactMutation.mutate({ subject: contactSubject, message: contactMessage }); }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                required
                type="text"
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
                onKeyDown={preventEnterSubmit}
                placeholder="Message Subject"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2D31D4] focus:border-[#2D31D4] outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                required
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#2D31D4] focus:border-[#2D31D4] outline-none min-h-[8rem] text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
             <button
              type="button"
              onClick={() => setIsContactOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={contactMutation.isPending || !contactSubject.trim() || !contactMessage.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-[#2D31D4] hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {contactMutation.isPending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CourseFormPage;
