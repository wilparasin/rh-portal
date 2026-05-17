import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: cc } = await admin.from('contra_cheques').select('storage_path').eq('id', id).single()
  if (!cc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  await admin.storage.from('contra-cheques').remove([cc.storage_path])
  await admin.from('contra_cheques').delete().eq('id', id)

  return NextResponse.json({ ok: true })
}
