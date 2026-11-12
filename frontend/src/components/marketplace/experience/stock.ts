export function stockLabel(product: any) {
  const key = product?.stock?.key || product?.availability;
  if (product?.sold || key === 'out_of_stock') return { key: 'out_of_stock', label: 'Out of Stock', className: 'bg-rose-500/15 text-rose-600' };
  if (key === 'low_stock' || Number(product?.stockQuantity || 99) <= 3) {
    return { key: 'low_stock', label: 'Low Stock', className: 'bg-amber-500/15 text-amber-600' };
  }
  return { key: 'in_stock', label: 'In Stock', className: 'bg-emerald-500/15 text-emerald-600' };
}

export function formatViews(n?: number) {
  const v = Number(n || 0);
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
}

export const COMPARE_KEY = 'wev-compare-ids';

export function readCompareIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function writeCompareIds(ids: string[]) {
  localStorage.setItem(COMPARE_KEY, JSON.stringify(ids.slice(0, 5)));
  window.dispatchEvent(new Event('wev-compare'));
}
