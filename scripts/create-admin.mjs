// Script para criar o primeiro administrador
// Uso: node scripts/create-admin.mjs
import { createClient } from '@supabase/supabase-js'
import * as readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Lê o .env.local manualmente
const envPath = resolve(__dirname, '../.env.local')
const env = readFileSync(envPath, 'utf-8')
  .split('\n')
  .filter(l => l && !l.startsWith('#'))
  .reduce((acc, line) => {
    const [k, ...v] = line.split('=')
    acc[k.trim()] = v.join('=').trim()
    return acc
  }, {})

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Variáveis de ambiente não encontradas no .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const rl = readline.createInterface({ input, output })

console.log('\n🔐  Criação do Administrador — Portal RH\n')

const nome      = await rl.question('Nome completo: ')
const email     = await rl.question('E-mail: ')
const matricula = await rl.question('Matrícula (ex: ADMIN001): ')
const senha     = await rl.question('Senha (mín. 6 caracteres): ')

rl.close()

if (!nome || !email || !matricula || !senha) {
  console.error('\n❌ Todos os campos são obrigatórios.')
  process.exit(1)
}

console.log('\nCriando usuário...')

const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email,
  password: senha,
  email_confirm: true,
  user_metadata: { nome, matricula, role: 'admin' }
})

if (authError) {
  console.error('\n❌ Erro ao criar usuário:', authError.message)
  process.exit(1)
}

const { error: profileError } = await supabase.from('profiles').upsert({
  id: authData.user.id,
  nome,
  matricula,
  role: 'admin',
  ativo: true,
})

if (profileError) {
  console.error('\n❌ Erro ao criar perfil:', profileError.message)
  process.exit(1)
}

console.log(`\n✅ Administrador criado com sucesso!`)
console.log(`   E-mail: ${email}`)
console.log(`   Acesse: http://localhost:3000/login\n`)
