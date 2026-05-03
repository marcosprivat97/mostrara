
-- ============================================================================
-- Enable RLS on all tables
-- The backend uses service_role key which BYPASSES RLS automatically.
-- RLS protects against direct access from anon/authenticated keys.
-- ============================================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Policies: Block all direct access from anon/authenticated roles.
-- The backend uses service_role which bypasses RLS entirely.
-- We add explicit deny-all policies so anon key can't touch data directly.
-- ============================================================================

-- Users: No direct access (everything goes through the API server)
CREATE POLICY "Deny anon select on users" ON users
  FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon insert on users" ON users
  FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny anon update on users" ON users
  FOR UPDATE TO anon USING (false);
CREATE POLICY "Deny anon delete on users" ON users
  FOR DELETE TO anon USING (false);

-- Products: No direct access 
CREATE POLICY "Deny anon select on products" ON products
  FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon insert on products" ON products
  FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny anon update on products" ON products
  FOR UPDATE TO anon USING (false);
CREATE POLICY "Deny anon delete on products" ON products
  FOR DELETE TO anon USING (false);

-- Sales: No direct access
CREATE POLICY "Deny anon select on sales" ON sales
  FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon insert on sales" ON sales
  FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny anon update on sales" ON sales
  FOR UPDATE TO anon USING (false);
CREATE POLICY "Deny anon delete on sales" ON sales
  FOR DELETE TO anon USING (false);

-- Also deny authenticated role (we don't use Supabase Auth)
CREATE POLICY "Deny authenticated select on users" ON users
  FOR SELECT TO authenticated USING (false);
CREATE POLICY "Deny authenticated insert on users" ON users
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny authenticated update on users" ON users
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY "Deny authenticated delete on users" ON users
  FOR DELETE TO authenticated USING (false);

CREATE POLICY "Deny authenticated select on products" ON products
  FOR SELECT TO authenticated USING (false);
CREATE POLICY "Deny authenticated insert on products" ON products
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny authenticated update on products" ON products
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY "Deny authenticated delete on products" ON products
  FOR DELETE TO authenticated USING (false);

CREATE POLICY "Deny authenticated select on sales" ON sales
  FOR SELECT TO authenticated USING (false);
CREATE POLICY "Deny authenticated insert on sales" ON sales
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny authenticated update on sales" ON sales
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY "Deny authenticated delete on sales" ON sales
  FOR DELETE TO authenticated USING (false);
;
