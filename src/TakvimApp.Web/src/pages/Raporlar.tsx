import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getKurumBazliRapor } from '../api/client'
import type { KurumYillikRapor } from '../api/client'

const AYLAR  = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']
const RENKLER = ['#696cff','#4caf50','#2196F3','#f06292','#00bcd4','#ff7043','#9c27b0','#607d8b','#8bc34a','#ff5722','#795548','#e91e63']

function fmt(v: number)   { return v.toLocaleString('tr-TR', { minimumFractionDigits: 0 }) }
function fmtTl(v: number) { return v.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }

export function Raporlar() {
  const bugun = new Date()
  const [yil, setYil]                   = useState(bugun.getFullYear())
  const [raporlar, setRaporlar]         = useState<KurumYillikRapor[]>([])
  const [loading, setLoading]           = useState(false)
  const [hata, setHata]                 = useState<string | null>(null)
  const [planlananDahil, setPlanlananDahil] = useState(true)   // default: dahil

  useEffect(() => {
    setLoading(true); setHata(null)
    getKurumBazliRapor(yil)
      .then(setRaporlar)
      .catch(err => setHata(err instanceof Error ? err.message : 'Hata'))
      .finally(() => setLoading(false))
  }, [yil])

  const yillar = [bugun.getFullYear() - 1, bugun.getFullYear(), bugun.getFullYear() + 1]

  const toplamGun          = raporlar.reduce((s, r) => s + r.toplamGun, 0)
  const toplamGelir        = raporlar.reduce((s, r) => s + r.toplamGelir, 0)
  const planlananToplamGun = raporlar.reduce((s, r) => s + (r.planlananToplamGun ?? 0), 0)

  // Pie verisi: planlanan dahil ise toplam günde planlanan da var
  const gunPie = raporlar
    .map((r, i) => {
      const g = r.toplamGun + (planlananDahil ? (r.planlananToplamGun ?? 0) : 0)
      return g > 0 ? { name: r.kurumAdi, value: g, fill: RENKLER[i % RENKLER.length] } : null
    })
    .filter(Boolean) as { name: string; value: number; fill: string }[]

  const gelirPie = raporlar
    .filter(r => r.toplamGelir > 0)
    .map((r, i) => ({ name: r.kurumAdi, value: Number(r.toplamGelir), fill: RENKLER[i % RENKLER.length] }))

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h5 className="mb-0">Raporlar</h5>
          <p className="text-muted small mb-0">Şirket bazlı eğitim ve gelir analizi</p>
        </div>
        <div className="d-flex align-items-center gap-3">
          {/* Planlanan toggle */}
          <div className="d-flex gap-3 align-items-center">
            <span className="small fw-semibold text-muted">Planlanan:</span>
            <div className="form-check form-check-inline mb-0">
              <input className="form-check-input" type="radio" id="pl-dahil" name="planlanan"
                checked={planlananDahil} onChange={() => setPlanlananDahil(true)} />
              <label className="form-check-label small" htmlFor="pl-dahil">Dahil</label>
            </div>
            <div className="form-check form-check-inline mb-0">
              <input className="form-check-input" type="radio" id="pl-haric" name="planlanan"
                checked={!planlananDahil} onChange={() => setPlanlananDahil(false)} />
              <label className="form-check-label small" htmlFor="pl-haric">Hariç</label>
            </div>
          </div>
          <select className="form-select form-select-sm" style={{ width: 100 }}
            value={yil} onChange={e => setYil(Number(e.target.value))}>
            {yillar.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {hata && <div className="alert alert-danger py-2">{hata}</div>}

      {loading ? (
        <div className="text-center py-5"><span className="spinner-border text-primary" /></div>
      ) : raporlar.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="ri ri-bar-chart-line" style={{ fontSize: 48 }} />
          <p className="mt-2">Bu yıl için veri bulunamadı.</p>
        </div>
      ) : (
        <>
          {/* Özet kartlar */}
          <div className="row g-3 mb-4">
            <div className="col-sm-6 col-xl-3">
              <div className="card h-100">
                <div className="card-body">
                  <p className="text-muted small mb-1">Gerçekleşen Eğitim Günü</p>
                  <h4 className="mb-0" style={{ color: '#4caf50' }}>{fmt(toplamGun)} gün</h4>
                </div>
              </div>
            </div>
            {planlananDahil && (
              <div className="col-sm-6 col-xl-3">
                <div className="card h-100">
                  <div className="card-body">
                    <p className="text-muted small mb-1">Planlanan Eğitim Günü</p>
                    <h4 className="mb-0" style={{ color: '#ffb300' }}>{fmt(planlananToplamGun)} gün</h4>
                  </div>
                </div>
              </div>
            )}
            <div className="col-sm-6 col-xl-3">
              <div className="card h-100">
                <div className="card-body">
                  <p className="text-muted small mb-1">Toplam Gelir ({yil})</p>
                  <h4 className="mb-0" style={{ color: '#696cff' }}>{fmtTl(toplamGelir)} ₺</h4>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-xl-3">
              <div className="card h-100">
                <div className="card-body">
                  <p className="text-muted small mb-1">Firma Sayısı</p>
                  <h4 className="mb-0" style={{ color: '#2196F3' }}>{raporlar.length}</h4>
                </div>
              </div>
            </div>
          </div>

          {/* Pie charts */}
          <div className="row g-4 mb-4">
            <div className="col-lg-6">
              <div className="card h-100">
                <div className="card-header">
                  <h6 className="mb-0">
                    <i className="ri ri-pie-chart-line me-1" />
                    Kurum Bazlı Gün Dağılımı
                    {planlananDahil && <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '0.68rem' }}>+ planlanan</span>}
                  </h6>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={gunPie} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={110} innerRadius={50}
                        paddingAngle={2}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {gunPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${fmt(v)} gün`, 'Gün']} />
                      <Legend formatter={(v) => <span style={{ fontSize: '0.8rem' }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="card h-100">
                <div className="card-header">
                  <h6 className="mb-0"><i className="ri ri-pie-chart-2-line me-1" />Kurum Bazlı Gelir Dağılımı (Gider Dahil)</h6>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={gelirPie} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={110} innerRadius={50}
                        paddingAngle={2}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {gelirPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${fmtTl(v)} ₺`, 'Gelir']} />
                      <Legend formatter={(v) => <span style={{ fontSize: '0.8rem' }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Pivot tablo */}
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0"><i className="ri ri-table-line me-1" />Ay × Kurum Pivot Tablosu — {yil}</h6>
            </div>
            <div className="table-responsive">
              <table className="table table-hover table-sm mb-0" style={{ fontSize: '0.78rem', minWidth: 900 }}>
                <thead className="table-light">
                  <tr>
                    <th style={{ minWidth: 140, position: 'sticky', left: 0, background: 'inherit', zIndex: 1 }}>Kurum</th>
                    {AYLAR.map(a => (
                      <th key={a} className="text-center" style={{ minWidth: 72 }}>
                        <span className="d-block">{a}</span>
                        <span className="d-block text-muted fw-normal" style={{ fontSize: '0.68rem' }}>
                          {planlananDahil ? 'g+p / ₺' : 'gün / ₺'}
                        </span>
                      </th>
                    ))}
                    <th className="text-end" style={{ minWidth: 80 }}>Top. Gün</th>
                    {planlananDahil && <th className="text-end" style={{ minWidth: 80, color: '#ffb300' }}>Planlanan</th>}
                    <th className="text-end" style={{ minWidth: 110 }}>Toplam Gelir</th>
                  </tr>
                </thead>
                <tbody>
                  {raporlar.map((r, ri) => (
                    <tr key={ri}>
                      <td style={{ position: 'sticky', left: 0, background: 'var(--bs-body-bg, #fff)', zIndex: 1 }}>
                        <span style={{
                          display: 'inline-block', width: 10, height: 10, borderRadius: 2,
                          backgroundColor: RENKLER[ri % RENKLER.length], marginRight: 6,
                        }} />
                        <strong>{r.kurumAdi}</strong>
                      </td>
                      {r.aylar.map(a => {
                        const g = a.gunSayisi
                        const p = planlananDahil ? (a.planlananGun ?? 0) : 0
                        return (
                          <td key={a.ay} className="text-center" style={{ verticalAlign: 'middle' }}>
                            {g > 0 || p > 0 ? (
                              <>
                                <span className="d-block" style={{ lineHeight: 1.2 }}>
                                  {g > 0 && <span style={{ color: '#4caf50', fontWeight: 600 }}>{g}g</span>}
                                  {g > 0 && p > 0 && <span className="text-muted mx-1" style={{ fontSize: '0.65rem' }}>+</span>}
                                  {p > 0 && <span style={{ color: '#ffb300', fontWeight: 600 }}>{p}p</span>}
                                </span>
                                {g > 0 && (
                                  <span className="d-block text-muted" style={{ fontSize: '0.7rem' }}>{fmt(a.toplamGelir)}₺</span>
                                )}
                              </>
                            ) : <span className="text-muted">—</span>}
                          </td>
                        )
                      })}
                      <td className="text-end fw-bold" style={{ color: '#4caf50' }}>{fmt(r.toplamGun)}</td>
                      {planlananDahil && (
                        <td className="text-end fw-bold" style={{ color: '#ffb300' }}>{fmt(r.planlananToplamGun ?? 0)}</td>
                      )}
                      <td className="text-end fw-bold" style={{ color: '#696cff' }}>{fmtTl(r.toplamGelir)} ₺</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="table-light fw-bold">
                    <td style={{ position: 'sticky', left: 0, background: 'inherit', zIndex: 1 }}>Toplam</td>
                    {AYLAR.map((_, i) => {
                      const g = raporlar.reduce((s, r) => s + (r.aylar[i]?.gunSayisi ?? 0), 0)
                      const p = planlananDahil ? raporlar.reduce((s, r) => s + (r.aylar[i]?.planlananGun ?? 0), 0) : 0
                      const t = raporlar.reduce((s, r) => s + (r.aylar[i]?.toplamGelir ?? 0), 0)
                      return (
                        <td key={i} className="text-center">
                          {g > 0 || p > 0 ? (
                            <>
                              <span className="d-block" style={{ lineHeight: 1.2 }}>
                                {g > 0 && <span style={{ color: '#4caf50' }}>{g}g</span>}
                                {g > 0 && p > 0 && <span className="text-muted mx-1" style={{ fontSize: '0.65rem' }}>+</span>}
                                {p > 0 && <span style={{ color: '#ffb300' }}>{p}p</span>}
                              </span>
                              {g > 0 && <span className="d-block text-muted" style={{ fontSize: '0.7rem' }}>{fmt(t)}₺</span>}
                            </>
                          ) : <span className="text-muted">—</span>}
                        </td>
                      )
                    })}
                    <td className="text-end" style={{ color: '#4caf50' }}>{fmt(toplamGun)}</td>
                    {planlananDahil && <td className="text-end" style={{ color: '#ffb300' }}>{fmt(planlananToplamGun)}</td>}
                    <td className="text-end" style={{ color: '#696cff' }}>{fmtTl(toplamGelir)} ₺</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )
}
