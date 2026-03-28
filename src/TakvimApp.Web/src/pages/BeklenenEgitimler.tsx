import { useEffect, useState, FormEvent } from 'react'
import {
  getBeklenenEgitimler, postBeklenenEgitim, putBeklenenEgitim, deleteBeklenenEgitim,
  getKurumlar,
} from '../api/client'
import type { BeklenenEgitim, Kurum } from '../api/client'

interface FormState {
  baslik: string
  yil: string
  gunlukFiyat: string
  notlar: string
  kurumId: string
}

function bosForm(): FormState {
  return { baslik: '', yil: String(new Date().getFullYear()), gunlukFiyat: '', notlar: '', kurumId: '' }
}

export function BeklenenEgitimler() {
  const [liste, setListe]               = useState<BeklenenEgitim[]>([])
  const [kurumlar, setKurumlar]         = useState<Kurum[]>([])
  const [loading, setLoading]           = useState(false)
  const [hata, setHata]                 = useState<string | null>(null)
  const [modalAcik, setModalAcik]       = useState(false)
  const [duzenlenen, setDuzenlenen]     = useState<BeklenenEgitim | null>(null)
  const [form, setForm]                 = useState<FormState>(bosForm)
  const [kayitLoading, setKayitLoading] = useState(false)

  function yukle() {
    setLoading(true)
    getBeklenenEgitimler()
      .then(setListe)
      .catch(err => setHata(err instanceof Error ? err.message : 'Hata'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    yukle()
    getKurumlar().then(setKurumlar).catch(() => {})
  }, [])

  function modalAc(egitim?: BeklenenEgitim) {
    if (egitim) {
      setDuzenlenen(egitim)
      setForm({
        baslik:      egitim.baslik,
        yil:         String(new Date(egitim.baslangicTarihi).getFullYear()),
        gunlukFiyat: String(egitim.gunlukFiyat),
        notlar:      egitim.notlar ?? '',
        kurumId:     egitim.kurumId ? String(egitim.kurumId) : '',
      })
    } else {
      setDuzenlenen(null)
      setForm(bosForm())
    }
    setModalAcik(true)
  }

  async function handleKaydet(e: FormEvent) {
    e.preventDefault()
    setKayitLoading(true)
    try {
      // Tarihin yalnızca yılı var — 01 Ocak olarak sakla
      const dt = new Date(parseInt(form.yil), 0, 1)
      const dto = {
        baslik:            form.baslik,
        baslangicTarihi:   dt.toISOString(),
        bitisTarihi:       dt.toISOString(),
        gunlukFiyat:       parseFloat(form.gunlukFiyat),
        notlar:            form.notlar || null,
        kurumId:           form.kurumId ? parseInt(form.kurumId) : null,
        kurumAdi:          null,
        olusturulmaTarihi: new Date().toISOString(),
      }
      if (duzenlenen) await putBeklenenEgitim(duzenlenen.id, dto)
      else            await postBeklenenEgitim(dto)
      setModalAcik(false)
      yukle()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Kayıt başarısız')
    } finally {
      setKayitLoading(false)
    }
  }

  async function handleSil(id: number) {
    if (!confirm('Bu beklenen eğitimi silmek istediğinizden emin misiniz?')) return
    try {
      await deleteBeklenenEgitim(id)
      yukle()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Silme başarısız')
    }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h5 className="mb-0">Beklenen Eğitimler</h5>
          <p className="text-muted small mb-0">Takvimde pembe renk ile gösterilir</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => modalAc()}>
          <i className="ri ri-add-line me-1" />Yeni Ekle
        </button>
      </div>

      {hata && <div className="alert alert-danger py-2">{hata}</div>}

      <div className="card">
        {loading ? (
          <div className="card-body text-center py-5"><span className="spinner-border text-primary" /></div>
        ) : liste.length === 0 ? (
          <div className="card-body text-center py-5">
            <i className="ri ri-calendar-todo-line ri-48px text-muted" />
            <p className="text-muted mt-2">Henüz beklenen eğitim eklenmedi.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Başlık</th>
                  <th>Yıl</th>
                  <th>Kurum</th>
                  <th>Günlük Fiyat</th>
                  <th>Notlar</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {liste.map(e => (
                  <tr key={e.id}>
                    <td><strong>{e.baslik}</strong></td>
                    <td>{new Date(e.baslangicTarihi).getFullYear()}</td>
                    <td className="text-muted small">{e.kurumAdi ?? '—'}</td>
                    <td>{e.gunlukFiyat.toLocaleString('tr-TR')} ₺</td>
                    <td><span className="text-muted small">{e.notlar ?? '—'}</span></td>
                    <td>
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => modalAc(e)}>
                          <i className="ri ri-edit-line" />
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleSil(e.id)}>
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

      {/* Modal */}
      {modalAcik && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setModalAcik(false)} />
          <div className="modal d-block" style={{ zIndex: 1050 }} tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{duzenlenen ? 'Eğitimi Düzenle' : 'Yeni Beklenen Eğitim'}</h5>
                  <button className="btn-close" onClick={() => setModalAcik(false)} />
                </div>
                <form onSubmit={handleKaydet}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Başlık</label>
                      <input className="form-control" required value={form.baslik}
                        onChange={e => setForm(f => ({ ...f, baslik: e.target.value }))} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Yıl</label>
                      <input type="number" className="form-control" required
                        min={2020} max={2035} value={form.yil}
                        onChange={e => setForm(f => ({ ...f, yil: e.target.value }))} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Kurum <span className="text-muted">(opsiyonel)</span></label>
                      <select className="form-select" value={form.kurumId}
                        onChange={e => setForm(f => ({ ...f, kurumId: e.target.value }))}>
                        <option value="">— Seçiniz —</option>
                        {kurumlar.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Günlük Fiyat (₺)</label>
                      <input type="number" className="form-control" required min={0} step={0.01}
                        value={form.gunlukFiyat}
                        onChange={e => setForm(f => ({ ...f, gunlukFiyat: e.target.value }))} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Notlar <span className="text-muted">(opsiyonel)</span></label>
                      <textarea className="form-control" rows={2} value={form.notlar}
                        onChange={e => setForm(f => ({ ...f, notlar: e.target.value }))} />
                    </div>
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
