import { useEffect, useState, FormEvent } from 'react'
import { getGoogleHesaplar, getGoogleHesap, postGoogleHesap, putGoogleHesap, deleteGoogleHesap, senkronizeEt } from '../api/client'
import type { GoogleTakvimHesabi } from '../api/client'

export function Ayarlar() {
  const [hesaplar, setHesaplar] = useState<GoogleTakvimHesabi[]>([])
  const [loading, setLoading] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [modalAcik, setModalAcik] = useState(false)
  const [duzenlenenId, setDuzenlenenId] = useState<number | null>(null)
  const [hesapAdi, setHesapAdi] = useState('')
  const [icsUrl, setIcsUrl] = useState('')
  const [aktifMi, setAktifMi] = useState(true)
  const [kayitLoading, setKayitLoading] = useState(false)
  const [senkronId, setSenkronId] = useState<number | null>(null)

  function yukle() {
    setLoading(true)
    getGoogleHesaplar()
      .then(setHesaplar)
      .catch(err => setHata(err instanceof Error ? err.message : 'Hata'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { yukle() }, [])

  async function modalAcYeni() {
    setDuzenlenenId(null)
    setHesapAdi('')
    setIcsUrl('')
    setAktifMi(true)
    setModalAcik(true)
  }

  async function modalAcDuzenle(id: number) {
    try {
      const detay = await getGoogleHesap(id)
      setDuzenlenenId(id)
      setHesapAdi(detay.hesapAdi)
      setIcsUrl(detay.servisHesabiJson ?? '')
      setAktifMi(detay.aktifMi)
      setModalAcik(true)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Hesap yüklenemedi')
    }
  }

  async function handleKaydet(e: FormEvent) {
    e.preventDefault()
    setKayitLoading(true)
    try {
      if (duzenlenenId) {
        await putGoogleHesap(duzenlenenId, { hesapAdi, servisHesabiJson: icsUrl, aktifMi })
      } else {
        await postGoogleHesap({ hesapAdi, servisHesabiJson: icsUrl })
      }
      setModalAcik(false)
      yukle()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Kayıt başarısız')
    } finally {
      setKayitLoading(false)
    }
  }

  async function handleSil(id: number) {
    if (!confirm('Bu takvimi ve tüm etkinliklerini silmek istiyor musunuz?')) return
    try {
      await deleteGoogleHesap(id)
      yukle()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Silme başarısız')
    }
  }

  async function handleSenkron(id: number) {
    setSenkronId(id)
    try {
      await senkronizeEt(id)
      yukle()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Senkronizasyon başarısız')
    } finally {
      setSenkronId(null)
    }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h5 className="mb-0">Ayarlar</h5>
          <p className="text-muted small mb-0">Google Calendar iCal bağlantıları</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={modalAcYeni}>
          <i className="ri ri-add-line me-1" />Takvim Ekle
        </button>
      </div>

      {hata && <div className="alert alert-danger py-2">{hata}</div>}

      <div className="card mb-4">
        <div className="card-header d-flex align-items-center gap-2">
          <i className="ri ri-calendar-line" />
          <h6 className="mb-0">Bağlı Takvimler</h6>
        </div>
        {loading ? (
          <div className="card-body text-center py-4"><span className="spinner-border text-primary" /></div>
        ) : hesaplar.length === 0 ? (
          <div className="card-body text-center py-4">
            <i className="ri ri-calendar-line ri-48px text-muted" />
            <p className="text-muted mt-2 mb-3">Henüz takvim eklenmedi.</p>
            <button className="btn btn-primary" onClick={modalAcYeni}>
              <i className="ri ri-add-line me-1" />Takvim Ekle
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr><th>Takvim Adı</th><th>Durum</th><th>Son Güncelleme</th><th></th></tr>
              </thead>
              <tbody>
                {hesaplar.map(h => (
                  <tr key={h.id}>
                    <td><strong>{h.hesapAdi}</strong></td>
                    <td>
                      <span className={`badge ${h.aktifMi ? 'bg-success' : 'bg-secondary'}`}>
                        {h.aktifMi ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="text-muted small">
                      {h.sonSenkronizasyon ? new Date(h.sonSenkronizasyon).toLocaleString('tr-TR') : '—'}
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm btn-outline-success" onClick={() => handleSenkron(h.id)}
                          disabled={senkronId === h.id} title="Takvimi Güncelle">
                          {senkronId === h.id
                            ? <span className="spinner-border spinner-border-sm" />
                            : <i className="ri ri-refresh-line" />}
                        </button>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => modalAcDuzenle(h.id)} title="Düzenle">
                          <i className="ri ri-edit-line" />
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleSil(h.id)} title="Sil">
                          <i className="ri ri-delete-bin-line" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nasıl yapılır */}
      <div className="card">
        <div className="card-body">
          <h6 className="mb-3"><i className="ri ri-information-line me-1" />iCal URL Nasıl Alınır?</h6>
          <div className="row g-3">
            {[
              { num: '1', text: 'Google Calendar\'ı açın (calendar.google.com)' },
              { num: '2', text: 'Sol menüde takviminizin yanındaki ⋮ → "Ayarlar ve paylaşım"' },
              { num: '3', text: 'Sayfayı aşağı kaydırın → "Takvimi entegre et"' },
              { num: '4', text: '"Gizli adres iCal formatında" URL\'yi kopyalayın' },
              { num: '5', text: 'TakvimApp\'te "Takvim Ekle" → URL\'yi yapıştırın' },
            ].map(({ num, text }) => (
              <div key={num} className="col-12 col-md-6">
                <div className="d-flex gap-3 align-items-start">
                  <span className="badge rounded-pill bg-primary">{num}</span>
                  <small className="text-muted">{text}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalAcik && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setModalAcik(false)} />
          <div className="modal d-block" style={{ zIndex: 1050 }} tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{duzenlenenId ? 'Takvimi Düzenle' : 'Yeni Takvim Ekle'}</h5>
                  <button className="btn-close" onClick={() => setModalAcik(false)} />
                </div>
                <form onSubmit={handleKaydet}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Takvim Adı</label>
                      <input className="form-control" required placeholder="ör: Fatma Eğitimleri"
                        value={hesapAdi} onChange={e => setHesapAdi(e.target.value)} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Google Calendar iCal URL</label>
                      <input
                        className="form-control"
                        required={!duzenlenenId}
                        placeholder="https://calendar.google.com/calendar/ical/..."
                        value={icsUrl}
                        onChange={e => setIcsUrl(e.target.value)}
                      />
                      {duzenlenenId && <small className="text-muted">Boş bırakırsanız mevcut URL korunur.</small>}
                      <small className="text-muted d-block mt-1">
                        Google Calendar → Takvim Ayarları → "Gizli adres iCal formatında"
                      </small>
                    </div>
                    {duzenlenenId && (
                      <div className="form-check">
                        <input type="checkbox" className="form-check-input" id="aktifMi"
                          checked={aktifMi} onChange={e => setAktifMi(e.target.checked)} />
                        <label className="form-check-label" htmlFor="aktifMi">Aktif</label>
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModalAcik(false)}>İptal</button>
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
    </>
  )
}
