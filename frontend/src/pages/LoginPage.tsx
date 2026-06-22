import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandStar } from '../components/ui/BrandStar'
import { Button } from '../components/ui/Button'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { data?: { message?: string } } }).response
        setError(res?.data?.message || 'Identifiants incorrects')
      } else {
        setError('Erreur de connexion au serveur')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col w-[480px] shrink-0 relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0B2A1B 0%, #0E3A24 40%, #0A6B3D 100%)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute top-48 -right-12 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-white/5" />

        <div className="flex flex-col flex-1 p-12 relative z-10">
          {/* Brand */}
          <div className="flex items-center gap-4 mb-16">
            <BrandStar size={56} />
            <div>
              <div className="text-white font-black text-2xl tracking-wider">SENDISTRI</div>
              <div className="text-green-300/60 text-sm">Système ERP Distribution</div>
            </div>
          </div>

          {/* Tagline */}
          <div className="mb-12">
            <h2 className="text-white text-3xl font-black leading-snug mb-4">
              Tout votre réseau de distribution,<br />
              <span className="text-green-300">en un seul endroit.</span>
            </h2>
            <p className="text-green-300/70 text-base leading-relaxed">
              Gérez vos PDV, abonnés, encaissements, logistique et analyses en temps réel.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-auto">
            {[
              { value: '1 248', label: 'PDVs actifs' },
              { value: '42 880', label: 'Abonnés actifs' },
              { value: '14', label: 'Modules métier' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 rounded-xl p-4 text-center">
                <div
                  className="text-2xl font-black text-white"
                  style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                >
                  {stat.value}
                </div>
                <div className="text-green-300/60 text-xs mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Tricolor bar */}
          <div className="mt-8 mb-6">
            <div className="flex rounded-full overflow-hidden h-1.5">
              <div className="flex-1 bg-primary" />
              <div className="flex-1 bg-gold" />
              <div className="flex-1 bg-danger" />
            </div>
          </div>

          {/* Footer */}
          <p className="text-green-300/40 text-xs">
            © 2026 SENDISTRI · Dakar, Sénégal
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-[400px]">
          {/* Mobile brand */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <BrandStar size={40} />
            <span className="font-black text-xl text-app-text">SENDISTRI</span>
          </div>

          <h1 className="text-2xl font-black text-app-text mb-2">Connexion</h1>
          <p className="text-app-muted text-sm mb-8">
            Entrez vos identifiants pour accéder au tableau de bord
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-app-text mb-1.5">
                Identifiant
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="Votre identifiant"
                className="w-full px-4 py-3 rounded-lg border border-app-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-app-text mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-app-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-text"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              size="lg"
              className="w-full"
            >
              Se connecter
            </Button>
          </form>

          {/* Demo hints */}
          <div className="mt-6 p-4 bg-primary-light rounded-xl border border-primary/20">
            <p className="text-sm font-semibold text-primary-dark mb-2">
              Comptes de démonstration
            </p>
            <div className="space-y-1 text-xs text-primary-dark/80 font-mono">
              <div>superadmin@sendistri.sn — Super Admin</div>
              <div>admin@sendistri.sn — Admin</div>
              <div>manager@sendistri.sn — Manager</div>
              <div>comptable@sendistri.sn — Comptable</div>
              <div>logisticien@sendistri.sn — Logisticien</div>
              <div>commercial@sendistri.sn — Commercial</div>
              <div>vendeur@sendistri.sn — Vendeur</div>
              <div className="mt-2 pt-2 border-t border-primary/20 font-semibold">
                Mot de passe : Demo123!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
