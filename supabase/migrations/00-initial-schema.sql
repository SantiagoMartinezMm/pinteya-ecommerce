-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_stat_statements";

-- Create enum types if they don't exist
do $$
begin
    if not exists (select 1 from pg_type where typname = 'user_role') then
        create type user_role as enum ('USER', 'ADMIN');
    end if;
    
    if not exists (select 1 from pg_type where typname = 'product_status') then
        create type product_status as enum ('ACTIVE', 'DRAFT', 'ARCHIVED');
    end if;
    
    if not exists (select 1 from pg_type where typname = 'shipping_provider') then
        create type shipping_provider as enum ('CORREO_ARGENTINO', 'ANDREANI', 'LOCAL');
    end if;
    
    if not exists (select 1 from pg_type where typname = 'order_status') then
        create type order_status as enum ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');
    end if;
end$$;

-- Drop existing tables if they exist (in reverse order of dependencies)
drop table if exists public.user_favorites cascade;
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.shipping_zones cascade;
drop table if exists public.products cascade;
drop table if exists public.categories cascade;
drop table if exists public.users cascade;

-- Create users table (extends Supabase auth.users)
create table if not exists public.users (
  id uuid references auth.users primary key,
  full_name text,
  phone text,
  address jsonb,
  role user_role default 'USER',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  search_path text[] default array['public']
);

-- Create categories table
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  search_path text[] default array['public']
);

-- Create products table
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  code text unique not null,
  images text[] not null default '{}',
  price decimal(10,2) not null,
  original_price decimal(10,2),
  description text not null,
  category_id uuid references public.categories(id) not null,
  brand text not null,
  sku text unique not null,
  stock integer not null default 0,
  features text[] not null default '{}',
  status product_status default 'DRAFT',
  views integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  search_path text[] default array['public']
);

-- Create shipping_zones table
create table if not exists public.shipping_zones (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  provider shipping_provider not null,
  delivery_time interval,
  price decimal(10,2) not null,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  search_path text[] default array['public']
);

-- Create orders table
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users not null,
  status order_status default 'PENDING',
  shipping_address jsonb not null,
  shipping_zone_id uuid references public.shipping_zones,
  total_amount decimal(10,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  search_path text[] default array['public']
);

-- Create order_items table
create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders not null,
  product_id uuid references public.products not null,
  quantity integer not null check (quantity > 0),
  price_at_time decimal(10,2) not null check (price_at_time >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  search_path text[] default array['public']
);

-- Create user_favorites table
create table if not exists public.user_favorites (
  user_id uuid references public.users not null,
  product_id uuid references public.products not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, product_id),
  search_path text[] default array['public']
);

-- Drop existing policies
do $$
declare
    pol record;
begin
    for pol in (select policyname, tablename from pg_policies where schemaname = 'public')
    loop
        execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
    end loop;
end$$;

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.user_favorites enable row level security;

-- Users policies
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- Categories policies
create policy "Anyone can view categories"
  on public.categories for select
  to authenticated, anon
  using (true);

create policy "Only admins can modify categories"
  on public.categories for all
  using (auth.jwt() ->> 'role' = 'ADMIN');

-- Products policies
create policy "Anyone can view active products"
  on public.products for select
  to authenticated, anon
  using (status = 'ACTIVE');

create policy "Only admins can modify products"
  on public.products for all
  using (auth.jwt() ->> 'role' = 'ADMIN');

-- Shipping zones policies
create policy "Anyone can view active shipping zones"
  on public.shipping_zones for select
  to authenticated, anon
  using (active = true);

create policy "Only admins can modify shipping zones"
  on public.shipping_zones for all
  using (auth.jwt() ->> 'role' = 'ADMIN');

-- Orders policies
create policy "Users can view their own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Users can create their own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

-- Order items policies
create policy "Users can view their own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );

-- User favorites policies
create policy "Users can manage their own favorites"
  on public.user_favorites for all
  using (auth.uid() = user_id);

-- Drop existing function and trigger
drop trigger if exists on_stock_update on public.products;
drop function if exists public.handle_stock_update();

-- Create function for real-time stock updates with explicit search path
create or replace function public.handle_stock_update()
returns trigger 
security definer
set search_path = public
language plpgsql
as $$
begin
  perform pg_notify(
    'stock_updates',
    json_build_object(
      'product_id', NEW.id,
      'stock', NEW.stock,
      'name', NEW.name
    )::text
  );
  return NEW;
end;
$$;

-- Revoke execute from public and grant only to authenticated users
revoke execute on function public.handle_stock_update() from public;
grant execute on function public.handle_stock_update() to authenticated;

-- Create triggers
create trigger on_stock_update
  after update of stock on public.products
  for each row
  execute function public.handle_stock_update();

-- Drop existing indexes
drop index if exists idx_products_category;
drop index if exists idx_products_brand;
drop index if exists idx_products_status;
drop index if exists idx_orders_user;
drop index if exists idx_orders_status;
drop index if exists idx_order_items_order;
drop index if exists idx_order_items_product;

-- Create indexes for better performance
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_brand on public.products(brand);
create index if not exists idx_products_status on public.products(status);
create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_product on public.order_items(product_id);
