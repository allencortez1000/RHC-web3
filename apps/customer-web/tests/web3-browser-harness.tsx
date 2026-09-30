import { createRoot } from 'react-dom/client';
import { PortalProvider, type AuthAdapter, type BrowserSession } from '@rhc/ui';
import { CustomerWeb3Preview } from '../app/components/web3-preview';
import { ThirdwebReadPanel } from '../../admin-web/app/integrations/thirdweb-read-panel';

// Served entirely through Playwright interception; no Next server or provider is used.
const parameters = new URLSearchParams(window.location.search);
const admin = parameters.get('view') === 'admin';
let session: BrowserSession | null = parameters.has('authenticated')
  ? { access_token: 'synthetic-session', user: { id: 'synthetic-user' } }
  : null;
const subscribers = new Set<(value: BrowserSession | null) => void>();
const unavailable = async (): Promise<never> => { throw new Error('Not part of this read-only harness.'); };
const auth: AuthAdapter = {
  mode: 'api',
  session: async () => session,
  subscribe: (callback) => { subscribers.add(callback); return () => { subscribers.delete(callback); }; },
  login: unavailable,
  register: unavailable,
  recover: unavailable,
  resend: unavailable,
  reset: unavailable,
  confirm: unavailable,
  logout: async () => {
    session = null;
    subscribers.forEach((callback) => callback(null));
  },
};
const navigate = () => undefined;
Object.assign(window, {
  web3Harness: {
    logout: auth.logout,
    switchSession: () => {
      session = { access_token: 'replacement-session', user: { id: 'replacement-user' } };
      subscribers.forEach((callback) => callback(session));
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <PortalProvider
    auth={auth}
    apiUrl="http://web3-fixture.test/api"
    pathname={admin ? '/integrations' : '/future-technology'}
    publicRoutes={['/future-technology']}
    requireAdmin={admin}
    navigate={navigate}
  >
    <h1>{admin ? 'Integrations' : 'Public roadmap'}</h1>
    {admin ? <ThirdwebReadPanel /> : <CustomerWeb3Preview />}
  </PortalProvider>,
);
