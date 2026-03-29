import { useEffect, useState, useMemo } from 'react'
import {
  getEgitimEtkinlikleriTumu, getKurumlar,
  putEgitimEtkinligi, deleteEgitimEtkinligi
} from '../api/client'
import type { EgitimEtkinligi, Kurum } from '../api/client'

const TURKIYE_ILLERI = [
  'Adana','Adıyaman','Afyonkarahisar','Ağrı','Aksaray','Amasya','Ankara','Antalya','Ardahan','Artvin',
  'Aydın','Balıkesir','Bartın','Batman','Bayburt','Bilecik','Bingöl','Bitlis','Bolu','Burdur',
  'Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Düzce','Edirne','Elazığ','Erzincan',
  'Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari','Hatay','Iğdır','Isparta','İstanbul',
  'İzmir','Kahramanmaraş','Karabük','Karaman','Kars','Kastamonu','Kayseri','Kilis','Kırıkkale','Kırklareli',
  'Kırşehir','Kocaeli','Konya','Kütahya','Malatya','Manisa','Mardin','Mersin','Muğla','Muş',
  'Nevşehir','Niğde','Ordu','Osmaniye','Rize','Sakarya','Samsun','Şanlıurfa','Şırnak','Siirt',
  'Sinop','Sivas','Tekirdağ','Tokat','Trabzon','Tunceli','Uşak','Van','Yalova','Yozgat','Zonguldak',
]

const SAYFA_BOYUTU = 20

function tarihFmt(s: string) {
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}
function toInputDate(s: string) {
  if (!s) return ''
  const d = new Date(s)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function bitisFmt(bitisTarihi: string) {
  const d = new Date(bitisTarihi)
  if (d.getHours() !== 0 || d.getMinutes() !== 0) return tarihFmt(bitisTarihi)
  const prev = new Date(d); prev.setDate(prev.getDate() - 1)
  return tarihFmt(prev.toISOString())
}
function bitisToInput(bitisTarihi: string) {
  const d = new Date(bitisTarihi)
  if (d.getHours() !== 0 || d.getMinutes() !== 0) return toInputDate(bitisTarihi)
  const prev = new Date(d); prev.setDate(prev.getDate() - 1)
  return `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}-${String(prev.getDate()).padStart(2,'0')}`
}
function fmt(v: number) { return v.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }

type SortKey = 'baslangicTarihi'|'baslik'|'kurumAdi'|'gunlukFiyat'|'egitimTipi'|'masraf'|'sehir'

export function HizliGiris() {
  const bugun = new Date()
  const [liste, setListe]       = useState<EgitimEtkinligi[]>([])
  const [kurumlar, setKurumlar] = useState<Kurum[]>([])
  const [loading, setLoading]   = useState(false)
  const [hata, setHata]         = useState<string|null>(null)

  const [editId, setEditId]     = useState<number|null>(null)
  const [form, setForm]         = useState({ baslik: '', baslangicTarihi: '', bitisTarihi: '', gunlukFiyat: '', etkinlikTuru: 'Egitim', egitimTipi: 'Online', masraf: '', kurumId: '', sehir: '' })
  const [saving, setSaving]     = useState(false)

  const [sortKey, setSortKey]   = useState<SortKey>('baslangicTarihi')
  const [sortAsc, setSortAsc]   = useState(false)

  const [fYil, setFYil]         = useState(bugun.getFullYear())
  const [fBaslik, setFBaslik]   = useState('')
  const [fKurum, setFKurum]     = useState('')
  const [fTip, setFTip]         = useState('')

  const [sayfa, setSayfa]       = useState(1)

  const yillar = [bugun.getFullYear() - 1, bugun.getFullYear(), bugun.getFullYear() + 1]

  useEffect(() => {
    setLoading(true); setHata(null)
    Promise.all([getEgitimEtkinlikleriTumu(), getKurumlar()])
      .then(([e, k]) => { setListe(e); setKurumlar(k) })
      .catch(err => setHata(err.message))
      .finally(() => setLoading(false))
  }, [])

  function setSort(k: SortKey) {
    if (sortKey === k) setSortAsc(!sortAsc)
    else { setSortKey(k); setSortAsc(true) }
    setSayfa(1)
  }

  const filtered = useMemo(() => {
    let d = [...liste]
    d = d.filter(r => new Date(r.baslangicTarihi).getFullYear() === fYil)
    if (fBaslik) d = d.filter(r => r.baslik.toLowerCase().includes(fBaslik.toLowerCase()))
    if (fKurum)  d = d.filter(r => String(r.kurumId ?? '') === fKurum)
    if (fTip)    d = d.filter(r => (r.egitimTipi ?? '') === fTip || r.etkinlikTuru === fTip)
    d.sort((a, b) => {
      let va: any, vb: any
      if      (sortKey === 'baslangicTarihi') { va = a.baslangicTarihi; vb = b.baslangicTarihi }
      else if (sortKey === 'baslik')          { va = a.baslik;          vb = b.baslik }
      else if (sortKey === 'kurumAdi')        { va = a.kurumAdi ?? '';  vb = b.kurumAdi ?? '' }
      else if (sortKey === 'gunlukFiyat')     { va = a.gunlukFiyat??0;  vb = b.gunlukFiyat??0 }
      else if (sortKey === 'egitimTipi')      { va = a.egitimTipi??'';  vb = b.egitimTipi??'' }
      else if (sortKey === 'masraf')          { va = a.masraf??0;        vb = b.masraf??0 }
      else if (sortKey === 'sehir')           { va = a.sehir??'';        vb = b.sehir??'' }
      if (va < vb) return sortAsc ? -1 : 1
      if (va > vb) return sortAsc ?  1 : -1
      return 0
    })
    return d
  }, [liste, fYil, fBaslik, fKurum, fTip, sortKey, sortAsc])

  const toplamSayfa   = Math.max(1, Math.ceil(filtered.length / SAYFA_BOYUTU))
  const sayfalananlar = filtered.slice((sayfa - 1) * SAYFA_BOYUTU, sayfa * SAYFA_BOYUTU)

  function startEdit(e: EgitimEtkinligi) {
    setEditId(e.id)
    setForm({
      baslik:          e.baslik,
      baslangicTarihi: toInputDate(e.baslangicTarihi),
      bitisTarihi:     bitisToInput(e.bitisTarihi),
      gunlukFiyat:     String(e.gunlukFiyat ?? ''),
      etkinlikTuru:    e.etkinlikTuru ?? 'Egitim',
      egitimTipi:      e.egitimTipi ?? 'Online',
      masraf:          String(e.masraf ?? ''),
      kurumId:         String(e.kurumId ?? ''),
      sehir:           e.sehir ?? '',
    })
  }

  async function save() {
    setSaving(true)
    try {
      const bs = new Date(form.baslangicTarihi + 'T00:00:00')
      const bt = new Date(form.bitisTarihi + 'T00:00:00')
      bt.setDate(bt.getDate() + 1)
      const payload = {
        baslik:          form.baslik,
        baslangicTarihi: bs.toISOString(),
        bitisTarihi:     bt.toISOString(),
        gunlukFiyat:     form.gunlukFiyat ? parseFloat(form.gunlukFiyat) : null,
        etkinlikTuru:    form.etkinlikTuru,
        egitimTipi:      form.etkinlikTuru === 'Toplanti' ? null : (form.egitimTipi || null),
        masraf:          (form.egitimTipi === 'Yuzyuze' && form.masraf) ? parseFloat(form.masraf) : null,
        kurumId:         form.kurumId ? parseInt(form.kurumId) : null,
        sehir:           form.sehir.trim() || null,
      }
      await putEgitimEtkinligi(editId!, payload)
      const kurumAdi = kurumlar.find(k => k.id === payload.kurumId)?.ad ?? null
      setListe(prev => prev.map(e => e.id === editId
        ? { ...e, ...payload, kurumAdi }
        : e))
      setEditId(null)
    } catch (err: any) { alert(err.message) }
    finally { setSaving(false) }
  }

  async function sil(id: number) {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return
    try {
      await deleteEgitimEtkinligi(id)
      setListe(prev => prev.filter(e => e.id !== id))
    } catch (err: any) { alert(err.message) }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <i className="ri ri-expand-up-down-line ms-1 text-muted" style={{ fontSize: '0.7rem' }} />
    return <i className={`ri ri-arrow-${sortAsc ? 'up' : 'down'}-line ms-1`} style={{ fontSize: '0.7rem' }} />
  }

  const thStyle: React.CSSProperties = { cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h5 className="mb-0">Hızlı Güncelleme</h5>
          <p className="text-muted small mb-0">Eğitim kayıtlarını hızlıca düzenle</p>
        </div>
        <select className="form-select form-select-sm" style={{ width: 100 }}
          value={fYil} onChange={e => { setFYil(Number(e.target.value)); setSayfa(1) }}>
          {yillar.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {hata && <div className="alert alert-danger py-2">{hata}</div>}

      {loading ? (
        <div className="text-center py-5"><span className="spinner-border text-primary" /></div>
      ) : (
        <>
          <div className="card">
            <div className="table-responsive">
              <table className="table table-hover table-sm mb-0" style={{ fontSize: '0.82rem', minWidth: 980 }}>
                <thead className="table-light">
                  <tr>
                    <th style={thStyle} onClick={() => setSort('baslangicTarihi')}>Tarih <SortIcon k="baslangicTarihi" /></th>
                    <th>Bitiş</th>
                    <th style={thStyle} onClick={() => setSort('baslik')}>Başlık <SortIcon k="baslik" /></th>
                    <th style={thStyle} onClick={() => setSort('kurumAdi')}>Kurum <SortIcon k="kurumAdi" /></th>
                    <th style={thStyle} onClick={() => setSort('gunlukFiyat')} className="text-end">Tutar <SortIcon k="gunlukFiyat" /></th>
                    <th style={thStyle} onClick={() => setSort('egitimTipi')}>Tip <SortIcon k="egitimTipi" /></th>
                    <th style={thStyle} onClick={() => setSort('masraf')} className="text-end">Masraf <SortIcon k="masraf" /></th>
                    <th style={thStyle} onClick={() => setSort('sehir')}>Şehir <SortIcon k="sehir" /></th>
                    <th style={{ width: 90 }}>İşlem</th>
                  </tr>
                  <tr>
                    <td colSpan={2} />
                    <td>
                      <input className="form-control form-control-sm" placeholder="Başlık ara..." value={fBaslik}
                        onChange={e => { setFBaslik(e.target.value); setSayfa(1) }} />
                    </td>
                    <td>
                      <select className="form-select form-select-sm" value={fKurum} onChange={e => { setFKurum(e.target.value); setSayfa(1) }}>
                        <option value="">Tümü</option>
                        {kurumlar.map(k => <option key={k.id} value={String(k.id)}>{k.ad}</option>)}
                      </select>
                    </td>
                    <td />
                    <td>
                      <select className="form-select form-select-sm" value={fTip} onChange={e => { setFTip(e.target.value); setSayfa(1) }}>
                        <option value="">Tümü</option>
                        <option value="Online">Online</option>
                        <option value="Yuzyuze">Yüzyüze</option>
                        <option value="Toplanti">Toplantı</option>
                      </select>
                    </td>
                    <td colSpan={3} />
                  </tr>
                </thead>
                <tbody>
                  {sayfalananlar.length === 0 && (
                    <tr><td colSpan={9} className="text-center text-muted py-4">Kayıt bulunamadı.</td></tr>
                  )}
                  {sayfalananlar.map(e => (
                    editId === e.id ? (
                      <tr key={e.id} className="table-warning">
                        <td><input type="date" className="form-control form-control-sm" value={form.baslangicTarihi} onChange={ev => setForm(f => ({ ...f, baslangicTarihi: ev.target.value }))} /></td>
                        <td><input type="date" className="form-control form-control-sm" value={form.bitisTarihi} onChange={ev => setForm(f => ({ ...f, bitisTarihi: ev.target.value }))} /></td>
                        <td><input className="form-control form-control-sm" value={form.baslik} onChange={ev => setForm(f => ({ ...f, baslik: ev.target.value }))} /></td>
                        <td>
                          <select className="form-select form-select-sm" value={form.kurumId} onChange={ev => setForm(f => ({ ...f, kurumId: ev.target.value }))}>
                            <option value="">—</option>
                            {kurumlar.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
                          </select>
                        </td>
                        <td><input type="number" className="form-control form-control-sm text-end" value={form.gunlukFiyat} onChange={ev => setForm(f => ({ ...f, gunlukFiyat: ev.target.value }))} /></td>
                        <td>
                          <select className="form-select form-select-sm"
                            value={form.etkinlikTuru === 'Toplanti' ? 'Toplanti' : form.egitimTipi}
                            onChange={ev => {
                              const v = ev.target.value
                              if (v === 'Toplanti') setForm(f => ({ ...f, etkinlikTuru: 'Toplanti', egitimTipi: '' }))
                              else setForm(f => ({ ...f, etkinlikTuru: 'Egitim', egitimTipi: v }))
                            }}>
                            <option value="Online">Online</option>
                            <option value="Yuzyuze">Yüzyüze</option>
                            <option value="Toplanti">Toplantı</option>
                          </select>
                        </td>
                        <td>
                          {form.egitimTipi === 'Yuzyuze' &&
                            <input type="number" className="form-control form-control-sm text-end" value={form.masraf}
                              onChange={ev => setForm(f => ({ ...f, masraf: ev.target.value }))} />}
                        </td>
                        <td>
                          <input
                            className="form-control form-control-sm"
                            list="turkiye-illeri-hg"
                            placeholder="Şehir..."
                            value={form.sehir}
                            onChange={ev => setForm(f => ({ ...f, sehir: ev.target.value }))}
                          />
                          <datalist id="turkiye-illeri-hg">
                            {TURKIYE_ILLERI.map(il => <option key={il} value={il} />)}
                          </datalist>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button className="btn btn-success btn-sm py-0 px-1" onClick={save} disabled={saving}>
                              {saving ? <span className="spinner-border spinner-border-sm" /> : <i className="ri ri-save-line" />}
                            </button>
                            <button className="btn btn-secondary btn-sm py-0 px-1" onClick={() => setEditId(null)}>
                              <i className="ri ri-close-line" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={e.id}>
                        <td>{tarihFmt(e.baslangicTarihi)}</td>
                        <td className="text-muted">{bitisFmt(e.bitisTarihi)}</td>
                        <td><strong>{e.baslik}</strong></td>
                        <td className="text-muted">{e.kurumAdi ?? '—'}</td>
                        <td className="text-end">
                          {e.gunlukFiyat != null
                            ? <span style={{ color: '#696cff' }}>{fmt(e.gunlukFiyat)} ₺</span>
                            : '—'}
                        </td>
                        <td>
                          {e.etkinlikTuru === 'Toplanti'
                            ? <span className="badge bg-label-info">Toplantı</span>
                            : e.egitimTipi === 'Yuzyuze'
                              ? <span className="badge bg-label-success">Yüzyüze</span>
                              : <span className="badge bg-label-primary">Online</span>}
                        </td>
                        <td className="text-end">
                          {e.masraf && e.masraf > 0
                            ? <span className="text-muted">{fmt(e.masraf)} ₺</span>
                            : '—'}
                        </td>
                        <td className="text-muted">{e.sehir ?? '—'}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <button className="btn btn-outline-primary btn-sm py-0 px-1"
                              onClick={() => startEdit(e)} disabled={editId !== null} title="Düzenle">
                              <i className="ri ri-pencil-line" />
                            </button>
                            <button className="btn btn-outline-danger btn-sm py-0 px-1"
                              onClick={() => sil(e.id)} title="Sil">
                              <i className="ri ri-delete-bin-line" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <small className="text-muted">{filtered.length} kayıt</small>
            {toplamSayfa > 1 && (
              <div className="d-flex gap-1">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setSayfa(1)} disabled={sayfa === 1}>«</button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setSayfa(s => Math.max(1, s - 1))} disabled={sayfa === 1}>‹</button>
                <span className="btn btn-sm disabled">{sayfa} / {toplamSayfa}</span>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setSayfa(s => Math.min(toplamSayfa, s + 1))} disabled={sayfa === toplamSayfa}>›</button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setSayfa(toplamSayfa)} disabled={sayfa === toplamSayfa}>»</button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
