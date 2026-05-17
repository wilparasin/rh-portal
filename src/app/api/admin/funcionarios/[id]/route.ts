import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? admin : null
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await assertAdmin()
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // Atualiza perfil
  const profileUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if ('ativo' in body) profileUpdate.ativo = body.ativo
  if ('nome' in body) profileUpdate.nome = body.nome
  if ('cpf' in body) profileUpdate.cpf = String(body.cpf).replace(/\D/g, '')
  if ('cargo' in body) profileUpdate.cargo = body.cargo
  if ('departamento' in body) profileUpdate.departamento = body.departamento

  const { error: profileError } = await admin.from('profiles').update(profileUpdate).eq('id', id)
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  // Atualiza senha se fornecida
  if (body.senha) {
    const { error: senhaError } = await admin.auth.admin.updateUserById(id, { password: body.senha })
    if (senhaError) return NextResponse.json({ error: senhaError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await assertAdmin()
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  // Deleta arquivos de storage do funcionário
  const { data: ccs } = await admin
    .from('contra_cheques')
    .select('storage_path')
    .eq('funcionario_id', id)

  if (ccs && ccs.length > 0) {
    await admin.storage.from('contra-cheques').remove(ccs.map(c => c.storage_path))
  }

  // Deleta o usuário do auth (cascata apaga o perfil e registros relacionados)
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
