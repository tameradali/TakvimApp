import { useEffect, useState, useCallback } from 'react'
import { TakvimWidget, TakvimEtkinlik } from '../components/TakvimWidget'
import { getEgitimEtkinlikleriAralik, getBeklenenEgitimlerAralik, senkronizeTumu, patchEtkinlikFiyat } from '../api/client'
import type { EgitimEtkinligi, BeklenenEgitim } from '../api/client'

const AY_ADLARI = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
const GUN_ADLARI = ['Pt','Sa','Ça','Pe','Cu','Ct','Pz']

function MiniTakvim({ aktifAy, onAyDegis }: { aktifAy: Date; onAyDegis: (d: Date) => void }) {
  const yil = aktifAy.getFullYear()
  const ay  = aktifAy.getMonth()
  const bugun = new Date()

  const ilkGun = new Date(yil, ay, 1)
  const bosluk = (ilkGun.getDay() + 6) % 7 // Pazartesi=0
  const gunSayisi = new Date(yil, ay + 1, 0).getDate()
  const gunler: (number | null)[] = [...Array(bosluk).fill(null), ...Array.from({ length: gunSayisi }, (_, i) => i + 1)]

  function oncekiAy() { onAyDegis(new Date(yil, ay - 1, 1)) }
  function sonrakiAy() { onAyDegis(new Date(yil, ay + 1, 1)) }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <button className="btn btn-sm btn-icon" style={{ background: 'none', border: 'none' }} onClick={oncekiAy}>
          <i className="ri ri-arrow-left-s-line" />
        </button>
        <small className="fw-semibold">{AY_ADLARI[ay]} {yil}</small>
        <button className="btn btn-sm btn-icon" style={{ background: 'none', border: 'none' }} onClick={sonrakiAy}>
          <i className="ri ri-arrow-right-s-line" />
        </button>
      </div>
      <table className="w-100" style={{ fontSize: '0.75rem', textAlign: 'center' }}>
        <thead>
          <tr>{GUN_ADLARI.map(g => <th key={g} className="text-muted fw-normal pb-1">{g}</th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(gunler.length / 7) }, (_, haftaIdx) => (
            <tr key={haftaIdx}>
              {gunler.slice(haftaIdx * 7, haftaIdx * 7 + 7).map((gun, i) => {
                const isBugun = gun && bugun.getFullYear() === yil && bugun.getMonth() === ay && bugun.getDate() === gun
                return (
                  <td key={i} style={{ padding: '2px' }}>
                    {gun ? (
                      <span
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 24, height: 24, borderRadius: '50%', cursor: 'pointer',
                          background: isBugun ? 'var(--bs-primary)' : 'transparent',
                          color: isBugun ? '#fff' : 'inherit',
                          fontWeight: isBugun ? 700 : 400,
                        }}
                        onClick={() => onAyDegis(new Date(yil, ay, gun))}
                      >{gun}</span>
                    ) : ''}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Takvim() {
  const [aktifTarih, setAktifTarih] = useState(new Date())
  const [etkinlikler, setEtkinlikler] = useState<TakvimEtkinlik[]>([])
  const [loading, setLoading]         = useState(false)
  const [senkronLoading, setSenkronLoading] = useState(false)
  const [hata, setHata]               = useState<string | null>(null)
  const [seciliEtkinlik, setSeciliEtkinlik] = useState<TakvimEtkinlik | null>(null)
  const [fiyatInput, setFiyatInput]   = useState('')
  const [fiyatKayitLoading, setFiyatKayitLoading] = useState(false)

  const yukle = useCallback(async (baslangic: Date, bitis: Date) => {
    setLoading(true)
    setHata(null)
    try {
      const [etkinlikData, beklenenData] = await Promise.all([
        getEgitimEtkinlikleriAralik(baslangic, bitis),
        getBeklenenEgitimlerAralik(baslangic, bitis),
      ])
      const liste: TakvimEtkinlik[] = [
        ...etkinlikData.map((e: EgitimEtkinligi) => ({
          id: e.id,
          title: e.baslik + (e.gunlukFiyat ? ` (${e.gunlukFiyat.toLocaleString('tr-TR')} ₺/gün)` : ''),
          start: new Date(e.baslangicTarihi),
          end:   new Date(e.bitisTarihi),
          tur:   'planlanan' as const,
          gunlukFiyat: e.gunlukFiyat,
          allDay: true,
        })),
        ...beklenenData.map((b: BeklenenEgitim) => ({
          id: b.id,
          title: b.baslik + ` (${b.gunlukFiyat.toLocaleString('tr-TR')} ₺/gün)`,
          start: new Date(b.baslangicTarihi),
          end:   new Date(b.bitisTarihi),
          tur:   'beklenen' as const,
          gunlukFiyat: b.gunlukFiyat,
          allDay: true,
        })),
      ]
      setEtkinlikler(liste)
    } catch (err: unknown) {
      setHata(err instanceof Error ? err.message : 'Etkinlikler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const bs = new Date(aktifTarih.getFullYear(), aktifTarih.getMonth(), 1)
    const bt = new Date(aktifTarih.getFullYear(), aktifTarih.getMonth() + 1, 0, 23, 59, 59)
    yukle(bs, bt)
  }, [aktifTarih, yukle])

  async function handleSenkron() {
    setSenkronLoading(true)
    setHata(null)
    try {
      await senkronizeTumu()
      const bs = new Date(aktifTarih.getFullYear(), aktifTarih.getMonth(), 1)
      const bt = new Date(aktifTarih.getFullYear(), aktifTarih.getMonth() + 1, 0, 23, 59, 59)
      await yukle(bs, bt)
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
      const bs = new Date(aktifTarih.getFullYear(), aktifTarih.getMonth(), 1)
      const bt = new Date(aktifTarih.getFullYear(), aktifTarih.getMonth() + 1, 0, 23, 59, 59)
      await yukle(bs, bt)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Hata')
    } finally {
      setFiyatKayitLoading(false)
    }
  }

  return (
    <>
      {hata && (
        <div className="alert alert-danger d-flex gap-2 py-2 mb-3">
          <i className="ri ri-error-warning-line" />{hata}
        </div>
      )}

      <div className="row g-4">
        {/* Sol panel */}
        <div className="col-12 col-xl-3">
          {/* Google Sync butonu */}
          <button
            className="btn btn-primary w-100 mb-4 d-flex align-items-center justify-content-center gap-2"
            onClick={handleSenkron}
            disabled={senkronLoading}
          >
            {senkronLoading ? (
              <><span className="spinner-border spinner-border-sm" />Güncelleniyor...</>
            ) : (
              <><i className="ri ri-refresh-line" />Google'dan Güncelle</>
            )}
          </button>

          {/* Mini Takvim */}
          <div className="card mb-4">
            <div className="card-body">
              <MiniTakvim aktifAy={aktifTarih} onAyDegis={setAktifTarih} />
            </div>
          </div>

          {/* Renk açıklamaları */}
          <div className="card">
            <div className="card-body">
              <p className="small fw-semibold text-uppercase text-muted mb-3">Renk Açıklamaları</p>
              <div className="d-flex flex-column gap-2">
                {[
                  { renk: '#4caf50', label: 'Gerçekleşen Eğitim' },
                  { renk: '#ffb300', label: 'Planlanan Eğitim' },
                  { renk: '#f06292', label: 'Beklenen Eğitim' },
                ].map(({ renk, label }) => (
                  <div key={label} className="d-flex align-items-center gap-2">
                    <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: renk, flexShrink: 0 }} />
                    <small>{label}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Ana takvim */}
        <div className="col-12 col-xl-9">
          <div className="card">
            <div className="card-body">
              {loading ? (
                <div className="text-center py-5">
                  <span className="spinner-border text-primary" />
                </div>
              ) : (
                <TakvimWidget
                  etkinlikler={etkinlikler}
                  onDatesSet={(start, end) => {
                    const mid = new Date((start.getTime() + end.getTime()) / 2)
                    setAktifTarih(mid)
                    yukle(start, end)
                  }}
                  onSelectEvent={(evt) => {
                    setSeciliEtkinlik(evt)
                    setFiyatInput(evt.gunlukFiyat ? String(evt.gunlukFiyat) : '')
                  }}
                />
              )}
            </div>
          </div>
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
