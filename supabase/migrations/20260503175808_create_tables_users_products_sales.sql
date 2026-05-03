
-- ============================================================================
-- Mostrara: Create all tables (users, products, sales)
-- ============================================================================

-- 1. USERS table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  store_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  store_slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  city TEXT DEFAULT 'Rio de Janeiro',
  logo_url TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- 2. PRODUCTS table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'iPhone',
  storage TEXT DEFAULT '',
  price REAL NOT NULL,
  condition TEXT DEFAULT 'Vitrine',
  battery TEXT DEFAULT '',
  warranty TEXT DEFAULT '',
  status TEXT DEFAULT 'disponivel',
  description TEXT DEFAULT '',
  photos TEXT DEFAULT '[]',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 3. SALES table
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_whatsapp TEXT DEFAULT '',
  sale_date DATE NOT NULL,
  product_price REAL NOT NULL,
  amount_paid REAL NOT NULL,
  payment_method TEXT DEFAULT 'pix',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- Performance Indexes
-- ============================================================================

-- Users: login by email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Users: storefront lookup by slug
CREATE INDEX IF NOT EXISTS idx_users_store_slug ON users(store_slug);

-- Products: all queries filter by user_id
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);

-- Products: storefront filters by status
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- Products: compound index for storefront query (user + status + created_at)
CREATE INDEX IF NOT EXISTS idx_products_user_status ON products(user_id, status, created_at DESC);

-- Sales: all queries filter by user_id
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);

-- Sales: date filtering for monthly queries
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);

-- Sales: compound index for monthly queries
CREATE INDEX IF NOT EXISTS idx_sales_user_date ON sales(user_id, sale_date DESC);
;
