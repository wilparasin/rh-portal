import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const { data: cc } = await admin.from('contra_cheques').select('storage_path, funcionario_id').eq('id', id).single()

  if (!cc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  if (profile?.role !== 'admin' && cc.funcionario_id !== user.id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { data, error } = await admin.storage
    .from('contra-cheques')
    .createSignedUrl(cc.storage_path, 3600)

  if (error || !data) {
    return NextResponse.json({ error: 'Erro ao gerar link' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
