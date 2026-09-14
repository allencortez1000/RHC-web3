import { AppShell, Card } from '@rhc/ui';
import { navFor } from '../web3-nav';
import { Notifications } from '../components/customer-data';
export default function Page() { return <AppShell title="Notifications" navItems={navFor('Notifications')}><section className="grid gap-4"><Card title="Notification Center"><Notifications /></Card></section></AppShell>; }
