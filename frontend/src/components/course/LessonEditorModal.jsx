import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Loader2,
  Upload,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Link as LinkIcon,
  CheckCircle2,
} from 'lucide-react';
import ReactPlayer from 'react-player';
import toast from 'react-hot-toast';
import axios from '../../lib/axios';

const lessonTypes = [
  { value: 'video', label: 'Video', emoji: '🎬' },
  { value: 'document', label: 'Document', emoji: '📄' },
  { value: 'image', label: 'Image', emoji: '🖼️' },
  { value: 'quiz', label: 'Quiz', emoji: '❓' },
];

const tabs = [
  { id: 'content', label: 'Content' },
  { id: 'description', label: 'Description' },
  { id: 'attachments', label: 'Attachments' },
];

const formatFileSize = (size = 0) => {
  if (!size) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
};

const isValidHttpUrl = (value) => {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const Dropzone = ({ accept, onFileChange, icon, title, subtitle }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileChange(file);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
        dragging ? 'border-[#2D31D4] bg-[#EEF0FF]' : 'border-gray-300 hover:border-[#2D31D4]/50'
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileChange(file);
        }}
      />
      <div className="flex justify-center text-gray-500 mb-2">{icon}</div>
      <p className="text-sm font-medium text-gray-800">{title}</p>
      {subtitle ? <p className="text-xs text-gray-500 mt-1">{subtitle}</p> : null}
    </div>
  );
};

const LessonEditorModal = ({ open, onOpenChange, courseId, lesson, onSaved }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('content');
  const [searchUser, setSearchUser] = useState('');
  const [attachmentMode, setAttachmentMode] = useState('upload');
  const [newAttachmentLabel, setNewAttachmentLabel] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newAttachmentFile, setNewAttachmentFile] = useState(null);

  const [form, setForm] = useState({
    title: '',
    type: 'video',
    responsibleUserId: '',
    videoUrl: '',
    durationMinutes: '',
    description: '',
    allowDownload: true,
    quizId: '',
    contentFile: null,
    imageFile: null,
  });

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setActiveTab('content');
      setAttachmentMode('upload');
      setNewAttachmentLabel('');
      setNewAttachmentUrl('');
      setNewAttachmentFile(null);
      setSearchUser('');
      setForm({
        title: lesson?.title || '',
        type: lesson?.type || 'video',
        responsibleUserId: lesson?.responsibleUserId || '',
        videoUrl: lesson?.videoUrl || '',
        durationMinutes: lesson?.durationMinutes ?? '',
        description: lesson?.description || '',
        allowDownload: lesson?.allowDownload ?? true,
        quizId: lesson?.quizId || '',
        contentFile: null,
        imageFile: null,
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [lesson, open]);

  const { data: users = [] } = useQuery({
    queryKey: ['lesson-users'],
    queryFn: async () => {
      try {
        const res = await axios.get('/users');
        const data = res.data?.data?.users || res.data?.users || res.data;
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    enabled: open,
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['course-quizzes', courseId],
    queryFn: async () => {
      try {
        const res = await axios.get(`/courses/${courseId}/quizzes`);
        const data = res.data?.data?.quizzes || res.data?.quizzes || res.data;
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    enabled: open && form.type === 'quiz',
  });

  const filteredUsers = useMemo(() => {
    if (!searchUser.trim()) return users;
    return users.filter((u) => (u.name || '').toLowerCase().includes(searchUser.toLowerCase()));
  }, [users, searchUser]);

  const saveLessonMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        type: form.type,
        responsibleUserId: form.responsibleUserId || null,
        videoUrl: form.type === 'video' ? form.videoUrl || null : null,
        durationMinutes: form.type === 'video' && form.durationMinutes !== '' ? Number(form.durationMinutes) : null,
        description: form.description || '',
        allowDownload: ['document', 'image'].includes(form.type) ? !!form.allowDownload : false,
        quizId: form.type === 'quiz' ? form.quizId || null : null,
      };

      let response;
      if (lesson?.id) {
        response = await axios.put(`/lessons/${lesson.id}`, payload);
      } else {
        response = await axios.post(`/courses/${courseId}/lessons`, payload);
      }

      const savedLessonId = response?.data?.data?.lesson?.id || response?.data?.lesson?.id || response?.data?.id || lesson?.id;

      if (form.type === 'document' && form.contentFile && savedLessonId) {
        const fd = new FormData();
        fd.append('file', form.contentFile);
        await axios.post(`/lessons/${savedLessonId}/file`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (form.type === 'image' && form.imageFile && savedLessonId) {
        const fd = new FormData();
        fd.append('file', form.imageFile);
        await axios.post(`/lessons/${savedLessonId}/image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-lessons', courseId] });
      toast.success('Lesson saved ✓');
      onOpenChange(false);
      if (onSaved) onSaved();
    },
    onError: () => toast.error('Failed to save lesson'),
  });

  const addAttachmentMutation = useMutation({
    mutationFn: async () => {
      if (!lesson?.id) throw new Error('Save lesson first');
      if (!newAttachmentLabel.trim()) throw new Error('Attachment label is required');

      if (attachmentMode === 'upload') {
        if (!newAttachmentFile) throw new Error('Select a file');
        const fd = new FormData();
        fd.append('file', newAttachmentFile);
        fd.append('label', newAttachmentLabel.trim());
        return axios.post(`/lessons/${lesson.id}/attachments`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (!isValidHttpUrl(newAttachmentUrl)) throw new Error('Enter a valid URL');
      return axios.post(`/lessons/${lesson.id}/attachments`, {
        label: newAttachmentLabel.trim(),
        url: newAttachmentUrl.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-lessons', courseId] });
      setNewAttachmentLabel('');
      setNewAttachmentUrl('');
      setNewAttachmentFile(null);
      toast.success('Attachment added');
    },
    onError: (err) => toast.error(err.message || 'Failed to add attachment'),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId) => axios.delete(`/attachments/${attachmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-lessons', courseId] });
      toast.success('Attachment removed');
    },
    onError: () => toast.error('Failed to delete attachment'),
  });

  const canPreviewVideo = form.type === 'video' && isValidHttpUrl(form.videoUrl);

  const lessonAttachments = lesson?.attachments || [];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 top-0 md:top-1/2 md:bottom-auto md:left-1/2 md:right-auto md:w-full md:max-w-2xl md:-translate-x-1/2 md:-translate-y-1/2 bg-white z-50 md:rounded-xl flex flex-col focus:outline-none">
          <div className="flex items-center justify-between border-b px-4 py-3 md:px-6">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {lesson?.id ? 'Edit Lesson' : 'Add Lesson'}
            </Dialog.Title>
            <Dialog.Close className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <div className="px-4 md:px-6 border-b">
            <div className="flex gap-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 text-sm font-medium border-b-2 ${
                    activeTab === tab.id
                      ? 'text-[#2D31D4] border-[#2D31D4]'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
            {activeTab === 'content' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#2D31D4] focus:ring-2 focus:ring-[#2D31D4]/15"
                    placeholder="Enter lesson title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lesson Type</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {lessonTypes.map((type) => {
                      const selected = form.type === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, type: type.value }))}
                          className={`rounded-xl border p-3 text-left transition-colors ${
                            selected
                              ? 'border-2 border-[#2D31D4] bg-[#EEF0FF]'
                              : 'border-gray-300 bg-white hover:border-gray-400'
                          }`}
                        >
                          <p className="text-sm font-medium text-gray-900">{type.emoji} {type.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsible User (optional)</label>
                  <input
                    type="text"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    placeholder="Search users..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2D31D4] mb-2"
                  />
                  <select
                    value={form.responsibleUserId}
                    onChange={(e) => setForm((prev) => ({ ...prev, responsibleUserId: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white outline-none focus:border-[#2D31D4]"
                  >
                    <option value="">Select a user</option>
                    {filteredUsers.map((user) => (
                      <option key={user.id} value={user.id}>{user.name || user.email || `User ${user.id}`}</option>
                    ))}
                  </select>
                </div>

                {form.type === 'video' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
                      <input
                        type="url"
                        value={form.videoUrl}
                        onChange={(e) => setForm((prev) => ({ ...prev, videoUrl: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#2D31D4]"
                        placeholder="https://..."
                      />
                    </div>
                    {canPreviewVideo ? (
                      <div className="overflow-hidden rounded-xl border border-gray-200 aspect-video">
                        <ReactPlayer url={form.videoUrl} controls width="100%" height="100%" />
                      </div>
                    ) : null}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                      <input
                        type="number"
                        min="0"
                        value={form.durationMinutes}
                        onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#2D31D4]"
                        placeholder="e.g. 12"
                      />
                    </div>
                  </div>
                )}

                {form.type === 'document' && (
                  <div className="space-y-4">
                    <Dropzone
                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                      onFileChange={(file) => setForm((prev) => ({ ...prev, contentFile: file }))}
                      icon={<FileText className="w-6 h-6" />}
                      title="Drag & drop or click to upload"
                      subtitle=".pdf, .doc, .docx, .ppt, .pptx"
                    />
                    {form.contentFile ? (
                      <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm flex items-center justify-between">
                        <div>
                          <p className="font-medium text-green-800">{form.contentFile.name}</p>
                          <p className="text-green-700">{formatFileSize(form.contentFile.size)}</p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                    ) : null}
                    <label className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                      <span className="text-sm text-gray-700">Allow learners to download this file</span>
                      <input
                        type="checkbox"
                        checked={!!form.allowDownload}
                        onChange={(e) => setForm((prev) => ({ ...prev, allowDownload: e.target.checked }))}
                        className="h-4 w-4"
                      />
                    </label>
                  </div>
                )}

                {form.type === 'image' && (
                  <div className="space-y-4">
                    <Dropzone
                      accept="image/*"
                      onFileChange={(file) => setForm((prev) => ({ ...prev, imageFile: file }))}
                      icon={<ImageIcon className="w-6 h-6" />}
                      title="Drag & drop or click to upload image"
                    />
                    {form.imageFile ? (
                      <div className="rounded-lg border border-gray-200 p-2">
                        <img
                          src={URL.createObjectURL(form.imageFile)}
                          alt="Preview"
                          className="max-h-48 rounded-lg object-contain mx-auto"
                        />
                      </div>
                    ) : null}
                    <label className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                      <span className="text-sm text-gray-700">Allow learners to download this file</span>
                      <input
                        type="checkbox"
                        checked={!!form.allowDownload}
                        onChange={(e) => setForm((prev) => ({ ...prev, allowDownload: e.target.checked }))}
                        className="h-4 w-4"
                      />
                    </label>
                  </div>
                )}

                {form.type === 'quiz' && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm text-blue-900">
                      This lesson will be a quiz. Configure questions in the Quiz tab.
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quiz</label>
                      <select
                        value={form.quizId}
                        onChange={(e) => setForm((prev) => ({ ...prev, quizId: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white outline-none focus:border-[#2D31D4]"
                      >
                        <option value="">Select an existing quiz</option>
                        {quizzes.map((quiz) => (
                          <option key={quiz.id} value={quiz.id}>{quiz.title || `Quiz ${quiz.id}`}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'description' && (
              <div>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full min-h-40 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#2D31D4]"
                  placeholder="Describe what learners will learn in this lesson..."
                />
              </div>
            )}

            {activeTab === 'attachments' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  {lessonAttachments.length === 0 ? (
                    <p className="text-sm text-gray-500">No attachments yet.</p>
                  ) : (
                    lessonAttachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-2.5">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-800">{attachment.label || attachment.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {attachment.type || (attachment.url ? 'Link' : 'File')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteAttachmentMutation.mutate(attachment.id)}
                          className="text-gray-500 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 p-4 space-y-4">
                  <div className="flex items-center gap-5 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="attachmentMode"
                        checked={attachmentMode === 'upload'}
                        onChange={() => setAttachmentMode('upload')}
                      />
                      Upload File
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="attachmentMode"
                        checked={attachmentMode === 'link'}
                        onChange={() => setAttachmentMode('link')}
                      />
                      External Link
                    </label>
                  </div>

                  {attachmentMode === 'upload' ? (
                    <>
                      <Dropzone
                        accept="*/*"
                        onFileChange={setNewAttachmentFile}
                        icon={<Upload className="w-6 h-6" />}
                        title="Drag & drop or click to upload"
                      />
                      {newAttachmentFile ? (
                        <p className="text-xs text-gray-600">{newAttachmentFile.name} ({formatFileSize(newAttachmentFile.size)})</p>
                      ) : null}
                      <input
                        type="text"
                        value={newAttachmentLabel}
                        onChange={(e) => setNewAttachmentLabel(e.target.value)}
                        placeholder="What to call it"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2D31D4]"
                      />
                    </>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newAttachmentLabel}
                        onChange={(e) => setNewAttachmentLabel(e.target.value)}
                        placeholder="Resource name"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2D31D4]"
                      />
                      <div className="relative">
                        <LinkIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          value={newAttachmentUrl}
                          onChange={(e) => setNewAttachmentUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-[#2D31D4]"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => addAttachmentMutation.mutate()}
                    disabled={addAttachmentMutation.isPending || !lesson?.id}
                    className="rounded-lg border border-dashed border-[#2D31D4] text-[#2D31D4] px-4 py-2 text-sm font-medium hover:bg-[#EEF0FF] disabled:opacity-50"
                  >
                    + Add Attachment
                  </button>
                  {!lesson?.id ? <p className="text-xs text-gray-500">Save lesson first to add attachments.</p> : null}
                </div>
              </div>
            )}
          </div>

          <div className="border-t px-4 py-3 md:px-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => saveLessonMutation.mutate()}
              disabled={saveLessonMutation.isPending || !form.title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-[#2D31D4] hover:bg-blue-800 rounded-lg disabled:opacity-70 inline-flex items-center gap-2"
            >
              {saveLessonMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Lesson
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default LessonEditorModal;
