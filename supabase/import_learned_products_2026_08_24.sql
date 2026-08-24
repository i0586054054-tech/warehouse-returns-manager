-- Import the first products learned from ChatGPT into the live Supabase system.
-- Safe to run more than once: catalog rows are updated and the active product row for each barcode is updated rather than duplicated.

do $$
declare
  v_company_id uuid;
  v_return_method text;
  v_agent_id uuid;
  v_status public.product_status;
  r record;
begin
  select id, return_method
    into v_company_id, v_return_method
  from public.companies
  where lower(name) like '%יוניליוור%'
  order by name
  limit 1;

  if v_company_id is null then
    raise exception 'לא נמצאה חברה בשם יוניליוור בטבלת companies';
  end if;

  if v_return_method = 'agent' then
    select id into v_agent_id
    from public.agents
    where company_id = v_company_id
    order by name
    limit 1;
    v_status := 'waiting_agent'::public.product_status;
  elsif v_return_method = 'none' then
    v_status := 'approved'::public.product_status;
  else
    v_status := 'pending_whatsapp'::public.product_status;
  end if;

  for r in
    select * from (values
      ('7290116534459'::text, 'קליק קטן'::text, 10::int),
      ('7290116537016'::text, 'שוקולד שלישיה'::text, 1::int),
      ('7290116534763'::text, 'שמפו קטן'::text, 1::int)
    ) as x(barcode, product_name, qty)
  loop
    insert into public.product_catalog(item_code, barcode, product_name, supplier_name)
    values (r.barcode, r.barcode, r.product_name, 'יוניליוור')
    on conflict (item_code) where item_code is not null
    do update set
      barcode = excluded.barcode,
      product_name = excluded.product_name,
      supplier_name = excluded.supplier_name;

    update public.products
       set name = r.product_name,
           qty = r.qty,
           supplier = 'יוניליוור',
           company_id = v_company_id,
           treatment_type = (case when v_return_method = 'agent' then 'agent' else 'whatsapp' end)::public.treatment_type,
           agent_id = case when v_return_method = 'agent' then v_agent_id else null end,
           status = v_status,
           notes = coalesce(notes, 'נקלט ממאגר הלמידה')
     where sku = r.barcode
       and status not in ('completed'::public.product_status,'collected'::public.product_status);

    if not found then
      insert into public.products(
        sku, name, qty, supplier, company_id, treatment_type, agent_id, status, notes
      ) values (
        r.barcode,
        r.product_name,
        r.qty,
        'יוניליוור',
        v_company_id,
        (case when v_return_method = 'agent' then 'agent' else 'whatsapp' end)::public.treatment_type,
        case when v_return_method = 'agent' then v_agent_id else null end,
        v_status,
        'נקלט ממאגר הלמידה'
      );
    end if;
  end loop;
end $$;
