import { useEffect, useState, FormEvent } from 'react'
import {
  getGoogleHesaplar, getGoogleHesap, postGoogleHesap, putGoogleHesap, deleteGoogleHesap, senkronizeEt,
  getKurumlar, postKurum, putKurum, deleteKurum,
} from '../api/client'
import type { GoogleTakvimHesabi, Kurum } from '../api/client'

export function Ayarlar() {
  // ── Google Takvim ──────────────────────────────────────────────────────────
  const [hesaplar, setHesaplar] = useState<GoogleTakvimHesabi[]>([])
  const [takvimLoading, setTakvimLoading] = useState(false)
  const [takvimHata, setTakvimHata] = useState<string | null>(null)
  const [takvimModalAcik, setTakvimModalAcik] = useState(false)
  const [duzenlenenHesapId, setDuzenlenenHesapId] = useState<number | null>(null)
  const [hesapAdi, setHesapAdi] = useState('')
  const [icsUrl, setIcsUrl] = useState('')
  const [aktifMi, setAktifMi] = useState(true)
  const [takvimKayitLoading, setTakvimKayitLoading] = useState(false)
  const [senkronId, setSenkronId] = useState<number | null>(null)

  // ── Kurumlar ───────────────────────────────────────────────────────────────
  const [kurumlar, setKurumlar] = useState<Kurum[]>([])
  const [kurumLoading, setKurumLoading] = useState(false)
  const [kurumHata, setKurumHata] = useState<string | null>(null)
  const [kurumModalAcik, setKurumModalAcik] = useState(false)
  const [duzenlenenKurumId, setDuzenlenenKurumId] = useState<number | null>(null)
  const [kurumAd, setKurumAd] = useState('')
  const [kurumNotlar, setKurumNotlar] = useState('')
  const [kurumRenk, setKurumRenk] = useState('#696cff')
  const [kurumKayitLoading, setKurumKayitLoading] = useState(false)

  function takvimYukle() {
    setTakvimLoading(true)
    getGoogleHesaplar()
      .then(setHesaplar)
      .catch(err => setTakvimHata(err instanceof Error ? err.message : 'Hata'))
      .finally(() => setTakvimLoading(false))
  }

  function kurumYukle() {
    setKurumLoading(true)
    getKurumlar()
      .then(setKurumlar)
      .catch(err => setKurumHata(err instanceof Error ? err.message : 'Hata'))
      .finally(() => setKurumLoading(false))
  }

  useEffect(() => { takvimYukle(); kurumYukle() }, [])

  // Google Takvim handlers
  function takvimModalAcYeni() {
    setDuzenlenenHesapId(null); setHesapAdi(''); setIcsUrl(''); setAktifMi(true)
    setTakvimModalAcik(true)
  }

  async function takvimModalAcDuzenle(id: number) {
    try {
      const detay = await getGoogleHesap(id)
      setDuzenlenenHesapId(id); setHesapAdi(detay.hesapAdi)
      setIcsUrl(detay.servisHesabiJson ?? ''); setAktifMi(detay.aktifMi)
      setTakvimModalAcik(true)
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Hesap yüklenemedi') }
  }

  async function handleTakvimKaydet(e: FormEvent) {
    e.preventDefault(); setTakvimKayitLoading(true)
    try {
      if (duzenlenenHesapId) {
        await putGoogleHesap(duzenlenenHesapId, { hesapAdi, servisHesabiJson: icsUrl, aktifMi })
      } else {
        await postGoogleHesap({ hesapAdi, servisHesabiJson: icsUrl })
      }
      setTakvimModalAcik(false); takvimYukle()
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Kayıt başarısız') }
    finally { setTakvimKayitLoading(false) }
  }

  async function handleTakvimSil(id: number) {
    if (!confirm('Bu takvimi ve tüm etkinliklerini silmek istiyor musunuz?')) return
    try { await deleteGoogleHesap(id); takvimYukle() }
    catch (err: unknown) { alert(err instanceof Error ? err.message : 'Silme başarısız') }
  }

  async function handleSenkron(id: number) {
    setSenkronId(id)
    try { await senkronizeEt(id); takvimYukle() }
    catch (err: unknown) { alert(err instanceof Error ? err.message : 'Senkronizasyon başarısız') }
    finally { setSenkronId(null) }
  }

  // Kurum handlers
  function kurumModalAcYeni() {
    setDuzenlenenKurumId(null); setKurumAd(''); setKurumNotlar(''); setKurumRenk('#696cff')
    setKurumModalAcik(true)
  }

  function kurumModalAcDuzenle(k: Kurum) {
    setDuzenlenenKurumId(k.id); setKurumAd(k.ad); setKurumNotlar(k.notlar ?? '')
    setKurumRenk(k.renk ?? '#696cff')
    setKurumModalAcik(true)
  }

  async function handleKurumKaydet(e: FormEvent) {
    e.preventDefault(); setKurumKayitLoading(true)
    try {
      const dto = { ad: kurumAd, notlar: kurumNotlar || null, renk: kurumRenk || null, logo: null }
      if (duzenlenenKurumId) {
        await putKurum(duzenlenenKurumId, dto)
      } else {
        await postKurum(dto)
      }
      setKurumModalAcik(false); kurumYukle()
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Kayıt başarısız') }
    finally { setKurumKayitLoading(false) }
  }

  async function handleKurumSil(id: number) {
    if (!confirm('Bu kurumu silmek istiyor musunuz?')) return
    try { await deleteKurum(id); kurumYukle() }
    catch (err: unknown) { alert(err instanceof Error ? err.message : 'Silme başarısız') }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h5 className="mb-0">Ayarlar</h5>
          <p className="text-muted small mb-0">Google Calendar bağlantıları ve kurum tanımları</p>
        </div>
      </div>

      {/* ── Google Takvim Hesapları ── */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0"><i className="ri ri-calendar-line me-1" />Bağlı Takvimler</h6>
        <button className="btn btn-primary btn-sm" onClick={takvimModalAcYeni}>
          <i className="ri ri-add-line me-1" />Takvim Ekle
        </button>
      </div>

      {takvimHata && <div className="alert alert-danger py-2 mb-3">{takvimHata}</div>}

      <div className="card mb-4">
        {takvimLoading ? (
          <div className="card-body text-center py-4"><span className="spinner-border text-primary" /></div>
        ) : hesaplar.length === 0 ? (
          <div className="card-body text-center py-4">
            <i className="ri ri-calendar-line ri-48px text-muted" />
            <p className="text-muted mt-2 mb-3">Henüz takvim eklenmedi.</p>
            <button className="btn btn-primary" onClick={takvimModalAcYeni}>
              <i className="ri ri-add-line me-1" />Takvim Ekle
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead><tr><th>Takvim Adı</th><th>Durum</th><th>Son Güncelleme</th><th></th></tr></thead>
              <tbody>
                {hesaplar.map(h => (
                  <tr key={h.id}>
                    <td><strong>{h.hesapAdi}</strong></td>
                    <td><span className={`badge ${h.aktifMi ? 'bg-success' : 'bg-secondary'}`}>{h.aktifMi ? 'Aktif' : 'Pasif'}</span></td>
                    <td className="text-muted small">{h.sonSenkronizasyon ? new Date(h.sonSenkronizasyon).toLocaleString('tr-TR') : '—'}</td>
                    <td>
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm btn-outline-success" onClick={() => handleSenkron(h.id)} disabled={senkronId === h.id} title="Güncelle">
                          {senkronId === h.id ? <span className="spinner-border spinner-border-sm" /> : <i className="ri ri-refresh-line" />}
                        </button>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => takvimModalAcDuzenle(h.id)} title="Düzenle">
                          <i className="ri ri-edit-line" />
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleTakvimSil(h.id)} title="Sil">
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

      {/* iCal nasıl alınır */}
      <div className="card mb-5">
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

      {/* ── Kurum Tanımları ── */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0"><i className="ri ri-building-line me-1" />Kurum Tanımları</h6>
        <button className="btn btn-primary btn-sm" onClick={kurumModalAcYeni}>
          <i className="ri ri-add-line me-1" />Kurum Ekle
        </button>
      </div>

      {kurumHata && <div className="alert alert-danger py-2 mb-3">{kurumHata}</div>}

      <div className="card mb-4">
        {kurumLoading ? (
          <div className="card-body text-center py-4"><span className="spinner-border text-primary" /></div>
        ) : kurumlar.length === 0 ? (
          <div className="card-body text-center py-4">
            <i className="ri ri-building-line ri-48px text-muted" />
            <p className="text-muted mt-2 mb-3">Henüz kurum eklenmedi.</p>
            <button className="btn btn-primary" onClick={kurumModalAcYeni}>
              <i className="ri ri-add-line me-1" />Kurum Ekle
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead><tr><th>Kurum Adı</th><th>Renk</th><th>Notlar</th><th></th></tr></thead>
              <tbody>
                {kurumlar.map(k => (
                  <tr key={k.id}>
                    <td><strong>{k.ad}</strong></td>
                    <td>
                      {k.renk
                        ? <span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 4, backgroundColor: k.renk, border: '1px solid rgba(0,0,0,.15)', verticalAlign: 'middle' }} title={k.renk} />
                        : <span className="text-muted small">—</span>}
                    </td>
                    <td className="text-muted small">{k.notlar ?? '—'}</td>
                    <td>
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => kurumModalAcDuzenle(k)} title="Düzenle">
                          <i className="ri ri-edit-line" />
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleKurumSil(k.id)} title="Sil">
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

      {/* Takvim Modal */}
      {takvimModalAcik && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setTakvimModalAcik(false)} />
          <div className="modal d-block" style={{ zIndex: 1050 }} tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{duzenlenenHesapId ? 'Takvimi Düzenle' : 'Yeni Takvim Ekle'}</h5>
                  <button className="btn-close" onClick={() => setTakvimModalAcik(false)} />
                </div>
                <form onSubmit={handleTakvimKaydet}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Takvim Adı</label>
                      <input className="form-control" required placeholder="ör: Fatma Eğitimleri"
                        value={hesapAdi} onChange={e => setHesapAdi(e.target.value)} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Google Calendar iCal URL</label>
                      <input className="form-control" required={!duzenlenenHesapId}
                        placeholder="https://calendar.google.com/calendar/ical/..."
                        value={icsUrl} onChange={e => setIcsUrl(e.target.value)} />
                      {duzenlenenHesapId && <small className="text-muted">Boş bırakırsanız mevcut URL korunur.</small>}
                    </div>
                    {duzenlenenHesapId && (
                      <div className="form-check">
                        <input type="checkbox" className="form-check-input" id="aktifMi"
                          checked={aktifMi} onChange={e => setAktifMi(e.target.checked)} />
                        <label className="form-check-label" htmlFor="aktifMi">Aktif</label>
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setTakvimModalAcik(false)}>İptal</button>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={takvimKayitLoading}>
                      {takvimKayitLoading ? <span className="spinner-border spinner-border-sm" /> : 'Kaydet'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Kurum Modal */}
      {kurumModalAcik && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setKurumModalAcik(false)} />
          <div className="modal d-block" style={{ zIndex: 1050 }} tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{duzenlenenKurumId ? 'Kurumu Düzenle' : 'Yeni Kurum Ekle'}</h5>
                  <button className="btn-close" onClick={() => setKurumModalAcik(false)} />
                </div>
                <form onSubmit={handleKurumKaydet}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Kurum Adı</label>
                      <input className="form-control" required placeholder="ör: ABC Şirketi"
                        value={kurumAd} onChange={e => setKurumAd(e.target.value)} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Renk <span className="text-muted">(opsiyonel)</span></label>
                      <div className="d-flex align-items-center gap-2">
                        <input type="color" className="form-control form-control-color"
                          value={kurumRenk} onChange={e => setKurumRenk(e.target.value)} style={{ width: 48, padding: 2 }} />
                        <input type="text" className="form-control form-control-sm" placeholder="#696cff"
                          value={kurumRenk} onChange={e => setKurumRenk(e.target.value)} style={{ maxWidth: 100 }} />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Notlar <span className="text-muted">(opsiyonel)</span></label>
                      <textarea className="form-control" rows={2} placeholder="Açıklama..."
                        value={kurumNotlar} onChange={e => setKurumNotlar(e.target.value)} />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setKurumModalAcik(false)}>İptal</button>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={kurumKayitLoading}>
                      {kurumKayitLoading ? <span className="spinner-border spinner-border-sm" /> : 'Kaydet'}
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
