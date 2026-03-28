import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getAylikGelir, getYillikGelir, getBeklenenEgitimler } from '../api/client'
import type { AylikGelir, BeklenenEgitim } from '../api/client'

const AYLAR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']

function fmt(v: number) { return v.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }

export function Gelir() {
  const bugun = new Date()
  const [yil, setYil]     = useState(bugun.getFullYear())
  const [ay, setAy]       = useState(bugun.getMonth() + 1)
  const [aylik, setAylik] = useState<AylikGelir | null>(null)
  const [yillik, setYillik] = useState<AylikGelir[]>([])
  const [beklenenListe, setBeklenenListe] = useState<BeklenenEgitim[]>([])
  const [loading, setLoading] = useState(false)
  const [hata, setHata] = useState<string | null>(null)

  // Toggles
  const [planlananDahil, setPlanlananDahil] = useState(true)
  const [beklenenDahil,  setBeklenenDahil]  = useState(true)

  useEffect(() => {
    getBeklenenEgitimler().then(setBeklenenListe).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true); setHata(null)
    if (ay === 0) {
      getYillikGelir(yil)
        .then(y => { setYillik(y); setAylik(null) })
        .catch(err => setHata(err instanceof Error ? err.message : 'Hata'))
        .finally(() => setLoading(false))
    } else {
      Promise.all([getAylikGelir(ay, yil), getYillikGelir(yil)])
        .then(([a, y]) => { setAylik(a); setYillik(y) })
        .catch(err => setHata(err instanceof Error ? err.message : 'Hata'))
        .finally(() => setLoading(false))
    }
  }, [ay, yil])

  // Beklenenler: yıl bazlı filtre (tarayıcı local time doğru yılı verir)
  const yilBeklenenler = beklenenListe.filter(b => new Date(b.baslangicTarihi).getFullYear() === yil)
  const toplamBeklenenGun   = yilBeklenenler.reduce((s, b) => s + (b.beklenenGunSayisi ?? 1), 0)
  const toplamBeklenenGelir = yilBeklenenler.reduce((s, b) => s + (b.beklenenGunSayisi ?? 1) * b.gunlukFiyat, 0)

  // Yıllık gerçekleşen ve planlanan
  const yillikGerceklesen = yillik.reduce((s, a) => s + a.etkinlikDetaylari.reduce((ss, k) => ss + k.toplamGelir, 0), 0)
  const yillikPlanlanan   = yillik.reduce((s, a) => s + (a.planlananDetaylari ?? []).reduce((ss, k) => ss + k.toplamGelir, 0), 0)
  const yillikToplam      = yillikGerceklesen
    + (planlananDahil ? yillikPlanlanan   : 0)
    + (beklenenDahil  ? toplamBeklenenGelir : 0)

  // Aylık
  const aylikGerceklesen = aylik?.etkinlikDetaylari.reduce((s, k) => s + k.toplamGelir, 0) ?? 0
  const aylikPlanlanan   = (aylik?.planlananDetaylari ?? []).reduce((s, k) => s + k.toplamGelir, 0)
  const aylikMasraf      = aylik?.etkinlikDetaylari.reduce((s, k) => s + (k.masraf ?? 0), 0) ?? 0
  const aylikToplam      = aylikGerceklesen + (planlananDahil ? aylikPlanlanan : 0)

  const isYillik = ay === 0

  const grafikVeri = yillik.map(a => ({
    ay: AYLAR[a.ay - 1],
    gerçekleşen: Number(a.etkinlikDetaylari.reduce((s, k) => s + k.toplamGelir, 0).toFixed(2)),
    ...(planlananDahil ? { planlanan: Number((a.planlananDetaylari ?? []).reduce((s, k) => s + k.toplamGelir, 0).toFixed(2)) } : {}),
  }))

  const yillar = [bugun.getFullYear() - 1, bugun.getFullYear(), bugun.getFullYear() + 1]

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h5 className="mb-0">Gelir Takibi</h5>
          <p className="text-muted small mb-0">Gerçekleşen, planlanan ve beklenen gelir özeti</p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Planlanan toggle */}
          <div className="d-flex align-items-center gap-1 border rounded px-2 py-1">
            <span className="small" style={{ color: '#ffb300' }}>■</span>
            <span className="small">Planlanan</span>
            <div className="form-check form-switch mb-0 ms-1">
              <input className="form-check-input" type="checkbox" role="switch"
                checked={planlananDahil} onChange={e => setPlanlananDahil(e.target.checked)} />
            </div>
          </div>
          {/* Beklenen toggle */}
          <div className="d-flex align-items-center gap-1 border rounded px-2 py-1">
            <span className="small" style={{ color: '#f06292' }}>■</span>
            <span className="small">Beklenen</span>
            <div className="form-check form-switch mb-0 ms-1">
              <input className="form-check-input" type="checkbox" role="switch"
                checked={beklenenDahil} onChange={e => setBeklenenDahil(e.target.checked)} />
            </div>
          </div>
          <select className="form-select form-select-sm" value={ay} onChange={e => setAy(Number(e.target.value))} style={{ width: 140 }}>
            <option value={0}>Hepsi (Yıllık)</option>
            {AYLAR.map((ad, i) => <option key={i + 1} value={i + 1}>{ad}</option>)}
          </select>
          <select className="form-select form-select-sm" value={yil} onChange={e => setYil(Number(e.target.value))} style={{ width: 90 }}>
            {yillar.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {hata && <div className="alert alert-danger py-2">{hata}</div>}

      {loading ? (
        <div className="text-center py-5"><span className="spinner-border text-primary" /></div>
      ) : (
        <>
          {/* Özet kartlar */}
          <div className="row g-3 mb-4">
            <div className="col-sm-6 col-xl-3">
              <div className="card h-100">
                <div className="card-body">
                  <p className="text-muted small mb-1">{isYillik ? 'Yıllık' : 'Aylık'} Gerçekleşen</p>
                  <h4 className="mb-0" style={{ color: '#4caf50' }}>
                    {fmt(isYillik ? yillikGerceklesen : aylikGerceklesen)} ₺
                  </h4>
                  {!isYillik && aylikMasraf > 0 && (
                    <small className="text-muted">masraf: {fmt(aylikMasraf)} ₺ dahil</small>
                  )}
                </div>
              </div>
            </div>
            {planlananDahil && (
              <div className="col-sm-6 col-xl-3">
                <div className="card h-100">
                  <div className="card-body">
                    <p className="text-muted small mb-1">{isYillik ? 'Yıllık' : 'Aylık'} Planlanan</p>
                    <h4 className="mb-0" style={{ color: '#ffb300' }}>
                      {fmt(isYillik ? yillikPlanlanan : aylikPlanlanan)} ₺
                    </h4>
                  </div>
                </div>
              </div>
            )}
            {beklenenDahil && (
              <div className="col-sm-6 col-xl-3">
                <div className="card h-100">
                  <div className="card-body">
                    <p className="text-muted small mb-1">Yıllık Beklenen ({yil})</p>
                    <h4 className="mb-0" style={{ color: '#f06292' }}>
                      {fmt(toplamBeklenenGelir)} ₺
                    </h4>
                    <small className="text-muted">{toplamBeklenenGun} gün</small>
                  </div>
                </div>
              </div>
            )}
            <div className="col-sm-6 col-xl-3">
              <div className="card h-100">
                <div className="card-body">
                  <p className="text-muted small mb-1">{isYillik ? 'Yıllık' : 'Aylık'} Toplam</p>
                  <h4 className="mb-0" style={{ color: '#696cff' }}>
                    {fmt(isYillik ? yillikToplam : aylikToplam)} ₺
                  </h4>
                </div>
              </div>
            </div>
          </div>

          {/* Yıllık grafik */}
          <div className="card mb-4">
            <div className="card-header"><h6 className="mb-0">{yil} Yıllık Gelir Grafiği</h6></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={grafikVeri}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(86,106,127,.15)" />
                  <XAxis dataKey="ay" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
                  <Tooltip formatter={(v: number, name: string) => [`${v.toLocaleString('tr-TR')} ₺`, name === 'gerçekleşen' ? 'Gerçekleşen' : 'Planlanan']} />
                  <Legend />
                  <Bar dataKey="gerçekleşen" fill="#4caf50" radius={[4,4,0,0]} stackId="a" />
                  {planlananDahil && <Bar dataKey="planlanan" fill="#ffb300" radius={[4,4,0,0]} stackId="a" />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gerçekleşen detay (aylık) */}
          {!isYillik && aylik && aylik.etkinlikDetaylari.length > 0 && (
            <div className="card mb-4">
              <div className="card-header">
                <h6 className="mb-0">Gerçekleşen Eğitim Detayları — {AYLAR[ay - 1]} {yil}</h6>
              </div>
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr><th>Eğitim</th><th>Gün</th><th>Günlük Fiyat</th><th>Masraf</th><th>Toplam</th></tr>
                  </thead>
                  <tbody>
                    {aylik.etkinlikDetaylari.map(k => (
                      <tr key={k.etkinlikId}>
                        <td>{k.baslik}{k.kurumAdi ? <span className="text-muted small ms-1">({k.kurumAdi})</span> : ''}</td>
                        <td>{k.tamamlananGunSayisi} gün</td>
                        <td>{fmt(k.gunlukFiyat)} ₺</td>
                        <td>{k.masraf > 0 ? `${fmt(k.masraf)} ₺` : '—'}</td>
                        <td><strong>{fmt(k.toplamGelir)} ₺</strong></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="table-light fw-bold">
                      <td colSpan={4}>Toplam</td>
                      <td><strong style={{ color: '#4caf50' }}>{fmt(aylikGerceklesen)} ₺</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Planlanan detay (aylık) */}
          {planlananDahil && !isYillik && aylik && (aylik.planlananDetaylari ?? []).length > 0 && (
            <div className="card mb-4">
              <div className="card-header d-flex align-items-center gap-2">
                <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#ffb300', display: 'inline-block' }} />
                <h6 className="mb-0">Planlanan Eğitim Detayları — {AYLAR[ay - 1]} {yil}</h6>
              </div>
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr><th>Eğitim</th><th>Planlanan Gün</th><th>Günlük Fiyat</th><th>Tahmini Gelir</th></tr>
                  </thead>
                  <tbody>
                    {aylik.planlananDetaylari.map(k => (
                      <tr key={k.etkinlikId}>
                        <td>{k.baslik}{k.kurumAdi ? <span className="text-muted small ms-1">({k.kurumAdi})</span> : ''}</td>
                        <td style={{ color: '#ffb300' }}>{k.planlananGunSayisi} gün</td>
                        <td>{fmt(k.gunlukFiyat)} ₺</td>
                        <td><strong style={{ color: '#ffb300' }}>{fmt(k.toplamGelir)} ₺</strong></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="table-light fw-bold">
                      <td colSpan={3}>Toplam</td>
                      <td><strong style={{ color: '#ffb300' }}>{fmt(aylikPlanlanan)} ₺</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Beklenen detay (yıllık — her zaman tüm yıl için) */}
          {beklenenDahil && yilBeklenenler.length > 0 && (
            <div className="card mb-4">
              <div className="card-header d-flex align-items-center gap-2">
                <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#f06292', display: 'inline-block' }} />
                <h6 className="mb-0">Beklenen Eğitim Detayları — {yil}</h6>
              </div>
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr><th>Eğitim</th><th>Kurum</th><th>Beklenen Gün</th><th>Günlük Fiyat</th><th>Potansiyel Gelir</th></tr>
                  </thead>
                  <tbody>
                    {yilBeklenenler.map(b => {
                      const gun = b.beklenenGunSayisi ?? 1
                      const gelir = gun * b.gunlukFiyat
                      return (
                        <tr key={b.id}>
                          <td><strong>{b.baslik}</strong></td>
                          <td className="text-muted small">{b.kurumAdi ?? '—'}</td>
                          <td style={{ color: '#f06292' }}>{gun} gün</td>
                          <td>{fmt(b.gunlukFiyat)} ₺</td>
                          <td><strong style={{ color: '#696cff' }}>{fmt(gelir)} ₺</strong></td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="table-light fw-bold">
                      <td colSpan={2}>Toplam</td>
                      <td style={{ color: '#f06292' }}>{toplamBeklenenGun} gün</td>
                      <td />
                      <td style={{ color: '#696cff' }}>{fmt(toplamBeklenenGelir)} ₺</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
