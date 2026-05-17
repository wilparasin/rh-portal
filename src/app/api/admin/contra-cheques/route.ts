import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return user
}

export async function POST(req: Request) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const formData = await req.formData()
  const funcionarioId = formData.get('funcionarioId') as string
  const mes = parseInt(formData.get('mes') as string)
  const ano = parseInt(formData.get('ano') as string)
  const arquivo = formData.get('arquivo') as File

  if (!funcionarioId || !mes || !ano || !arquivo) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const ext = arquivo.name.split('.').pop() || 'pdf'
  const uid = crypto.randomUUID()
  const storagePath = `${funcionarioId}/${ano}/${String(mes).padStart(2, '0')}/${uid}.${ext}`

  const bytes = await arquivo.arrayBuffer()
  const admin = createAdminClient()

  const { error: storageError } = await admin.storage
    .from('contra-cheques')
    .upload(storagePath, bytes, {
      contentType: arquivo.type || 'application/pdf',
      upsert: false,
    })

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 })
  }

  const { error: dbError } = await admin.from('contra_cheques').insert({
    funcionario_id: funcionarioId,
    mes,
    ano,
    storage_path: storagePath,
    nome_arquivo: arquivo.name,
    uploaded_by: user.id,
  })

  if (dbError) {
    await admin.storage.from('contra-cheques').remove([storagePath])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
