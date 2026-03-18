'use client';

import { createClientBrowser } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AuthNav() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClientBrowser();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      router.refresh(); // Refresh server components on auth state change
    });

    return () => subscription.unsubscribe();
  }, [router, supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <a href="/upload" className="nav-cta" style={{ textDecoration: 'none' }}>📤 Analyser un bulletin</a>
        <button onClick={handleSignOut} className="btn" style={{ padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
          Déconnexion
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <a href="/auth" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}>Se connecter</a>
      <a href="/auth" className="nav-cta" style={{ textDecoration: 'none' }}>🚀 Inscription gratuite</a>
    </div>
  );
}
