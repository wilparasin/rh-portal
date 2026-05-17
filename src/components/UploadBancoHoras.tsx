'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { formatCPF } from '@/lib/utils'

interface PreviewRow {
  cpf: string
  nome: string
  saldo_minutos: number
  periodo: string
  encontrado: boolean
}

export default function UploadBancoHoras() {
  const router = useRouter()
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [periodo, setPeriodo] = useState('')
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [carregandoPreview, setCarregandoPreview] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ ok: number; naoEncontrados: string[] } | null>(null)
  const [erro, setErro] = useState('')

  async function handlePreview() {
    if (!arquivo || !periodo) return
    setCarregandoPreview(true)
    setErro('')
    setPreview(null)

    const formData = new FormData()
    formData.append('arquivo', arquivo)
    formData.append('periodo', periodo)
    formData.append('modo', 'preview')

    const res = await fetch('/api/admin/banco-horas', { method: 'POST', body: formData })
    const data = await res.json()

    if (!res.ok) {
      setErro(data.error || 'Erro ao processar planilha.')
    } else {
      setPreview(data.preview)
    }
    setCarregandoPreview(false)
  }

  async function handleConfirmar() {
    if (!arquivo || !periodo || !preview) return
    setEnviando(true)
    setErro('')

    const formData = new FormData()
    formData.append('arquivo', arquivo)
    formData.append('periodo', periodo)
    formData.append('modo', 'confirmar')

    const res = await fetch('/api/admin/banco-horas', { method: 'POST', body: formData })
    const data = await res.json()

    if (!res.ok) {
      setErro(data.error || 'Erro ao importar.')
    } else {
      setResultado({ ok: data.total, naoEncontrados: data.naoEncontrados })
      setPreview(null)
      setArquivo(null)
      setPeriodo('')
      router.refresh()
    }
    setEnviando(false)
  }

  function formatHoras(minutos: number): string {
    const sinal = minutos < 0 ? '-' : '+'
    const abs = Math.abs(minutos)
    return `${sinal}${Math.floor(abs / 60)}h${(abs % 60).toString().padStart(2, '0')}min`
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900 text-sm">Importar Planilha</h2>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Planilha Excel (.xlsx ou .xls)</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={e => { setArquivo(e.target.files?.[0] || null); setPreview(null); setResultado(null) }}
              className="w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:text-sm hover:file:bg-slate-200 transition cursor-pointer border border-slate-300 rounded-lg py-1.5 px-2"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Período (ex: Abril/2025)</label>
            <input
              type="text"
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
              placeholder="Maio/2025"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>

        {erro && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{erro}</p>
          </div>
        )}

        {resultado && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <p className="text-sm text-emerald-700 font-medium">{resultado.ok} funcionários atualizados com sucesso.</p>
            </div>
            {resultado.naoEncontrados.length > 0 && (
              <p className="text-xs text-amber-600 mt-2">
                CPFs não encontrados: {resultado.naoEncontrados.join(', ')}
              </p>
            )}
          </div>
        )}

        {!preview && (
          <button
            onClick={handlePreview}
            disabled={!arquivo || !periodo || carregandoPreview}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-300 text-white text-sm px-5 py-2.5 rounded-lg transition"
          >
            {carregandoPreview ? 'Processando...' : 'Visualizar Dados'}
          </button>
        )}

        {/* Preview */}
        {preview && (
          <>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <p className="text-xs font-medium text-slate-600">
                  {preview.length} registros encontrados
                  {preview.filter(r => !r.encontrado).length > 0 && (
                    <span className="text-amber-600 ml-2">
                      · {preview.filter(r => !r.encontrado).length} CPF(s) não cadastrado(s)
                    </span>
                  )}
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-slate-500 font-medium">CPF</th>
                      <th className="px-4 py-2 text-left text-slate-500 font-medium">Nome</th>
                      <th className="px-4 py-2 text-left text-slate-500 font-medium">Saldo</th>
                      <th className="px-4 py-2 text-left text-slate-500 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.map((row, i) => (
                      <tr key={i} className={row.encontrado ? '' : 'bg-amber-50'}>
                        <td className="px-4 py-2 text-slate-700">{formatCPF(row.cpf)}</td>
                        <td className="px-4 py-2 text-slate-700">{row.nome}</td>
                        <td className={`px-4 py-2 font-medium ${row.saldo_minutos < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {formatHoras(row.saldo_minutos)}
                        </td>
                        <td className="px-4 py-2">
                          {row.encontrado ? (
                            <span className="text-emerald-600">OK</span>
                          ) : (
                            <span className="text-amber-600">Não cadastrado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPreview(null)}
                className="border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={enviando || preview.filter(r => r.encontrado).length === 0}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
              >
                <Upload className="w-4 h-4" />
                {enviando ? 'Importando...' : `Confirmar (${preview.filter(r => r.encontrado).length} registros)`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
