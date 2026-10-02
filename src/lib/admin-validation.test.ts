import {
  normalizePhone,
  parseAdminActive,
  parseAdminEmail,
  parseAdminName,
  parseAdminPhone,
  parseAdminRole,
  parsePassword,
  parseResetMode,
} from '@/lib/admin-validation'

describe('admin-validation', () => {
  describe('parseAdminEmail', () => {
    it('accepts and normalises a valid email', () => {
      expect(parseAdminEmail('  User@Example.com ')).toBe('user@example.com')
    })

    it('rejects malformed emails', () => {
      expect(() => parseAdminEmail('not-an-email')).toThrow()
      expect(() => parseAdminEmail('a@b')).toThrow()
      expect(() => parseAdminEmail('')).toThrow()
      expect(() => parseAdminEmail('  ')).toThrow()
    })
  })

  describe('parseAdminName', () => {
    it('accepts a trimmed name', () => {
      expect(parseAdminName('  Ali Raza  ')).toBe('Ali Raza')
    })

    it('rejects names that are too short or too long', () => {
      expect(() => parseAdminName('A')).toThrow()
      expect(() => parseAdminName('')).toThrow()
      expect(() => parseAdminName('x'.repeat(121))).toThrow()
    })
  })

  describe('parseAdminPhone / normalizePhone', () => {
    it('normalises common phone formats', () => {
      expect(parseAdminPhone('+1 (555) 123-4567')).toBe('+15551234567')
      expect(parseAdminPhone('0300 1234567')).toBe('03001234567')
    })

    it('allows empty phones', () => {
      expect(parseAdminPhone('')).toBeNull()
      expect(parseAdminPhone(null)).toBeNull()
      expect(normalizePhone('  ')).toBeNull()
    })

    it('rejects clearly invalid phones', () => {
      expect(() => parseAdminPhone('abc')).toThrow()
      expect(() => parseAdminPhone('123')).toThrow()
    })
  })

  describe('parsePassword', () => {
    it('accepts passwords of 8-128 characters', () => {
      expect(parsePassword('eightchr')).toBe('eightchr')
      expect(parsePassword('x'.repeat(128))).toHaveLength(128)
    })

    it('rejects short or missing passwords', () => {
      expect(() => parsePassword('short')).toThrow()
      expect(() => parsePassword('')).toThrow()
      expect(() => parsePassword('  123  ')).toThrow()
    })
  })

  describe('parseAdminRole', () => {
    it('accepts admin_staff and super_admin', () => {
      expect(parseAdminRole('admin_staff')).toBe('admin_staff')
      expect(parseAdminRole('super_admin')).toBe('super_admin')
    })

    it('rejects owner, customer and garbage', () => {
      expect(() => parseAdminRole('owner')).toThrow()
      expect(() => parseAdminRole('customer')).toThrow()
      expect(() => parseAdminRole('admin')).toThrow()
    })
  })

  describe('parseAdminActive', () => {
    it('accepts booleans', () => {
      expect(parseAdminActive(true)).toBe(true)
      expect(parseAdminActive(false)).toBe(false)
    })

    it('rejects strings and numbers', () => {
      expect(() => parseAdminActive('true')).toThrow()
      expect(() => parseAdminActive(1)).toThrow()
    })
  })

  describe('parseResetMode', () => {
    it('accepts link and temp', () => {
      expect(parseResetMode('link')).toBe('link')
      expect(parseResetMode('temp')).toBe('temp')
    })

    it('rejects unknown modes', () => {
      expect(() => parseResetMode('email')) .toThrow()
      expect(() => parseResetMode('')).toThrow()
    })
  })
})