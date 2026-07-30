import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const createCheckoutSession = require("./create-checkout-session.js");

function createResponse() {
  const response = {
    setHeader: vi.fn(),
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

describe("Stripe Checkout function request validation", () => {
  it("accepts POST requests only", async () => {
    const response = createResponse();
    await createCheckoutSession({ method: "GET", headers: {} }, response);

    expect(response.status).toHaveBeenCalledWith(405);
    expect(response.setHeader).toHaveBeenCalledWith("Allow", "POST");
  });

  it("requires a Supabase bearer token", async () => {
    const response = createResponse();
    await createCheckoutSession(
      { method: "POST", headers: {}, body: { plan: "one_week" } },
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
      },
      response,
    );

    expect(response.status).toHaveBeenCalledWith(400);
  });
});
