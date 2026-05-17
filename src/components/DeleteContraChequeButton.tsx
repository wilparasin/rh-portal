'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

interface Props {
  contraChequeId: string
  storagePath: string
}

export default function DeleteContraChequeButton({ contraChequeId }: Props) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function handleDelete() {
    setCarregando(true)
    const res = await fetch(`/api/admin/contra-cheques/${contraChequeId}`, { method: 'DELETE' })
    if (res.ok) {
      setConfirmando(false)
      router.refresh()
    }
    setCarregando(false)
  }

  if (confirmando) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Confirmar exclusão?</span>
        <button onClick={handleDelete} disabled={carregando}
          className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50">
          {carregando ? '...' : 'Sim'}
        </button>
        <button onClick={() => setConfirmando(false)} className="text-xs text-slate-400 hover:text-slate-600">
          Não
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirmando(true)}
      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
