/**
 * Server-Side Role-Based Access Control (RBAC) Middleware
 * Enforces permissions for Member, Prayer Host, Church Admin, and Super Admin roles.
 */

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    const userRole = req.user.role || 'Member';

    // Super Admin has universal access
    if (userRole === 'Super Admin') {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: `Forbidden: Access requires one of these roles: [${allowedRoles.join(', ')}]. Current role: '${userRole}'` 
      });
    }

    next();
  };
}

module.exports = {
  requireRole
};
