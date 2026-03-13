export const SALES_WHATSAPP = '5582987227433';

function encode(text: string) {
  return encodeURIComponent(text);
}

export function getAdminUpgradeWhatsappLink(params: {
  storeName?: string;
  currentPlan?: string;
  limitType?: 'orders' | 'products' | 'categories' | 'coupons' | 'stores' | 'users';
  currentUsage?: number;
  limitValue?: number;
}) {
  const {
    storeName = 'Minha loja',
    currentPlan = 'plano atual',
    limitType = 'orders',
    currentUsage,
    limitValue,
  } = params;

  const limitLabelMap: Record<string, string> = {
    orders: 'pedidos',
    products: 'produtos',
    categories: 'categorias',
    coupons: 'cupons',
    stores: 'lojas',
    users: 'usuários',
  };

  const limitLabel = limitLabelMap[limitType] || 'limites';

  const message = [
    'Olá! Tudo bem?',
    '',
    'Sou administrador da plataforma e quero fazer um upgrade do meu plano.',
    '',
    `*Loja:* ${storeName}`,
    `*Plano atual:* ${currentPlan}`,
    `*Limite atingido:* ${limitLabel}`,
    currentUsage !== undefined ? `*Uso atual:* ${currentUsage}` : '',
    limitValue !== undefined ? `*Limite do plano:* ${limitValue}` : '',
    '',
    'Gostaria de receber as opções de upgrade para continuar utilizando a plataforma com mais capacidade.',
    '',
    'Fico no aguardo. Obrigado!',
  ]
    .filter(Boolean)
    .join('\n');

  return `https://wa.me/${SALES_WHATSAPP}?text=${encode(message)}`;
}

export function getAdminUpgradeMessage(params?: {
  limitType?: 'orders' | 'products' | 'categories' | 'coupons' | 'stores' | 'users';
  limitValue?: number;
}) {
  const { limitType = 'orders', limitValue } = params || {};

  const limitLabelMap: Record<string, string> = {
    orders: 'de pedidos',
    products: 'de produtos',
    categories: 'de categorias',
    coupons: 'de cupons',
    stores: 'de lojas',
    users: 'de usuários',
  };

  const limitLabel = limitLabelMap[limitType] || 'do plano';

  return limitValue
    ? `Você atingiu o limite ${limitLabel} do seu plano (${limitValue}). Para continuar, faça o upgrade do seu plano.`
    : `Você atingiu o limite ${limitLabel} do seu plano. Para continuar, faça o upgrade do seu plano.`;
}

export function getCustomerLimitMessage(limitType?: 'orders' | 'products' | 'categories') {
  const map: Record<string, string> = {
    orders:
      'No momento, não foi possível concluir seu pedido. Tente novamente em alguns instantes ou entre em contato com a loja para mais informações.',
    products:
      'No momento, este item está temporariamente indisponível. Tente novamente em alguns instantes.',
    categories:
      'No momento, esta seção está temporariamente indisponível. Tente novamente em alguns instantes.',
  };

  return map[limitType || 'orders']
    || 'No momento, esta ação está temporariamente indisponível. Tente novamente em alguns instantes.';
}