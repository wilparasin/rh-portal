import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { cpf } = await req.json()
  if (!cpf) return NextResponse.json({ error: 'CPF obrigatório' }, { status: 400 })

  const cpfNormalized = String(cpf).replace(/\D/g, '')
  if (cpfNormalized.length !== 11) {
    return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
  }

  const admin = createAdminClient()
  // Tenta com zeros à esquerda e sem, pois matrículas podem ter formatos variados
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .or(`cpf.eq.${cpfNormalized},cpf.eq.${cpfNormalized.replace(/^0+/, '')}`)
    .eq('ativo', true)
    .limit(1)
    .single()

  if (!profile) return NextResponse.json({ error: 'CPF não encontrado' }, { status: 404 })

  const { data: userData } = await admin.auth.admin.getUserById(profile.id)
  if (!userData?.user?.email) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  return NextResponse.json({ email: userData.user.email })
}
