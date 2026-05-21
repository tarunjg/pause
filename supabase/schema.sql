-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Contacts table
create table if not exists contacts (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  first_name text,
  last_name text,
  org text,
  interests text[] default '{}',
  notes text,
  subscribed boolean default true,
  source text default 'website',
  unsubscribe_token uuid default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast lookups
create index if not exists idx_contacts_email on contacts(email);
create index if not exists idx_contacts_subscribed on contacts(subscribed);
create unique index if not exists idx_contacts_unsubscribe_token on contacts(unsubscribe_token);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contacts_updated_at
  before update on contacts
  for each row
  execute function update_updated_at();

-- Newsletter sends log
create table if not exists newsletter_sends (
  id uuid default gen_random_uuid() primary key,
  subject text not null,
  recipients int default 0,
  failed int default 0,
  sent_at timestamptz default now()
);
