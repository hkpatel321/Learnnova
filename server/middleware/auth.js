import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Extract and verify the Bearer token from the Authorization header.
 * Returns the decoded payload, or null if absent / invalid.
 */
function extractUser(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;

  const token = header.slice(7); // strip "Bearer "
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Hard block — respond 401 if no valid token.
 * Attaches decoded payload to req.user when valid.
 */
export function authRequired(req, res, next) {
  const user = extractUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  req.user = user;
  next();
}

/**
 * Soft attach — silently attaches user to req.user when a valid token is
 * present, but never blocks the request (req.user stays undefined otherwise).
 * Useful for public endpoints that behave differently when logged in.
 */
export function authOptional(req, res, next) {
  req.user = extractUser(req) ?? undefined;
  next();
}
