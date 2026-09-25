import { validateEmail, validatePhoneNumber } from '@/lib/auth'

describe('Auth Utilities', () => {
  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true)
      expect(validateEmail('test.email@domain.co.uk')).toBe(true)
      expect(validateEmail('user+tag@example.com')).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid.email')).toBe(false)
      expect(validateEmail('user@')).toBe(false)
      expect(validateEmail('@domain.com')).toBe(false)
      expect(validateEmail('')).toBe(false)
    })
  })

  describe('validatePhoneNumber', () => {
    it('should accept valid Pakistani phone numbers', () => {
      expect(validatePhoneNumber('03001234567')).toBe(true)
      expect(validatePhoneNumber('03111234567')).toBe(true)
      expect(validatePhoneNumber('+923001234567')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('1234567')).toBe(false)
      expect(validatePhoneNumber('02001234567')).toBe(false) // Invalid prefix
      expect(validatePhoneNumber('')).toBe(false)
    })
  })
})
