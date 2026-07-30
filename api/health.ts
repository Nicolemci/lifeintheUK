import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function health(_request: VercelRequest, response: VercelResponse) {
  return response.status(200).json({
    ok: true,
    service: "life-in-the-uk-prep",
  });
}
