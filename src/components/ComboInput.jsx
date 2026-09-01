import { useId } from 'react'

const base =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-ink-700 dark:bg-ink-800 dark:text-white'

// Input com sugestões (datalist): você pode escolher uma opção existente
// ou digitar uma nova. `options` é uma lista de strings.
export default function ComboInput({ value, onChange, options = [], placeholder, required }) {
  const listId = useId()
  return (
    <>
      <input
        className={base}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
    </>
  )
}
