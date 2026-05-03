create or replace function public.finalize_checkout_v1(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loja_id uuid := (payload->>'loja_id')::uuid;
  v_cliente_nome text := payload->>'cliente_nome';
  v_cliente_whatsapp text := payload->>'cliente_whatsapp';
  v_modalidade text := payload->>'modalidade';
  v_pagamento text := payload->>'pagamento';
  v_endereco jsonb := payload->'endereco';
  v_cupom_codigo text := nullif(upper(coalesce(payload->>'cupom_codigo', '')), '');
  v_items jsonb := payload->'items';
  v_item jsonb;
  v_product record;
  v_order_items jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_desconto numeric := 0;
  v_total numeric := 0;
  v_coupon record;
  v_order_id uuid;
begin
  if v_items is null or jsonb_array_length(v_items) = 0 then
    return jsonb_build_object('error', 'Carrinho vazio');
  end if;

  if not exists (select 1 from public.lojas where id = v_loja_id) then
    return jsonb_build_object('error', 'Loja nao encontrada');
  end if;

  for v_item in select * from jsonb_array_elements(v_items)
  loop
    select id, nome, preco, estoque, estoque_ilimitado
      into v_product
      from public.produtos
      where id = (v_item->>'id')::uuid
        and loja_id = v_loja_id
      for update;

    if v_product.id is null then
      return jsonb_build_object('error', 'Produto nao encontrado');
    end if;

    if coalesce(v_product.estoque_ilimitado, false) = false
       and coalesce(v_product.estoque, 0) < (v_item->>'quantidade')::int then
      return jsonb_build_object('error', 'Estoque insuficiente para ' || v_product.nome);
    end if;

    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'id', v_product.id,
      'nome', v_product.nome,
      'preco', v_product.preco,
      'quantidade', (v_item->>'quantidade')::int,
      'total', v_product.preco * (v_item->>'quantidade')::int
    ));

    v_subtotal := v_subtotal + (v_product.preco * (v_item->>'quantidade')::int);

    if coalesce(v_product.estoque_ilimitado, false) = false then
      update public.produtos
        set estoque = greatest(0, coalesce(estoque, 0) - (v_item->>'quantidade')::int)
        where id = v_product.id;
    end if;
  end loop;

  if v_cupom_codigo is not null then
    select codigo, tipo, valor, expira_em
      into v_coupon
      from public.cupons
      where loja_id = v_loja_id
        and codigo = v_cupom_codigo
        and ativo = true
      limit 1;

    if v_coupon.codigo is not null
       and (v_coupon.expira_em is null or v_coupon.expira_em >= now()) then
      if v_coupon.tipo = 'porcentagem' then
        v_desconto := v_subtotal * (v_coupon.valor / 100);
      else
        v_desconto := v_coupon.valor;
      end if;
    else
      v_cupom_codigo := null;
    end if;
  end if;

  v_total := greatest(0, v_subtotal - v_desconto);

  insert into public.pedidos (
    loja_id,
    cliente_nome,
    cliente_whatsapp,
    modalidade,
    endereco_json,
    pagamento,
    items,
    subtotal,
    desconto,
    cupom_codigo,
    total,
    valor_total,
    status
  )
  values (
    v_loja_id,
    v_cliente_nome,
    v_cliente_whatsapp,
    v_modalidade,
    v_endereco,
    v_pagamento,
    v_order_items,
    v_subtotal,
    v_desconto,
    v_cupom_codigo,
    v_total,
    v_total,
    'Novo'
  )
  returning id into v_order_id;

  return jsonb_build_object(
    'orderId', v_order_id,
    'orderUniqueId', upper(left(v_order_id::text, 8)),
    'total', v_total
  );
end;
$$;
