import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getAylikGelir, getYillikGelir } from '../api/client'
import type { AylikGelir } from '../api/client'

const AYLAR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']

export function Gelir() {
  const bugun    = new Date()
  const [yil, setYil]     = useState(bugun.getFullYear())
  const [ay, setAy]       = useState(bugun.getMonth() + 1)
  const [aylik, setAylik] = useState<AylikGelir | null>(null)
  const [yillik, setYillik] = useState<AylikGelir[]>([])
  const [loading, setLoading] = useState(false)
  const [hata, setHata] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setHata(null)
    Promise.all([getAylikGelir(ay, yil), getYillikGelir(yil)])
      .then(([a, y]) => { setAylik(a); setYillik(y) })
      .catch(err => setHata(err instanceof Error ? err.message : 'Hata'))
      .finally(() => setLoading(false))
  }, [ay, yil])

  const grafikVeri = yillik.map(a => ({
    ay: AYLAR[a.ay - 1],
    gelir: a.toplamGelir,
  }))

  const yillar = [bugun.getFullYear() - 1, bugun.getFullYear(), bugun.getFullYear() + 1]

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h5 className="mb-0">Gelir Takibi</h5>
          <p className="text-muted small mb-0">Gerçekleşen eğitimlerden hesaplanan gelir</p>
        </div>
        <div className="d-flex gap-2">
          <select className="form-select form-select-sm" value={ay} onChange={e => setAy(Number(e.target.value))} style={{ width: 120 }}>
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
            <div className="col-sm-6 col-xl-4">
              <div className="card h-100">
                <div className="card-body">
                  <p className="text-muted small mb-1">Aylık Gerçekleşen Gelir</p>
                  <h4 className="mb-0" style={{ color: '#4caf50' }}>
                    {(aylik?.etkinlikDetaylari.reduce((s, k) => s + k.toplamGelir, 0) ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </h4>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-xl-4">
              <div className="card h-100">
                <div className="card-body">
                  <p className="text-muted small mb-1">Aylık Beklenen Gelir</p>
                  <h4 className="mb-0" style={{ color: '#f06292' }}>
                    {(aylik?.beklenenDetaylari.reduce((s, k) => s + k.toplamGelir, 0) ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </h4>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-xl-4">
              <div className="card h-100">
                <div className="card-body">
                  <p className="text-muted small mb-1">Aylık Toplam</p>
                  <h4 className="mb-0" style={{ color: '#696cff' }}>
                    {(aylik?.toplamGelir ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
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
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString('tr-TR')} ₺`, 'Gelir']} />
                  <Bar dataKey="gelir" fill="#696cff" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detay tabloları */}
          {aylik && aylik.etkinlikDetaylari.length > 0 && (
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
                        <td>{k.baslik}</td>
                        <td>{k.tamamlananGunSayisi} gün</td>
                        <td>{k.gunlukFiyat.toLocaleString('tr-TR')} ₺</td>
                        <td>{k.masraf > 0 ? `${k.masraf.toLocaleString('tr-TR')} ₺` : '—'}</td>
                        <td><strong>{k.toplamGelir.toLocaleString('tr-TR')} ₺</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {aylik && aylik.beklenenDetaylari.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Beklenen Eğitim Detayları — {AYLAR[ay - 1]} {yil}</h6>
              </div>
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr><th>Eğitim</th><th>Gün</th><th>Günlük Fiyat</th><th>Toplam</th></tr>
                  </thead>
                  <tbody>
                    {aylik.beklenenDetaylari.map(k => (
                      <tr key={k.egitimId}>
                        <td>{k.baslik}</td>
                        <td>{k.toplamGunSayisi} gün</td>
                        <td>{k.gunlukFiyat.toLocaleString('tr-TR')} ₺</td>
                        <td><strong>{k.toplamGelir.toLocaleString('tr-TR')} ₺</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
