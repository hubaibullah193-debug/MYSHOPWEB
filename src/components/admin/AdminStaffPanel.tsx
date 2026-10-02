'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  createAdmin,
  generateAdminResetLink,
  listAdmins,
  removeAdmin,
  revokeAdminSessions,
  setAdminTempPassword,
  updateAdmin,
  type AdminUser,
} from '@/lib/admin-account'

interface ActionResult {
  kind: 'link' | 'temp'
  email: string
  value: string
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.'
}

export default function AdminStaffPage() {
  const { user, isSuperAdmin, loading: authLoading } = useAuth()

  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [form, setForm] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: 'admin_staff' as 'admin_staff' | 'super_admin',
  })
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<{ email: string; temp_password: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [result, setResult] = useState<ActionResult | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const currentUserId = user?.id
  const canAssignSuperAdmin = user?.role === 'owner'

  const loadAdmins = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setAdmins(await listAdmins())
    } catch (err) {
      setLoadError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isSuperAdmin) {
      void loadAdmins()
    }
  }, [isSuperAdmin, loadAdmins])

  const canManage = (admin: AdminUser): boolean => {
    if (currentUserId === admin.id) return false
    if (!user) return false
    if (user.role === 'owner') return admin.role !== 'owner'
    return admin.role === 'admin_staff'
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setCreated(null)
    setCreating(true)
    try {
      const result = await createAdmin({
        email: form.email,
        full_name: form.full_name,
        phone: form.phone,
        role: form.role,
      })
      if (!result.temp_password) {
        throw new Error('No temporary password returned.')
      }
      setCreated({ email: result.email, temp_password: result.temp_password })
      setForm({ email: '', full_name: '', phone: '', role: form.role })
      await loadAdmins()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  const handleRoleChange = async (admin: AdminUser, role: 'admin_staff' | 'super_admin') => {
    setError(null)
    if (role === admin.role) return
    if (role === 'super_admin' && !canAssignSuperAdmin) {
      setError('Only the owner can promote an account to super admin.')
      return
    }
    setBusy(`role:${admin.id}`)
    try {
      await updateAdmin(admin.id, { role })
      setNotice(`${admin.email}'s role was changed to ${role.replace('_', ' ')}.`)
      await loadAdmins()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const handleToggleActive = async (admin: AdminUser) => {
    if (!window.confirm(admin.is_active
      ? `Deactivate ${admin.email}? They will be signed out immediately and blocked from logging in.`
      : `Reactivate ${admin.email}? They will be able to sign in again.`)) return
    setError(null)
    setNotice(null)
    setBusy(`active:${admin.id}`)
    try {
      await updateAdmin(admin.id, { is_active: !admin.is_active })
      setNotice(`${admin.email} ${admin.is_active ? 'deactivated' : 'activated'}.`)
      await loadAdmins()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const handleResetLink = async (admin: AdminUser) => {
    setError(null)
    setNotice(null)
    setResult(null)
    setBusy(`link:${admin.id}`)
    try {
      const { action_link } = await generateAdminResetLink(admin.id)
      setResult({ kind: 'link', email: admin.email, value: action_link })
      setNotice(`A one-time reset link was generated for ${admin.email}.`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const handleTempPassword = async (admin: AdminUser) => {
    setError(null)
    setNotice(null)
    setResult(null)
    setBusy(`temp:${admin.id}`)
    try {
      const { temp_password } = await setAdminTempPassword(admin.id)
      setResult({ kind: 'temp', email: admin.email, value: temp_password })
      setNotice(`A temporary password was issued for ${admin.email}. Their other sessions were signed out.`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const handleRevokeSessions = async (admin: AdminUser) => {
    setError(null)
    setNotice(null)
    setResult(null)
    setBusy(`revoke:${admin.id}`)
    try {
      const { temp_password } = await revokeAdminSessions(admin.id)
      setResult({ kind: 'temp', email: admin.email, value: temp_password })
      setNotice(`All sessions for ${admin.email} were signed out. A new password was issued.`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const handleRemove = async (admin: AdminUser) => {
    if (!window.confirm(
      `Remove ${admin.email} permanently? This deletes the account and cannot be undone. Deactivation is the safer alternative.`
    )) return
    setError(null)
    setNotice(null)
    setBusy(`remove:${admin.id}`)
    try {
      await removeAdmin(admin.id)
      setNotice(`${admin.email} was removed.`)
      await loadAdmins()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || !isSuperAdmin) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">
          You do not have permission to manage admin accounts.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff Accounts</h1>
        <p className="text-sm text-gray-600 mt-1">
          Create, manage, deactivate, and reset passwords for admin staff. These changes are
          enforced server-side and recorded in the activity log.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}
      {notice && (
        <div className="rounded-md bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">{notice}</p>
        </div>
      )}

      {result && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm font-medium text-amber-900">
            {result.kind === 'temp'
              ? `Temporary password for ${result.email}`
              : `Password reset link for ${result.email}`}
          </p>
          {result.kind === 'temp' ? (
            <p className="mt-2 font-mono text-base text-amber-900 break-all">{result.value}</p>
          ) : (
            <a
              href={result.value}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block text-sm text-primary underline break-all"
            >
              {result.value}
            </a>
          )}
          <p className="mt-2 text-xs text-amber-700">
            {result.kind === 'temp'
              ? 'Share this once and securely. It will not be shown again.'
              : 'This link is one-time use and expires. Share it securely with the admin.'}
          </p>
        </div>
      )}

      <section className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create Staff Account</h2>
          <p className="text-sm text-gray-600 mt-1">
            A temporary password is generated and shown once so the account can sign in immediately.
          </p>
        </div>
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                Full name
              </label>
              <input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone (optional)
              </label>
              <input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="role"
                value={form.role}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    role: e.target.value as 'admin_staff' | 'super_admin',
                  }))
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:ring-primary focus:border-primary sm:text-sm"
              >
                <option value="admin_staff">Admin Staff</option>
                {canAssignSuperAdmin && <option value="super_admin">Super Admin</option>}
              </select>
            </div>
          </div>
          {created && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm font-medium text-amber-900">
                Account created for {created.email}. Temporary password:
              </p>
              <p className="mt-2 font-mono text-base text-amber-900 break-all">
                {created.temp_password}
              </p>
              <p className="mt-2 text-xs text-amber-700">
                Share this once and securely. It will not be shown again.
              </p>
            </div>
          )}
          <div>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Existing Admins</h2>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading accounts...</div>
        ) : loadError ? (
          <div className="p-6">
            <p className="text-sm text-red-700">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadAdmins()}
              className="mt-3 inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        ) : admins.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No admin accounts yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last sign in
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {admins.map((admin) => {
                  const manageable = canManage(admin)
                  return (
                    <tr key={admin.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-900">{admin.full_name}</p>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {manageable && admin.role !== 'owner' ? (
                          <select
                            value={admin.role}
                            disabled={busy === `role:${admin.id}`}
                            onChange={(e) =>
                              void handleRoleChange(
                                admin,
                                e.target.value as 'admin_staff' | 'super_admin'
                              )
                            }
                            className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:ring-primary focus:border-primary disabled:opacity-50"
                          >
                            <option value="admin_staff">Admin Staff</option>
                            {(canAssignSuperAdmin || admin.role === 'super_admin') && (
                              <option value="super_admin">Super Admin</option>
                            )}
                          </select>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            {admin.role.replace('_', ' ')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            admin.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {admin.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {admin.last_sign_in_at
                          ? new Date(admin.last_sign_in_at).toLocaleString()
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {manageable ? (
                          <div className="flex justify-end gap-1 flex-wrap">
                            <button
                              type="button"
                              disabled={busy === `link:${admin.id}`}
                              onClick={() => void handleResetLink(admin)}
                              className="text-primary hover:text-indigo-500 disabled:opacity-50"
                            >
                              Reset link
                            </button>
                            <button
                              type="button"
                              disabled={busy === `temp:${admin.id}`}
                              onClick={() => void handleTempPassword(admin)}
                              className="text-primary hover:text-indigo-500 disabled:opacity-50"
                            >
                              Temp password
                            </button>
                            <button
                              type="button"
                              disabled={busy === `revoke:${admin.id}`}
                              onClick={() => void handleRevokeSessions(admin)}
                              className="text-primary hover:text-indigo-500 disabled:opacity-50"
                            >
                              Revoke sessions
                            </button>
                            <button
                              type="button"
                              disabled={busy === `active:${admin.id}`}
                              onClick={() => void handleToggleActive(admin)}
                              className="text-primary hover:text-indigo-500 disabled:opacity-50"
                            >
                              {admin.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              disabled={busy === `remove:${admin.id}`}
                              onClick={() => void handleRemove(admin)}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {admin.id === currentUserId ? 'You' : 'Read only'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}