export type UserRole = 'employee' | 'admin'

export interface Profile {
  id: string
  nome: string
  cpf: string
  cargo: string | null
  departamento: string | null
  role: UserRole
  ativo: boolean
  email?: string
  created_at: string
  updated_at: string
}

export interface ContraCheque {
  id: string
  funcionario_id: string
  mes: number
  ano: number
  storage_path: string
  nome_arquivo: string
  uploaded_by: string
  created_at: string
  funcionario?: Pick<Profile, 'id' | 'nome' | 'cpf'>
}

export interface BancoHoras {
  id: string
  funcionario_id: string
  saldo_minutos: number
  periodo: string
  observacao: string | null
  upload_batch_id: string
  created_at: string
}

export interface BancoHorasUpload {
  id: string
  nome_arquivo: string
  periodo: string
  total_funcionarios: number
  uploaded_by: string
  created_at: string
}

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]
