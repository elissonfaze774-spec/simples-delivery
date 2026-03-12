const normalizeUrl = (url: string) => url.replace(/\/$/, '');

export const getAppUrl = () => {
  const envUrl = import.meta.env.VITE_PUBLIC_APP_URL;

  if (envUrl && envUrl.trim()) {
    return normalizeUrl(envUrl);
  }

  if (typeof window !== 'undefined') {
    return normalizeUrl(window.location.origin);
  }

  return '';
};

export const getStoreUrl = (slug?: string | null) => {
  const base = getAppUrl();
  if (!slug) return `${base}/loja`;

  return `${base}/loja/${slug}`;
};

export const getAdminLoginUrl = () => `${getAppUrl()}/login`;
export const getAdminDashboardUrl = () => `${getAppUrl()}/admin`;
export const getSuperAdminUrl = () => `${getAppUrl()}/super-admin`;