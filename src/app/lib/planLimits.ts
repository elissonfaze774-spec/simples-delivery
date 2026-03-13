export type PlanKey = 'simples' | 'pro' | 'premium';

export type PlanLimitConfig = {
  key: PlanKey;
  name: string;
  maxProducts: number | null;
  maxOrdersPerMonth: number | null;
};

export const PLAN_LIMITS: Record<PlanKey, PlanLimitConfig> = {
  simples: {
    key: 'simples',
    name: 'Simples',
    maxProducts: 30,
    maxOrdersPerMonth: 500,
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    maxProducts: 100,
    maxOrdersPerMonth: 1000,
  },
  premium: {
    key: 'premium',
    name: 'Premium',
    maxProducts: null,
    maxOrdersPerMonth: null,
  },
};

export function normalizePlan(plan?: string | null): PlanKey {
  const value = String(plan || '')
    .trim()
    .toLowerCase();

  if (value === 'premium') return 'premium';
  if (value === 'pro') return 'pro';
  return 'simples';
}

export function getPlanLimits(plan?: string | null): PlanLimitConfig {
  return PLAN_LIMITS[normalizePlan(plan)];
}

export function isUnlimited(value: number | null) {
  return value === null;
}

export function canAddProduct(
  plan: string | null | undefined,
  currentProductsCount: number
) {
  const limits = getPlanLimits(plan);

  if (limits.maxProducts === null) {
    return {
      allowed: true,
      reason: null,
      current: currentProductsCount,
      limit: null,
      planName: limits.name,
    };
  }

  const allowed = currentProductsCount < limits.maxProducts;

  return {
    allowed,
    reason: allowed
      ? null
      : `Seu plano ${limits.name} atingiu o limite de ${limits.maxProducts} produtos.`,
    current: currentProductsCount,
    limit: limits.maxProducts,
    planName: limits.name,
  };
}

export function canCreateOrderThisMonth(
  plan: string | null | undefined,
  currentOrdersThisMonth: number
) {
  const limits = getPlanLimits(plan);

  if (limits.maxOrdersPerMonth === null) {
    return {
      allowed: true,
      reason: null,
      current: currentOrdersThisMonth,
      limit: null,
      planName: limits.name,
    };
  }

  const allowed = currentOrdersThisMonth < limits.maxOrdersPerMonth;

  return {
    allowed,
    reason: allowed
      ? null
      : `Seu plano ${limits.name} atingiu o limite de ${limits.maxOrdersPerMonth} pedidos neste mês.`,
    current: currentOrdersThisMonth,
    limit: limits.maxOrdersPerMonth,
    planName: limits.name,
  };
}

export function getNextPlans(plan?: string | null) {
  const normalized = normalizePlan(plan);

  if (normalized === 'simples') {
    return ['Pro', 'Premium'];
  }

  if (normalized === 'pro') {
    return ['Premium'];
  }

  return [];
}