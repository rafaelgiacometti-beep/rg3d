-- RG3D: independente das tabelas do Medical R.G. Executar no SQL Editor.
begin;
create table if not exists public.rg3d_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(length(name)>0),
 role text not null check(role in ('admin','operator')),
 created_at timestamptz not null default now()
);
create table if not exists public.rg3d_records (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('clients','products','materials','printers','settings','quotes','orders','payments')),
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 version integer not null default 1 check(version>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists rg3d_kind_idx on public.rg3d_records(kind);
create unique index if not exists rg3d_one_settings on public.rg3d_records(kind) where kind='settings';
create unique index if not exists rg3d_one_order_per_quote on public.rg3d_records((payload->>'quoteId')) where kind='orders';
alter table public.rg3d_members enable row level security;
alter table public.rg3d_records enable row level security;
create or replace function public.rg3d_role() returns text language sql stable security definer set search_path='' as $$
 select role from public.rg3d_members where user_id=auth.uid();
$$;
revoke all on function public.rg3d_role() from public;
grant execute on function public.rg3d_role() to authenticated;
drop policy if exists rg3d_members_read on public.rg3d_members;
create policy rg3d_members_read on public.rg3d_members for select to authenticated using(user_id=auth.uid() or public.rg3d_role()='admin');
drop policy if exists rg3d_members_add on public.rg3d_members;
create policy rg3d_members_add on public.rg3d_members for insert to authenticated with check(public.rg3d_role()='admin');
drop policy if exists rg3d_members_remove on public.rg3d_members;
create policy rg3d_members_remove on public.rg3d_members for delete to authenticated using(public.rg3d_role()='admin' and user_id<>auth.uid());
drop policy if exists rg3d_records_read on public.rg3d_records;
create policy rg3d_records_read on public.rg3d_records for select to authenticated using(public.rg3d_role() is not null);
drop policy if exists rg3d_records_insert on public.rg3d_records;
create policy rg3d_records_insert on public.rg3d_records for insert to authenticated with check(public.rg3d_role() is not null and (kind<>'settings' or public.rg3d_role()='admin'));
drop policy if exists rg3d_records_update on public.rg3d_records;
create policy rg3d_records_update on public.rg3d_records for update to authenticated using(public.rg3d_role() is not null and (kind<>'settings' or public.rg3d_role()='admin')) with check(public.rg3d_role() is not null and (kind<>'settings' or public.rg3d_role()='admin'));
drop policy if exists rg3d_records_delete on public.rg3d_records;
create policy rg3d_records_delete on public.rg3d_records for delete to authenticated using(public.rg3d_role() is not null and kind in ('clients','products','materials','printers','payments'));
revoke all on public.rg3d_records, public.rg3d_members from anon;
grant select,insert,update,delete on public.rg3d_records to authenticated;
grant select,insert,delete on public.rg3d_members to authenticated;

-- Validação do saldo no servidor: pagamentos concorrentes bloqueiam a mesma encomenda.
create or replace function public.rg3d_validate() returns trigger language plpgsql set search_path='' as $$
declare order_row public.rg3d_records; received numeric; amount numeric; total numeric;
begin
 if TG_OP='UPDATE' then
  if NEW.kind<>OLD.kind or NEW.id<>OLD.id then raise exception 'O tipo e o ID não podem mudar.'; end if;
  if NEW.version<>OLD.version+1 then raise exception 'Versão inválida. Atualiza os dados.'; end if;
  NEW.created_at=OLD.created_at;
 end if;
 NEW.updated_at=now();
 if NEW.kind='payments' then
  if TG_OP='UPDATE' then raise exception 'Para corrigir um pagamento, apaga e regista novamente.'; end if;
  select * into order_row from public.rg3d_records where id=(NEW.payload->>'orderId')::uuid and kind='orders' for update;
  if not found then raise exception 'Encomenda inexistente.'; end if;
  if order_row.payload->>'status'='Cancelado' then raise exception 'Encomenda cancelada.'; end if;
  amount=(NEW.payload->>'amount')::numeric;
  if amount is null or amount<=0 or amount<>round(amount,2) then raise exception 'Pagamento inválido.'; end if;
  select coalesce(sum((payload->>'amount')::numeric),0) into received from public.rg3d_records where kind='payments' and payload->>'orderId'=NEW.payload->>'orderId';
  total=(order_row.payload->'result'->>'total')::numeric;
  if received+amount>total then raise exception 'O pagamento excede o saldo. Atualiza os dados.'; end if;
 end if;
 if NEW.kind in ('quotes','orders') then
  total=(NEW.payload->'result'->>'total')::numeric;
  if total is null or total<0 then raise exception 'Total inválido.'; end if;
  if NEW.kind='orders' and TG_OP='UPDATE' and (NEW.payload->'result' is distinct from OLD.payload->'result' or NEW.payload->>'quoteId' is distinct from OLD.payload->>'quoteId') then raise exception 'Os valores da encomenda são um retrato do orçamento original.'; end if;
 end if;
 return NEW;
end; $$;
drop trigger if exists rg3d_validate_record on public.rg3d_records;
create trigger rg3d_validate_record before insert or update on public.rg3d_records for each row execute function public.rg3d_validate();
-- Conversão atómica: impede encomendas duplicadas ou valores divergentes.
create or replace function public.rg3d_convert_quote(quote_id uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare q public.rg3d_records; order_id uuid;
begin
 if public.rg3d_role() is null then raise exception 'Sem acesso à RG3D.'; end if;
 select * into q from public.rg3d_records where id=quote_id and kind='quotes' for update;
 if not found then raise exception 'Orçamento inexistente.'; end if;
 select id into order_id from public.rg3d_records where kind='orders' and payload->>'quoteId'=quote_id::text;
 if order_id is not null then return order_id; end if;
 if q.payload->>'status'<>'Pendente' then raise exception 'Este orçamento já não está pendente.'; end if;
 insert into public.rg3d_records(kind,payload) values('orders',q.payload||jsonb_build_object('quoteId',quote_id::text,'status','Aguarda pagamento','productionNotes','')) returning id into order_id;
 update public.rg3d_records set payload=payload||jsonb_build_object('status','Convertido'),version=version+1 where id=quote_id;
 return order_id;
end; $$;
revoke all on function public.rg3d_convert_quote(uuid) from public;
grant execute on function public.rg3d_convert_quote(uuid) to authenticated;
commit;

-- PRIMEIRO ADMINISTRADOR: depois de criar a conta em Authentication > Users,
-- substituir o UUID abaixo e executar APENAS este bloco descomentado.
-- insert into public.rg3d_members(user_id,name,role)
-- values ('UUID-DA-TUA-CONTA','Rafael','admin')
-- on conflict(user_id) do update set name=excluded.name,role=excluded.role;
