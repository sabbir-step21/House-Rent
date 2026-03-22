import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

const STORE_NAME = "House Rent";

// Keys in the blob store
const KEYS = {
  houses: "houses",
  tenants: "tenants",
  payments: "payments",
};

const DEFAULT_HOUSES = [
  { id: "h1", name: "House 01", costs: { caretaker: 0, currentBill: 0, gasBill: 0, waterBill: 0, tax: 0, others: [] } },
  { id: "h2", name: "House 02", costs: { caretaker: 0, currentBill: 0, gasBill: 0, waterBill: 0, tax: 0, others: [] } },
  { id: "h3", name: "House 03", costs: { caretaker: 0, currentBill: 0, gasBill: 0, waterBill: 0, tax: 0, others: [] } },
];

export default async (req: Request, context: Context) => {
  const store = getStore({ name: STORE_NAME, consistency: "strong" });

  // GET — return all data
  if (req.method === "GET") {
    const [houses, tenants, payments] = await Promise.all([
      store.get(KEYS.houses, { type: "json" }),
      store.get(KEYS.tenants, { type: "json" }),
      store.get(KEYS.payments, { type: "json" }),
    ]);

    return Response.json({
      houses: houses ?? DEFAULT_HOUSES,
      tenants: tenants ?? [],
      payments: payments ?? [],
    });
  }

  // PUT — save all data (full replace)
  if (req.method === "PUT") {
    const body = await req.json();
    const { houses, tenants, payments } = body;

    await Promise.all([
      houses !== undefined ? store.setJSON(KEYS.houses, houses) : Promise.resolve(),
      tenants !== undefined ? store.setJSON(KEYS.tenants, tenants) : Promise.resolve(),
      payments !== undefined ? store.setJSON(KEYS.payments, payments) : Promise.resolve(),
    ]);

    return Response.json({ success: true });
  }

  // PATCH — save specific keys only
  if (req.method === "PATCH") {
    const body = await req.json();
    const ops: Promise<unknown>[] = [];

    if (body.houses !== undefined) ops.push(store.setJSON(KEYS.houses, body.houses));
    if (body.tenants !== undefined) ops.push(store.setJSON(KEYS.tenants, body.tenants));
    if (body.payments !== undefined) ops.push(store.setJSON(KEYS.payments, body.payments));

    await Promise.all(ops);

    return Response.json({ success: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = {
  path: "/api/data",
};
