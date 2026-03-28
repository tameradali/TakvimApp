import { useState, FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { login } from '../api/client'

export function Login() {
  const { isLoggedIn, loginSuccess } = useAuth()
  const navigate = useNavigate()
  const [kullaniciAdi, setKullaniciAdi] = useState('')
  const [sifre, setSifre] = useState('')
  const [loading, setLoading] = useState(false)
  const [hata, setHata] = useState<string | null>(null)

  if (isLoggedIn) return <Navigate to="/app" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setHata(null)
    setLoading(true)
    try {
      const res = await login({ kullaniciAdi, sifre })
      loginSuccess(res.token, res.kullaniciAdi, res.kullaniciId, res.rol ?? 'tenant')
      navigate('/app')
    } catch (err: unknown) {
      setHata(err instanceof Error ? err.message : 'Giriş başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-xxl">
      <div className="authentication-wrapper authentication-basic container-p-y">
        <div className="authentication-inner py-4">
          <div className="card">
            <div className="card-body">
              <div className="app-brand justify-content-center mb-4">
                <span className="app-brand-link gap-2">
                  <span style={{
                    display: 'flex', width: 40, height: 40, borderRadius: 10,
                    background: 'linear-gradient(135deg, #26a69a 0%, #80cbc4 100%)',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 700, color: '#fff',
                  }}>
                    <i className="ri ri-calendar-2-line" />
                  </span>
                  <span className="app-brand-text fw-bold fs-4">TakvimApp</span>
                </span>
              </div>

              <h4 className="mb-1 text-center">Hoş Geldiniz! 👋</h4>
              <p className="mb-4 text-center text-muted small">
                Devam etmek için giriş yapın
              </p>

              <form onSubmit={handleSubmit}>
                {hata && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
                    <i className="ri ri-error-warning-line ri-18px" />
                    <span>{hata}</span>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label" htmlFor="kullaniciAdi">Kullanıcı Adı</label>
                  <div className="input-group input-group-merge">
                    <span className="input-group-text"><i className="ri ri-user-3-line" /></span>
                    <input
                      id="kullaniciAdi" type="text" className="form-control"
                      placeholder="kullanici.adi" value={kullaniciAdi}
                      onChange={(e) => setKullaniciAdi(e.target.value)}
                      autoComplete="username" required autoFocus
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label" htmlFor="sifre">Şifre</label>
                  <div className="input-group input-group-merge">
                    <span className="input-group-text"><i className="ri ri-lock-password-line" /></span>
                    <input
                      id="sifre" type="password" className="form-control"
                      placeholder="••••••••" value={sifre}
                      onChange={(e) => setSifre(e.target.value)}
                      autoComplete="current-password" required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary d-grid w-100" disabled={loading}>
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm me-2" role="status" />Giriş yapılıyor...</>
                  ) : 'Giriş Yap'}
                </button>
              </form>
            </div>
          </div>
          <p className="text-center text-muted small mt-3">
            TakvimApp — Eğitim Takvimi &amp; Gelir Takibi
          </p>
        </div>
      </div>
    </div>
  )
}
