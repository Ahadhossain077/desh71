-- Desh 71 baseline schema, meant to be run in Supabase SQL Editor.
-- Authorization is enforced here using auth.uid() and profiles.role, never a browser role.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('admin','editor')),
  created_at timestamptz not null default now()
);
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name_bn text not null,
  name_en text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title_bn text not null,
  title_en text not null,
  summary_bn text not null,
  summary_en text not null,
  content_bn text not null,
  content_en text not null,
  image_url text,
  author_name text,
  author_id uuid references auth.users(id) on delete set null,
  category_id uuid not null references public.categories(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_has_date check (status <> 'published' or published_at is not null)
);
create index if not exists articles_public_order on public.articles(status,published_at desc);
create index if not exists articles_category_id on public.articles(category_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists articles_touch_updated_at on public.articles;
create trigger articles_touch_updated_at before update on public.articles for each row execute function public.touch_updated_at();

-- SECURITY DEFINER reads only the caller's profile to avoid profiles RLS recursion.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.articles enable row level security;
drop policy if exists "profiles self or admin read" on public.profiles;
create policy "profiles self or admin read" on public.profiles for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "admin manage profiles" on public.profiles;
create policy "admin manage profiles" on public.profiles for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select to anon, authenticated using (true);
drop policy if exists "admin manage categories" on public.categories;
create policy "admin manage categories" on public.categories for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "public read published articles" on public.articles;
create policy "public read published articles" on public.articles for select to anon, authenticated using (status = 'published');
drop policy if exists "admin manage articles" on public.articles;
create policy "admin manage articles" on public.articles for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.categories, public.articles to anon, authenticated;
grant select, insert, update, delete on public.categories, public.articles, public.profiles to authenticated;
-- Do not create a public self-registration flow. Create auth users from Supabase dashboard,
-- then grant admin role from the trusted SQL editor, e.g.:
-- insert into public.profiles (id, role) values ('AUTH_USER_UUID', 'admin')
-- on conflict (id) do update set role = excluded.role;
