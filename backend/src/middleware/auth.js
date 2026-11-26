
import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || '';

  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Please log in to continue.'
    });
  }

  const token = authorization.slice(7);

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        error: 'Authentication is not configured.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.sub,
      email: decoded.email
    };

    next();
  } catch {
    return res.status(401).json({
      error: 'Your session is invalid or expired. Please log in again.'
    });
  }
}
