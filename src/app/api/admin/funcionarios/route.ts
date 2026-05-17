import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  // Usa admin client para evitar recursão no RLS
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return user
}

export async function GET() {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('*')
    .eq('role', 'employee')
    .order('nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const nome = body.nome
  const email = body.email
  const cpf = String(body.cpf ?? '').replace(/\D/g, '')
  const cargo = body.cargo
  const departamento = body.departamento
  const senha = body.senha

  if (!nome || !email || !cpf || !senha) {
    return NextResponse.json({ error: 'Campos obrigatórios: nome, email, matrícula, senha' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, cpf, role: 'employee', cargo: cargo || null, departamento: departamento || null }
  })

  if (authError || !authUser.user) {
    return NextResponse.json({ error: authError?.message || 'Erro ao criar usuário' }, { status: 400 })
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: authUser.user.id,
    nome,
    cpf,
    cargo: cargo || null,
    departamento: departamento || null,
    role: 'employee',
    ativo: true,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ id: authUser.user.id }, { status: 201 })
}
