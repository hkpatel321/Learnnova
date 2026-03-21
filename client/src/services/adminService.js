import api from '../lib/api';

// ═════════════════════════════════════════════════════════════════════════════
// COURSES
// ═════════════════════════════════════════════════════════════════════════════

export const getCourses     = (search) =>
  api.get('/admin/courses', { params: { search } }).then(r => r.data);

export const getCourse      = (id) =>
  api.get(`/admin/courses/${id}`).then(r => r.data);

export const createCourse   = (title) =>
  api.post('/admin/courses', { title }).then(r => r.data);

export const updateCourse   = (id, data) =>
  api.put(`/admin/courses/${id}`, data).then(r => r.data);

export const publishCourse  = (id, publish) =>
  api.put(`/admin/courses/${id}/publish`, { publish }).then(r => r.data);

export const deleteCourse   = (id) =>
  api.delete(`/admin/courses/${id}`).then(r => r.data);

export const getShareLink   = (id) =>
  api.get(`/admin/courses/${id}/share-link`).then(r => r.data);

// ═════════════════════════════════════════════════════════════════════════════
// LESSONS
// ═════════════════════════════════════════════════════════════════════════════

export const getLesson      = (id) =>
  api.get(`/admin/lessons/${id}`).then(r => r.data);

export const createLesson   = (data) =>
  api.post('/admin/lessons', data).then(r => r.data);

export const updateLesson   = (id, data) =>
  api.put(`/admin/lessons/${id}`, data).then(r => r.data);

export const deleteLesson   = (id) =>
  api.delete(`/admin/lessons/${id}`).then(r => r.data);

export const reorderLesson  = (id, sort_order) =>
  api.put(`/admin/lessons/${id}/reorder`, { sort_order }).then(r => r.data);

export const addAttachment  = (lessonId, data) =>
  api.post(`/admin/lessons/${lessonId}/attachments`, data).then(r => r.data);

export const deleteAttachment = (lessonId, attachmentId) =>
  api.delete(`/admin/lessons/${lessonId}/attachments/${attachmentId}`).then(r => r.data);

// ═════════════════════════════════════════════════════════════════════════════
// QUIZZES
// ═════════════════════════════════════════════════════════════════════════════

export const getQuiz        = (id) =>
  api.get(`/admin/quizzes/${id}`).then(r => r.data);

export const createQuiz     = (data) =>
  api.post('/admin/quizzes', data).then(r => r.data);

export const updateQuiz     = (id, data) =>
  api.put(`/admin/quizzes/${id}`, data).then(r => r.data);

export const deleteQuiz     = (id) =>
  api.delete(`/admin/quizzes/${id}`).then(r => r.data);

// Questions
export const addQuestion    = (quizId, data) =>
  api.post(`/admin/quizzes/${quizId}/questions`, data).then(r => r.data);

export const updateQuestion = (questionId, data) =>
  api.put(`/admin/quizzes/questions/${questionId}`, data).then(r => r.data);

export const deleteQuestion = (questionId) =>
  api.delete(`/admin/quizzes/questions/${questionId}`).then(r => r.data);

// Options
export const addOption      = (questionId, data) =>
  api.post(`/admin/quizzes/questions/${questionId}/options`, data).then(r => r.data);

export const updateOption   = (optionId, data) =>
  api.put(`/admin/quizzes/options/${optionId}`, data).then(r => r.data);

export const deleteOption   = (optionId) =>
  api.delete(`/admin/quizzes/options/${optionId}`).then(r => r.data);

// ═════════════════════════════════════════════════════════════════════════════
// ATTENDEES
// ═════════════════════════════════════════════════════════════════════════════

export const getAttendees   = (courseId) =>
  api.get(`/admin/attendees/courses/${courseId}/attendees`).then(r => r.data);

export const inviteAttendees = (courseId, emails) =>
  api.post(`/admin/attendees/courses/${courseId}/invite`, { emails }).then(r => r.data);

export const removeAttendee = (courseId, enrollmentId) =>
  api.delete(`/admin/attendees/courses/${courseId}/attendees/${enrollmentId}`).then(r => r.data);

export const contactAttendees = (courseId, data) =>
  api.post(`/admin/attendees/courses/${courseId}/contact`, data).then(r => r.data);

// ═════════════════════════════════════════════════════════════════════════════
// REPORTING
// ═════════════════════════════════════════════════════════════════════════════

export const getReporting   = (params) =>
  api.get('/admin/reporting', { params }).then(r => r.data);

export const getReportingCourses = () =>
  api.get('/admin/reporting/courses').then(r => r.data);

// ═════════════════════════════════════════════════════════════════════════════
// USERS
// ═════════════════════════════════════════════════════════════════════════════

export const getUsers       = (search) =>
  api.get('/admin/users', { params: { search } }).then(r => r.data);

export const getUserStats   = () =>
  api.get('/admin/users/stats').then(r => r.data);
