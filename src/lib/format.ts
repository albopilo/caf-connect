export function rupiah(value: number): string {
  return "Rp" + Math.round(value || 0).toLocaleString("id-ID");
}

export function roundTo100(value: number): number {
  return Math.round(value / 100) * 100;
}

export function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}
