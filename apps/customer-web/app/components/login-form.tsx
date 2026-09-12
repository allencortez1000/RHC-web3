'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { requireSupabase } from '../lib/supabase';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const { error: signInError } = await requireSupabase().auth.signInWithPassword({
        email: String(form.get('email')),
        password: String(form.get('password')),
      });
      if (signInError) throw signInError;
      router.replace('/dashboard');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return <form onSubmit={submit} className="mt-8 space-y-5">
    <label className="block"><span className="text-sm font-semibold text-slate-200">Email address</span><input name="email" type="email" required autoComplete="email" className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none ring-cyan-300/40 placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-4" placeholder="you@example.com" /></label>
    <label className="block"><span className="text-sm font-semibold text-slate-200">Password</span><input name="password" type="password" required autoComplete="current-password" className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none ring-cyan-300/40 placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-4" placeholder="Enter your password" /></label>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><label className="flex items-center gap-2 text-slate-300"><input type="checkbox" className="h-4 w-4 rounded border-white/20 bg-white/10 accent-cyan-300" />Remember this device</label><a href="/forgot-password" className="font-semibold text-cyan-200 hover:text-cyan-100">Forgot password?</a></div>
    {error && <p role="alert" className="rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p>}
    <button disabled={loading} type="submit" className="w-full rounded-2xl bg-cyan-300 px-6 py-3 font-black text-slate-950 shadow-xl shadow-cyan-950/40 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in'}</button>
  </form>;
}
