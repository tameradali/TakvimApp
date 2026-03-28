const API = import.meta.env.VITE_API_URL ?? ''

// ── Auth helpers ──────────────────────────────────────────────────────────────
export function getToken(): string | null { return localStorage.getItem('takvimapp_token') }
export function setToken(t: string): void { localStorage.setItem('takvimapp_token', t) }
export function removeToken(): void       { localStorage.removeItem('takvimapp_token') }

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch(path: string, opts?: RequestInit): Promise<Response> {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(opts?.headers ?? {}) }
  })
  return r
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface LoginRequest  { kullaniciAdi: string; sifre: string }
export interface LoginResponse { token: string; kullaniciAdi: string; kullaniciId: number; rol: string }

export async function login(req: LoginRequest): Promise<LoginResponse> {
  const r = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!r.ok) throw new Error('Kullanıcı adı veya şifre hatalı')
  return r.json()
}

// ── Tipler ────────────────────────────────────────────────────────────────────
export interface GoogleTakvimHesabi {
  id: number
  kullaniciId: number
  hesapAdi: string
  aktifMi: boolean
  sonSenkronizasyon: string | null
}

export interface GoogleTakvimHesabiDetay extends GoogleTakvimHesabi {
  servisHesabiJson: string
}

export interface EgitimEtkinligi {
  id: number
  hesapId: number
  googleEtkinlikId: string
  baslik: string
  baslangicTarihi: string
  bitisTarihi: string
  aciklama: string | null
  gunlukFiyat: number | null
  yer: string | null
  etkinlikTuru: string        // 'Egitim' | 'Toplanti'
  egitimTipi: string | null   // 'Yuzyuze' | 'Online'
  masraf: number | null
  kurumId: number | null
  kurumAdi: string | null
}

export interface BeklenenEgitim {
  id: number
  kullaniciId: number
  baslik: string
  baslangicTarihi: string
  bitisTarihi: string
  gunlukFiyat: number
  notlar: string | null
  kurumId: number | null
  kurumAdi: string | null
  beklenenGunSayisi: number
}

export interface EtkinlikGelirKalemi {
  etkinlikId: number
  baslik: string
  tamamlananGunSayisi: number
  gunlukFiyat: number
  masraf: number
  toplamGelir: number
  kurumId?: number | null
  kurumAdi?: string | null
}

export interface PlanlananGelirKalemi {
  etkinlikId: number
  baslik: string
  planlananGunSayisi: number
  gunlukFiyat: number
  toplamGelir: number
  kurumId?: number | null
  kurumAdi?: string | null
}

export interface BeklenenGelirKalemi {
  egitimId: number
  baslik: string
  toplamGunSayisi: number
  gunlukFiyat: number
  toplamGelir: number
  kurumId?: number | null
  kurumAdi?: string | null
}

export interface AylikGelir {
  ay: number
  yil: number
  toplamGelir: number
  etkinlikDetaylari: EtkinlikGelirKalemi[]
  beklenenDetaylari: BeklenenGelirKalemi[]
  planlananDetaylari: PlanlananGelirKalemi[]
}

export interface Kullanici {
  id: number
  kullaniciAdi: string
  email: string
  adSoyad: string
  rol: string
  olusturulmaTarihi: string
}

export interface Kurum {
  id: number
  kullaniciId: number
  ad: string
  notlar: string | null
  renk: string | null
  logo: string | null
}

// ── Google Takvim Hesapları ───────────────────────────────────────────────────
export async function getGoogleHesaplar(): Promise<GoogleTakvimHesabi[]> {
  const r = await apiFetch('/api/google-takvim/hesaplar')
  if (!r.ok) throw new Error('Hesaplar alınamadı')
  return r.json()
}

export async function getGoogleHesap(id: number): Promise<GoogleTakvimHesabiDetay> {
  const r = await apiFetch(`/api/google-takvim/hesaplar/${id}`)
  if (!r.ok) throw new Error('Hesap alınamadı')
  return r.json()
}

export async function postGoogleHesap(dto: { hesapAdi: string; servisHesabiJson: string }): Promise<{ id: number }> {
  const r = await apiFetch('/api/google-takvim/hesaplar', {
    method: 'POST', body: JSON.stringify(dto),
  })
  if (!r.ok) throw new Error('Hesap eklenemedi')
  return r.json()
}

export async function putGoogleHesap(id: number, dto: { hesapAdi: string; servisHesabiJson: string; aktifMi: boolean }): Promise<void> {
  const r = await apiFetch(`/api/google-takvim/hesaplar/${id}`, {
    method: 'PUT', body: JSON.stringify(dto),
  })
  if (!r.ok) throw new Error('Hesap güncellenemedi')
}

export async function deleteGoogleHesap(id: number): Promise<void> {
  const r = await apiFetch(`/api/google-takvim/hesaplar/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Hesap silinemedi')
}

export async function senkronizeEt(hesapId: number): Promise<void> {
  const r = await apiFetch(`/api/google-takvim/hesaplar/${hesapId}/senkronize`, { method: 'POST' })
  if (!r.ok) throw new Error('Senkronizasyon başarısız')
}

export async function senkronizeTumu(): Promise<void> {
  const r = await apiFetch('/api/google-takvim/senkronize-tumu', { method: 'POST' })
  if (!r.ok) throw new Error('Senkronizasyon başarısız')
}

export async function patchEtkinlikFiyat(id: number, gunlukFiyat: number | null): Promise<void> {
  const r = await apiFetch(`/api/google-takvim/etkinlikler/${id}/fiyat`, {
    method: 'PATCH', body: JSON.stringify({ gunlukFiyat }),
  })
  if (!r.ok) throw new Error('Fiyat güncellenemedi')
}

export async function patchEtkinlikBilgi(id: number, dto: {
  gunlukFiyat: number | null
  etkinlikTuru: string
  egitimTipi: string | null
  masraf: number | null
  kurumId: number | null
}): Promise<void> {
  const r = await apiFetch(`/api/egitim-etkinlikleri/${id}/bilgi`, {
    method: 'PATCH', body: JSON.stringify(dto),
  })
  if (!r.ok) throw new Error('Bilgi güncellenemedi')
}

// ── Etkinlikler ───────────────────────────────────────────────────────────────
export async function getEgitimEtkinlikleriAralik(baslangic: Date, bitis: Date): Promise<EgitimEtkinligi[]> {
  const bs = baslangic.toISOString()
  const bt = bitis.toISOString()
  const r  = await apiFetch(`/api/egitim-etkinlikleri/aralik?baslangic=${bs}&bitis=${bt}`)
  if (!r.ok) throw new Error('Etkinlikler alınamadı')
  return r.json()
}

// ── Beklenen Eğitimler ────────────────────────────────────────────────────────
export async function getBeklenenEgitimler(): Promise<BeklenenEgitim[]> {
  const r = await apiFetch('/api/beklenen-egitimler')
  if (!r.ok) throw new Error('Beklenen eğitimler alınamadı')
  return r.json()
}

export async function getBeklenenEgitimlerAralik(baslangic: Date, bitis: Date): Promise<BeklenenEgitim[]> {
  const bs = baslangic.toISOString()
  const bt = bitis.toISOString()
  const r  = await apiFetch(`/api/beklenen-egitimler/aralik?baslangic=${bs}&bitis=${bt}`)
  if (!r.ok) throw new Error('Beklenen eğitimler alınamadı')
  return r.json()
}

export async function postBeklenenEgitim(dto: Omit<BeklenenEgitim, 'id' | 'kullaniciId'>): Promise<{ id: number }> {
  const r = await apiFetch('/api/beklenen-egitimler', {
    method: 'POST', body: JSON.stringify(dto),
  })
  if (!r.ok) throw new Error('Beklenen eğitim eklenemedi')
  return r.json()
}

export async function putBeklenenEgitim(id: number, dto: Omit<BeklenenEgitim, 'id' | 'kullaniciId'>): Promise<void> {
  const r = await apiFetch(`/api/beklenen-egitimler/${id}`, {
    method: 'PUT', body: JSON.stringify(dto),
  })
  if (!r.ok) throw new Error('Beklenen eğitim güncellenemedi')
}

export async function deleteBeklenenEgitim(id: number): Promise<void> {
  const r = await apiFetch(`/api/beklenen-egitimler/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Beklenen eğitim silinemedi')
}

// ── Gelir ─────────────────────────────────────────────────────────────────────
export async function getAylikGelir(ay: number, yil: number): Promise<AylikGelir> {
  const r = await apiFetch(`/api/gelir/aylik?ay=${ay}&yil=${yil}`)
  if (!r.ok) throw new Error('Gelir alınamadı')
  return r.json()
}

export async function getYillikGelir(yil: number): Promise<AylikGelir[]> {
  const r = await apiFetch(`/api/gelir/yillik?yil=${yil}`)
  if (!r.ok) throw new Error('Yıllık gelir alınamadı')
  return r.json()
}

// ── Raporlar ──────────────────────────────────────────────────────────────────
export interface KurumAyDetay {
  ay: number
  gunSayisi: number
  toplamGelir: number
  planlananGun: number
  planlananGelir: number
}

export interface KurumYillikRapor {
  kurumId: number | null
  kurumAdi: string
  renk: string | null
  toplamGun: number
  toplamGelir: number
  planlananToplamGun: number
  planlananToplamGelir: number
  beklenenToplamGun: number
  beklenenToplamGelir: number
  aylar: KurumAyDetay[]
}

export async function getKurumBazliRapor(yil: number): Promise<KurumYillikRapor[]> {
  const r = await apiFetch(`/api/gelir/kurum-bazli?yil=${yil}`)
  if (!r.ok) throw new Error('Rapor alınamadı')
  return r.json()
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export async function getAdminKullanicilar(): Promise<Kullanici[]> {
  const r = await apiFetch('/api/admin/kullanicilar')
  if (!r.ok) throw new Error('Kullanıcılar alınamadı')
  return r.json()
}

export async function postAdminKullanici(dto: {
  kullaniciAdi: string; email: string; adSoyad: string; sifre: string; rol: string
}): Promise<{ id: number }> {
  const r = await apiFetch('/api/admin/kullanicilar', {
    method: 'POST', body: JSON.stringify(dto),
  })
  if (!r.ok) throw new Error('Kullanıcı oluşturulamadı')
  return r.json()
}

export async function putAdminKullaniciRol(id: number, rol: string): Promise<void> {
  const r = await apiFetch(`/api/admin/kullanicilar/${id}/rol`, {
    method: 'PUT', body: JSON.stringify({ rol }),
  })
  if (!r.ok) throw new Error('Rol güncellenemedi')
}

export async function putAdminKullaniciSifre(id: number, yeniSifre: string): Promise<void> {
  const r = await apiFetch(`/api/admin/kullanicilar/${id}/sifre`, {
    method: 'PUT', body: JSON.stringify({ yeniSifre }),
  })
  if (!r.ok) throw new Error('Şifre güncellenemedi')
}

// ── Kurumlar ──────────────────────────────────────────────────────────────────
export async function getKurumlar(): Promise<Kurum[]> {
  const r = await apiFetch('/api/kurumlar')
  if (!r.ok) throw new Error('Kurumlar alınamadı')
  return r.json()
}

export async function postKurum(dto: { ad: string; notlar: string | null; renk: string | null; logo: string | null }): Promise<{ id: number }> {
  const r = await apiFetch('/api/kurumlar', {
    method: 'POST', body: JSON.stringify(dto),
  })
  if (!r.ok) throw new Error('Kurum eklenemedi')
  return r.json()
}

export async function putKurum(id: number, dto: { ad: string; notlar: string | null; renk: string | null; logo: string | null }): Promise<void> {
  const r = await apiFetch(`/api/kurumlar/${id}`, {
    method: 'PUT', body: JSON.stringify(dto),
  })
  if (!r.ok) throw new Error('Kurum güncellenemedi')
}

export async function deleteKurum(id: number): Promise<void> {
  const r = await apiFetch(`/api/kurumlar/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Kurum silinemedi')
}

// ── Eğitim Etkinlikleri (tümü + CRUD) ────────────────────────────────────────
export async function getEgitimEtkinlikleriTumu(): Promise<EgitimEtkinligi[]> {
  const r = await apiFetch('/api/egitim-etkinlikleri')
  if (!r.ok) throw new Error('Etkinlikler alınamadı')
  return r.json()
}

export interface HizliGirisRow {
  baslik: string
  baslangicTarihi: string
  bitisTarihi: string
  gunlukFiyat: number | null
  etkinlikTuru: string
  egitimTipi: string | null
  masraf: number | null
  kurumId: number | null
}

export async function postEgitimEtkinligi(data: HizliGirisRow): Promise<{ id: number }> {
  const r = await apiFetch('/api/egitim-etkinlikleri', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!r.ok) throw new Error('Eklenemedi')
  return r.json()
}

export async function putEgitimEtkinligi(id: number, data: HizliGirisRow): Promise<void> {
  const r = await apiFetch(`/api/egitim-etkinlikleri/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!r.ok) throw new Error('Güncellenemedi')
}

export async function deleteEgitimEtkinligi(id: number): Promise<void> {
  const r = await apiFetch(`/api/egitim-etkinlikleri/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error('Silinemedi')
}
