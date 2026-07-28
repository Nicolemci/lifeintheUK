import { Readable } from "node:stream";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import stripeWebhook from "./stripe-webhook";

const webhookSecret = "whsec_test_example";
const originalEnvironment = { ...process.env };

function createRequest(payload: string, signature?: string): VercelRequest {
  const request = Readable.from([Buffer.from(payload)]) as unknown as VercelRequest;
  request.method = "POST";
  request.headers = signature ? { "stripe-signature": signature } : {};
  return request;
}

function createResponse() {
  const response = {
    setHeader: vi.fn(),
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response as unknown as VercelResponse & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_example";
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
  process.env.VITE_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role_example";
});

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe("Stripe webhook verification", () => {
  it("rejects requests without a Stripe signature", async () => {
    const response = createResponse();
    await stripeWebhook(createRequest("{}"), response);

    expect(response.status).toHaveBeenCalledWith(400);
  });

  it("rejects an invalid Stripe signature", async () => {
    const response = createResponse();
    await stripeWebhook(createRequest("{}", "invalid-signature"), response);

    expect(response.status).toHaveBeenCalledWith(400);
  });

  it("acknowledges valid events that are not checkout.session.completed", async () => {
    const payload = JSON.stringify({
      id: "evt_test_example",
      object: "event",
      api_version: "2026-06-30.basil",
      created: Math.floor(Date.now() / 1000),
      data: { object: { id: "cus_example", object: "customer" } },
      livemode: false,
      pending_webhooks: 1,
      request: null,
      type: "customer.created",
    });
    const stripe = new Stripe("sk_test_example");
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });
    const response = createResponse();

    await stripeWebhook(createRequest(payload, signature), response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      received: true,
      handled: false,
    });
  });
});
