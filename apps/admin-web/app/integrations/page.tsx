import { AdminModule } from '../admin-data';
import { ThirdwebReadPanel } from './thirdweb-read-panel';

export default function Page() {
  return (
    <AdminModule title="Integrations" resource="integrations">
      <ThirdwebReadPanel />
    </AdminModule>
  );
}
