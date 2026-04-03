import { useEffect, useState } from 'react'
import type { KurumYillikRapor } from '../api/client'

// ── Projeksiyon (equirectangular) ─────────────────────────────────────────────
const W = 720, H = 350
const LON_MIN = 25.5, LON_MAX = 45.8
const LAT_MAX = 42.5, LAT_MIN = 35.6

function prjX(lon: number) { return ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * W }
function prjY(lat: number) { return ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H }

// ── GeoJSON türleri ───────────────────────────────────────────────────────────
type Coord     = [number, number]
type Ring      = Coord[]
type PolygonG  = { type: 'Polygon';      coordinates: Ring[] }
type MultiPolG = { type: 'MultiPolygon'; coordinates: Ring[][] }
type Geometry  = PolygonG | MultiPolG

interface Feature {
  type: 'Feature'
  geometry: Geometry
  properties: { NAME_1: string; GID_1: string }
}
interface GeoJSON {
  type: 'FeatureCollection'
  features: Feature[]
}

// ── Ring → SVG path string ────────────────────────────────────────────────────
function ringToPath(ring: Ring): string {
  return ring.map(([lon, lat], i) =>
    `${i === 0 ? 'M' : 'L'} ${prjX(lon).toFixed(1)},${prjY(lat).toFixed(1)}`
  ).join(' ') + ' Z'
}

function geometryToPath(g: Geometry): string {
  if (g.type === 'Polygon') {
    return g.coordinates.map(ringToPath).join(' ')
  }
  return g.coordinates.map(rings => rings.map(ringToPath).join(' ')).join(' ')
}

// ── Centroid hesapla (label için) ─────────────────────────────────────────────
function centroid(g: Geometry): [number, number] {
  const ring = g.type === 'Polygon' ? g.coordinates[0]
    : g.coordinates.reduce((a, b) => a[0].length >= b[0].length ? a : b)[0]
  const n = ring.length
  const cx = ring.reduce((s, [lon]) => s + lon, 0) / n
  const cy = ring.reduce((s, [, lat]) => s + lat, 0) / n
  return [prjX(cx), prjY(cy)]
}

// ── Renk skalası ──────────────────────────────────────────────────────────────
function gunRengi(gun: number, maxGun: number): string {
  if (gun === 0) return '#f1f8f1'
  const t = Math.pow(gun / maxGun, 0.5) // sqrt skala: düşük değerlerde daha görünür
  // açık yeşil (l=80) → koyu yeşil (l=22)
  const l = Math.round(80 - t * 58)
  return `hsl(125, 65%, ${l}%)`
}
function yazıRengi(gun: number, maxGun: number): string {
  return maxGun > 0 && gun / maxGun > 0.45 ? '#fff' : '#2e7d32'
}

// ── İsim normalleştirme ───────────────────────────────────────────────────────
// ÖNEMLI: Önce Türkçe harfleri replace et, SONRA toLowerCase çağır.
// JS'te 'İ'.toLowerCase() → 'i̇' (2 karakter: i + combining dot) olabilir,
// bu yüzden önce replace yapmazsak eşleşme bozulur.
function norm(s: string): string {
  return s
    .replace(/İ/g, 'i').replace(/I/g, 'i')
    .replace(/Ğ/g, 'g').replace(/Ü/g, 'u')
    .replace(/Ş/g, 's').replace(/Ö/g, 'o').replace(/Ç/g, 'c')
    .toLowerCase()
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/â/g, 'a').trim()
}

// GADM NAME_1 → normalize → alias eşleşmeleri
const GADM_ALIAS: Record<string, string> = {
  'afyon karahisar':  'afyonkarahisar',
  'afyonkarahisar':   'afyonkarahisar',
  'k. maras':         'kahramanmaras',
  'kahraman maras':   'kahramanmaras',
  'kahramanmaras':    'kahramanmaras',
  'sanliurfa':        'sanliurfa',
  'sanli urfa':       'sanliurfa',
  'icel':             'mersin',
  'istanbul':         'istanbul',
  'izmir':            'izmir',
  'igdir':            'igdir',
  'mugla':            'mugla',
  'usak':             'usak',
}

function matchSehir(gadmName: string, userNames: string[]): string | null {
  const gNorm = GADM_ALIAS[norm(gadmName)] ?? norm(gadmName)
  for (const u of userNames) {
    const uNorm = norm(u)
    if (gNorm === uNorm) return u
    if (gNorm.startsWith(uNorm) || uNorm.startsWith(gNorm)) return u
  }
  return null
}

// ── Bileşen ───────────────────────────────────────────────────────────────────
interface Props { raporlar: KurumYillikRapor[] }
type Mod = 'gerceklesen' | 'planlanan' | 'tumu'

interface TooltipInfo {
  name: string
  g: number
  p: number
  mx: number
  my: number
}

export function TurkiyeHaritasi({ raporlar }: Props) {
  const [geoJson, setGeoJson] = useState<GeoJSON | null>(null)
  const [mod, setMod]         = useState<Mod>('tumu')
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)

  useEffect(() => {
    fetch('/turkey-provinces.json').then(r => r.json()).then(setGeoJson)
  }, [])

  // Tüm firmalardan şehir günlerini topla
  const sehirGunleri: Record<string, { g: number; p: number }> = {}
  for (const r of raporlar) {
    for (const a of r.aylar) {
      for (const s of a.sehirler ?? []) {
        if (!sehirGunleri[s.sehir]) sehirGunleri[s.sehir] = { g: 0, p: 0 }
        sehirGunleri[s.sehir].g += s.gun
      }
      for (const s of a.planlananSehirler ?? []) {
        if (!sehirGunleri[s.sehir]) sehirGunleri[s.sehir] = { g: 0, p: 0 }
        sehirGunleri[s.sehir].p += s.gun
      }
    }
  }

  const userSehirler = Object.keys(sehirGunleri)

  function aktifGun(g: number, p: number): number {
    if (mod === 'gerceklesen') return g
    if (mod === 'planlanan')   return p
    return g + p
  }

  const maxGun = Math.max(
    ...userSehirler.map(k => aktifGun(sehirGunleri[k].g, sehirGunleri[k].p)),
    1
  )

  const hicVeri = userSehirler.every(k => aktifGun(sehirGunleri[k].g, sehirGunleri[k].p) === 0)

  return (
    <div className="card mt-4">
      <div className="card-header d-flex align-items-center gap-3 flex-wrap">
        <h6 className="mb-0">
          <i className="ri ri-map-2-line me-1" />Türkiye Eğitim Haritası
        </h6>
        <div className="d-flex gap-1">
          {(['tumu', 'gerceklesen', 'planlanan'] as Mod[]).map(m => (
            <button
              key={m}
              className={`btn btn-sm ${mod === m ? 'btn-primary' : 'btn-outline-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '3px 10px' }}
              onClick={() => setMod(m)}
            >
              {m === 'tumu' ? 'Tümü' : m === 'gerceklesen' ? 'Gerçekleşen' : 'Planlanan'}
            </button>
          ))}
        </div>
      </div>

      <div className="card-body p-2" style={{ position: 'relative', userSelect: 'none' }}>
        {!geoJson ? (
          <div className="text-center py-5"><span className="spinner-border spinner-border-sm" /></div>
        ) : hicVeri ? (
          <div className="text-center py-4 text-muted">
            <i className="ri ri-map-pin-line" style={{ fontSize: 32 }} />
            <p className="mt-2 small">Eğitimlerde şehir bilgisi girilmemiş.</p>
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              style={{ width: '100%', display: 'block' }}
              onMouseLeave={() => setTooltip(null)}
            >
              <defs>
                <filter id="provShadow">
                  <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.15" />
                </filter>
              </defs>

              {geoJson.features.map(f => {
                const match   = matchSehir(f.properties.NAME_1, userSehirler)
                const data    = match ? sehirGunleri[match] : null
                const g       = data?.g ?? 0
                const p       = data?.p ?? 0
                const gun     = aktifGun(g, p)
                const fill    = gunRengi(gun, maxGun)
                const yazı    = yazıRengi(gun, maxGun)
                const d       = geometryToPath(f.geometry)
                const [cx,cy] = centroid(f.geometry)
                const label   = gun > 0 ? `${gun}g` : null

                return (
                  <g
                    key={f.properties.GID_1}
                    onMouseEnter={e => setTooltip({
                      name: f.properties.NAME_1,
                      g, p,
                      mx: e.clientX, my: e.clientY,
                    })}
                    onMouseLeave={() => setTooltip(null)}
                    style={{ cursor: gun > 0 ? 'pointer' : 'default' }}
                  >
                    <path
                      d={d}
                      fill={fill}
                      stroke="#fff"
                      strokeWidth={0.8}
                      filter="url(#provShadow)"
                    />
                    {label && (
                      <>
                        {/* Arka plan kutusu — küçük illerde okunabilirlik için */}
                        <rect
                          x={cx - 14} y={cy - 8}
                          width={28} height={15}
                          rx={3}
                          fill={gun / maxGun > 0.45 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.55)'}
                          style={{ pointerEvents: 'none' }}
                        />
                        <text
                          x={cx} y={cy + 1}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={10}
                          fontWeight="700"
                          fill={yazı}
                          style={{ pointerEvents: 'none' }}
                        >
                          {label}
                        </text>
                      </>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* Renk skalası */}
            <div className="d-flex align-items-center gap-1 mt-1 px-2 flex-wrap">
              <span style={{ fontSize: '0.72rem', color: '#666' }}>Az</span>
              {[0.05, 0.2, 0.4, 0.6, 0.8, 1.0].map(t => (
                <div key={t} style={{
                  width: 22, height: 11, borderRadius: 2,
                  background: gunRengi(t * maxGun, maxGun),
                  border: '1px solid #ccc',
                }} />
              ))}
              <span style={{ fontSize: '0.72rem', color: '#666' }}>Çok ({maxGun} gün)</span>
              <span style={{ fontSize: '0.72rem', color: '#aaa', marginLeft: 8 }}>
                Boş iller: yok/şehir girilmemiş
              </span>
            </div>
          </>
        )}
      </div>

      {/* Tooltip — fixed position, mouse takipli */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.mx + 14,
          top: tooltip.my - 10,
          background: '#fff',
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: '8px 14px',
          pointerEvents: 'none',
          zIndex: 9999,
          boxShadow: '0 3px 12px rgba(0,0,0,0.18)',
          fontSize: '0.83rem',
          minWidth: 140,
        }}>
          <strong style={{ display: 'block', marginBottom: 4 }}>{tooltip.name}</strong>
          {tooltip.g > 0 && <div style={{ color: '#2e7d32' }}>● Gerçekleşen: <b>{tooltip.g} gün</b></div>}
          {tooltip.p > 0 && <div style={{ color: '#f57f17' }}>● Planlanan: <b>{tooltip.p} gün</b></div>}
          {tooltip.g === 0 && tooltip.p === 0 && <div className="text-muted">Eğitim yok</div>}
          {(tooltip.g > 0 || tooltip.p > 0) && (
            <div style={{ color: '#1565c0', marginTop: 2, fontWeight: 600 }}>
              Toplam: {tooltip.g + tooltip.p} gün
            </div>
          )}
        </div>
      )}
    </div>
  )
}
