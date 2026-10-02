export type UserRole = 'customer' | 'admin_staff' | 'super_admin' | 'owner'

export const ADMIN_ROLES = ['admin_staff', 'super_admin', 'owner'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

const ROLE_RANK: Record<UserRole, number> = {
  customer: 0,
  admin_staff: 1,
  super_admin: 2,
  owner: 3,
}

export function roleRank(role: UserRole | null | undefined): number {
  return role ? ROLE_RANK[role] : -1
}

export function isAdminRole(role: UserRole | null | undefined): boolean {
  return role !== null && role !== undefined && ADMIN_ROLES.includes(role as AdminRole)
}

export function isSuperAdminRole(role: UserRole | null | undefined): boolean {
  return role === 'super_admin' || role === 'owner'
}

export function isOwnerRole(role: UserRole | null | undefined): boolean {
  return role === 'owner'
}

/**
 * Can `actor` manage an account carrying `target` (or being assigned `target`)?
 * Only super admin / owner can manage accounts, and never at equal or higher rank.
 */
export function canManageRole(
  actor: UserRole | null | undefined,
  target: UserRole | null | undefined
): boolean {
  return isSuperAdminRole(actor) && roleRank(target) < roleRank(actor)
}

/**
 * Roles that super admins / owners may assign when creating or promoting staff.
 * The `owner` role is never assignable.
 */
export function isValidAssignableRole(role: UserRole | null | undefined): boolean {
  return role === 'admin_staff' || role === 'super_admin'
}