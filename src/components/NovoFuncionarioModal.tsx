'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, X } from 'lucide-react'
import { maskCPF } from '@/lib/utils'

export default function NovoFuncionarioModal() {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    nome: '', email: '', cpf: '', cargo: '', departamento: '', senha: ''
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const res = await fetch('/api/admin/funcionarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    if (!res.ok) {
      setErro(data.error || 'Erro ao criar funcionário.')
      setCarregando(false)
      return
    }

    setAberto(false)
    setForm({ nome: '', email: '', cpf: '', cargo: '', departamento: '', senha: '' })
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
      >
        <UserPlus className="w-4 h-4" />
        Novo Funcionário
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Novo Funcionário</h2>
              <button onClick={() => setAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nome completo *</label>
                  <input value={form.nome} onChange={e => set('nome', e.target.value)} required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">E-mail *</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">CPF *</label>
                  <input value={form.cpf} onChange={e => set('cpf', maskCPF(e.target.value))} required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Senha inicial *</label>
                  <input type="password" value={form.senha} onChange={e => set('senha', e.target.value)} required minLength={6}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cargo</label>
                  <input value={form.cargo} onChange={e => set('cargo', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Departamento</label>
                  <input value={form.departamento} onChange={e => set('departamento', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
              </div>

              {erro && <p className="text-red-600 text-xs">{erro}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAberto(false)}
                  className="flex-1 border border-slate-300 text-slate-700 text-sm py-2 rounded-lg hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={carregando}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-400 text-white text-sm py-2 rounded-lg transition">
                  {carregando ? 'Criando...' : 'Criar Funcionário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
