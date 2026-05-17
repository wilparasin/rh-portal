-- ============================================================
-- PORTAL RH - Schema do Supabase
-- Execute este arquivo no SQL Editor do seu projeto Supabase
-- ============================================================

-- 1. Tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nome        TEXT NOT NULL,
  cpf         TEXT NOT NULL UNIQUE,
  cargo       TEXT,
  departamento TEXT,
  role        TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela de contra cheques (sem UNIQUE por mês — múltiplos arquivos por mês permitidos)
CREATE TABLE IF NOT EXISTS public.contra_cheques (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  mes            INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano            INTEGER NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
  storage_path   TEXT NOT NULL,
  nome_arquivo   TEXT NOT NULL,
  uploaded_by    UUID REFERENCES public.profiles NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Se já criou a tabela com a constraint única, remova-a:
-- ALTER TABLE public.contra_cheques DROP CONSTRAINT IF EXISTS contra_cheques_funcionario_id_mes_ano_key;

-- 3. Tabela de registros de banco de horas
CREATE TABLE IF NOT EXISTS public.banco_horas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id  UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  saldo_minutos   INTEGER NOT NULL,
  periodo         TEXT NOT NULL,
  observacao      TEXT,
  upload_batch_id UUID NOT NULL,
  uploaded_by     UUID REFERENCES public.profiles NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabela de controle de uploads de banco de horas
CREATE TABLE IF NOT EXISTS public.banco_horas_uploads (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_arquivo       TEXT NOT NULL,
  periodo            TEXT NOT NULL,
  total_funcionarios INTEGER NOT NULL,
  uploaded_by        UUID REFERENCES public.profiles NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGER: cria perfil automaticamente ao criar usuário
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, cpf, cargo, departamento, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'cpf', NEW.id::TEXT),
    NEW.raw_user_meta_data->>'cargo',
    NEW.raw_user_meta_data->>'departamento',
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contra_cheques   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banco_horas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banco_horas_uploads ENABLE ROW LEVEL SECURITY;

-- PROFILES: funcionário vê só o próprio; admin vê todos
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
CREATE POLICY "profiles_insert_admin" ON public.profiles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- CONTRA CHEQUES: funcionário vê só os seus; admin vê/gerencia todos
DROP POLICY IF EXISTS "cc_select" ON public.contra_cheques;
CREATE POLICY "cc_select" ON public.contra_cheques FOR SELECT
  USING (
    funcionario_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "cc_insert_admin" ON public.contra_cheques;
CREATE POLICY "cc_insert_admin" ON public.contra_cheques FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "cc_delete_admin" ON public.contra_cheques;
CREATE POLICY "cc_delete_admin" ON public.contra_cheques FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "cc_update_admin" ON public.contra_cheques;
CREATE POLICY "cc_update_admin" ON public.contra_cheques FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- BANCO DE HORAS: funcionário vê só os seus; admin vê/gerencia todos
DROP POLICY IF EXISTS "bh_select" ON public.banco_horas;
CREATE POLICY "bh_select" ON public.banco_horas FOR SELECT
  USING (
    funcionario_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "bh_insert_admin" ON public.banco_horas;
CREATE POLICY "bh_insert_admin" ON public.banco_horas FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- BANCO HORAS UPLOADS: somente admin
DROP POLICY IF EXISTS "bhu_select_admin" ON public.banco_horas_uploads;
CREATE POLICY "bhu_select_admin" ON public.banco_horas_uploads FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "bhu_insert_admin" ON public.banco_horas_uploads;
CREATE POLICY "bhu_insert_admin" ON public.banco_horas_uploads FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- STORAGE: criar bucket "contra-cheques" (execute no dashboard)
-- ============================================================
-- Vá em Storage > New Bucket > Nome: "contra-cheques" > Private (sem acesso público)
-- Depois adicione as seguintes políticas no bucket:

-- Política de leitura: autenticados podem ler seus próprios arquivos
-- (isso é tratado via signed URLs na API, então o bucket pode ficar privado)

-- ============================================================
-- ADMIN INICIAL: crie o primeiro administrador
-- ============================================================
-- 1. Crie o usuário pelo Authentication > Add user no Supabase Dashboard
-- 2. Depois execute:
-- UPDATE public.profiles SET role = 'admin', nome = 'Seu Nome', cpf = '00000000000'
--   WHERE id = 'uuid-do-usuario-criado';
