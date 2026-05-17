import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'
import AdminNavLinks from '@/components/AdminNavLinks'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('nome, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="bg-slate-800 text-white flex flex-col fixed h-full z-10 hidden lg:flex" style={{ width: '200px' }}>
        <div className="px-6 py-5 border-b border-slate-700">
          <img src="/logo.png" alt="Logo 2B" style={{ height: '52px', objectFit: 'contain' }} />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <AdminNavLinks />
        </nav>

        <div className="px-6 py-4 border-t border-slate-700">
          <p className="text-xs text-slate-400 truncate mb-2">{profile.nome}</p>
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-slate-800 text-white z-10 px-4 py-3 flex items-center justify-between">
        <img src="/logo.png" alt="Logo 2B" style={{ height: '36px', objectFit: 'contain' }} />
        <div className="flex items-center gap-2">
          <Link href="/admin" className="text-xs text-slate-300 hover:text-white">Início</Link>
          <Link href="/admin/funcionarios" className="text-xs text-slate-300 hover:text-white">Funcionários</Link>
          <Link href="/admin/contra-cheques" className="text-xs text-slate-300 hover:text-white">CC</Link>
          <Link href="/admin/banco-horas" className="text-xs text-slate-300 hover:text-white">BH</Link>
          <LogoutButton />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pt-14 lg:pt-0 min-h-screen bg-slate-50 lg:ml-[200px]">
        {children}
      </main>
    </div>
  )
}
