/**
 * POST /api/corporate/organizations/[id]/wallet/credit
 * Next.js 15 route handler using async params (Promise<{ id: string }>)
 */
type Params = { id: string };

export async function POST(
  req: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;

    let body: unknown = {};
    try { body = await req.json(); } catch { /* no-op */ }

    // TODO: wire to BFF/GraphQL mutation later
    return new Response(JSON.stringify({ ok: true, organizationId: id, received: body }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: (err as Error)?.message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}