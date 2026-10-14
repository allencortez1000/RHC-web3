import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { evaluateLocalThirdwebQa } from "../components/wallet-thirdweb/real-provider-qa/gate";


/**
 * LOCAL-ONLY real SDK connection QA.
 * This route NEVER mounts in the Account page or production application.
 * A real RHC-approved provider test, public Client ID, selected wallet method
 * and explicit localhost access must all exist before the SDK can render.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "RHC Thirdweb Provider QA — Local Only",
  robots: { index: false, follow: false },
};

export default async function ThirdwebQaPage() {
  const host = (await headers()).get("host") ?? undefined;
  const gate = evaluateLocalThirdwebQa({
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV,
    host,
    approvalReference: process.env.RHC_THIRDWEB_QA_PERMISSION_REF,
    clientId: process.env.RHC_THIRDWEB_QA_CLIENT_ID,
    chainId: process.env.RHC_THIRDWEB_QA_CHAIN_ID,
    mode: process.env.RHC_THIRDWEB_QA_WALLET_MODE,
  });
  if (!gate.allowed) notFound();
  // Do not evaluate the real provider component before all server-side gates pass.
  const { ThirdwebLocalQa } = await import("../components/wallet-thirdweb/real-provider-qa/ThirdwebLocalQa");
  return (
    <ThirdwebLocalQa
      clientId={gate.clientId}
      chainId={gate.chainId}
      mode={gate.mode}
    />
  );
}
