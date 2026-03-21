const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === '[object Object]';

const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const MAX_NESTING_DEPTH = 8;
const MAX_ARRAY_LENGTH = 200;
const MAX_STRING_LENGTH = 20000;

const scanValue = (value, path, depth = 0) => {
  if (depth > MAX_NESTING_DEPTH) {
    return `Payload nesting is too deep at "${path || 'root'}"`;
  }

  if (typeof value === 'string') {
    if (value.includes('\0')) {
      return `Null bytes are not allowed in "${path || 'root'}"`;
    }

    if (value.length > MAX_STRING_LENGTH) {
      return `Value is too long at "${path || 'root'}"`;
    }

    return null;
  }

  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_LENGTH) {
      return `Array is too large at "${path || 'root'}"`;
    }

    for (let index = 0; index < value.length; index += 1) {
      const issue = scanValue(value[index], `${path}[${index}]`, depth + 1);
      if (issue) return issue;
    }

    return null;
  }

  if (!isPlainObject(value)) {
    return null;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (DANGEROUS_KEYS.has(key)) {
      return `Dangerous object key "${key}" is not allowed`;
    }

    if (key.startsWith('$') || key.includes('.')) {
      return `Suspicious field name "${key}" is not allowed`;
    }

    const issue = scanValue(nestedValue, path ? `${path}.${key}` : key, depth + 1);
    if (issue) return issue;
  }

  return null;
};

const enforceRequestSafety = (req, res, next) => {
  const segments = [
    ['body', req.body],
    ['query', req.query],
    ['params', req.params],
  ];

  for (const [label, value] of segments) {
    const issue = scanValue(value, label);
    if (issue) {
      return res.status(400).json({
        success: false,
        message: issue,
      });
    }
  }

  return next();
};

const rejectUnknownBodyFields = (allowedFields) => {
  const allowed = new Set(allowedFields);

  return (req, res, next) => {
    if (!req.body || !isPlainObject(req.body)) {
      return next();
    }

    const unexpectedFields = Object.keys(req.body).filter((key) => !allowed.has(key));
    if (unexpectedFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Unexpected field(s): ${unexpectedFields.join(', ')}`,
      });
    }

    return next();
  };
};

module.exports = {
  enforceRequestSafety,
  rejectUnknownBodyFields,
};
