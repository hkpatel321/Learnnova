const normalizePathIdentifier = (value) => {
  if (!value) return '';

  const text = String(value).trim();
  if (!text) return '';

  try {
    const parsed = new URL(text);
    const segments = parsed.pathname.split('/').filter(Boolean);
    return segments[segments.length - 1] || '';
  } catch {
    return text;
  }
};

export const getCoursePathIdentifier = (course) =>
  normalizePathIdentifier(course?.websiteUrl || course?.website_url) || course?.id || '';

export const getCoursePath = (course) => `/courses/${getCoursePathIdentifier(course)}`;
