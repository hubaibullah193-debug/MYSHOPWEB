export const inputClassName =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500'

export const buttonPrimary =
  'inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50'

export const buttonSecondary =
  'inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'

export const buttonDanger =
  'inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'

export function Field({
  label,
  hint,
  children,
  required,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="rounded-md bg-red-50 p-4" role="alert">
      <p className="text-sm font-medium text-red-800">{message}</p>
    </div>
  )
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-600">{label}</p>
      </div>
    </div>
  )
}

export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white p-12 text-center shadow">
      <p className="text-lg text-gray-600">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return 'PKR 0'
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount)) return 'PKR 0'
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`
}