import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getKurumBazliRapor } from '../api/client'
import type { KurumYillikRapor } from '../api/client'

const AYLAR          = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']
const FALLBACK_RENK  = ['#696cff','#4caf50','#2196F3','#f06292','#00bcd4','#ff7043','#9c27b0','#607d8b','#8bc34a','#ff5722','#795548','#e91e63']

function fmt(v: number)   { return v.toLocaleString('tr-TR', { minimumFractionDigits: 0 }) }
function fmtTl(v: number) { return v.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }
function getRenk(r: KurumYillikRapor, i: number) { return r.renk ?? FALLBACK_RENK[i % FALLBACK_RENK.length] }

export function Raporlar() {
  const bugun = new Date()
  const [yil, setYil]                       = useState(bugun.getFullYear())
  const [raporlar, setRaporlar]             = useState<KurumYillikRapor[]>([])
  const [loading, setLoading]               = useState(false)
  const [hata, setHata]                     = useState<string | null>(null)
  const [planlananDahil, setPlanlananDahil] = useState(true)
  const [beklenenDahil, setBeklenenDahil]   = useState(true)

  useEffect(() => {
    setLoading(true); setHata(null)
    getKurumBazliRapor(yil)
      .then(setRaporlar)
      .catch(err => setHata(err instanceof Error ? err.message : 'Hata'))
      .finally(() => setLoading(false))
  }, [yil])

  const yillar = [bugun.getFullYear() - 1, bugun.getFullYear(), bugun.getFullYear() + 1]

  const toplamGun              = raporlar.reduce((s, r) => s + r.toplamGun, 0)
  const toplamGelir            = raporlar.reduce((s, r) => s + r.toplamGelir, 0)
  const planlananToplamGun     = raporlar.reduce((s, r) => s + (r.planlananToplamGun ?? 0), 0)
  const planlananToplamGelir   = raporlar.reduce((s, r) => s + (r.planlananToplamGelir ?? 0), 0)
  const beklenenToplamGun      = raporlar.reduce((s, r) => s + (r.beklenenToplamGun ?? 0), 0)
  const beklenenToplamGelir    = raporlar.reduce((s, r) => s + (r.beklenenToplamGelir ?? 0), 0)

  const gunPie = raporlar.map((r, i) => {
    const g = r.toplamGun
      + (planlananDahil ? (r.planlananToplamGun ?? 0) : 0)
      + (beklenenDahil  ? (r.beklenenToplamGun  ?? 0) : 0)
    return g > 0 ? { name: r.kurumAdi, value: g, fill: getRenk(r, i) } : null
  }).filter(Boolean) as { name: string; value: number; fill: string }[]

  const gelirPie = raporlar.map((r, i) => {
    const g = r.toplamGelir + (beklenenDahil ? (r.beklenenToplamGelir ?? 0) : 0)
    return g > 0 ? { name: r.kurumAdi, value: Number(g), fill: getRenk(r, i) } : null
  }).filter(Boolean) as { name: string; value: number; fill: string }[]

  // ── CSV export ───────────────────────────────────────────────────────────────
  function exportCSV() {
    const header = [
      'Kurum',
      ...AYLAR.map(a => `${a} Gün`),
      'Toplam Gün',
      ...(planlananDahil ? ['Planlanan Gün', 'Planlanan Gelir'] : []),
      ...(beklenenDahil  ? ['Beklenen Gün', 'Beklenen Gelir'] : []),
      'Toplam Gelir',
    ]
    const rows = raporlar.map(r => [
      r.kurumAdi,
      ...r.aylar.map(a => String(a.gunSayisi)),
      String(r.toplamGun),
      ...(planlananDahil ? [String(r.planlananToplamGun ?? 0), fmtTl(r.planlananToplamGelir ?? 0)] : []),
      ...(beklenenDahil  ? [String(r.beklenenToplamGun ?? 0), fmtTl(r.beklenenToplamGelir ?? 0)] : []),
      fmtTl(r.toplamGelir),
    ])
    const footer = [
      'Toplam',
      ...AYLAR.map((_, i) => String(raporlar.reduce((s, r) => s + (r.aylar[i]?.gunSayisi ?? 0), 0))),
      String(toplamGun),
      ...(planlananDahil ? [String(planlananToplamGun), fmtTl(planlananToplamGelir)] : []),
      ...(beklenenDahil  ? [String(beklenenToplamGun), fmtTl(beklenenToplamGelir)] : []),
      fmtTl(toplamGelir),
    ]
    const csv = [header, ...rows, footer]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `rapor-${yil}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── PDF export (yeni pencere + print) ───────────────────────────────────────
  function exportPDF() {
    const plH = planlananDahil ? '<th>Plan.Gün</th><th>Plan.Gelir</th>' : ''
    const bkH = beklenenDahil  ? '<th>Beklenen Gün</th><th>Beklenen Gelir</th>' : ''

    const tableRows = raporlar.map(r => `
      <tr>
        <td><b>${r.kurumAdi}</b></td>
        ${r.aylar.map(a => `<td>${a.gunSayisi > 0 ? a.gunSayisi + 'g' : '—'}</td>`).join('')}
        <td style="color:#4caf50"><b>${fmt(r.toplamGun)}</b></td>
        ${planlananDahil ? `<td style="color:#ffb300"><b>${fmt(r.planlananToplamGun ?? 0)}</b></td><td style="color:#ffb300">${fmtTl(r.planlananToplamGelir ?? 0)} ₺</td>` : ''}
        ${beklenenDahil  ? `<td style="color:#f06292"><b>${fmt(r.beklenenToplamGun ?? 0)}</b></td><td style="color:#f06292">${fmtTl(r.beklenenToplamGelir ?? 0)} ₺</td>` : ''}
        <td style="color:#696cff"><b>${fmtTl(r.toplamGelir)} ₺</b></td>
      </tr>`).join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Rapor ${yil}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:11px;margin:20px}
  h2{font-size:15px;margin-bottom:10px}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #ddd;padding:4px 6px;white-space:nowrap;text-align:center}
  th{background:#f5f5f5;font-weight:bold}
  td:first-child,th:first-child{text-align:left}
  tfoot td{background:#f0f0f0;font-weight:bold}
</style></head>
<body>
<h2>Kurum Bazlı Rapor — ${yil}</h2>
<table>
  <thead><tr>
    <th>Kurum</th>${AYLAR.map(a => `<th>${a}</th>`).join('')}
    <th>Top.Gün</th>${plH}${bkH}<th>Toplam Gelir</th>
  </tr></thead>
  <tbody>${tableRows}</tbody>
  <tfoot><tr>
    <td>Toplam</td>
    ${AYLAR.map((_, i) => `<td>${raporlar.reduce((s, r) => s + (r.aylar[i]?.gunSayisi ?? 0), 0)}g</td>`).join('')}
    <td>${fmt(toplamGun)}</td>
    ${planlananDahil ? `<td>${fmt(planlananToplamGun)}</td><td>${fmtTl(planlananToplamGelir)} ₺</td>` : ''}
    ${beklenenDahil  ? `<td>${fmt(beklenenToplamGun)}</td><td>${fmtTl(beklenenToplamGelir)} ₺</td>` : ''}
    <td>${fmtTl(toplamGelir)} ₺</td>
  </tr></tfoot>
</table>
</body></html>`

    const w = window.open('', '_blank', 'width=1200,height=800')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 400)
  }

  return (
    <>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h5 className="mb-0">Raporlar</h5>
          <p className="text-muted small mb-0">Şirket bazlı eğitim ve gelir analizi</p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">

          {/* Planlanan toggle */}
          <div className="d-flex gap-2 align-items-center border rounded px-2 py-1">
            <span className="small" style={{ color: '#ffb300', whiteSpace: 'nowrap' }}>■ Planlanan:</span>
            <div className="form-check form-check-inline mb-0">
              <input className="form-check-input" type="radio" id="pl-d" name="planlanan"
                checked={planlananDahil} onChange={() => setPlanlananDahil(true)} />
              <label className="form-check-label small" htmlFor="pl-d">Dahil</label>
            </div>
            <div className="form-check form-check-inline mb-0">
              <input className="form-check-input" type="radio" id="pl-h" name="planlanan"
                checked={!planlananDahil} onChange={() => setPlanlananDahil(false)} />
              <label className="form-check-label small" htmlFor="pl-h">Hariç</label>
            </div>
          </div>

          {/* Beklenen toggle */}
          <div className="d-flex gap-2 align-items-center border rounded px-2 py-1">
            <span className="small" style={{ color: '#f06292', whiteSpace: 'nowrap' }}>■ Beklenen:</span>
            <div className="form-check form-check-inline mb-0">
              <input className="form-check-input" type="radio" id="bk-d" name="beklenen"
                checked={beklenenDahil} onChange={() => setBeklenenDahil(true)} />
              <label className="form-check-label small" htmlFor="bk-d">Dahil</label>
            </div>
            <div className="form-check form-check-inline mb-0">
              <input className="form-check-input" type="radio" id="bk-h" name="beklenen"
                checked={!beklenenDahil} onChange={() => setBeklenenDahil(false)} />
              <label className="form-check-label small" htmlFor="bk-h">Hariç</label>
            </div>
          </div>

          <select className="form-select form-select-sm" style={{ width: 100 }}
            value={yil} onChange={e => setYil(Number(e.target.value))}>
            {yillar.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <div className="d-flex gap-1">
            <button className="btn btn-sm btn-outline-success" onClick={exportCSV}>
              <i className="ri ri-file-excel-line me-1" />Excel
            </button>
            <button className="btn btn-sm btn-outline-danger" onClick={exportPDF}>
              <i className="ri ri-file-pdf-line me-1" />PDF
            </button>
          </div>
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
              <div className="card h-100"><div className="card-body">
                <p className="text-muted small mb-1">Gerçekleşen Gün</p>
                <h4 className="mb-0" style={{ color: '#4caf50' }}>{fmt(toplamGun)} gün</h4>
              </div></div>
            </div>
            {planlananDahil && (
              <div className="col-sm-6 col-xl-3">
                <div className="card h-100"><div className="card-body">
                  <p className="text-muted small mb-1">Planlanan Gün</p>
                  <h4 className="mb-0" style={{ color: '#ffb300' }}>{fmt(planlananToplamGun)} gün</h4>
                </div></div>
              </div>
            )}
            {beklenenDahil && (
              <div className="col-sm-6 col-xl-3">
                <div className="card h-100"><div className="card-body">
                  <p className="text-muted small mb-1">Beklenen Gün</p>
                  <h4 className="mb-0" style={{ color: '#f06292' }}>{fmt(beklenenToplamGun)} gün</h4>
                  <small className="text-muted">{fmtTl(beklenenToplamGelir)} ₺ potansiyel</small>
                </div></div>
              </div>
            )}
            <div className="col-sm-6 col-xl-3">
              <div className="card h-100"><div className="card-body">
                <p className="text-muted small mb-1">Toplam Gelir ({yil})</p>
                <h4 className="mb-0" style={{ color: '#696cff' }}>
                  {fmtTl(toplamGelir + (planlananDahil ? planlananToplamGelir : 0) + (beklenenDahil ? beklenenToplamGelir : 0))} ₺
                </h4>
                <small className="text-muted">
                  {fmtTl(toplamGelir)} ₺ gerçekleşen
                  {planlananDahil && planlananToplamGelir > 0 && <> + {fmtTl(planlananToplamGelir)} ₺ plan</>}
                  {beklenenDahil  && beklenenToplamGelir  > 0 && <> + {fmtTl(beklenenToplamGelir)}  ₺ bek</>}
                </small>
              </div></div>
            </div>
          </div>

          {/* Pie charts */}
          <div className="row g-4 mb-4">
            <div className="col-lg-6">
              <div className="card h-100">
                <div className="card-header">
                  <h6 className="mb-0"><i className="ri ri-pie-chart-line me-1" />Kurum Bazlı Gün Dağılımı</h6>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={gunPie} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={100} innerRadius={45} paddingAngle={2}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {gunPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${fmt(v)} gün`, 'Gün']} />
                      <Legend formatter={v => <span style={{ fontSize: '0.78rem' }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="card h-100">
                <div className="card-header">
                  <h6 className="mb-0"><i className="ri ri-pie-chart-2-line me-1" />Kurum Bazlı Gelir Dağılımı</h6>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={gelirPie} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={100} innerRadius={45} paddingAngle={2}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {gelirPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${fmtTl(v)} ₺`, 'Gelir']} />
                      <Legend formatter={v => <span style={{ fontSize: '0.78rem' }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Yıllık Beklenen Gün bölümü */}
          {beklenenDahil && beklenenToplamGun > 0 && (
            <div className="card mb-4">
              <div className="card-header d-flex align-items-center gap-2">
                <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#f06292', display: 'inline-block' }} />
                <h6 className="mb-0">Yıllık Beklenen Eğitim Günleri — {yil}</h6>
              </div>
              <div className="table-responsive">
                <table className="table table-hover table-sm mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Kurum</th>
                      <th className="text-end">Beklenen Gün</th>
                      <th className="text-end">Ort. Günlük Fiyat</th>
                      <th className="text-end">Potansiyel Gelir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {raporlar.filter(r => (r.beklenenToplamGun ?? 0) > 0).map((r, ri) => (
                      <tr key={ri}>
                        <td>
                          <span style={{ display: 'inline-block', width: 10, height: 10,
                            borderRadius: 2, backgroundColor: getRenk(r, ri), marginRight: 6 }} />
                          <strong>{r.kurumAdi}</strong>
                        </td>
                        <td className="text-end" style={{ color: '#f06292' }}>
                          <strong>{fmt(r.beklenenToplamGun)} gün</strong>
                        </td>
                        <td className="text-end text-muted small">
                          {r.beklenenToplamGun > 0
                            ? fmtTl((r.beklenenToplamGelir ?? 0) / r.beklenenToplamGun)
                            : '—'} ₺/gün
                        </td>
                        <td className="text-end" style={{ color: '#696cff' }}>
                          <strong>{fmtTl(r.beklenenToplamGelir ?? 0)} ₺</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="table-light fw-bold">
                      <td>Toplam</td>
                      <td className="text-end" style={{ color: '#f06292' }}>{fmt(beklenenToplamGun)} gün</td>
                      <td />
                      <td className="text-end" style={{ color: '#696cff' }}>{fmtTl(beklenenToplamGelir)} ₺</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Pivot tablo */}
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0"><i className="ri ri-table-line me-1" />Ay × Kurum Pivot — {yil}</h6>
            </div>
            <div className="table-responsive">
              <table className="table table-hover table-sm mb-0" style={{ fontSize: '0.77rem', minWidth: 900 }}>
                <thead className="table-light">
                  <tr>
                    <th style={{ minWidth: 140, position: 'sticky', left: 0, background: 'inherit', zIndex: 1 }}>Kurum</th>
                    {AYLAR.map(a => (
                      <th key={a} className="text-center" style={{ minWidth: 66 }}>
                        <span className="d-block">{a}</span>
                        <span className="d-block text-muted fw-normal" style={{ fontSize: '0.6rem' }}>
                          g{planlananDahil ? '+p' : ''} / ₺
                        </span>
                      </th>
                    ))}
                    <th className="text-end" style={{ minWidth: 56 }}>Gün</th>
                    {planlananDahil && <th className="text-end" style={{ minWidth: 56, color: '#ffb300' }}>Plan.</th>}
                    {beklenenDahil  && <th className="text-end" style={{ minWidth: 56, color: '#f06292' }}>Bekl.</th>}
                    <th className="text-end" style={{ minWidth: 105 }}>Gelir</th>
                    {planlananDahil && <th className="text-end" style={{ minWidth: 105, color: '#ffb300' }}>Plan.Gelir</th>}
                    {beklenenDahil  && <th className="text-end" style={{ minWidth: 105, color: '#f06292' }}>Bek.Gelir</th>}
                  </tr>
                </thead>
                <tbody>
                  {raporlar.map((r, ri) => (
                    <tr key={ri}>
                      <td style={{ position: 'sticky', left: 0, background: 'var(--bs-body-bg,#fff)', zIndex: 1 }}>
                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2,
                          backgroundColor: getRenk(r, ri), marginRight: 6 }} />
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
                                  {g > 0 && p > 0 && <span className="text-muted" style={{ fontSize: '0.6rem', margin: '0 1px' }}>+</span>}
                                  {p > 0 && <span style={{ color: '#ffb300', fontWeight: 600 }}>{p}p</span>}
                                </span>
                                {(g > 0 || p > 0) && (
                                <span className="d-block text-muted" style={{ fontSize: '0.67rem' }}>
                                  {g > 0 && <span style={{ color: '#4caf50' }}>{fmt(a.toplamGelir)}₺</span>}
                                  {g > 0 && p > 0 && <span className="text-muted"> </span>}
                                  {p > 0 && <span style={{ color: '#ffb300' }}>{fmt(a.planlananGelir ?? 0)}₺</span>}
                                </span>
                              )}
                              </>
                            ) : <span className="text-muted">—</span>}
                          </td>
                        )
                      })}
                      <td className="text-end fw-bold" style={{ color: '#4caf50' }}>{fmt(r.toplamGun)}</td>
                      {planlananDahil && <td className="text-end fw-bold" style={{ color: '#ffb300' }}>{fmt(r.planlananToplamGun ?? 0)}</td>}
                      {beklenenDahil  && <td className="text-end fw-bold" style={{ color: '#f06292' }}>{fmt(r.beklenenToplamGun ?? 0)}</td>}
                      <td className="text-end fw-bold" style={{ color: '#696cff' }}>{fmtTl(r.toplamGelir)} ₺</td>
                      {planlananDahil && <td className="text-end" style={{ color: '#ffb300' }}>{fmtTl(r.planlananToplamGelir ?? 0)} ₺</td>}
                      {beklenenDahil  && <td className="text-end" style={{ color: '#f06292' }}>{fmtTl(r.beklenenToplamGelir ?? 0)} ₺</td>}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="table-light fw-bold">
                    <td style={{ position: 'sticky', left: 0, background: 'inherit', zIndex: 1 }}>Toplam</td>
                    {AYLAR.map((_, i) => {
                      const g  = raporlar.reduce((s, r) => s + (r.aylar[i]?.gunSayisi ?? 0), 0)
                      const p  = planlananDahil ? raporlar.reduce((s, r) => s + (r.aylar[i]?.planlananGun ?? 0), 0) : 0
                      const t  = raporlar.reduce((s, r) => s + (r.aylar[i]?.toplamGelir ?? 0), 0)
                      const tp = planlananDahil ? raporlar.reduce((s, r) => s + (r.aylar[i]?.planlananGelir ?? 0), 0) : 0
                      return (
                        <td key={i} className="text-center">
                          {g > 0 || p > 0 ? (
                            <>
                              <span className="d-block" style={{ lineHeight: 1.2 }}>
                                {g > 0 && <span style={{ color: '#4caf50' }}>{g}g</span>}
                                {g > 0 && p > 0 && <span className="text-muted" style={{ fontSize: '0.6rem', margin: '0 1px' }}>+</span>}
                                {p > 0 && <span style={{ color: '#ffb300' }}>{p}p</span>}
                              </span>
                              {(g > 0 || p > 0) && (
                                <span className="d-block text-muted" style={{ fontSize: '0.67rem' }}>
                                  {g > 0 && <span style={{ color: '#4caf50' }}>{fmt(t)}₺</span>}
                                  {g > 0 && p > 0 && ' '}
                                  {p > 0 && <span style={{ color: '#ffb300' }}>{fmt(tp)}₺</span>}
                                </span>
                              )}
                            </>
                          ) : <span className="text-muted">—</span>}
                        </td>
                      )
                    })}
                    <td className="text-end" style={{ color: '#4caf50' }}>{fmt(toplamGun)}</td>
                    {planlananDahil && <td className="text-end" style={{ color: '#ffb300' }}>{fmt(planlananToplamGun)}</td>}
                    {beklenenDahil  && <td className="text-end" style={{ color: '#f06292' }}>{fmt(beklenenToplamGun)}</td>}
                    <td className="text-end" style={{ color: '#696cff' }}>{fmtTl(toplamGelir)} ₺</td>
                    {planlananDahil && <td className="text-end" style={{ color: '#ffb300' }}>{fmtTl(planlananToplamGelir)} ₺</td>}
                    {beklenenDahil  && <td className="text-end" style={{ color: '#f06292' }}>{fmtTl(beklenenToplamGelir)} ₺</td>}
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
