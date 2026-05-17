'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, CheckCircle, AlertCircle, X } from 'lucide-react'
import { MESES } from '@/lib/types'
import DeleteContraChequeButton from '@/components/DeleteContraChequeButton'
import DownloadButton from '@/components/DownloadButton'
import { formatDateTime, formatCPF } from '@/lib/utils'

interface Funcionario {
  id: string
  nome: string
  cpf: string
}

interface ContraCheque {
  id: string
  funcionario_id: string
  mes: number
  ano: number
  created_at: string
  nome_arquivo: string
  storage_path: string
}

interface Props {
  funcionarios: Funcionario[]
  contraCheques: ContraCheque[]
}

interface FileItem {
  arquivo: File
  cpfExtraido: string
  funcionario: Funcionario | null
  status: 'pending' | 'ok' | 'error'
  erro?: string
}

function extractCPF(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '')
  const beforeDash = nameWithoutExt.split('-')[0]
  return beforeDash.replace(/\D/g, '')
}

const anoAtual = new Date().getFullYear()
const anos = Array.from({ length: 5 }, (_, i) => anoAtual - i)

export default function UploadContraCheque({ funcionarios, contraCheques }: Props) {
  const router = useRouter()
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(anoAtual)
  const [items, setItems] = useState<FileItem[]>([])
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ ok: number; erro: number } | null>(null)
  const [filtroFuncionario, setFiltroFuncionario] = useState('')

  const funcMapByCPF = new Map(funcionarios.map(f => [f.cpf.replace(/\D/g, ''), f]))
  const funcMapById = new Map(funcionarios.map(f => [f.id, f]))

  function handleFiles(files: FileList | null) {
    if (!files) return
    const newItems: FileItem[] = Array.from(files)
      .filter(f => f.name.toLowerCase().endsWith('.pdf'))
      .map(arquivo => {
        const cpfExtraido = extractCPF(arquivo.name)
        const funcionario = funcMapByCPF.get(cpfExtraido) ?? null
        return { arquivo, cpfExtraido, funcionario, status: 'pending' as const }
      })
    setItems(newItems)
    setResultado(null)
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleEnviar() {
    const enviáveis = items.filter(i => i.funcionario && i.status === 'pending')
    if (enviáveis.length === 0) return
    setEnviando(true)
    setResultado(null)

    let ok = 0
    let erro = 0
    const updatedItems = [...items]

    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i]
      if (!item.funcionario || item.status !== 'pending') continue

      const formData = new FormData()
      formData.append('funcionarioId', item.funcionario.id)
      formData.append('mes', String(mes))
      formData.append('ano', String(ano))
      formData.append('arquivo', item.arquivo)

      const res = await fetch('/api/admin/contra-cheques', { method: 'POST', body: formData })
      if (res.ok) {
        updatedItems[i] = { ...item, status: 'ok' }
        ok++
      } else {
        const data = await res.json()
        updatedItems[i] = { ...item, status: 'error', erro: data.error || 'Erro' }
        erro++
      }
    }

    setItems(updatedItems)
    setResultado({ ok, erro })
    setEnviando(false)
    if (ok > 0) router.refresh()
  }

  const pendentesEnviáveis = items.filter(i => i.funcionario && i.status === 'pending')
  const naoEncontrados = items.filter(i => !i.funcionario)
  const docsFiltrados = filtroFuncionario
    ? contraCheques.filter(cc => cc.funcionario_id === filtroFuncionario)
    : contraCheques

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900 text-sm">Adicionar Contra Cheques</h2>
      </div>

      <div className="p-6 space-y-4">
        {/* Mês e Ano */}
        <div className="grid grid-cols-2 gap-3 max-w-xs">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Mês</label>
            <select
              value={mes}
              onChange={e => setMes(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Ano</label>
            <select
              value={ano}
              onChange={e => setAno(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {anos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* Seleção de arquivos */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Arquivos PDF</label>
          <input
            id="arquivos-input"
            type="file"
            accept=".pdf"
            multiple
            onChange={e => handleFiles(e.target.files)}
            className="w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:text-sm hover:file:bg-slate-200 transition cursor-pointer border border-slate-300 rounded-lg py-1.5 px-2"
          />
          <p className="text-xs text-slate-400 mt-1.5">
            O CPF deve ser a primeira parte do nome do arquivo antes do traço.
            Exemplo: <span className="font-mono bg-slate-100 px-1 rounded">08084426605-Maio2026.pdf</span>
          </p>
        </div>

        {/* Preview dos arquivos */}
        {items.length > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            {naoEncontrados.length > 0 && (
              <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
                {naoEncontrados.length} arquivo(s) com CPF não cadastrado — serão ignorados no envio.
              </div>
            )}
            <div className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.status === 'ok' && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                    {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    {item.status === 'pending' && item.funcionario && (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                    )}
                    {item.status === 'pending' && !item.funcionario && (
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{item.arquivo.name}</p>
                      {item.funcionario ? (
                        <p className="text-xs text-emerald-600">
                          {item.funcionario.nome} · CPF {formatCPF(item.cpfExtraido)}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600">
                          CPF {formatCPF(item.cpfExtraido) || item.cpfExtraido} — não cadastrado
                        </p>
                      )}
                      {item.erro && <p className="text-xs text-red-500 mt-0.5">{item.erro}</p>}
                    </div>
                  </div>
                  {item.status === 'pending' && (
                    <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-400 flex-shrink-0 transition">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {resultado && (
          <div className={`rounded-lg px-4 py-3 text-sm ${resultado.erro === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {resultado.ok} enviado(s) com sucesso.{resultado.erro > 0 && ` ${resultado.erro} com erro.`}
          </div>
        )}

        <button
          onClick={handleEnviar}
          disabled={enviando || pendentesEnviáveis.length === 0}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
        >
          <Upload className="w-4 h-4" />
          {enviando ? 'Enviando...' : `Enviar ${pendentesEnviáveis.length} arquivo(s)`}
        </button>
      </div>

      {/* Documentos Enviados */}
      <div className="border-t border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-semibold text-slate-900 text-sm whitespace-nowrap">Documentos Enviados</h2>
          <select
            value={filtroFuncionario}
            onChange={e => setFiltroFuncionario(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">Todos os funcionários</option>
            {funcionarios.map(f => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
        </div>
        {docsFiltrados.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            {filtroFuncionario ? 'Nenhum documento enviado para este funcionário.' : 'Nenhum documento enviado ainda.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Funcionário</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CPF</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Período</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Enviado em</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docsFiltrados.map(cc => {
                  const func = funcMapById.get(cc.funcionario_id)
                  return (
                    <tr key={cc.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-900">{func?.nome ?? '—'}</td>
                      <td className="px-6 py-3 text-slate-500">{func ? formatCPF(func.cpf) : '—'}</td>
                      <td className="px-6 py-3 text-slate-700">{MESES[cc.mes - 1]}/{cc.ano}</td>
                      <td className="px-6 py-3 text-slate-400 hidden md:table-cell">{formatDateTime(cc.created_at)}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <DownloadButton contraChequeId={cc.id} nomeArquivo={cc.nome_arquivo} />
                          <DeleteContraChequeButton contraChequeId={cc.id} storagePath={cc.storage_path} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
