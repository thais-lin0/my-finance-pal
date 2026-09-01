# 💰 My Finance Pal

Controle financeiro pessoal com dashboard. Cadastre receitas, despesas (com categoria, vencimento e status pago/pendente) e poupança por mês, e acompanhe KPIs e gráficos.

**Stack:** React + Vite + TailwindCSS + Recharts · Supabase (Postgres + Auth + RLS) · deploy na Vercel.

---

## 1. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, cole e rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql). Isso cria as tabelas `incomes`, `expenses`, `savings` e ativa o **Row Level Security** (cada usuário só vê os próprios dados).
3. Em **Project Settings → API**, copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - Chave **anon public** → `VITE_SUPABASE_ANON_KEY`
4. (Opcional) Em **Authentication → Providers → Email**, você pode desativar "Confirm email" para entrar sem confirmação por email durante os testes.

## 2. Rodar localmente

```bash
cp .env.example .env      # preencha as duas variáveis
npm install
npm run dev               # http://localhost:5173
```

## 3. Deploy na Vercel

1. Suba o repositório no GitHub.
2. Na Vercel: **New Project → Import** o repositório.
   - Framework preset: **Vite** (detectado automaticamente)
   - Build command: `npm run build` · Output: `dist`
3. Em **Settings → Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **Deploy**. O `vercel.json` já cuida do roteamento SPA (fallback para `index.html`).
5. Depois do deploy, no Supabase em **Authentication → URL Configuration**, adicione a URL da Vercel em **Site URL** e **Redirect URLs**.

> A chave `anon` é pública por design — o RLS é o que protege os dados. Nunca exponha a chave `service_role` no frontend.

---

## Estrutura

```
supabase/schema.sql          Tabelas + RLS
src/
  lib/supabase.js            Cliente Supabase
  lib/format.js              Formatação BRL, datas, meses, categorias
  context/AuthContext.jsx    Sessão / login / logout
  hooks/useFinanceData.js    CRUD + totais + agregações do mês
  pages/LoginPage.jsx        Login / cadastro
  pages/DashboardPage.jsx    Dashboard principal
  components/                KPIs, gráficos, tabela, modais
```

## Funcionalidades

- Login por email/senha (Supabase Auth)
- Seleção de mês de referência (últimos 12 meses)
- KPIs: receita, despesas, poupança, saldo em caixa
- Barra de progresso pago × restante
- Gráfico de pizza de gastos por tipo + barras receita × despesa × poupança
- Tabela de despesas com filtro por categoria/status e toggle pago/pendente
- Formatação em Real (pt-BR) e dark mode
