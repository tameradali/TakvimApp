import { useEffect, useState, useCallback, useRef } from 'react'
import { TakvimWidget, TakvimEtkinlik } from '../components/TakvimWidget'
import {
  getEgitimEtkinlikleriAralik,
  getBeklenenEgitimlerAralik,
  senkronizeTumu,
  patchEtkinlikBilgi,
  getKurumlar,
} from '../api/client'
import type { EgitimEtkinligi, BeklenenEgitim, Kurum } from '../api/client'

function etkinlikGunSayisi(start: Date, end: Date): number {
  const s = new Date(start); s.setHours(0, 0, 0, 0)
  const e = new Date(end);   e.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / 86400000))
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return isMobile
}

export function Takvim() {
  const isMobile = useIsMobile()

  const [etkinlikler, setEtkinlikler] = useState<TakvimEtkinlik[]>([])
  const [loading, setLoading]         = useState(false)
  const [senkronLoading, setSenkronLoading] = useState(false)
  const [hata, setHata]               = useState<string | null>(null)
  const sonYuklenenAralik    = useRef<string>('')
  const sonYuklenenAralikRef = useRef<{ start: Date; end: Date } | null>(null)

  const [kurumlar, setKurumlar] = useState<Kurum[]>([])

  const [seciliEtkinlik, setSeciliEtkinlik]           = useState<TakvimEtkinlik | null>(null)
  const [fiyatInput, setFiyatInput]                   = useState('')
  const [etkinlikTuruInput, setEtkinlikTuruInput]     = useState('Egitim')
  const [egitimTipiInput, setEgitimTipiInput]         = useState('')
  const [masrafInput, setMasrafInput]                 = useState('')
  const [kurumIdInput, setKurumIdInput]               = useState<number | null>(null)
  const [bilgiKayitLoading, setBilgiKayitLoading]     = useState(false)

  // Gün sayısı hesapla
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0)
  const gunSayilari = etkinlikler.reduce(
    (acc, e) => {
      const s  = new Date(e.start); s.setHours(0, 0, 0, 0)
      const en = new Date(e.end);   en.setHours(0, 0, 0, 0)
      if (e.tur === 'beklenen') {
        acc.beklenen += etkinlikGunSayisi(s, en)
      } else if (e.etkinlikTuru === 'Toplanti') {
        acc.toplanti += etkinlikGunSayisi(s, en)
      } else {
        const pastEnd     = en   < bugun ? en   : bugun
        const futureStart = s    > bugun ? s    : bugun
        acc.gerceklesen  += Math.max(0, Math.round((pastEnd.getTime()    - s.getTime())          / 86400000))
        acc.planlanan    += Math.max(0, Math.round((en.getTime()         - futureStart.getTime()) / 86400000))
      }
      return acc
    },
    { gerceklesen: 0, planlanan: 0, beklenen: 0, toplanti: 0 }
  )

  const yukle = useCallback(async (baslangic: Date, bitis: Date) => {
    setLoading(true); setHata(null)
    try {
      const [etkinlikData, beklenenData] = await Promise.all([
        getEgitimEtkinlikleriAralik(baslangic, bitis),
        getBeklenenEgitimlerAralik(baslangic, bitis),
      ])
      setEtkinlikler([
        ...etkinlikData.map((e: EgitimEtkinligi) => ({
          id: e.id,
          title: e.baslik + (e.gunlukFiyat ? ` (${e.gunlukFiyat.toLocaleString('tr-TR')} ₺/gün)` : ''),
          start: new Date(e.baslangicTarihi),
          end:   new Date(e.bitisTarihi),
          tur:   (e.etkinlikTuru === 'Toplanti' ? 'toplanti' : 'planlanan') as TakvimEtkinlik['tur'],
          gunlukFiyat: e.gunlukFiyat, allDay: true,
          etkinlikTuru: e.etkinlikTuru, yer: e.yer, aciklama: e.aciklama,
          egitimTipi: e.egitimTipi, masraf: e.masraf,
          kurumId: e.kurumId, kurumAdi: e.kurumAdi,
        })),
        ...beklenenData.map((b: BeklenenEgitim) => ({
          id: b.id,
          title: b.baslik + ` (${b.gunlukFiyat.toLocaleString('tr-TR')} ₺/gün)`,
          start: new Date(b.baslangicTarihi), end: new Date(b.bitisTarihi),
          tur: 'beklenen' as const, gunlukFiyat: b.gunlukFiyat, allDay: true,
        })),
      ])
    } catch (err: unknown) {
      setHata(err instanceof Error ? err.message : 'Etkinlikler yüklenemedi')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    getKurumlar().then(setKurumlar).catch(() => {})
  }, [])

  async function handleSenkron() {
    setSenkronLoading(true); setHata(null)
    try {
      await senkronizeTumu()
      const ref = sonYuklenenAralikRef.current
      if (ref) await yukle(ref.start, ref.end)
    } catch (err: unknown) {
      setHata(err instanceof Error ? err.message : 'Senkronizasyon başarısız')
    } finally { setSenkronLoading(false) }
  }

  function handleEtkinlikSec(evt: TakvimEtkinlik) {
    setSeciliEtkinlik(evt)
    setFiyatInput(evt.gunlukFiyat ? String(evt.gunlukFiyat) : '')
    setEtkinlikTuruInput(evt.etkinlikTuru ?? 'Egitim')
    setEgitimTipiInput(evt.egitimTipi ?? '')
    setMasrafInput(evt.masraf ? String(evt.masraf) : '')
    setKurumIdInput((evt as TakvimEtkinlik & { kurumId?: number | null }).kurumId ?? null)
  }

  async function handleBilgiKaydet() {
    if (!seciliEtkinlik || seciliEtkinlik.tur === 'beklenen') return
    setBilgiKayitLoading(true)
    try {
      await patchEtkinlikBilgi(seciliEtkinlik.id, {
        gunlukFiyat:  fiyatInput ? parseFloat(fiyatInput) : null,
        etkinlikTuru: etkinlikTuruInput,
        egitimTipi:   egitimTipiInput || null,
        masraf:       masrafInput ? parseFloat(masrafInput) : null,
        kurumId:      kurumIdInput,
      })
      setSeciliEtkinlik(null)
      const ref = sonYuklenenAralikRef.current
      if (ref) await yukle(ref.start, ref.end)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Hata')
    } finally { setBilgiKayitLoading(false) }
  }

  const renkAciklamalari = [
    { renk: '#4caf50', label: 'Gerçekleşen Eğitim', gun: gunSayilari.gerceklesen },
    { renk: '#ffb300', label: 'Planlanan Eğitim',   gun: gunSayilari.planlanan   },
    { renk: '#f06292', label: 'Beklenen Eğitim',    gun: gunSayilari.beklenen    },
    { renk: '#2196F3', label: 'Toplantı',            gun: gunSayilari.toplanti    },
  ]

  return (
    <>
      {hata && (
        <div className="alert alert-danger d-flex gap-2 py-2 mb-3">
          <i className="ri ri-error-warning-line" />{hata}
        </div>
      )}

      <div className="takvim-layout" style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Sol panel */}
        <div className="takvim-sol-panel">
          <button
            className="btn btn-primary w-100 mb-3 d-flex align-items-center justify-content-center gap-2"
            onClick={handleSenkron}
            disabled={senkronLoading}
          >
            {senkronLoading
              ? <><span className="spinner-border spinner-border-sm" />Güncelleniyor...</>
              : <><i className="ri ri-refresh-line" />Google'dan Güncelle</>
            }
          </button>

          {/* Renk açıklamaları */}
          <div className="card">
            <div className="card-body py-3">
              <p className="small fw-semibold text-uppercase text-muted mb-2">Renk Açıklamaları</p>
              <div className="d-flex flex-column gap-2">
                {renkAciklamalari.map(({ renk, label, gun }) => (
                  <div key={label} className="d-flex align-items-center justify-content-between gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: renk, flexShrink: 0 }} />
                      <small>{label}</small>
                    </div>
                    {gun > 0 && (
                      <span className="badge rounded-pill" style={{
                        backgroundColor: renk,
                        color: renk === '#ffb300' ? '#333' : '#fff',
                        fontSize: '0.7rem',
                      }}>
                        {gun} gün
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Ana takvim */}
        <div className="takvim-ana">
          <div className="card">
            <div className="card-body p-2 p-sm-3">
              <div style={{ position: 'relative' }}>
                {loading && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(255,255,255,0.6)',
                    zIndex: 10, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', borderRadius: 8,
                  }}>
                    <span className="spinner-border text-primary" />
                  </div>
                )}
                <TakvimWidget
                  etkinlikler={etkinlikler}
                  isMobile={isMobile}
                  onDatesSet={(start, end) => {
                    const key = start.toISOString() + end.toISOString()
                    if (sonYuklenenAralik.current === key) return
                    sonYuklenenAralik.current = key
                    sonYuklenenAralikRef.current = { start, end }
                    yukle(start, end)
                  }}
                  onSelectEvent={handleEtkinlikSec}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Etkinlik bilgi modal */}
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
                  <p className="text-muted small mb-2">
                    <i className="ri ri-time-line me-1" />
                    {new Date(seciliEtkinlik.start).toLocaleDateString('tr-TR')} —{' '}
                    {new Date(seciliEtkinlik.end).toLocaleDateString('tr-TR')}
                  </p>
                  {seciliEtkinlik.yer && (
                    <p className="text-muted small mb-2">
                      <i className="ri ri-map-pin-line me-1" />{seciliEtkinlik.yer}
                    </p>
                  )}
                  {seciliEtkinlik.aciklama && (
                    <p className="text-muted small mb-3" style={{ whiteSpace: 'pre-wrap' }}>
                      <i className="ri ri-file-text-line me-1" />{seciliEtkinlik.aciklama}
                    </p>
                  )}

                  {seciliEtkinlik.tur === 'beklenen' ? (
                    <p className="text-muted">Beklenen eğitim — fiyat eğitim listesinden düzenlenebilir.</p>
                  ) : (
                    <>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Etkinlik Türü</label>
                        <select className="form-select form-select-sm" value={etkinlikTuruInput}
                          onChange={e => {
                            setEtkinlikTuruInput(e.target.value)
                            if (e.target.value === 'Toplanti') { setEgitimTipiInput(''); setMasrafInput('') }
                          }}>
                          <option value="Egitim">Eğitim</option>
                          <option value="Toplanti">Toplantı</option>
                        </select>
                      </div>

                      <div className="mb-3">
                        <label className="form-label fw-semibold">Kurum</label>
                        <select className="form-select form-select-sm"
                          value={kurumIdInput ?? ''}
                          onChange={e => setKurumIdInput(e.target.value ? Number(e.target.value) : null)}>
                          <option value="">— Seçiniz —</option>
                          {kurumlar.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
                        </select>
                        {kurumlar.length === 0 && (
                          <small className="text-muted">Kurum eklemek için Ayarlar sayfasına gidin.</small>
                        )}
                      </div>

                      <div className="mb-3">
                        <label className="form-label fw-semibold">Günlük Fiyat (₺)</label>
                        <input type="number" className="form-control form-control-sm" placeholder="0.00"
                          value={fiyatInput} onChange={e => setFiyatInput(e.target.value)} min={0} step={0.01} />
                      </div>

                      {etkinlikTuruInput === 'Egitim' && (
                        <div className="mb-3">
                          <label className="form-label fw-semibold">Eğitim Tipi</label>
                          <select className="form-select form-select-sm" value={egitimTipiInput}
                            onChange={e => {
                              setEgitimTipiInput(e.target.value)
                              if (e.target.value !== 'Yuzyuze') setMasrafInput('')
                            }}>
                            <option value="">— Seçiniz —</option>
                            <option value="Yuzyuze">Yüzyüze</option>
                            <option value="Online">Online</option>
                          </select>
                        </div>
                      )}

                      {etkinlikTuruInput === 'Egitim' && egitimTipiInput === 'Yuzyuze' && (
                        <div className="mb-3">
                          <label className="form-label fw-semibold">Günlük Masraf (₺/gün)</label>
                          <input type="number" className="form-control form-control-sm" placeholder="0.00"
                            value={masrafInput} onChange={e => setMasrafInput(e.target.value)} min={0} step={0.01} />
                          <small className="text-muted">Toplam masraf = bu tutar × gün sayısı</small>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {seciliEtkinlik.tur !== 'beklenen' && (
                  <div className="modal-footer">
                    <button className="btn btn-secondary btn-sm" onClick={() => setSeciliEtkinlik(null)}>İptal</button>
                    <button className="btn btn-primary btn-sm" onClick={handleBilgiKaydet} disabled={bilgiKayitLoading}>
                      {bilgiKayitLoading ? <span className="spinner-border spinner-border-sm" /> : 'Kaydet'}
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
