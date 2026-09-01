import { useEffect, useRef, useState } from 'react'

// Célula editável por duplo-clique. Enter/blur salva, Esc cancela.
// type: 'text' | 'number' | 'date' | 'select'
export default function EditableCell({
  value,
  display,
  type = 'text',
  options = [],
  onSave,
  align = 'left',
  className = '',
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const ref = useRef(null)

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus()
      if (ref.current.select) ref.current.select()
    }
  }, [editing])

  const start = () => {
    setDraft(value ?? '')
    setEditing(true)
  }

  const commit = async () => {
    setEditing(false)
    const normalized = type === 'number' ? Number(draft) || 0 : draft
    if (String(normalized) !== String(value ?? '')) {
      await onSave(normalized)
    }
  }

  const cancel = () => {
    setDraft(value ?? '')
    setEditing(false)
  }

  const onKey = (e) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') cancel()
  }

  if (editing) {
    const common =
      'w-full rounded-md border border-brand-400 bg-white px-1.5 py-1 text-sm outline-none focus:ring-2 focus:ring-brand-200 dark:bg-ink-800 dark:text-white'
    if (type === 'select') {
      return (
        <select
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKey}
          className={common}
        >
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      )
    }
    return (
      <input
        ref={ref}
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        className={`${common} ${align === 'right' ? 'text-right' : ''}`}
      />
    )
  }

  return (
    <span
      onDoubleClick={start}
      title="Dê dois cliques para editar"
      className={`block cursor-text rounded-md px-1 py-0.5 hover:bg-slate-100 dark:hover:bg-ink-800 ${className}`}
    >
      {display ?? value ?? '—'}
    </span>
  )
}
