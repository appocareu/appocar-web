CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID,
  title TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  year INT NOT NULL,
  mileage_km INT NOT NULL,
  fuel TEXT NOT NULL,
  transmission TEXT NOT NULL,
  power_kw INT NOT NULL,
  view_count INT NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  deal_type TEXT NOT NULL DEFAULT 'buy',
  make TEXT,
  model TEXT,
  seller_email TEXT,
  ev_range_km INT,
  ev_battery_kwh INT,
  ev_fast_charge_kw INT,
  ev_charge_type TEXT,
  co2_g_km INT,
  consumption TEXT,
  location TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  seller_name TEXT NOT NULL,
  seller_type TEXT NOT NULL,
  body TEXT NOT NULL,
  color TEXT NOT NULL,
  drive TEXT NOT NULL,
  doors INT NOT NULL,
  seats INT NOT NULL,
  description TEXT NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  vin TEXT,
  owners TEXT,
  phone TEXT,
  whatsapp TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS listings_make_idx ON listings(make);
CREATE INDEX IF NOT EXISTS listings_model_idx ON listings(model);
CREATE INDEX IF NOT EXISTS listings_price_idx ON listings(price);
CREATE INDEX IF NOT EXISTS listings_year_idx ON listings(year);
CREATE INDEX IF NOT EXISTS listings_fuel_idx ON listings(fuel);
CREATE INDEX IF NOT EXISTS listings_body_idx ON listings(body);
CREATE INDEX IF NOT EXISTS listings_deal_type_idx ON listings(deal_type);
CREATE INDEX IF NOT EXISTS listings_verified_idx ON listings(verified);
CREATE INDEX IF NOT EXISTS listings_ev_range_idx ON listings(ev_range_km);
CREATE INDEX IF NOT EXISTS listings_co2_idx ON listings(co2_g_km);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  provider TEXT,
  provider_id TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token TEXT,
  email_verification_expires TIMESTAMPTZ,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  state TEXT NOT NULL,
  redirect TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  listing_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_email, listing_id)
);

CREATE TABLE IF NOT EXISTS moderation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT,
  file_name TEXT,
  status TEXT NOT NULL,
  reason TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  decision_status TEXT,
  decision_note TEXT
);

CREATE TABLE IF NOT EXISTS car_brands (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  popular_rank INT DEFAULT 999
);

CREATE TABLE IF NOT EXISTS car_models (
  id SERIAL PRIMARY KEY,
  brand_id INT NOT NULL REFERENCES car_brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL,
  buyer_email TEXT NOT NULL,
  seller_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT,
  event_type TEXT NOT NULL,
  listing_id UUID,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  label TEXT NOT NULL,
  params TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS listings_search_idx ON listings USING GIN (to_tsvector('simple', title));
CREATE INDEX IF NOT EXISTS listings_price_idx ON listings (price);
CREATE INDEX IF NOT EXISTS listings_year_idx ON listings (year);
CREATE INDEX IF NOT EXISTS listings_body_idx ON listings (body);
CREATE INDEX IF NOT EXISTS user_history_email_idx ON user_history (user_email);
CREATE INDEX IF NOT EXISTS auth_sessions_token_hash_idx ON auth_sessions (token_hash);
CREATE INDEX IF NOT EXISTS oauth_states_state_idx ON oauth_states (state);
CREATE INDEX IF NOT EXISTS car_models_brand_idx ON car_models (brand_id);
