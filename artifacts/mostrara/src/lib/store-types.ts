import {
  Beef,
  CakeSlice,
  Cookie,
  Hand,
  Pizza,
  Salad,
  Scissors,
  ShoppingBag,
  Smartphone,
  Utensils,
} from "lucide-react";

export const STORE_TYPES = [
  "celulares",
  "acai",
  "hamburgueria",
  "pizzaria",
  "quentinhas",
  "salgados",
  "doces",
  "manicure",
  "salao",
  "pastelaria",
  "salgadinhos",
  "marmitex",
] as const;

export type StoreType = (typeof STORE_TYPES)[number];
export const CANONICAL_STORE_TYPES = [
  "acai",
  "pizzaria",
  "quentinhas",
  "doces",
  "hamburgueria",
  "salgados",
  "celulares",
  "manicure",
] as const;

export type CanonicalStoreType = (typeof CANONICAL_STORE_TYPES)[number];
export type StoreMode = "retail" | "food" | "booking";
export type DeliveryFeeType = "none" | "fixed" | "distance";
export type ProductStatusValue = "disponivel" | "reservado" | "vendido";

export interface StoreTypeConfig {
  value: StoreType;
  label: string;
  shortLabel: string;
  productLabel: string;
  productPlural: string;
  categoryLabel: string;
  variantLabel: string;
  variantPlaceholder: string;
  conditionLabel: string;
  conditionPlaceholder: string;
  detailLabel: string;
  detailPlaceholder: string;
  warrantyLabel: string;
  warrantyPlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  categories: string[];
  conditions: string[];
  tips: string[];
  icon: typeof Smartphone;
}

export interface StoreTypeCapabilities {
  productOptions: boolean;
  inventory: boolean;
  shippingDimensions: boolean;
  shippingCalculator: boolean;
  localDelivery: boolean;
  pickup: boolean;
  serviceScheduling: boolean;
  backgroundRemoval: boolean;
}

export interface DeliveryFeeOption {
  value: DeliveryFeeType;
  label: string;
}

export interface StatusOption {
  value: ProductStatusValue;
  label: string;
}

export interface ResolvedStoreTypeConfig extends StoreTypeConfig {
  mode: StoreMode;
  canonicalNiche: CanonicalStoreType | null;
  capabilities: StoreTypeCapabilities;
  deliveryFeeOptions: DeliveryFeeOption[];
  statusOptions: StatusOption[];
  statusLabels: Record<ProductStatusValue, string>;
  inventoryLabel: string;
  inventoryUnlimitedLabel: string;
  optionsLabel: string;
}

export const STORE_TYPE_CONFIGS: Record<StoreType, StoreTypeConfig> = {
  celulares: {
    value: "celulares",
    label: "Celulares & Eletrônicos",
    shortLabel: "Eletrônicos",
    productLabel: "Aparelho",
    productPlural: "aparelhos",
    categoryLabel: "Marca",
    variantLabel: "Armazenamento",
    variantPlaceholder: "256GB",
    conditionLabel: "Condicao",
    conditionPlaceholder: "Vitrine",
    detailLabel: "Bateria",
    detailPlaceholder: "95%",
    warrantyLabel: "Garantia",
    warrantyPlaceholder: "6 meses",
    descriptionLabel: "Descricao",
    descriptionPlaceholder: "Cor, estado, acessorios, procedencia...",
    categories: ["iPhone", "Samsung", "Xiaomi", "Motorola", "Acessorios", "Outro"],
    conditions: ["Vitrine", "Novo", "Usado A+", "Usado A", "Usado B"],
    tips: ["Informe bateria e armazenamento.", "Use fotos reais.", "Marque vendido para sair da vitrine."],
    icon: Smartphone,
  },
  acai: {
    value: "acai",
    label: "Açaiteria & Sorveterias",
    shortLabel: "Açaí",
    productLabel: "Copo/tigela",
    productPlural: "opcoes de acai",
    categoryLabel: "Tamanho",
    variantLabel: "Base",
    variantPlaceholder: "Acai puro, cupuacu, misto",
    conditionLabel: "Montagem",
    conditionPlaceholder: "Tradicional, premium, fitness",
    detailLabel: "Complementos",
    detailPlaceholder: "Granola, leite em po, banana, morango",
    warrantyLabel: "Tempo medio",
    warrantyPlaceholder: "20-30 min",
    descriptionLabel: "Complementos e regras",
    descriptionPlaceholder: "Liste complementos inclusos, adicionais pagos e observacoes.",
    categories: ["300ml", "500ml", "700ml", "1L", "Barca", "Combo"],
    conditions: ["Tradicional", "Premium", "Zero acucar", "Com frutas", "Combo"],
    tips: ["Use complemento no campo Complementos.", "Explique adicionais na descricao.", "Crie tamanhos como categorias."],
    icon: Salad,
  },
  hamburgueria: {
    value: "hamburgueria",
    label: "Hamburgueria & Lanches",
    shortLabel: "Burgers",
    productLabel: "Item",
    productPlural: "itens",
    categoryLabel: "Categoria",
    variantLabel: "Pao/proteina",
    variantPlaceholder: "Brioche, smash, frango",
    conditionLabel: "Tipo",
    conditionPlaceholder: "Smash, artesanal, combo",
    detailLabel: "Ingredientes",
    detailPlaceholder: "Carne, queijo, bacon, molho",
    warrantyLabel: "Tempo medio",
    warrantyPlaceholder: "30-45 min",
    descriptionLabel: "Descricao do lanche",
    descriptionPlaceholder: "Ingredientes, ponto da carne, adicionais e acompanhamentos.",
    categories: ["Burgers", "Combos", "Batatas", "Bebidas", "Sobremesas", "Promocoes"],
    conditions: ["Smash", "Artesanal", "Frango", "Vegetariano", "Combo"],
    tips: ["Coloque ingredientes no campo Ingredientes.", "Use Combos para ticket maior.", "Fotos devem mostrar lanche inteiro."],
    icon: Beef,
  },
  pizzaria: {
    value: "pizzaria",
    label: "Pizzaria",
    shortLabel: "Pizza",
    productLabel: "Pizza",
    productPlural: "pizzas",
    categoryLabel: "Tamanho",
    variantLabel: "Sabor/borda",
    variantPlaceholder: "Calabresa, catupiry, borda recheada",
    conditionLabel: "Tipo",
    conditionPlaceholder: "Salgada, doce, meio a meio",
    detailLabel: "Ingredientes",
    detailPlaceholder: "Mussarela, calabresa, cebola",
    warrantyLabel: "Tempo medio",
    warrantyPlaceholder: "35-50 min",
    descriptionLabel: "Sabores e adicionais",
    descriptionPlaceholder: "Explique sabores, bordas, adicionais e regras para meio a meio.",
    categories: ["Pequena", "Media", "Grande", "Familia", "Broto", "Combo"],
    conditions: ["Salgada", "Doce", "Especial", "Meio a meio", "Combo"],
    tips: ["Use tamanho como categoria.", "Detalhe borda e meio a meio.", "Crie combos com refrigerante."],
    icon: Pizza,
  },
  quentinhas: {
    value: "quentinhas",
    label: "Quentinhas & Marmitas",
    shortLabel: "Quentinhas",
    productLabel: "Quentinha",
    productPlural: "quentinhas",
    categoryLabel: "Tamanho",
    variantLabel: "Proteina",
    variantPlaceholder: "Frango, carne, peixe",
    conditionLabel: "Cardapio",
    conditionPlaceholder: "Do dia, fit, executivo",
    detailLabel: "Acompanhamentos",
    detailPlaceholder: "Arroz, feijao, farofa, salada",
    warrantyLabel: "Entrega",
    warrantyPlaceholder: "11h as 14h",
    descriptionLabel: "Descricao da quentinha",
    descriptionPlaceholder: "Cardapio do dia, opcoes, taxa de entrega e observacoes.",
    categories: ["Pequena", "Media", "Grande", "Fit", "Executiva", "Combo"],
    conditions: ["Do dia", "Fit", "Executiva", "Vegetariana", "Combo"],
    tips: ["Atualize o cardapio do dia.", "Use tamanho como categoria.", "Informe horario de entrega."],
    icon: Utensils,
  },
  salgados: {
    value: "salgados",
    label: "Salgados & Encomendas",
    shortLabel: "Salgados",
    productLabel: "Salgado",
    productPlural: "salgados",
    categoryLabel: "Categoria",
    variantLabel: "Quantidade",
    variantPlaceholder: "Unidade, 25, 50, 100 unidades",
    conditionLabel: "Tipo",
    conditionPlaceholder: "Frito, assado, congelado",
    detailLabel: "Sabores",
    detailPlaceholder: "Coxinha, bolinha de queijo, kibe",
    warrantyLabel: "Prazo",
    warrantyPlaceholder: "Pronta entrega ou encomenda",
    descriptionLabel: "Descricao do kit",
    descriptionPlaceholder: "Sabores, quantidade minima, entrega e prazo de encomenda.",
    categories: ["Unidades", "Cento", "Kits", "Festa", "Congelados", "Promocoes"],
    conditions: ["Frito", "Assado", "Congelado", "Misto", "Festa"],
    tips: ["Informe prazo de encomenda.", "Crie kits por quantidade.", "Explique sabores inclusos."],
    icon: ShoppingBag,
  },
  pastelaria: {
    value: "pastelaria",
    label: "Pastelaria & Salgados",
    shortLabel: "Pastéis",
    productLabel: "Pastel",
    productPlural: "pasteis",
    categoryLabel: "Categoria",
    variantLabel: "Tamanho/massa",
    variantPlaceholder: "Pequeno, grande, massa fina",
    conditionLabel: "Tipo",
    conditionPlaceholder: "Salgado, doce, especial",
    detailLabel: "Recheio",
    detailPlaceholder: "Queijo, carne, frango, catupiry",
    warrantyLabel: "Tempo medio",
    warrantyPlaceholder: "15-25 min",
    descriptionLabel: "Descricao do pastel",
    descriptionPlaceholder: "Recheios, adicionais, molhos e observacoes.",
    categories: ["Salgados", "Doces", "Especiais", "Combos", "Bebidas", "Promocoes"],
    conditions: ["Tradicional", "Especial", "Doce", "Combo", "Vegetariano"],
    tips: ["Recheio claro vende mais.", "Use combos com caldo de cana.", "Separe doce e salgado."],
    icon: ShoppingBag,
  },
  salgadinhos: {
    value: "salgadinhos",
    label: "Salgados & Festas",
    shortLabel: "Festas",
    productLabel: "Salgado/cento",
    productPlural: "salgadinhos",
    categoryLabel: "Categoria",
    variantLabel: "Quantidade",
    variantPlaceholder: "25, 50, 100 unidades",
    conditionLabel: "Tipo",
    conditionPlaceholder: "Frito, assado, congelado",
    detailLabel: "Sabores",
    detailPlaceholder: "Coxinha, bolinha de queijo, kibe",
    warrantyLabel: "Prazo",
    warrantyPlaceholder: "Encomenda 24h",
    descriptionLabel: "Descricao do kit",
    descriptionPlaceholder: "Sabores, quantidade minima, entrega e prazo de encomenda.",
    categories: ["Cento", "Kits", "Fritos", "Assados", "Congelados", "Festa"],
    conditions: ["Frito", "Assado", "Congelado", "Misto", "Festa"],
    tips: ["Informe prazo de encomenda.", "Crie kits por quantidade.", "Explique sabores inclusos."],
    icon: Utensils,
  },
  marmitex: {
    value: "marmitex",
    label: "Restaurante & Delivery",
    shortLabel: "Marmitas",
    productLabel: "Marmita",
    productPlural: "marmitas",
    categoryLabel: "Tamanho",
    variantLabel: "Proteina",
    variantPlaceholder: "Frango, carne, peixe",
    conditionLabel: "Cardapio",
    conditionPlaceholder: "Dia, fit, executivo",
    detailLabel: "Acompanhamentos",
    detailPlaceholder: "Arroz, feijao, farofa, salada",
    warrantyLabel: "Entrega",
    warrantyPlaceholder: "11h as 14h",
    descriptionLabel: "Descricao da marmita",
    descriptionPlaceholder: "Cardapio do dia, opcoes, taxa de entrega e observacoes.",
    categories: ["Pequena", "Media", "Grande", "Fit", "Executiva", "Combo"],
    conditions: ["Do dia", "Fit", "Executiva", "Vegetariana", "Combo"],
    tips: ["Atualize cardapio do dia.", "Use tamanho como categoria.", "Informe horario de entrega."],
    icon: Utensils,
  },
  manicure: {
    value: "manicure",
    label: "Nail Designer & Manicure",
    shortLabel: "Unhas",
    productLabel: "Servico",
    productPlural: "servicos",
    categoryLabel: "Categoria",
    variantLabel: "Duracao",
    variantPlaceholder: "40 min, 1h, 2h",
    conditionLabel: "Modalidade",
    conditionPlaceholder: "Presencial, domicilio, pacote",
    detailLabel: "Inclui",
    detailPlaceholder: "Cutilagem, esmalte, alongamento",
    warrantyLabel: "Agenda",
    warrantyPlaceholder: "Seg a sab",
    descriptionLabel: "Descricao do servico",
    descriptionPlaceholder: "Explique servico, materiais, preparo e politica de agenda.",
    categories: ["Maos", "Pes", "Alongamento", "Manutencao", "Pacotes", "Decoracao"],
    conditions: ["Presencial", "Domicilio", "Pacote", "Manutencao", "Promocao"],
    tips: ["Use produtos como servicos.", "Informe duracao e agenda.", "Fotos de resultado ajudam."],
    icon: Hand,
  },
  salao: {
    value: "salao",
    label: "Beleza & Estética",
    shortLabel: "Beleza",
    productLabel: "Servico",
    productPlural: "servicos",
    categoryLabel: "Categoria",
    variantLabel: "Duracao",
    variantPlaceholder: "30 min, 1h, 3h",
    conditionLabel: "Modalidade",
    conditionPlaceholder: "Corte, pacote, tratamento",
    detailLabel: "Inclui",
    detailPlaceholder: "Lavagem, escova, finalizacao",
    warrantyLabel: "Agenda",
    warrantyPlaceholder: "Seg a sab",
    descriptionLabel: "Descricao do servico",
    descriptionPlaceholder: "Detalhe procedimento, duracao, preparo e observacoes.",
    categories: ["Cabelo", "Barba", "Sobrancelha", "Tratamentos", "Pacotes", "Promocoes"],
    conditions: ["Servico", "Tratamento", "Pacote", "Promocao", "Domicilio"],
    tips: ["Cadastre servicos com duracao.", "Use pacotes para combos.", "Fotos antes/depois ajudam."],
    icon: Scissors,
  },
  doces: {
    value: "doces",
    label: "Confeitaria & Doces",
    shortLabel: "Confeitaria",
    productLabel: "Doce",
    productPlural: "doces",
    categoryLabel: "Categoria",
    variantLabel: "Sabor/tamanho",
    variantPlaceholder: "Chocolate, 80g, caixa 6 un.",
    conditionLabel: "Tipo",
    conditionPlaceholder: "Cookie, brownie, bolo",
    detailLabel: "Ingredientes",
    detailPlaceholder: "Chocolate, Nutella, leite Ninho",
    warrantyLabel: "Prazo",
    warrantyPlaceholder: "Pronta entrega ou encomenda",
    descriptionLabel: "Descricao do doce",
    descriptionPlaceholder: "Sabores, validade, quantidade, alergicos e encomendas.",
    categories: ["Cookies", "Brownies", "Bolos", "Caixas", "Festas", "Promocoes"],
    conditions: ["Pronta entrega", "Encomenda", "Combo", "Festa", "Especial"],
    tips: ["Informe validade e alergicos.", "Crie caixas e combos.", "Use fotos com embalagem."],
    icon: Cookie,
  },
};

const FOOD_STORE_TYPES = new Set<StoreType>([
  "acai",
  "hamburgueria",
  "pizzaria",
  "quentinhas",
  "salgados",
  "pastelaria",
  "salgadinhos",
  "marmitex",
  "doces",
]);

const BOOKING_STORE_TYPES = new Set<StoreType>(["manicure", "salao"]);
const STORE_TYPE_CANONICAL_MAP: Record<StoreType, CanonicalStoreType | null> = {
  celulares: "celulares",
  acai: "acai",
  hamburgueria: "hamburgueria",
  pizzaria: "pizzaria",
  quentinhas: "quentinhas",
  salgados: "salgados",
  doces: "doces",
  manicure: "manicure",
  salao: null,
  pastelaria: "salgados",
  salgadinhos: "salgados",
  marmitex: "quentinhas",
};

const STORE_TYPE_LOOKUP: Record<StoreType, StoreType> = {
  celulares: "celulares",
  acai: "acai",
  hamburgueria: "hamburgueria",
  pizzaria: "pizzaria",
  quentinhas: "quentinhas",
  salgados: "salgados",
  doces: "doces",
  manicure: "manicure",
  salao: "salao",
  pastelaria: "pastelaria",
  salgadinhos: "salgadinhos",
  marmitex: "marmitex",
};

const MODE_BEHAVIOR: Record<
  StoreMode,
  {
    capabilities: StoreTypeCapabilities;
    deliveryFeeOptions: DeliveryFeeOption[];
    statusOptions: StatusOption[];
    inventoryLabel: string;
    inventoryUnlimitedLabel: string;
    optionsLabel: string;
  }
> = {
  retail: {
    capabilities: {
      productOptions: false,
      inventory: true,
      shippingDimensions: true,
      shippingCalculator: true,
      localDelivery: true,
      pickup: true,
      serviceScheduling: false,
      backgroundRemoval: true,
    },
    deliveryFeeOptions: [
      { value: "none", label: "Frete gratis" },
      { value: "fixed", label: "Taxa fixa" },
      { value: "distance", label: "Correios / transportadora" },
    ],
    statusOptions: [
      { value: "disponivel", label: "Disponivel" },
      { value: "reservado", label: "Reservado" },
      { value: "vendido", label: "Vendido" },
    ],
    inventoryLabel: "Estoque",
    inventoryUnlimitedLabel: "Estoque livre",
    optionsLabel: "Variacoes e adicionais",
  },
  food: {
    capabilities: {
      productOptions: true,
      inventory: true,
      shippingDimensions: false,
      shippingCalculator: false,
      localDelivery: true,
      pickup: true,
      serviceScheduling: false,
      backgroundRemoval: false,
    },
    deliveryFeeOptions: [
      { value: "none", label: "Entrega gratis" },
      { value: "fixed", label: "Taxa fixa" },
    ],
    statusOptions: [
      { value: "disponivel", label: "No cardapio" },
      { value: "reservado", label: "Sob encomenda" },
      { value: "vendido", label: "Indisponivel" },
    ],
    inventoryLabel: "Estoque",
    inventoryUnlimitedLabel: "Disponibilidade livre",
    optionsLabel: "Adicionais e complementos",
  },
  booking: {
    capabilities: {
      productOptions: false,
      inventory: false,
      shippingDimensions: false,
      shippingCalculator: false,
      localDelivery: true,
      pickup: true,
      serviceScheduling: true,
      backgroundRemoval: false,
    },
    deliveryFeeOptions: [
      { value: "none", label: "Sem taxa de visita" },
      { value: "fixed", label: "Taxa de atendimento" },
    ],
    statusOptions: [
      { value: "disponivel", label: "Disponivel" },
      { value: "reservado", label: "Agenda limitada" },
      { value: "vendido", label: "Indisponivel" },
    ],
    inventoryLabel: "Vagas",
    inventoryUnlimitedLabel: "Agenda livre",
    optionsLabel: "Opcoes do servico",
  },
};

function normalizeStoreType(type?: string | null): StoreType {
  const normalized = String(type || "").trim().toLowerCase();
  return (STORE_TYPES as readonly string[]).includes(normalized)
    ? (normalized as StoreType)
    : "celulares";
}

export function resolveCanonicalStoreType(type?: string | null): CanonicalStoreType | null {
  return STORE_TYPE_CANONICAL_MAP[normalizeStoreType(type)];
}

export function resolveStoreTypeFromProfile(profile?: {
  store_type?: string | null;
  store_mode?: string | null;
  canonical_niche?: string | null;
} | null) {
  const rawStoreType = String(profile?.store_type || "").trim().toLowerCase();
  if ((STORE_TYPES as readonly string[]).includes(rawStoreType)) {
    return rawStoreType as StoreType;
  }

  const canonical = String(profile?.canonical_niche || "").trim().toLowerCase();
  if ((STORE_TYPES as readonly string[]).includes(canonical)) {
    return canonical as StoreType;
  }

  const mode = String(profile?.store_mode || "").trim().toLowerCase();
  if (mode === "food") return "acai";
  if (mode === "booking") return "manicure";
  return "celulares";
}

function resolveStoreMode(type?: string | null): StoreMode {
  const normalized = normalizeStoreType(type);
  if (BOOKING_STORE_TYPES.has(normalized)) return "booking";
  if (FOOD_STORE_TYPES.has(normalized)) return "food";
  return "retail";
}

export function getStoreTypeConfig(type?: string | null): ResolvedStoreTypeConfig {
  const normalized = normalizeStoreType(type);
  const resolvedType = STORE_TYPE_LOOKUP[normalized] ?? "celulares";
  const base = STORE_TYPE_CONFIGS[resolvedType] ?? STORE_TYPE_CONFIGS.celulares;
  const mode = resolveStoreMode(normalized);
  const behavior = MODE_BEHAVIOR[mode];
  const statusLabels = Object.fromEntries(
    behavior.statusOptions.map((status) => [status.value, status.label]),
  ) as Record<ProductStatusValue, string>;

  return {
    ...base,
    mode,
    canonicalNiche: STORE_TYPE_CANONICAL_MAP[normalized],
    capabilities: behavior.capabilities,
    deliveryFeeOptions: behavior.deliveryFeeOptions,
    statusOptions: behavior.statusOptions,
    statusLabels,
    inventoryLabel: behavior.inventoryLabel,
    inventoryUnlimitedLabel: behavior.inventoryUnlimitedLabel,
    optionsLabel: behavior.optionsLabel,
  };
}

export const STORE_TYPE_OPTION_VALUES = [
  "celulares",
  "acai",
  "hamburgueria",
  "pizzaria",
  "quentinhas",
  "doces",
  "salgados",
  "manicure",
  "pastelaria",
  "salgadinhos",
  "marmitex",
  "salao",
] as const satisfies readonly StoreType[];

export const STORE_TYPE_OPTIONS = STORE_TYPE_OPTION_VALUES.map((type) => ({
  value: type,
  label: type === "salao" ? `${STORE_TYPE_CONFIGS[type].label} (legado)` : STORE_TYPE_CONFIGS[type].label,
}));
