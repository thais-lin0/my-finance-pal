import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Home } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { user, signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin') // signin | signup
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) throw error
      } else {
        const { error } = await signUp(email, password, name.trim() || undefined)
        if (error) throw error
        setMsg({
          type: 'ok',
          text: 'Conta criada! Se a confirmação por email estiver ativa, verifique sua caixa de entrada. Caso contrário, já pode entrar.',
        })
      }
    } catch (err) {
      setMsg({ type: 'err', text: err.message ?? 'Erro ao autenticar' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-ink-900 via-brand-800 to-brand-600 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl dark:bg-ink-900">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white">
            <Home size={26} />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              My Life Pal
            </h1>
            <p className="text-sm text-slate-500">Seu painel de vida</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Nome
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="Como quer ser chamada(o)"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="voce@email.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              Senha
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          {msg && (
            <div
              className={`rounded-xl px-4 py-2.5 text-sm ${
                msg.type === 'ok'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {msg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? 'Aguarde…' : mode === 'signin' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
            setMsg(null)
          }}
          className="mt-4 w-full text-center text-sm text-brand-600 hover:underline"
        >
          {mode === 'signin'
            ? 'Não tem conta? Criar agora'
            : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  )
}
