export function rp(value: number): string {
  return "Rp" + Math.round(value).toLocaleString("id-ID");
}

export function normalizePhone(input: string): string {
  const digits = input.replace(/[^\d]/g, "");
  if (digits.startsWith("62")) return "0" + digits.slice(2);
  if (digits.startsWith("0")) return digits;
  return "0" + digits;
}

export function waLink(phone: string): string {
  const d = normalizePhone(phone).replace(/^0/, "62");
  return `https://wa.me/${d}`;
}

export function normalizePhotoUrl(url: string): string {
  if (!url) return "";
  const drive = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/);
  if (drive) return `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w800`;
  return url;
}

export function elapsed(since: string): string {
  const mins = Math.floor((Date.now() - new Date(since).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}
