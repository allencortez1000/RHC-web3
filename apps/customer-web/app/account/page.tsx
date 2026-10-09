import { DemoRecordsPage } from '../components/demo-records';
import { ThirdwebWalletReadiness } from '../components/wallet-thirdweb/ThirdwebWalletReadiness';

export default function Page() {
  return (
    <>
      <DemoRecordsPage kind="account" />
      <div className="mx-auto mt-6 w-full max-w-6xl px-4 pb-8">
        <ThirdwebWalletReadiness />
      </div>
    </>
  );
}
