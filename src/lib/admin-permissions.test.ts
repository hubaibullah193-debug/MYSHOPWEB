import {
  ADMIN_ROLES,
  canManageRole,
  isAdminRole,
  isOwnerRole,
  isSuperAdminRole,
  isValidAssignableRole,
  roleRank,
  type UserRole,
} from '@/lib/admin-permissions'

describe('admin-permissions', () => {
  describe('roleRank', () => {
    it('ranks customer < admin_staff < super_admin < owner', () => {
      expect(roleRank('customer')).toBe(0)
      expect(roleRank('admin_staff')).toBe(1)
      expect(roleRank('super_admin')).toBe(2)
      expect(roleRank('owner')).toBe(3)
    })

    it('returns -1 for null or undefined', () => {
      expect(roleRank(null)).toBe(-1)
      expect(roleRank(undefined)).toBe(-1)
    })
  })

  describe('role predicates', () => {
    it('recognises all admin roles', () => {
      expect(isAdminRole('admin_staff')).toBe(true)
      expect(isAdminRole('super_admin')).toBe(true)
      expect(isAdminRole('owner')).toBe(true)
      expect(isAdminRole('customer')).toBe(false)
      expect(isAdminRole(null)).toBe(false)
    })

    it('recognises super admin and owner', () => {
      expect(isSuperAdminRole('super_admin')).toBe(true)
      expect(isSuperAdminRole('owner')).toBe(true)
      expect(isSuperAdminRole('admin_staff')).toBe(false)
      expect(isSuperAdminRole('customer')).toBe(false)
    })

    it('recognises owner only', () => {
      expect(isOwnerRole('owner')).toBe(true)
      expect(isOwnerRole('super_admin')).toBe(false)
      expect(isOwnerRole('admin_staff')).toBe(false)
    })

    it('exports the canonical admin role list', () => {
      expect([...ADMIN_ROLES]).toEqual(['admin_staff', 'super_admin', 'owner'])
    })
  })

  describe('canManageRole', () => {
    it('lets the owner manage super admins and staff', () => {
      expect(canManageRole('owner', 'super_admin')).toBe(true)
      expect(canManageRole('owner', 'admin_staff')).toBe(true)
    })

    it('lets a super admin manage staff but not another super admin', () => {
      expect(canManageRole('super_admin', 'admin_staff')).toBe(true)
      expect(canManageRole('super_admin', 'super_admin')).toBe(false)
    })

    it('blocks any admin from managing the owner', () => {
      expect(canManageRole('owner', 'owner')).toBe(false)
      expect(canManageRole('super_admin', 'owner')).toBe(false)
    })

    it('blocks admin staff from managing anyone', () => {
      expect(canManageRole('admin_staff', 'admin_staff')).toBe(false)
      expect(canManageRole('admin_staff', 'super_admin')).toBe(false)
      expect(canManageRole('admin_staff', 'owner')).toBe(false)
    })

    it('blocks customer and unknown actors', () => {
      expect(canManageRole('customer', 'admin_staff')).toBe(false)
      expect(canManageRole(null, 'admin_staff')).toBe(false)
      expect(canManageRole(undefined, 'admin_staff')).toBe(false)
    })
  })

  describe('isValidAssignableRole', () => {
    it('allows only admin_staff and super_admin', () => {
      expect(isValidAssignableRole('admin_staff')).toBe(true)
      expect(isValidAssignableRole('super_admin')).toBe(true)
      expect(isValidAssignableRole('owner')).toBe(false)
      expect(isValidAssignableRole('customer')).toBe(false)
      expect(isValidAssignableRole(null)).toBe(false)
    })
  })

  describe('type assertions', () => {
    it('exposes the UserRole union', () => {
      const role: UserRole = 'owner'
      expect(role).toBe('owner')
    })
  })
})