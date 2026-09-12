/**
 * Olsera POS helpers. Every call is a no-op when credentials are not configured,
 * so the café app keeps working before the POS is connected.
 */

type OlseraConfig = { baseUrl: string; token: string; merchantId: string };

export function olseraConfig(): OlseraConfig | null {
  const baseUrl = process.env["OLSERA_API_BASE_URL"];
  const token = process.env["OLSERA_API_TOKEN"];
  const merchantId = process.env["OLSERA_MERCHANT_ID"];
  if (!baseUrl || !token || !merchantId) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), token, merchantId };
}

async function olseraFetch(path: string, init?: RequestInit) {
  const config = olseraConfig();
  if (!config) return null;
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.token}`,
      "X-Merchant-Id": config.merchantId,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    console.error("Olsera request failed", path, response.status, await response.text());
    return null;
  }
  return (await response.json()) as unknown;
}

export type OlseraProduct = {
  id: string | number;
  name: string;
  category?: string;
  variant_name?: string;
  sell_price?: number;
  hidden?: boolean;
  photo?: string;
};

export async function fetchOlseraProducts(): Promise<OlseraProduct[]> {
  const json = (await olseraFetch("/products")) as { data?: OlseraProduct[] } | null;
  if (!json) return [];
  return json.data ?? [];
}

export async function pushOlseraOrder(payload: unknown): Promise<string | null> {
  const json = (await olseraFetch("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as { data?: { id?: string | number } } | null;
  const id = json?.data?.id;
  return id == null ? null : String(id);
}

export async function pushOlseraCustomer(payload: unknown): Promise<void> {
  await olseraFetch("/customers", { method: "POST", body: JSON.stringify(payload) });
}

export async function fetchOlseraOrderStatus(olseraOrderId: string): Promise<string | null> {
  const json = (await olseraFetch(`/orders/${olseraOrderId}`)) as
    | { data?: { status?: string } }
    | null;
  return json?.data?.status ?? null;
}
