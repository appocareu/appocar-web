create extension if not exists "uuid-ossp";

create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique,
  full_name text not null,
  phone text,
  type text check (type in ('Dealer', 'Private')) default 'Private',
  created_at timestamptz default now()
);

create table if not exists listings (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid,
  title text not null,
  price numeric not null,
  currency text default 'EUR',
  year int not null,
  mileage_km int not null,
  fuel text not null,
  transmission text not null,
  power_kw int not null,
  location text not null,
  images text[] not null,
  seller_name text not null,
  seller_type text not null,
  created_at timestamptz default now(),
  body text not null,
  color text,
  drive text,
  doors int,
  seats int,
  description text,
  features text[]
);

create table if not exists favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  listing_id uuid references listings(id) on delete cascade,
  created_at timestamptz default now()
);

create unique index if not exists favorites_unique on favorites(user_id, listing_id);

create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references listings(id) on delete set null,
  buyer_id uuid,
  seller_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid,
  body text not null,
  sent_at timestamptz default now()
);
