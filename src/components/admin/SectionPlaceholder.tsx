interface SectionPlaceholderProps {
  title: string
  blurb?: string
}

/**
 * Renders an empty admin section for features that belong to later Phase 1
 * tasks. It is intentionally non-functional so we do not pre-empt dedicated
 * tasks (products, inventory, delivery zones, etc.).
 */
export default function SectionPlaceholder({ title, blurb }: SectionPlaceholderProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-600 mt-1">
        {blurb ?? 'This section is scheduled for a dedicated later task and is intentionally not built yet.'}
      </p>
      <div className="mt-8 rounded-lg border-2 border-dashed border-gray-300 bg-white p-16 text-center">
        <p className="text-gray-500">Coming in a later task.</p>
      </div>
    </div>
  )
}