-- ============================================================
-- RATHUDAN YÖNETİM PANELİ - SUPABASE SQL ŞEMASI
-- ============================================================
-- Çalıştırma sırası: Supabase SQL Editor'e yapıştırın
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES (Kullanıcı Profilleri)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('super_admin', 'admin', 'employee', 'client')),
  phone TEXT,
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. CLIENTS (Müşteriler)
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  tax_number TEXT,
  assigned_employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. TICKETS (Destek Biletleri)
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. INVOICES (Faturalar)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 20,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. TRANSACTIONS (Gelir/Gider)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. PACKAGES (Hizmet Paketleri)
-- ============================================================
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'quarterly', 'yearly', 'one_time')),
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  custom_price NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. PROJECTS (Projeler)
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  start_date DATE,
  deadline DATE,
  budget NUMERIC(12,2),
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. TASKS (Görevler)
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. MEETINGS (Görüşme Raporları)
-- ============================================================
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'face_to_face' CHECK (meeting_type IN ('face_to_face', 'online', 'phone')),
  date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  location TEXT,
  agenda TEXT,
  summary TEXT,
  outcome TEXT CHECK (outcome IN ('successful', 'follow_up_needed', 'no_decision', 'cancelled')),
  next_steps TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','clients','tickets','invoices','client_packages','projects','tasks','meetings']
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
      CREATE TRIGGER update_%s_updated_at
        BEFORE UPDATE ON %s
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Invoice number generator
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT := TO_CHAR(NOW(), 'YYYY');
  seq_num INTEGER;
  invoice_num TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num
  FROM invoices
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  invoice_num := 'RTH-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: is admin or super_admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES POLICIES
CREATE POLICY "Users can view all active profiles" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL USING (is_admin());

-- CLIENTS POLICIES
CREATE POLICY "Employees and admins can view clients" ON clients
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('super_admin', 'admin', 'employee')
    OR (get_user_role(auth.uid()) = 'client' AND id IN (
      SELECT id FROM clients WHERE email = (SELECT email FROM profiles WHERE id = auth.uid())
    ))
  );

CREATE POLICY "Admins can manage clients" ON clients
  FOR ALL USING (is_admin());

CREATE POLICY "Employees can update assigned clients" ON clients
  FOR UPDATE USING (
    get_user_role(auth.uid()) = 'employee'
    AND assigned_employee_id = auth.uid()
  );

-- TICKETS POLICIES
CREATE POLICY "View tickets based on role" ON tickets
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('super_admin', 'admin', 'employee')
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Create tickets" ON tickets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Update own or assigned tickets" ON tickets
  FOR UPDATE USING (
    is_admin()
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "Admins delete tickets" ON tickets
  FOR DELETE USING (is_admin());

-- TICKET COMMENTS POLICIES
CREATE POLICY "View ticket comments" ON ticket_comments
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('super_admin', 'admin', 'employee')
    OR (is_internal = false AND author_id = auth.uid())
  );

CREATE POLICY "Create ticket comments" ON ticket_comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- INVOICES POLICIES
CREATE POLICY "Admin can view all invoices" ON invoices
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('super_admin', 'admin', 'employee')
  );

CREATE POLICY "Clients can view own invoices" ON invoices
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'client'
    AND client_id IN (
      SELECT id FROM clients WHERE email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins manage invoices" ON invoices
  FOR ALL USING (is_admin());

-- INVOICE ITEMS POLICIES
CREATE POLICY "View invoice items with invoice access" ON invoice_items
  FOR SELECT USING (
    invoice_id IN (SELECT id FROM invoices)
  );

CREATE POLICY "Admins manage invoice items" ON invoice_items
  FOR ALL USING (is_admin());

-- TRANSACTIONS POLICIES
CREATE POLICY "Admins view all transactions" ON transactions
  FOR SELECT USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Employees view transactions" ON transactions
  FOR SELECT USING (get_user_role(auth.uid()) = 'employee');

CREATE POLICY "Admins manage transactions" ON transactions
  FOR ALL USING (is_admin());

CREATE POLICY "Employees create transactions" ON transactions
  FOR INSERT WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'super_admin', 'employee'));

-- PACKAGES POLICIES
CREATE POLICY "All authenticated users view packages" ON packages
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage packages" ON packages
  FOR ALL USING (is_admin());

-- CLIENT PACKAGES POLICIES
CREATE POLICY "View client packages" ON client_packages
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('super_admin', 'admin', 'employee')
  );

CREATE POLICY "Admins manage client packages" ON client_packages
  FOR ALL USING (is_admin());

-- PROJECTS POLICIES
CREATE POLICY "View projects" ON projects
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('super_admin', 'admin', 'employee')
  );

CREATE POLICY "Admins manage projects" ON projects
  FOR ALL USING (is_admin());

CREATE POLICY "Employees update managed projects" ON projects
  FOR UPDATE USING (manager_id = auth.uid());

-- TASKS POLICIES
CREATE POLICY "View tasks" ON tasks
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('super_admin', 'admin', 'employee')
  );

CREATE POLICY "Create tasks" ON tasks
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('super_admin', 'admin', 'employee')
  );

CREATE POLICY "Update own assigned tasks" ON tasks
  FOR UPDATE USING (
    is_admin()
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "Admins delete tasks" ON tasks
  FOR DELETE USING (is_admin());

-- MEETINGS POLICIES
CREATE POLICY "View meetings" ON meetings
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('super_admin', 'admin')
    OR employee_id = auth.uid()
  );

CREATE POLICY "Create meetings" ON meetings
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('super_admin', 'admin', 'employee')
  );

CREATE POLICY "Update own meetings" ON meetings
  FOR UPDATE USING (
    is_admin() OR employee_id = auth.uid()
  );

CREATE POLICY "Admins delete meetings" ON meetings
  FOR DELETE USING (is_admin());

-- ============================================================
-- SEED DATA (Örnek veriler)
-- ============================================================

INSERT INTO packages (name, description, price, billing_period, features) VALUES
('Starter', 'Küçük işletmeler için temel dijital varlık paketi', 2500, 'monthly', '["Web sitesi tasarımı", "5 sayfa", "Mobil uyumlu", "1 yıl hosting", "SSL sertifikası"]'),
('Growth', 'Büyümeye odaklanan işletmeler için kapsamlı paket', 5000, 'monthly', '["Web sitesi tasarımı", "10 sayfa", "SEO optimizasyonu", "Sosyal medya yönetimi (2 platform)", "Aylık raporlama", "E-posta desteği"]'),
('Pro', 'Kurumsal firmalar için tam hizmet paketi', 9500, 'monthly', '["Kurumsal web sitesi", "Sınırsız sayfa", "SEO + SEM", "Sosyal medya yönetimi (4 platform)", "Fotoğraf çekimi (ayda 1)", "Yazılım geliştirme (20 saat)", "7/24 destek", "Haftalık raporlama"]')
ON CONFLICT DO NOTHING;
