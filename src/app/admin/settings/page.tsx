'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { changeOwnPassword, signOutAdmin, signOutAllDevices } from '@/lib/admin-account'
import { useAuth } from '@/hooks/useAuth'

export default function AdminSettingsPage() {
  const router = useRouter()
  const { user, isSuperAdmin } = useAuth()
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [signingOutAll, setSigningOutAll] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setUpdating(true)
    try {
      await changeOwnPassword(formData.currentPassword, formData.newPassword)
      await signOutAdmin()
      router.push('/admin/login?reset=1')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change the password.')
    } finally {
      setUpdating(false)
    }
  }

  const handleSignOutAllDevices = async () => {
    setError(null)
    setSigningOutAll(true)
    try {
      await signOutAllDevices()
      router.push('/admin/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign out all devices.')
      setSigningOutAll(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-1">
        <section className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Account Security</h2>
            <p className="text-sm text-gray-600 mt-1">
              Changing your password signs you out of every other device.
            </p>
          </div>
          <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                Current password
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:ring-primary focus:border-primary sm:text-sm"
                value={formData.currentPassword}
                onChange={handleChange}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:ring-primary focus:border-primary sm:text-sm"
                  value={formData.newPassword}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:ring-primary focus:border-primary sm:text-sm"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={updating}
                className="inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Sessions</h2>
            <p className="text-sm text-gray-600 mt-1">
              Sign out of Hubaib Admin on every device you are currently signed in on.
            </p>
          </div>
          <div className="p-6 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-gray-600">
              Signed in as <span className="font-medium text-gray-900">{user?.email}</span>
            </p>
            <button
              type="button"
              onClick={handleSignOutAllDevices}
              disabled={signingOutAll}
              className="inline-flex justify-center py-2 px-4 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signingOutAll ? 'Signing Out All Devices...' : 'Sign Out All Devices'}
            </button>
          </div>
        </section>

        {isSuperAdmin && user && (
          <section className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Admin Accounts</h2>
              <p className="text-sm text-gray-600 mt-1">
                Create staff accounts, change roles, deactivate, and reset passwords.
              </p>
            </div>
            <div className="p-6">
              <Link
                href="/admin/settings/staff"
                className="inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Manage Staff Accounts
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}