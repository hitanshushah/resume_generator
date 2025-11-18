import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const username = req.headers.get("x-username");
  const email = req.headers.get("x-email");
  const name = req.headers.get("x-name");

  const response = NextResponse.next();
  if (username && email) {
    response.headers.set("x-username", username);
    response.headers.set("x-email", email);
    if (name) {
      response.headers.set("x-name", name);
    }
  }

  return response;
}

export const config = {
  matcher: "/:path*",
};

