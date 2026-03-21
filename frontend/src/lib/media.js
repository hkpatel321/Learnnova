export const resolveMediaUrl = (value) => {
  if (!value) return '';
  const raw = String(value).trim();

  if (!raw || raw === 'null' || raw === 'undefined') return '';

  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }

  if (raw.startsWith('/')) return raw;

  return `/${raw}`;
};
