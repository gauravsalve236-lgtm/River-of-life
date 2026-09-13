/**
 * Server-Side Role-Based Access Control (RBAC) Middleware
 * Enforces permissions for Super-Admin, Pastor, Prayer Team, and Member/User roles.
 */

function normalizeRole(role) {
  if (!role) return 'user';
  return role.toString().trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function requireRole(...allowedRoles) {
  const normalizedAllowed = allowedRoles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    const userRole = normalizeRole(req.user.role || 'user');

    // Super Admin has universal access across all modules
    if (userRole === 'super_admin') {
      return next();
    }

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ 
        error: `Forbidden: Access requires one of these roles: [${allowedRoles.join(', ')}]. Current role: '${req.user.role}'` 
      });
    }

    next();
  };
}

module.exports = {
  requireRole,
  normalizeRole
};

