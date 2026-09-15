'use client';

import { createClient } from '@supabase/supabase-js';
import type { AuthAdapter, BrowserSession } from '@rhc/ui';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const demoEmail = 'demo@rhc.local';
const demoPassword = 'Demo123456!';
const demoSessionKey = 'rhc-demo-session';
const demoSession: BrowserSession = {
  access_token: 'rhc-demo-token',
  user: { id: 'mock-user-customer', email: demoEmail },
};
const demoSubscribers = new Set<(session: BrowserSession | null) => void>();

function readDemoSession() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(demoSessionKey) === 'active' ? demoSession : null;
}

function writeDemoSession(active: boolean) {
  if (typeof window === 'undefined') return;
  if (active) window.localStorage.setItem(demoSessionKey, 'active');
  else window.localStorage.removeItem(demoSessionKey);
  const next = readDemoSession();
  demoSubscribers.forEach((callback) => callback(next));
}

export const supabase = url && key ? createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true } }) : null;
export function requireSupabase() {
  if (!supabase) throw new Error('Authentication is unavailable because the public Supabase configuration is missing.');
  return supabase;
}
export const authAdapter: AuthAdapter = {
  async session() {
    const localDemoSession = readDemoSession();
    if (localDemoSession) return localDemoSession;
    const { data, error } = await requireSupabase().auth.getSession();
    if (error) throw error;
    return data.session;
  },
  subscribe(callback) {
    demoSubscribers.add(callback);
    if (!supabase) {
      return () => {
        demoSubscribers.delete(callback);
      };
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(readDemoSession() || session));
    return () => {
      demoSubscribers.delete(callback);
      data.subscription.unsubscribe();
    };
  },
  async login(email, password) {
    if (email.trim().toLowerCase() === demoEmail && password === demoPassword) {
      writeDemoSession(true);
      return;
    }
    writeDemoSession(false);
    const { error } = await requireSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
  async register(email, password, mobile, redirect) {
    const { data, error } = await requireSupabase().auth.signUp({ email, password, options: { emailRedirectTo: redirect, data: { mobile_number: mobile, privacy_terms_acceptance: true } } });
    if (error) throw error;
    return Boolean(data.session);
  },
  async recover(email, redirect) { const { error } = await requireSupabase().auth.resetPasswordForEmail(email, { redirectTo: redirect }); if (error) throw error; },
  async resend(email, redirect) { const { error } = await requireSupabase().auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirect } }); if (error) throw error; },
  async reset(password) { const { error } = await requireSupabase().auth.updateUser({ password }); if (error) throw error; },
  async confirm(href) {
    const link = new URL(href);
    const hash = new URLSearchParams(link.hash.slice(1));
    const failure = link.searchParams.get('error_description') || hash.get('error_description');
    if (failure) throw new Error(failure);
    // Bearer-token links are not bound to this browser and can swap the user's session.
    if (['access_token', 'refresh_token', 'token_hash'].some((name) => link.searchParams.has(name) || hash.has(name)))
      throw new Error('Unsupported confirmation link. Request a new email link in this browser.');
    const code = link.searchParams.get('code');
    if (!code || link.searchParams.getAll('code').length !== 1)
      throw new Error('The confirmation code is missing or invalid. Request a new email link in this browser.');
    const client = requireSupabase();
    // The SDK supplies the locally stored PKCE verifier; never fall back to an existing session.
    const { data, error: exchangeError } = await client.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    if (!data.session) throw new Error('This link is invalid or expired. Request a new email link in this browser.');
    const { error } = await client.auth.getUser(); if (error) throw error;
  },
  async logout() {
    writeDemoSession(false);
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  },
};
