import { authAdapter, supabase } from '../app/lib/supabase';
import { authCallbackTests } from '../../customer-web/tests/auth-callback-cases';

authCallbackTests(authAdapter, supabase);
