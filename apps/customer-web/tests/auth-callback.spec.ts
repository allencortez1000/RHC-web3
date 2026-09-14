import { authAdapter, supabase } from '../app/lib/supabase';
import { authCallbackTests } from './auth-callback-cases';

authCallbackTests(authAdapter, supabase);
