import { useEffect, useState, useCallback } from 'react'
import { TakvimWidget, TakvimEtkinlik } from '../components/TakvimWidget'
import { getEgitimEtkinlikleriAralik, getBeklenenEgitimlerAralik, senkronizeTumu, patchEtkinlikFiyat } from '../api/client'
import type { EgitimEtkinligi, BeklenenEgitim } from '../api/client'

function ayBaslangici(tarih: Date): Date {
  return new Date(tarih.getFullYear(), tarih.getMonth(), 1)
}
function ayBitisi(tarih: Date): Date {
  return new Date(tarih.getFullYear(), tarih.getMonth() + 1, 0, 23, 59, 59)
}

export function Takvim() {
  const [aktifTarih, setAktifTarih] = useState(new Date())
  const [etkinlikler, setEtkinlikler] = useState<TakvimEtkinlik[]>([])
  const [loading, setLoading] = useState(false)
  const [senkronLoading, setSenkronLoading] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [seciliEtkinlik, setSeciliEtkinlik] = useState<TakvimEtkinlik | null>(null)
  const [fiyatInput, setFiyatInput] = useState('')
  const [fiyatKayitLoading, setFiyatKayitLoading] = useState(false)

  const yukle = useCallback(async (tarih: Date) => {
    setLoading(true)
    setHata(null)
    try {
      const bs = ayBaslangici(tarih)
      const bt = ayBitisi(tarih)
      const [etkinlikData, beklenenData] = await Promise.all([
        getEgitimEtkinlikleriAralik(bs, bt),
        getBeklenenEgitimlerAralik(bs, bt),
      ])
      const rbcEtkinlikler: TakvimEtkinlik[] = [
        ...etkinlikData.map((e: EgitimEtkinligi) => ({
          id:           e.id,
          title:        e.baslik + (e.gunlukFiyat ? ` (${e.gunlukFiyat.toLocaleString('tr-TR')} ₺/gün)` : ''),
          start:        new Date(e.baslangicTarihi),
          end:          new Date(e.bitisTarihi),
          tur:          'planlanan' as const,
          gunlukFiyat:  e.gunlukFiyat,
          allDay:       true,
        })),
        ...beklenenData.map((b: BeklenenEgitim) => ({
          id:          b.id,
          title:       b.baslik + ` (${b.gunlukFiyat.toLocaleString('tr-TR')} ₺/gün)`,
          start:       new Date(b.baslangicTarihi),
          end:         new Date(b.bitisTarihi),
          tur:         'beklenen' as const,
          gunlukFiyat: b.gunlukFiyat,
          allDay:      true,
        })),
      ]
      setEtkinlikler(rbcEtkinlikler)
    } catch (err: unknown) {
      setHata(err instanceof Error ? err.message : 'Etkinlikler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { yukle(aktifTarih) }, [aktifTarih, yukle])

  async function handleSenkron() {
    setSenkronLoading(true)
    setHata(null)
    try {
      await senkronizeTumu()
      await yukle(aktifTarih)
    } catch (err: unknown) {
      setHata(err instanceof Error ? err.message : 'Senkronizasyon başarısız')
    } finally {
      setSenkronLoading(false)
    }
  }

  async function handleFiyatKaydet() {
    if (!seciliEtkinlik || seciliEtkinlik.tur !== 'planlanan') return
    setFiyatKayitLoading(true)
    try {
      const fiyat = fiyatInput ? parseFloat(fiyatInput) : null
      await patchEtkinlikFiyat(seciliEtkinlik.id, fiyat)
      setSeciliEtkinlik(null)
      await yukle(aktifTarih)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Hata')
    } finally {
      setFiyatKayitLoading(false)
    }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h5 className="mb-0">Eğitim Takvimi</h5>
          <p className="text-muted small mb-0">Google Calendar etkinlikleri ve beklenen eğitimler</p>
        </div>
        <div className="d-flex gap-2 align-items-center flex-wrap">
          {/* Renk Açıklamaları */}
          <span className="badge" style={{ background: '#4caf50' }}>● Gerçekleşen</span>
          <span className="badge" style={{ background: '#ffb300', color: '#333' }}>● Planlanan</span>
          <span className="badge" style={{ background: '#f06292' }}>● Beklenen</span>
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={handleSenkron}
            disabled={senkronLoading}
          >
            {senkronLoading ? (
              <><span className="spinner-border spinner-border-sm me-1" />Senkronize ediliyor...</>
            ) : (
              <><i className="ri ri-refresh-line me-1" />Google'dan Güncelle</>
            )}
          </button>
        </div>
      </div>

      {hata && (
        <div className="alert alert-danger d-flex gap-2 py-2 mb-3">
          <i className="ri ri-error-warning-line" />
          {hata}
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <span className="spinner-border text-primary" />
            </div>
          ) : (
            <TakvimWidget
              etkinlikler={etkinlikler}
              onNavigate={(date) => setAktifTarih(date)}
              onSelectEvent={(evt) => {
                setSeciliEtkinlik(evt)
                setFiyatInput(evt.gunlukFiyat ? String(evt.gunlukFiyat) : '')
              }}
            />
          )}
        </div>
      </div>

      {/* Fiyat güncelleme modal */}
      {seciliEtkinlik && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setSeciliEtkinlik(null)} />
          <div className="modal d-block" style={{ zIndex: 1050 }} tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="ri ri-calendar-event-line me-2" />
                    {seciliEtkinlik.title.split(' (')[0]}
                  </h5>
                  <button className="btn-close" onClick={() => setSeciliEtkinlik(null)} />
                </div>
                <div className="modal-body">
                  <p className="text-muted small mb-3">
                    {new Date(seciliEtkinlik.start).toLocaleDateString('tr-TR')} —{' '}
                    {new Date(seciliEtkinlik.end).toLocaleDateString('tr-TR')}
                  </p>
                  {seciliEtkinlik.tur === 'planlanan' ? (
                    <div className="mb-3">
                      <label className="form-label">Günlük Fiyat (₺)</label>
                      <input
                        type="number" className="form-control" placeholder="0.00"
                        value={fiyatInput} onChange={(e) => setFiyatInput(e.target.value)}
                        min={0} step={0.01}
                      />
                    </div>
                  ) : (
                    <p className="text-muted">Beklenen eğitim — fiyat eğitim listesinden düzenlenebilir.</p>
                  )}
                </div>
                {seciliEtkinlik.tur === 'planlanan' && (
                  <div className="modal-footer">
                    <button className="btn btn-secondary btn-sm" onClick={() => setSeciliEtkinlik(null)}>İptal</button>
                    <button className="btn btn-primary btn-sm" onClick={handleFiyatKaydet} disabled={fiyatKayitLoading}>
                      {fiyatKayitLoading ? <span className="spinner-border spinner-border-sm" /> : 'Kaydet'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
