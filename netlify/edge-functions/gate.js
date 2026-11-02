// Netlify Edge Function: password gate in front of the whole site. See auth/gate.js.
import { gate } from "../../auth/gate.js";

export default async (request, context) => {
  const res = await gate(request, Netlify.env.get("SITE_PASSWORD"));
  return res || context.next();
};

export const config = { path: "/*" };
