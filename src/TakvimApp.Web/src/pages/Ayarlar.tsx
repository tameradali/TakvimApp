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
  const [jsonText, setJsonText] = useState('')
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
    setJsonText('')
    setAktifMi(true)
    setModalAcik(true)
  }

  async function modalAcDuzenle(id: number) {
    try {
      const detay = await getGoogleHesap(id)
      setDuzenlenenId(id)
      setHesapAdi(detay.hesapAdi)
      setJsonText(detay.servisHesabiJson)
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
        await putGoogleHesap(duzenlenenId, { hesapAdi, servisHesabiJson: jsonText, aktifMi })
      } else {
        await postGoogleHesap({ hesapAdi, servisHesabiJson: jsonText })
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
    if (!confirm('Bu Google hesabını ve tüm etkinliklerini silmek istiyor musunuz?')) return
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
          <p className="text-muted small mb-0">Google Calendar hesap yapılandırması</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={modalAcYeni}>
          <i className="ri ri-add-line me-1" />Hesap Ekle
        </button>
      </div>

      {hata && <div className="alert alert-danger py-2">{hata}</div>}

      <div className="card mb-4">
        <div className="card-header d-flex align-items-center gap-2">
          <i className="ri ri-google-line" />
          <h6 className="mb-0">Google Calendar Hesapları</h6>
        </div>
        {loading ? (
          <div className="card-body text-center py-4"><span className="spinner-border text-primary" /></div>
        ) : hesaplar.length === 0 ? (
          <div className="card-body text-center py-4">
            <i className="ri ri-google-line ri-48px text-muted" />
            <p className="text-muted mt-2 mb-0">Henüz Google hesabı eklenmedi.</p>
            <p className="text-muted small">Service Account JSON ile Google Calendar okuma yetkisi verin.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr><th>Hesap Adı</th><th>Durum</th><th>Son Senkronizasyon</th><th></th></tr>
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
                      {h.sonSenkronizasyon
                        ? new Date(h.sonSenkronizasyon).toLocaleString('tr-TR')
                        : '—'}
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={() => handleSenkron(h.id)}
                          disabled={senkronId === h.id}
                          title="Senkronize Et"
                        >
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

      {/* Service Account JSON bilgi notu */}
      <div className="card">
        <div className="card-body">
          <h6 className="mb-2"><i className="ri ri-information-line me-1" />Service Account Nasıl Oluşturulur?</h6>
          <ol className="text-muted small mb-0">
            <li>Google Cloud Console → IAM &amp; Admin → Service Accounts</li>
            <li>Yeni service account oluşturun</li>
            <li>JSON anahtarı indirin</li>
            <li>Google Calendar → Settings → Share with specific people: service account e-postasını "See all event details" yetkisiyle ekleyin</li>
            <li>JSON içeriğini buraya yapıştırın</li>
          </ol>
        </div>
      </div>

      {/* Modal */}
      {modalAcik && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setModalAcik(false)} />
          <div className="modal d-block" style={{ zIndex: 1050 }} tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{duzenlenenId ? 'Hesabı Düzenle' : 'Yeni Google Hesabı'}</h5>
                  <button className="btn-close" onClick={() => setModalAcik(false)} />
                </div>
                <form onSubmit={handleKaydet}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Hesap Adı (hatırlatıcı isim)</label>
                      <input className="form-control" required placeholder="ör: Fatma Google" value={hesapAdi}
                        onChange={e => setHesapAdi(e.target.value)} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Service Account JSON</label>
                      <textarea
                        className="form-control"
                        rows={8}
                        required={!duzenlenenId}
                        placeholder='{"type":"service_account","project_id":"...","private_key_id":"...",...}'
                        value={jsonText}
                        onChange={e => setJsonText(e.target.value)}
                        style={{ fontFamily: 'monospace', fontSize: 12 }}
                      />
                      {duzenlenenId && <small className="text-muted">Boş bırakırsanız mevcut JSON korunur.</small>}
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
