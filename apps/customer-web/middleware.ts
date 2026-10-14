import { NextResponse, type NextRequest } from "next/server";
import { evaluateLocalThirdwebQa } from "./app/components/wallet-thirdweb/real-provider-qa/gate";

/**
 * Reject the local Thirdweb QA route before an App Router stream can start.
 * Page-level notFound() remains a second guard, but streamed responses can
 * already have HTTP 200 headers. This middleware produces the actual 404.
 * It never handles application identity, customer authorization or wallet IO.
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname !== "/thirdweb-qa" && !pathname.startsWith("/thirdweb-qa/")) {
    return NextResponse.next();
  }

  const gate = evaluateLocalThirdwebQa({
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV,
    host: request.headers.get("host") ?? undefined,
    approvalReference: process.env.RHC_THIRDWEB_QA_PERMISSION_REF,
    clientId: process.env.RHC_THIRDWEB_QA_CLIENT_ID,
    chainId: process.env.RHC_THIRDWEB_QA_CHAIN_ID,
    mode: process.env.RHC_THIRDWEB_QA_WALLET_MODE,
  });

  if (!gate.allowed) {
    return new NextResponse(null, {
      status: 404,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      },
    });
  }
  return NextResponse.next();
}

// Keep this exact path narrow: normal RHC customer pages are outside this gate.
export const config = { matcher: ["/thirdweb-qa/:path*"] };
