export const getApiErrorMessage = (
  error,
  fallback = 'Something went wrong. Please try again.'
) => {
  const validationMessage = error?.response?.data?.errors?.[0]?.msg;
  const apiMessage = error?.response?.data?.message;

  if (validationMessage) return validationMessage;
  if (apiMessage) return apiMessage;
  if (error?.code === 'ERR_NETWORK') {
    return 'Unable to connect to the server. Please check your network and try again.';
  }

  return fallback;
};

export const applyApiFieldErrors = (error, setError, fieldMap = {}) => {
  const issues = error?.response?.data?.errors;

  if (!Array.isArray(issues) || issues.length === 0) {
    return false;
  }

  issues.forEach((issue) => {
    const field = fieldMap[issue.path] || issue.path;

    if (field) {
      setError(field, {
        type: 'server',
        message: issue.msg || 'Invalid value',
      });
    }
  });

  return true;
};
