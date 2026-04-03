import { useState } from 'react'
import type { KurumYillikRapor } from '../api/client'

// ── Projeksiyon ───────────────────────────────────────────────────────────────
const W = 800, H = 420
const LON_MIN = 25.5, LON_MAX = 45.8
const LAT_MIN = 35.6, LAT_MAX = 42.6

function prj(lon: number, lat: number): [number, number] {
  return [
    Math.round(((lon - LON_MIN) / (LON_MAX - LON_MIN)) * W),
    Math.round(((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H),
  ]
}

// ── Türkiye ana hattı (yaklaşık, saat yönü, NW'den başlayarak) ───────────────
const pts: [number, number][] = [
  // Trakya NW → Ege kıyısı
  [26.0, 42.0], [26.0, 41.8], [25.9, 41.5], [26.0, 41.0],
  [26.2, 40.8], [26.4, 40.5], [26.1, 40.0], [26.3, 39.5],
  [26.7, 39.0], [26.7, 38.5], [26.8, 38.0], [27.0, 37.6],
  [27.4, 37.0], [27.5, 36.8],
  // Ege-Akdeniz kıyısı
  [28.2, 36.7], [28.9, 36.5], [29.6, 36.4], [30.0, 36.2],
  [30.6, 36.1], [31.2, 36.2], [32.0, 36.2], [33.2, 36.0],
  [34.6, 36.1], [35.1, 36.1], [35.8, 36.1], [36.2, 36.0],
  [36.6, 36.4],
  // Güneydoğu sınırı (Suriye-Irak)
  [37.0, 36.7], [37.5, 37.0], [38.1, 37.1], [38.7, 37.1],
  [39.5, 37.1], [40.4, 37.1], [41.0, 37.2], [41.8, 37.2],
  [42.3, 37.1], [43.0, 37.1], [43.7, 37.3],
  // İran sınırı (kuzey)
  [44.1, 37.6], [44.3, 38.2], [44.5, 38.9], [44.8, 39.7],
  [45.0, 40.0], [45.5, 40.6],
  // Gürcistan-Ermenistan sınırı
  [45.2, 41.1], [44.4, 41.5], [43.5, 41.6], [43.0, 41.5],
  [42.0, 41.5], [41.5, 41.5],
  // Karadeniz kıyısı (doğudan batıya)
  [40.5, 41.1], [39.5, 41.1], [38.5, 40.7],
  [37.5, 41.2], [36.5, 41.8], [35.5, 42.1], [34.5, 42.0],
  [33.0, 42.0], [32.5, 41.9], [31.5, 41.6],
  [31.2, 41.4], [30.5, 41.2], [30.0, 41.1],
  [29.5, 41.1], [29.1, 41.3],
  // Marmara / İstanbul / Boğaz
  [28.9, 41.1], [28.4, 41.0], [28.0, 40.8],
  [27.5, 40.7], [27.1, 40.9], [26.8, 41.1],
  [26.6, 41.5], [26.4, 41.8], [26.2, 42.0],
].map(([lon, lat]) => prj(lon, lat))

const OUTLINE_PATH = 'M ' + pts.map(([x, y]) => `${x},${y}`).join(' L ') + ' Z'

// ── İl merkezleri (lon, lat) ──────────────────────────────────────────────────
const IL_KOORDINAT: Record<string, [number, number]> = {
  'Adana':            [35.32, 37.00], 'Adıyaman':         [38.28, 37.76],
  'Afyonkarahisar':   [30.54, 38.76], 'Afyon':            [30.54, 38.76],
  'Ağrı':             [43.05, 39.72], 'Amasya':           [35.83, 40.65],
  'Ankara':           [32.85, 39.92], 'Antalya':          [30.70, 36.88],
  'Artvin':           [41.82, 41.18], 'Aydın':            [27.84, 37.84],
  'Balıkesir':        [27.88, 39.65], 'Bilecik':          [30.07, 40.15],
  'Bingöl':           [40.50, 38.88], 'Bitlis':           [42.10, 38.40],
  'Bolu':             [31.60, 40.73], 'Burdur':           [30.29, 37.72],
  'Bursa':            [29.06, 40.18], 'Çanakkale':        [26.41, 40.14],
  'Çankırı':          [33.62, 40.60], 'Çorum':            [34.96, 40.55],
  'Denizli':          [29.09, 37.77], 'Diyarbakır':       [40.23, 37.91],
  'Edirne':           [26.56, 41.68], 'Elazığ':           [39.22, 38.68],
  'Erzincan':         [39.49, 39.74], 'Erzurum':          [41.27, 39.91],
  'Eskişehir':        [30.52, 39.78], 'Gaziantep':        [37.38, 37.06],
  'Giresun':          [38.39, 40.91], 'Gümüşhane':        [39.48, 40.46],
  'Hakkari':          [43.74, 37.57], 'Hatay':            [36.16, 36.40],
  'Isparta':          [30.55, 37.76], 'Mersin':           [34.64, 36.81],
  'İçel':             [34.64, 36.81], 'İstanbul':         [29.01, 41.01],
  'Istanbul':         [29.01, 41.01], 'İzmir':            [27.14, 38.42],
  'Izmir':            [27.14, 38.42], 'Kars':             [43.09, 40.61],
  'Kastamonu':        [33.78, 41.38], 'Kayseri':          [35.49, 38.72],
  'Kırklareli':       [27.22, 41.73], 'Kırşehir':         [34.16, 39.14],
  'Kocaeli':          [29.92, 40.77], 'Konya':            [32.49, 37.87],
  'Kütahya':          [29.98, 39.42], 'Malatya':          [38.33, 38.35],
  'Manisa':           [27.43, 38.61], 'Kahramanmaraş':    [36.94, 37.59],
  'Mardin':           [40.74, 37.31], 'Muğla':            [28.36, 37.22],
  'Muş':              [41.50, 38.74], 'Nevşehir':         [34.72, 38.62],
  'Niğde':            [34.68, 37.97], 'Ordu':             [37.88, 40.98],
  'Rize':             [40.52, 41.02], 'Sakarya':          [30.69, 40.76],
  'Samsun':           [36.33, 41.29], 'Siirt':            [41.94, 37.93],
  'Sinop':            [35.15, 42.03], 'Sivas':            [37.02, 39.75],
  'Tekirdağ':         [27.51, 40.98], 'Tokat':            [36.56, 40.31],
  'Trabzon':          [39.73, 40.98], 'Tunceli':          [39.55, 39.11],
  'Şanlıurfa':        [38.80, 37.16], 'Urfa':             [38.80, 37.16],
  'Uşak':             [29.41, 38.68], 'Van':              [43.38, 38.49],
  'Yozgat':           [34.81, 39.82], 'Zonguldak':        [31.79, 41.45],
  'Aksaray':          [34.03, 38.37], 'Bayburt':          [40.26, 40.26],
  'Karaman':          [33.22, 37.18], 'Kırıkkale':        [33.51, 39.85],
  'Batman':           [41.13, 37.88], 'Şırnak':           [42.46, 37.52],
  'Bartın':           [32.34, 41.64], 'Ardahan':          [42.70, 41.11],
  'Iğdır':            [44.04, 39.89], 'Yalova':           [29.27, 40.66],
  'Karabük':          [32.62, 41.20], 'Kilis':            [37.12, 36.72],
  'Osmaniye':         [36.25, 37.07], 'Düzce':            [31.16, 40.84],
}

function normalizeSehir(s: string): string {
  return s
    .toLowerCase()
    .replace(/ı/g, 'i').replace(/İ/g, 'i')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o')
    .replace(/ç/g, 'c').replace(/â/g, 'a')
    .trim()
}

// Normalleştirilmiş isim → orijinal key
const NORM_MAP: Record<string, string> = {}
for (const k of Object.keys(IL_KOORDINAT)) {
  NORM_MAP[normalizeSehir(k)] = k
}

function getKoordinat(sehir: string): [number, number] | null {
  const norm = normalizeSehir(sehir)
  // Doğrudan eşleşme
  if (IL_KOORDINAT[sehir]) return IL_KOORDINAT[sehir]
  // Normalleştirilmiş eşleşme
  const key = NORM_MAP[norm]
  if (key) return IL_KOORDINAT[key]
  // Kısmi eşleşme (girilmiş isim, kayıtlı isme dahilse)
  for (const [k, v] of Object.entries(IL_KOORDINAT)) {
    if (normalizeSehir(k).startsWith(norm) || norm.startsWith(normalizeSehir(k))) return v
  }
  return null
}

function gunRengi(gun: number, maxGun: number): string {
  if (gun === 0 || maxGun === 0) return '#e8f5e9'
  const t = Math.sqrt(gun / maxGun)
  const l = Math.round(72 - t * 48) // 72% → 24%
  return `hsl(122, 55%, ${l}%)`
}

function yazıRengi(gun: number, maxGun: number): string {
  if (maxGun === 0) return '#333'
  return gun / maxGun > 0.5 ? '#fff' : '#1b5e20'
}

// ── Bileşen ───────────────────────────────────────────────────────────────────
interface TurkiyeHaritasiProps {
  raporlar: KurumYillikRapor[]
}

type GosterimModu = 'gerceklesen' | 'planlanan' | 'tumu'

export function TurkiyeHaritasi({ raporlar }: TurkiyeHaritasiProps) {
  const [mod, setMod] = useState<GosterimModu>('gerceklesen')
  const [tooltip, setTooltip] = useState<{ sehir: string; g: number; p: number; x: number; y: number } | null>(null)

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

  // Mod'a göre aktif gün sayısı
  function aktifGun(g: number, p: number): number {
    if (mod === 'gerceklesen') return g
    if (mod === 'planlanan')   return p
    return g + p
  }

  const gosterilenler = Object.entries(sehirGunleri)
    .map(([sehir, { g, p }]) => ({ sehir, g, p, gun: aktifGun(g, p) }))
    .filter(e => e.gun > 0)

  const maxGun = Math.max(...gosterilenler.map(e => e.gun), 1)

  // Hiç şehir verisi yoksa boş mesaj
  const hicVeri = gosterilenler.length === 0

  return (
    <div className="card mt-4">
      <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
        <h6 className="mb-0">
          <i className="ri ri-map-2-line me-1" />Türkiye Eğitim Haritası
        </h6>
        <div className="d-flex gap-1">
          {(['gerceklesen', 'planlanan', 'tumu'] as GosterimModu[]).map(m => (
            <button
              key={m}
              className={`btn btn-sm ${mod === m ? 'btn-primary' : 'btn-outline-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '3px 10px' }}
              onClick={() => setMod(m)}
            >
              {m === 'gerceklesen' ? 'Gerçekleşen' : m === 'planlanan' ? 'Planlanan' : 'Tümü'}
            </button>
          ))}
        </div>
      </div>

      <div className="card-body p-2" style={{ position: 'relative' }}>
        {hicVeri ? (
          <div className="text-center py-4 text-muted">
            <i className="ri ri-map-pin-line" style={{ fontSize: 32 }} />
            <p className="mt-2 small">Eğitimlerde şehir bilgisi girilmemiş.</p>
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              style={{ width: '100%', maxHeight: 420, display: 'block' }}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Türkiye ana hattı */}
              <path
                d={OUTLINE_PATH}
                fill="#f0f4f0"
                stroke="#b0c4b0"
                strokeWidth={1.5}
              />

              {/* Şehir daireleri */}
              {gosterilenler.map(({ sehir, g, p, gun }) => {
                const koord = getKoordinat(sehir)
                if (!koord) return null
                const [x, y] = prj(...koord)
                const r = Math.max(14, Math.min(36, 10 + Math.sqrt(gun) * 3.5))
                const fill  = gunRengi(gun, maxGun)
                const yazı  = yazıRengi(gun, maxGun)
                return (
                  <g
                    key={sehir}
                    onMouseEnter={() => setTooltip({ sehir, g, p, x, y })}
                    onMouseLeave={() => setTooltip(null)}
                    style={{ cursor: 'default' }}
                  >
                    <circle
                      cx={x} cy={y} r={r}
                      fill={fill}
                      stroke={yazı === '#fff' ? 'rgba(0,0,0,0.2)' : '#4caf50'}
                      strokeWidth={1}
                    />
                    <text
                      x={x} y={y - 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={Math.max(8, Math.min(11, r * 0.55))}
                      fontWeight="700"
                      fill={yazı}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {gun}g
                    </text>
                    {r >= 20 && (
                      <text
                        x={x} y={y + r + 9}
                        textAnchor="middle"
                        fontSize={9}
                        fill="#444"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {sehir}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* Renk skalası */}
            <div className="d-flex align-items-center gap-1 mt-1 px-2">
              <span style={{ fontSize: '0.72rem', color: '#666' }}>Az</span>
              {[0.1, 0.25, 0.45, 0.65, 0.85, 1.0].map(t => (
                <div
                  key={t}
                  style={{
                    width: 20, height: 10, borderRadius: 2,
                    background: gunRengi(t * maxGun, maxGun),
                    border: '1px solid #ccc',
                  }}
                />
              ))}
              <span style={{ fontSize: '0.72rem', color: '#666' }}>Çok</span>
              <span style={{ fontSize: '0.72rem', color: '#999', marginLeft: 8 }}>
                Maks: {maxGun} gün
              </span>
            </div>
          </>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: '8px 12px',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontSize: '0.82rem',
            transform: 'translate(10px, 10px)',
          }}
        >
          <strong>{tooltip.sehir}</strong>
          <div style={{ color: '#4caf50' }}>Gerçekleşen: {tooltip.g} gün</div>
          {tooltip.p > 0 && <div style={{ color: '#ffb300' }}>Planlanan: {tooltip.p} gün</div>}
          {tooltip.g + tooltip.p > 0 && (
            <div style={{ color: '#696cff', fontWeight: 600 }}>Toplam: {tooltip.g + tooltip.p} gün</div>
          )}
        </div>
      )}
    </div>
  )
}
