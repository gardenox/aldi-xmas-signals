// Vercel Routing Middleware: password gate in front of the whole site. See auth/gate.js.
import { gate } from "./auth/gate.js";

export default async function middleware(request) {
  const res = await gate(request, process.env.SITE_PASSWORD);
  if (res) return res;
  // returning nothing lets the request through to the static site
}

export const config = { matcher: "/:path*" };
