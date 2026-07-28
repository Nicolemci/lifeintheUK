import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";
import createCheckoutSession from "./create-checkout-session";

function createResponse() {
  const response = {
    setHeader: vi.fn(),
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response as unknown as VercelResponse & {
    setHeader: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

describe("Stripe Checkout function request validation", () => {
  it("accepts POST requests only", async () => {
    const response = createResponse();
    await createCheckoutSession(
      { method: "GET", headers: {} } as unknown as VercelRequest,
      response,
    );

    expect(response.status).toHaveBeenCalledWith(405);
    expect(response.setHeader).toHaveBeenCalledWith("Allow", "POST");
  });

  it("requires a Supabase bearer token", async () => {
    const response = createResponse();
    await createCheckoutSession(
      { method: "POST", headers: {}, body: { plan: "one_week" } } as unknown as VercelRequest,
      response,
    );

    expect(response.status).toHaveBeenCalledWith(401);
  });

  it("rejects plans outside the server allow-list", async () => {
    const response = createResponse();
    await createCheckoutSession(
      {
        method: "POST",
        headers: { authorization: "Bearer example-token" },
        body: { plan: "free" },
      } as unknown as VercelRequest,
      response,
    );

    expect(response.status).toHaveBeenCalledWith(400);
  });
});
