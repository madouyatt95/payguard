import { createClientServer } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AuthForm from './AuthForm'

export default async function AuthPage() {
  const supabase = await createClientServer()

  // If already logged in, redirect to dashboard
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', background: 'linear-gradient(135deg, var(--primary-color), #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          PayGuard
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Vérifiez vos bulletins de paie en toute sécurité.</p>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <AuthForm />
      </div>
      
      <p style={{ marginTop: '2rem', color: 'var(--text-tertiary)', fontSize: '0.85rem', textAlign: 'center', maxWidth: '400px' }}>
        En vous connectant, vous acceptez que PayGuard accède à vos documents de manière sécurisée et privée, strictement pour les analyser.
      </p>

    </main>
  )
}
