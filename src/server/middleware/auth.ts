import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../types';

export type UserRoleType = 'admin' | 'manager' | 'staff';

/**
 * Strict role verification middleware.
 * Maps backend database roles ('barista') to frontend roles ('staff') to align with RBAC specifications.
 * Instantly terminates unauthorized access with a 403 Forbidden JSON response.
 */
export const verifyRole = (allowedRoles: UserRoleType[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(403).json({ error: "Access Denied: User context is missing or invalid token." });
    }

    // Safely map database role 'barista' to UI role type 'staff'
    const currentMappedRole: UserRoleType = user.role === 'barista' ? 'staff' : (user.role as any);

    if (!allowedRoles.includes(currentMappedRole)) {
      return res.status(403).json({
        error: `Access Denied: Insufficient permissions. Required role: one of [${allowedRoles.join(', ')}]. Current role: ${currentMappedRole}`
      });
    }

    next();
  };
};
