'use client';

import { useState } from 'react';
import { createClientBrowser } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const router = useRouter();
  const supabase = createClientBrowser();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage({ text: 'Veuillez remplir tous les champs.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Require double opt-in to prevent fake accounts
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        });
        
        if (error) throw error;
        setMessage({ text: 'Vérifiez vos emails ! Un lien de confirmation vous a été envoyé.', type: 'success' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        // Refresh routing to pass through the middleware auth gate
        router.refresh();
      }
    } catch (err: any) {
      let errorMsg = err.message;
      if (errorMsg.includes('Invalid login credentials')) errorMsg = 'Identifiants incorrects.';
      if (errorMsg.includes('User already registered')) errorMsg = 'Un compte existe déjà avec cet email.';
      
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {message && (
        <div style={{ 
          padding: '0.75rem', 
          borderRadius: '8px', 
          fontSize: '0.9rem',
          backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          color: message.type === 'error' ? '#ef4444' : '#22c55e',
          border: `1px solid ${message.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
        }}>
          {message.type === 'error' ? '⚠️ ' : '✅ '} {message.text}
        </div>
      )}

      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Adresse Email</label>
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre@email.com"
          required
          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Mot de passe</label>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={6}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
        />
      </div>

      <button 
        type="submit" 
        className="btn btn-primary" 
        disabled={loading}
        style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem', justifyContent: 'center' }}
      >
        {loading ? 'Chargement...' : (isSignUp ? 'Créer mon compte sécurisé' : 'Se connecter')}
      </button>

      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button 
          type="button" 
          onClick={() => setIsSignUp(!isSignUp)}
          style={{ background: 'none', border: 'none', color: 'var(--text-link)', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
        >
          {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? S\'inscrire'}
        </button>
      </div>
    </form>
  );
}
