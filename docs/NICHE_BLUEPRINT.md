# Niche Blueprint

## Objetivo

Este blueprint consolida os 8 nichos canonicos do produto em 3 modos operacionais:

- `food`
- `retail`
- `booking`

Ele serve para comparar a modelagem alvo com o que o repositorio ja tem hoje, sem disparar migracoes automaticas.

## Leitura do estado atual

O repositorio ja tem partes importantes dessa separacao, mas ainda com mistura de responsabilidades:

- `lib/db/src/schema/users.ts`
  - Hoje funciona como auth + dados da loja.
  - No alvo, vira a base da entidade `stores`.
- `lib/db/src/schema/products.ts`
  - Hoje mistura cadastro principal, variacoes simples, estoque e dimensoes de envio na mesma tabela.
  - No alvo, isso se divide em `catalog_items`, `item_variants`, `item_addons` e `inventory`.
- `lib/db/src/schema/orders.ts`
  - Hoje mistura cabecalho do pedido, itens em JSON e campos de agendamento.
  - No alvo, isso se divide em `orders`, `order_items` e `appointments`.
- `artifacts/mostrara/src/lib/store-types.ts`
  - Ja existe diferenciacao de comportamento por modo.
  - Hoje os modos runtime sao `food`, `retail` e `service`.
  - Neste blueprint, o nome alvo para `service` passa a ser `booking`.

## Taxonomia canonica

| Nicho canonico | Modo | Alias legado atual | Observacao |
| --- | --- | --- | --- |
| `acai` | `food` | - | Tamanhos, complementos, adicionais. |
| `pizzaria` | `food` | - | Sabores, borda, massa, meio a meio. |
| `quentinhas` | `food` | `marmitex` | Cardapio do dia, combos, disponibilidade. |
| `doces` | `food` | - | Kits, encomendas, sabores e adicionais. |
| `hamburgueria` | `food` | - | Adicionais, combos, observacoes, bebidas. |
| `salgados` | `food` | `pastelaria`, `salgadinhos` | Unidade, cento, kit festa, encomenda. |
| `celulares` | `retail` | - | SKU, cor, armazenamento, estoque, garantia. |
| `manicure` | `booking` | - | Agenda, duracao, profissional, horarios. |

### Nichos legados fora do recorte canonico

- `salao`
  - Continua pertencendo ao grupo `booking`.
  - Nao deve ser alias automatico de `manicure`, porque o fluxo pode precisar de servicos e duracoes diferentes.

## O que ja encaixa no projeto atual

- `food`
  - O storefront ja suporta checkout, entrega, retirada, observacoes e pedido por WhatsApp.
  - O dashboard ja diferencia labels e capacidades por tipo de loja.
- `retail`
  - Ja existem estoque, dimensoes e calculo de frete focados em `celulares`.
- `booking`
  - Ja existem disponibilidade, data/horario e duracao no fluxo publico e no backend.

## O que ainda esta acoplado

- `products` ainda centraliza demais.
- `orders.items` ainda esta serializado em JSON.
- `appointment_*` ainda mora em `orders`, em vez de tabela propria.
- A taxonomia de nicho existe no frontend e no backend, mas nao existe um artefato canonico unico no repositorio.

## Estrutura recomendada de pastas

```text
artifacts/mostrara/src/
  config/
    niche-config.ts
  features/
    catalog/
    checkout/
    inventory/
    booking/
  pages/
    DashboardProducts.tsx
    DashboardOrdersKanban.tsx
    DashboardSettings.tsx
    Storefront.tsx

artifacts/api-server/src/
  domain/
    stores/
    catalog/
    orders/
    booking/
    inventory/
  routes/
    auth.ts
    settings.ts
    products.ts
    store.ts
    shipping.ts

lib/db/src/schema/
  stores.ts
  catalog-categories.ts
  catalog-items.ts
  item-variants.ts
  item-addons.ts
  item-addon-options.ts
  inventory.ts
  professionals.ts
  appointments.ts
  orders.ts
  order-items.ts
  store-hours.ts
```

## Estrategia de migracao recomendada

1. Fase 0: manter compatibilidade
   - Continuar aceitando os valores legados ja gravados em `store_type`.
   - Usar aliases para mapear `marmitex -> quentinhas` e `pastelaria/salgadinhos -> salgados`.

2. Fase 1: canonizar taxonomia
   - Introduzir `mode` e `canonical_niche` em `stores`.
   - Preservar `legacy_niche` apenas para auditoria/migracao.

3. Fase 2: separar catalogo
   - Migrar `products` para `catalog_items`, `item_variants`, `item_addons` e `inventory`.

4. Fase 3: separar agenda
   - Tirar `appointment_*` de `orders`.
   - Criar `professionals` e `appointments`.

5. Fase 4: normalizar itens de pedido
   - Migrar `orders.items` JSON para `order_items`.

## Arquivos deste blueprint

- `docs/niche-config.json`
  - Config canonica dos modos, nichos e aliases.
- `docs/schema-blueprint.sql`
  - SQL alvo para a modelagem normalizada.

