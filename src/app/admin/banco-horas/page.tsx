import { createAdminClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import UploadBancoHoras from '@/components/UploadBancoHoras'

export default async function BancoHorasAdminPage() {
  const supabase = createAdminClient()

  const { data: uploads } = await supabase
    .from('banco_horas_uploads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Banco de Horas</h1>
        <p className="text-slate-500 text-sm mt-1">
          Faça upload da planilha Excel com os saldos dos funcionários.
        </p>
      </div>

      {/* Instruções do formato */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-6">
        <h3 className="font-semibold text-blue-900 text-sm mb-2">Formato da planilha esperado</h3>
        <p className="text-blue-700 text-xs mb-2">A planilha deve ter as seguintes colunas (na primeira linha):</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {['CPF', 'Nome', 'Saldo', 'Periodo'].map(col => (
            <div key={col} className="bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-center">
              <code className="text-xs font-mono text-blue-800">{col}</code>
            </div>
          ))}
        </div>
        <p className="text-blue-600 text-xs mt-3">
          O campo <strong>Saldo</strong> pode ser em horas decimais (ex: 2.5) ou no formato H:MM (ex: 2:30 ou -1:15).
        </p>
      </div>

      {/* Upload form */}
      <UploadBancoHoras />

      {/* Histórico de uploads */}
      {uploads && uploads.length > 0 && (
        <div className="mt-8 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">Histórico de Importações</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {uploads.map((u: any) => (
              <div key={u.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{u.nome_arquivo}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Período: <strong>{u.periodo}</strong> · {u.total_funcionarios} funcionários atualizados
                  </p>
                </div>
                <p className="text-xs text-slate-400 whitespace-nowrap ml-4">{formatDate(u.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
