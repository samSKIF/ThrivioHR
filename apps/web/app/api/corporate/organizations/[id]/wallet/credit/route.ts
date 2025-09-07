/**
 * POST /api/corporate/organizations/[id]/wallet/credit
 * Next.js App Router route handler
 */
type Params = { id: string };

export async function POST(req: Request, context: { params: Params }) {
  try {
    const { id } = context.params;

    // Parse JSON body if present (fail-safe to empty object)
    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    // TODO: wire to BFF/GraphQL call to actually credit the wallet
    return new Response(
      JSON.stringify({
        ok: true,
        organizationId: id,
        received: body,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error)?.message ?? "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}