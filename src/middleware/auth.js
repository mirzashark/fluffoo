import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fluffoo_super_secret_jwt_key_2026_cuddle_forever';

export function generateToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please login.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired authentication token.' });
    }
    req.user = user;
    next();
  });
}

// Staff role-based access control (RBAC)
export function requireStaffRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || req.user.type !== 'staff') {
      return res.status(403).json({ success: false, error: 'Access denied: Staff credentials required.' });
    }

    // Super Admin has unrestricted access to all operations
    if (req.user.role === 'super_admin') {
      return next();
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Access denied: Requires one of [${allowedRoles.join(', ')}] role.`
    });
  };
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
    } else {
      req.user = null;
    }
    next();
  });
}
