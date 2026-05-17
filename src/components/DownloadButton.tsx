'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'

interface Props {
  contraChequeId: string
  nomeArquivo: string
}

export default function DownloadButton({ contraChequeId, nomeArquivo }: Props) {
  const [baixando, setBaixando] = useState(false)

  async function handleDownload() {
    setBaixando(true)
    try {
      const res = await fetch(`/api/contra-cheques/${contraChequeId}/download`)
      if (!res.ok) throw new Error('Erro ao gerar link')
      const { url } = await res.json()
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      alert('Não foi possível baixar o arquivo. Tente novamente.')
    } finally {
      setBaixando(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={baixando}
      className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 px-3 py-1.5 rounded-lg transition"
    >
      <Download className="w-4 h-4" />
      {baixando ? 'Baixando...' : 'Baixar'}
    </button>
  )
}
