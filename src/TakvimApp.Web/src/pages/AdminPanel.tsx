import { useEffect, useState, FormEvent } from 'react'
import { getAdminKullanicilar, postAdminKullanici, putAdminKullaniciRol, putAdminKullaniciSifre } from '../api/client'
import type { Kullanici } from '../api/client'

export function AdminPanel() {
  const [kullanicilar, setKullanicilar] = useState<Kullanici[]>([])
  const [loading, setLoading] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [ekleModal, setEkleModal] = useState(false)
  const [sifreModal, setSifreModal] = useState<{ id: number; ad: string } | null>(null)
  const [form, setForm] = useState({ kullaniciAdi: '', email: '', adSoyad: '', sifre: '', rol: 'tenant' })
  const [yeniSifre, setYeniSifre] = useState('')
  const [kayitLoading, setKayitLoading] = useState(false)

  function yukle() {
    setLoading(true)
    getAdminKullanicilar()
      .then(setKullanicilar)
      .catch(err => setHata(err instanceof Error ? err.message : 'Hata'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { yukle() }, [])

  async function handleEkle(e: FormEvent) {
    e.preventDefault()
    setKayitLoading(true)
    try {
      await postAdminKullanici(form)
      setEkleModal(false)
      setForm({ kullaniciAdi: '', email: '', adSoyad: '', sifre: '', rol: 'tenant' })
      yukle()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Hata')
    } finally { setKayitLoading(false) }
  }

  async function handleRol(id: number, rol: string) {
    try { await putAdminKullaniciRol(id, rol); yukle() }
    catch (err: unknown) { alert(err instanceof Error ? err.message : 'Hata') }
  }

  async function handleSifre(e: FormEvent) {
    e.preventDefault()
    if (!sifreModal) return
    setKayitLoading(true)
    try {
      await putAdminKullaniciSifre(sifreModal.id, yeniSifre)
      setSifreModal(null)
      setYeniSifre('')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Hata')
    } finally { setKayitLoading(false) }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h5 className="mb-0">Admin Paneli</h5>
          <p className="text-muted small mb-0">Kullanıcı yönetimi</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setEkleModal(true)}>
          <i className="ri ri-user-add-line me-1" />Kullanıcı Ekle
        </button>
      </div>

      {hata && <div className="alert alert-danger py-2">{hata}</div>}

      <div className="card">
        {loading ? (
          <div className="card-body text-center py-5"><span className="spinner-border text-primary" /></div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr><th>Kullanıcı Adı</th><th>Ad Soyad</th><th>E-posta</th><th>Rol</th><th>Oluşturulma</th><th></th></tr>
              </thead>
              <tbody>
                {kullanicilar.map(k => (
                  <tr key={k.id}>
                    <td><strong>{k.kullaniciAdi}</strong></td>
                    <td>{k.adSoyad}</td>
                    <td className="text-muted small">{k.email}</td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        style={{ width: 100 }}
                        value={k.rol}
                        onChange={e => handleRol(k.id, e.target.value)}
                      >
                        <option value="tenant">Kullanıcı</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="text-muted small">{new Date(k.olusturulmaTarihi).toLocaleDateString('tr-TR')}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => { setSifreModal({ id: k.id, ad: k.kullaniciAdi }); setYeniSifre('') }}
                      >
                        <i className="ri ri-lock-password-line" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Kullanıcı Ekle Modal */}
      {ekleModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setEkleModal(false)} />
          <div className="modal d-block" style={{ zIndex: 1050 }} tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Yeni Kullanıcı</h5>
                  <button className="btn-close" onClick={() => setEkleModal(false)} />
                </div>
                <form onSubmit={handleEkle}>
                  <div className="modal-body">
                    {(['kullaniciAdi', 'email', 'adSoyad', 'sifre'] as const).map(f => (
                      <div className="mb-3" key={f}>
                        <label className="form-label">{
                          f === 'kullaniciAdi' ? 'Kullanıcı Adı' :
                          f === 'email' ? 'E-posta' :
                          f === 'adSoyad' ? 'Ad Soyad' : 'Şifre'
                        }</label>
                        <input
                          className="form-control" required
                          type={f === 'sifre' ? 'password' : f === 'email' ? 'email' : 'text'}
                          value={form[f]}
                          onChange={e => setForm(prev => ({ ...prev, [f]: e.target.value }))}
                        />
                      </div>
                    ))}
                    <div className="mb-3">
                      <label className="form-label">Rol</label>
                      <select className="form-select" value={form.rol}
                        onChange={e => setForm(prev => ({ ...prev, rol: e.target.value }))}>
                        <option value="tenant">Kullanıcı</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEkleModal(false)}>İptal</button>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={kayitLoading}>
                      {kayitLoading ? <span className="spinner-border spinner-border-sm" /> : 'Kaydet'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Şifre Güncelle Modal */}
      {sifreModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setSifreModal(null)} />
          <div className="modal d-block" style={{ zIndex: 1050 }} tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Şifre Güncelle — {sifreModal.ad}</h5>
                  <button className="btn-close" onClick={() => setSifreModal(null)} />
                </div>
                <form onSubmit={handleSifre}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Yeni Şifre</label>
                      <input type="password" className="form-control" required minLength={6}
                        value={yeniSifre} onChange={e => setYeniSifre(e.target.value)} />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSifreModal(null)}>İptal</button>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={kayitLoading}>
                      {kayitLoading ? <span className="spinner-border spinner-border-sm" /> : 'Güncelle'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
