import { useEffect, useRef, useState } from 'react'
import { User, Lock, Save, Mail, Loader2, Upload, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-ink-700 dark:bg-ink-800 dark:text-white'

const card =
  'rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900'

const label = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1'

// Iniciais a partir do nome (fallback quando não há avatar).
function initials(name, email) {
  const base = (name || email || '').trim()
  if (!base) return '?'
  const parts = base.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return base.slice(0, 2).toUpperCase()
}

export default function PerfilPage() {
  const { user } = useAuth()

  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)

  const [toast, setToast] = useState(null) // { type: 'ok' | 'err', msg }

  const showToast = (type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  // Carrega o perfil atual da tabela profiles.
  useEffect(() => {
    if (!user) return
    let active = true
    setDisplayName(user.user_metadata?.display_name || '')
    supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        if (data) {
          setDisplayName(data.display_name || user.user_metadata?.display_name || '')
          setAvatarUrl(data.avatar_url || '')
        }
        setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [user])

  // Persiste a avatar_url em profiles + auth metadata (usada pelo upload/remover).
  const persistAvatar = async (url) => {
    const { error: pErr } = await supabase
      .from('profiles')
      .update({ avatar_url: url || null, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (pErr) throw pErr
    const { error: aErr } = await supabase.auth.updateUser({ data: { avatar_url: url || null } })
    if (aErr) throw aErr
  }

  // Faz upload da foto pro Storage (avatars/{uid}/avatar.<ext>) e salva a URL pública.
  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      showToast('err', 'Use uma imagem PNG, JPG ou WEBP.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('err', 'A imagem precisa ter até 2 MB.')
      return
    }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${user.id}/avatar.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      // cache-bust: força o navegador a recarregar quando a foto muda no mesmo path
      const url = `${data.publicUrl}?v=${Date.now()}`

      await persistAvatar(url)
      setAvatarUrl(url)
      showToast('ok', 'Foto atualizada.')
    } catch (err) {
      showToast('err', err.message || 'Não foi possível enviar a foto.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Remove a foto atual (limpa a URL; o arquivo antigo é sobrescrito no próximo upload).
  const removeAvatar = async () => {
    if (!user || !avatarUrl) return
    setUploading(true)
    try {
      await persistAvatar('')
      setAvatarUrl('')
      showToast('ok', 'Foto removida.')
    } catch (err) {
      showToast('err', err.message || 'Não foi possível remover a foto.')
    } finally {
      setUploading(false)
    }
  }

  const saveProfile = async () => {
    if (!user) return
    const name = displayName.trim()
    if (!name) {
      showToast('err', 'Informe um nome.')
      return
    }
    setSavingProfile(true)
    try {
      // 1) Atualiza a linha em profiles (fonte da verdade exibida no app).
      const { error: pErr } = await supabase
        .from('profiles')
        .update({
          display_name: name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
      if (pErr) throw pErr

      // 2) Espelha no metadata do auth (mantém consistência no primeiro load).
      const { error: aErr } = await supabase.auth.updateUser({
        data: { display_name: name },
      })
      if (aErr) throw aErr

      showToast('ok', 'Perfil atualizado.')
    } catch (e) {
      showToast('err', e.message || 'Não foi possível salvar o perfil.')
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async () => {
    if (pwd.length < 6) {
      showToast('err', 'A senha precisa ter ao menos 6 caracteres.')
      return
    }
    if (pwd !== pwd2) {
      showToast('err', 'As senhas não coincidem.')
      return
    }
    setSavingPwd(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd })
      if (error) throw error
      setPwd('')
      setPwd2('')
      showToast('ok', 'Senha alterada com sucesso.')
    } catch (e) {
      showToast('err', e.message || 'Não foi possível alterar a senha.')
    } finally {
      setSavingPwd(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-500">Sua conta</p>
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Perfil</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Ajuste seu nome, avatar e senha.
        </p>
      </header>

      {/* Cabeçalho com avatar + preview */}
      <div className={`${card} mb-6 flex items-center gap-4`}>
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-500 text-xl font-bold text-white">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            initials(displayName, user?.email)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-slate-900 dark:text-white">
            {displayName || '—'}
          </p>
          <p className="flex items-center gap-1.5 truncate text-sm text-slate-400">
            <Mail size={14} /> {user?.email}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !loaded}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition hover:bg-brand-600 disabled:opacity-60"
            >
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {avatarUrl ? 'Trocar foto' : 'Enviar foto'}
            </button>
            {avatarUrl && (
              <button
                onClick={removeAvatar}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-coral/10 hover:text-coral disabled:opacity-60 dark:border-ink-700 dark:text-slate-300"
              >
                <Trash2 size={15} /> Remover
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">PNG, JPG ou WEBP, até 2 MB.</p>
        </div>
      </div>

      {/* Dados do perfil */}
      <section className={`${card} mb-6`}>
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
          <User size={18} className="text-brand-500" /> Dados do perfil
        </h2>

        <div className="space-y-4">
          <div>
            <label className={label} htmlFor="pf-name">
              Nome
            </label>
            <input
              id="pf-name"
              className={inputCls}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Como quer ser chamada(o)"
              disabled={!loaded}
            />
          </div>

          <button
            onClick={saveProfile}
            disabled={savingProfile || !loaded}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-card transition hover:bg-brand-600 disabled:opacity-60"
          >
            {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar perfil
          </button>
        </div>
      </section>

      {/* Segurança / senha */}
      <section className={card}>
        <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
          <Lock size={18} className="text-brand-500" /> Segurança
        </h2>
        <p className="mb-4 text-sm text-slate-400">Defina uma nova senha (mínimo 6 caracteres).</p>

        <div className="space-y-4">
          <div>
            <label className={label} htmlFor="pf-pwd">
              Nova senha
            </label>
            <input
              id="pf-pwd"
              type="password"
              className={inputCls}
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className={label} htmlFor="pf-pwd2">
              Confirmar nova senha
            </label>
            <input
              id="pf-pwd2"
              type="password"
              className={inputCls}
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <button
            onClick={savePassword}
            disabled={savingPwd || !pwd || !pwd2}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-ink-700 dark:text-slate-200 dark:hover:bg-ink-800"
          >
            {savingPwd ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            Alterar senha
          </button>
        </div>
      </section>

      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
            toast.type === 'err' ? 'bg-coral' : 'bg-ink-900 dark:bg-ink-700'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
