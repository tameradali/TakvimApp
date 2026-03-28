import { useEffect, useState, useMemo } from 'react'
import {
  getEgitimEtkinlikleriTumu, getKurumlar,
  postEgitimEtkinligi, putEgitimEtkinligi, deleteEgitimEtkinligi
} from '../api/client'
import type { EgitimEtkinligi, Kurum } from '../api/client'

const SAYFA_BOYUTU = 20
const BOSH_FORM = { baslik: '', baslangicTarihi: '', bitisTarihi: '', gunlukFiyat: '', etkinlikTuru: 'Egitim', egitimTipi: 'Online', masraf: '', kurumId: '' }

function tarihFmt(s: string) {
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}
function toInputDate(s: string) {
  if (!s) return ''
  const d = new Date(s)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function gunSayisi(bs: string, bt: string) {
  const s = new Date(bs); s.setHours(0,0,0,0)
  const e = new Date(bt)
  const ex = (e.getHours()!==0||e.getMinutes()!==0) ? new Date(e.getFullYear(),e.getMonth(),e.getDate()+1) : (e.setHours(0,0,0,0), e)
  return Math.max(1, Math.round((ex.getTime()-s.getTime())/86400000))
}
function fmt(v: number) { return v.toLocaleString('tr-TR',{minimumFractionDigits:2}) }

type SortKey = 'baslangicTarihi'|'baslik'|'kurumAdi'|'gunlukFiyat'|'egitimTipi'|'masraf'|'gun'

export function HizliGiris() {
  const [liste, setListe]       = useState<EgitimEtkinligi[]>([])
  const [kurumlar, setKurumlar] = useState<Kurum[]>([])
  const [loading, setLoading]   = useState(false)
  const [hata, setHata]         = useState<string|null>(null)

  // Edit state: null=none, 0=new row, id=existing
  const [editId, setEditId]     = useState<number|null>(null)
  const [form, setForm]         = useState({ ...BOSH_FORM })
  const [saving, setSaving]     = useState(false)

  // Sort
  const [sortKey, setSortKey]   = useState<SortKey>('baslangicTarihi')
  const [sortAsc, setSortAsc]   = useState(false)

  // Filters
  const [fBaslik, setFBaslik]   = useState('')
  const [fKurum, setFKurum]     = useState('')
  const [fTip, setFTip]         = useState('')
  const [fTarih, setFTarih]     = useState('')

  // Paging
  const [sayfa, setSayfa]       = useState(1)

  function yukle() {
    setLoading(true); setHata(null)
    Promise.all([getEgitimEtkinlikleriTumu(), getKurumlar()])
      .then(([e, k]) => { setListe(e); setKurumlar(k) })
      .catch(err => setHata(err.message))
      .finally(() => setLoading(false))
  }
  useEffect(yukle, [])

  function setSort(k: SortKey) {
    if (sortKey === k) setSortAsc(!sortAsc)
    else { setSortKey(k); setSortAsc(true) }
    setSayfa(1)
  }

  const filtered = useMemo(() => {
    let d = [...liste]
    if (fBaslik) d = d.filter(r => r.baslik.toLowerCase().includes(fBaslik.toLowerCase()))
    if (fKurum)  d = d.filter(r => (r.kurumAdi ?? '').toLowerCase().includes(fKurum.toLowerCase()) || String(r.kurumId ?? '') === fKurum)
    if (fTip)    d = d.filter(r => (r.egitimTipi ?? '') === fTip || r.etkinlikTuru === fTip)
    if (fTarih)  d = d.filter(r => r.baslangicTarihi.startsWith(fTarih))
    d.sort((a, b) => {
      let va: any, vb: any
      if (sortKey === 'baslangicTarihi') { va = a.baslangicTarihi; vb = b.baslangicTarihi }
      else if (sortKey === 'baslik')     { va = a.baslik;          vb = b.baslik }
      else if (sortKey === 'kurumAdi')   { va = a.kurumAdi ?? '';  vb = b.kurumAdi ?? '' }
      else if (sortKey === 'gunlukFiyat'){ va = a.gunlukFiyat??0;  vb = b.gunlukFiyat??0 }
      else if (sortKey === 'egitimTipi') { va = a.egitimTipi??'';  vb = b.egitimTipi??'' }
      else if (sortKey === 'masraf')     { va = a.masraf??0;        vb = b.masraf??0 }
      else if (sortKey === 'gun')        { va = gunSayisi(a.baslangicTarihi,a.bitisTarihi); vb = gunSayisi(b.baslangicTarihi,b.bitisTarihi) }
      if (va < vb) return sortAsc ? -1 : 1
      if (va > vb) return sortAsc ?  1 : -1
      return 0
    })
    return d
  }, [liste, fBaslik, fKurum, fTip, fTarih, sortKey, sortAsc])

  const toplamSayfa = Math.max(1, Math.ceil(filtered.length / SAYFA_BOYUTU))
  const sayfalananlar = filtered.slice((sayfa-1)*SAYFA_BOYUTU, sayfa*SAYFA_BOYUTU)

  function startEdit(e: EgitimEtkinligi) {
    setEditId(e.id)
    setForm({
      baslik:          e.baslik,
      baslangicTarihi: toInputDate(e.baslangicTarihi),
      bitisTarihi:     (() => { const d = new Date(e.bitisTarihi); if(d.getHours()!==0||d.getMinutes()!==0){return toInputDate(e.bitisTarihi)} const prev = new Date(d); prev.setDate(prev.getDate()-1); return `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}-${String(prev.getDate()).padStart(2,'0')}` })(),
      gunlukFiyat:     String(e.gunlukFiyat ?? ''),
      etkinlikTuru:    e.etkinlikTuru ?? 'Egitim',
      egitimTipi:      e.egitimTipi ?? 'Online',
      masraf:          String(e.masraf ?? ''),
      kurumId:         String(e.kurumId ?? ''),
    })
  }

  function startNew() {
    const today = new Date()
    const ds = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
    setEditId(0)
    setForm({ ...BOSH_FORM, baslangicTarihi: ds, bitisTarihi: ds })
    setSayfa(1)
  }

  async function save() {
    setSaving(true)
    try {
      // Convert form dates: bitisTarihi -> next day midnight UTC for all-day convention
      const bs = new Date(form.baslangicTarihi + 'T00:00:00')
      const bt = new Date(form.bitisTarihi + 'T00:00:00')
      bt.setDate(bt.getDate() + 1) // exclusive end
      const payload = {
        baslik:          form.baslik || 'Yeni Egitim',
        baslangicTarihi: bs.toISOString(),
        bitisTarihi:     bt.toISOString(),
        gunlukFiyat:     form.gunlukFiyat ? parseFloat(form.gunlukFiyat) : null,
        etkinlikTuru:    form.etkinlikTuru,
        egitimTipi:      form.etkinlikTuru === 'Toplanti' ? null : (form.egitimTipi || null),
        masraf:          (form.egitimTipi === 'Yuzyuze' && form.masraf) ? parseFloat(form.masraf) : null,
        kurumId:         form.kurumId ? parseInt(form.kurumId) : null,
      }
      if (editId === 0) {
        const { id } = await postEgitimEtkinligi(payload)
        setListe(prev => [{ id, hesapId: 0, googleEtkinlikId: '', ...payload, kurumAdi: kurumlar.find(k=>k.id===payload.kurumId)?.ad??null, aciklama: null, yer: null }, ...prev])
      } else {
        await putEgitimEtkinligi(editId!, payload)
        setListe(prev => prev.map(e => e.id === editId ? { ...e, ...payload, baslangicTarihi: payload.baslangicTarihi, bitisTarihi: payload.bitisTarihi, kurumAdi: kurumlar.find(k=>k.id===payload.kurumId)?.ad??null } : e))
      }
      setEditId(null)
    } catch(err: any) { alert(err.message) }
    finally { setSaving(false) }
  }

  async function sil(id: number) {
    if (!confirm('Bu kaydi silmek istediginize emin misiniz?')) return
    try {
      await deleteEgitimEtkinligi(id)
      setListe(prev => prev.filter(e => e.id !== id))
    } catch(err: any) { alert(err.message) }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <i className="ri ri-expand-up-down-line ms-1 text-muted" style={{fontSize:'0.7rem'}}/>
    return <i className={`ri ri-arrow-${sortAsc?'up':'down'}-line ms-1`} style={{fontSize:'0.7rem'}}/>
  }

  const thStyle: React.CSSProperties = { cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h5 className="mb-0">Hizli Giris</h5>
          <p className="text-muted small mb-0">Egitim kayitlarini duzenle, yeni ekle</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={startNew} disabled={editId !== null}>
          <i className="ri ri-add-line me-1"/>Yeni Satir
        </button>
      </div>

      {hata && <div className="alert alert-danger py-2">{hata}</div>}

      {loading ? (
        <div className="text-center py-5"><span className="spinner-border text-primary"/></div>
      ) : (
        <>
          <div className="card">
            <div className="table-responsive">
              <table className="table table-hover table-sm mb-0" style={{fontSize:'0.82rem', minWidth:900}}>
                <thead className="table-light">
                  <tr>
                    <th style={thStyle} onClick={()=>setSort('baslangicTarihi')}>Tarih <SortIcon k="baslangicTarihi"/></th>
                    <th style={thStyle} onClick={()=>setSort('baslangicTarihi')}>Bitis</th>
                    <th style={thStyle} onClick={()=>setSort('baslik')}>Baslik <SortIcon k="baslik"/></th>
                    <th style={thStyle} onClick={()=>setSort('kurumAdi')}>Kurum <SortIcon k="kurumAdi"/></th>
                    <th style={thStyle} onClick={()=>setSort('gunlukFiyat')} className="text-end">Tutar <SortIcon k="gunlukFiyat"/></th>
                    <th style={thStyle} onClick={()=>setSort('egitimTipi')}>Tip <SortIcon k="egitimTipi"/></th>
                    <th style={thStyle} onClick={()=>setSort('masraf')} className="text-end">Masraf <SortIcon k="masraf"/></th>
                    <th style={{width:90}}>Islem</th>
                  </tr>
                  {/* Filter row */}
                  <tr>
                    <td colSpan={2}>
                      <input className="form-control form-control-sm" placeholder="Tarih (yil-ay)" value={fTarih}
                        onChange={e=>{setFTarih(e.target.value);setSayfa(1)}} style={{minWidth:100}}/>
                    </td>
                    <td>
                      <input className="form-control form-control-sm" placeholder="Baslik ara..." value={fBaslik}
                        onChange={e=>{setFBaslik(e.target.value);setSayfa(1)}}/>
                    </td>
                    <td>
                      <select className="form-select form-select-sm" value={fKurum} onChange={e=>{setFKurum(e.target.value);setSayfa(1)}}>
                        <option value="">Tumu</option>
                        {kurumlar.map(k=><option key={k.id} value={String(k.id)}>{k.ad}</option>)}
                      </select>
                    </td>
                    <td/>
                    <td>
                      <select className="form-select form-select-sm" value={fTip} onChange={e=>{setFTip(e.target.value);setSayfa(1)}}>
                        <option value="">Tumu</option>
                        <option value="Online">Online</option>
                        <option value="Yuzyuze">Yuzyuze</option>
                        <option value="Toplanti">Toplanti</option>
                      </select>
                    </td>
                    <td colSpan={2}/>
                  </tr>
                </thead>
                <tbody>
                  {/* New row */}
                  {editId === 0 && (
                    <tr className="table-warning">
                      <td><input type="date" className="form-control form-control-sm" value={form.baslangicTarihi} onChange={e=>setForm(f=>({...f,baslangicTarihi:e.target.value}))}/></td>
                      <td><input type="date" className="form-control form-control-sm" value={form.bitisTarihi} onChange={e=>setForm(f=>({...f,bitisTarihi:e.target.value}))}/></td>
                      <td><input className="form-control form-control-sm" value={form.baslik} onChange={e=>setForm(f=>({...f,baslik:e.target.value}))} placeholder="Baslik"/></td>
                      <td>
                        <select className="form-select form-select-sm" value={form.kurumId} onChange={e=>setForm(f=>({...f,kurumId:e.target.value}))}>
                          <option value="">—</option>
                          {kurumlar.map(k=><option key={k.id} value={k.id}>{k.ad}</option>)}
                        </select>
                      </td>
                      <td><input type="number" className="form-control form-control-sm text-end" value={form.gunlukFiyat} onChange={e=>setForm(f=>({...f,gunlukFiyat:e.target.value}))} placeholder="TL"/></td>
                      <td>
                        <select className="form-select form-select-sm" value={form.etkinlikTuru==='Toplanti'?'Toplanti':form.egitimTipi} onChange={e=>{const v=e.target.value; if(v==='Toplanti') setForm(f=>({...f,etkinlikTuru:'Toplanti',egitimTipi:''})); else setForm(f=>({...f,etkinlikTuru:'Egitim',egitimTipi:v}))}}>
                          <option value="Online">Online</option>
                          <option value="Yuzyuze">Yuzyuze</option>
                          <option value="Toplanti">Toplanti</option>
                        </select>
                      </td>
                      <td>{form.egitimTipi==='Yuzyuze'&&<input type="number" className="form-control form-control-sm text-end" value={form.masraf} onChange={e=>setForm(f=>({...f,masraf:e.target.value}))} placeholder="TL"/>}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-success btn-sm py-0 px-1" onClick={save} disabled={saving}>{saving?<span className="spinner-border spinner-border-sm"/>:<i className="ri ri-save-line"/>}</button>
                          <button className="btn btn-secondary btn-sm py-0 px-1" onClick={()=>setEditId(null)}><i className="ri ri-close-line"/></button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {sayfalananlar.length === 0 && editId !== 0 && (
                    <tr><td colSpan={8} className="text-center text-muted py-4">Kayit bulunamadi.</td></tr>
                  )}
                  {sayfalananlar.map(e => (
                    editId === e.id ? (
                      <tr key={e.id} className="table-warning">
                        <td><input type="date" className="form-control form-control-sm" value={form.baslangicTarihi} onChange={ev=>setForm(f=>({...f,baslangicTarihi:ev.target.value}))}/></td>
                        <td><input type="date" className="form-control form-control-sm" value={form.bitisTarihi} onChange={ev=>setForm(f=>({...f,bitisTarihi:ev.target.value}))}/></td>
                        <td><input className="form-control form-control-sm" value={form.baslik} onChange={ev=>setForm(f=>({...f,baslik:ev.target.value}))}/></td>
                        <td>
                          <select className="form-select form-select-sm" value={form.kurumId} onChange={ev=>setForm(f=>({...f,kurumId:ev.target.value}))}>
                            <option value="">—</option>
                            {kurumlar.map(k=><option key={k.id} value={k.id}>{k.ad}</option>)}
                          </select>
                        </td>
                        <td><input type="number" className="form-control form-control-sm text-end" value={form.gunlukFiyat} onChange={ev=>setForm(f=>({...f,gunlukFiyat:ev.target.value}))}/></td>
                        <td>
                          <select className="form-select form-select-sm" value={form.etkinlikTuru==='Toplanti'?'Toplanti':form.egitimTipi} onChange={ev=>{const v=ev.target.value; if(v==='Toplanti') setForm(f=>({...f,etkinlikTuru:'Toplanti',egitimTipi:''})); else setForm(f=>({...f,etkinlikTuru:'Egitim',egitimTipi:v}))}}>
                            <option value="Online">Online</option>
                            <option value="Yuzyuze">Yuzyuze</option>
                            <option value="Toplanti">Toplanti</option>
                          </select>
                        </td>
                        <td>{form.egitimTipi==='Yuzyuze'&&<input type="number" className="form-control form-control-sm text-end" value={form.masraf} onChange={ev=>setForm(f=>({...f,masraf:ev.target.value}))}/>}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <button className="btn btn-success btn-sm py-0 px-1" onClick={save} disabled={saving}>{saving?<span className="spinner-border spinner-border-sm"/>:<i className="ri ri-save-line"/>}</button>
                            <button className="btn btn-secondary btn-sm py-0 px-1" onClick={()=>setEditId(null)}><i className="ri ri-close-line"/></button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={e.id}>
                        <td>{tarihFmt(e.baslangicTarihi)}</td>
                        <td className="text-muted">{(() => { const d = new Date(e.bitisTarihi); if(d.getHours()!==0||d.getMinutes()!==0) return tarihFmt(e.bitisTarihi); const prev=new Date(d); prev.setDate(prev.getDate()-1); return tarihFmt(prev.toISOString()) })()}</td>
                        <td><strong>{e.baslik}</strong></td>
                        <td className="text-muted">{e.kurumAdi ?? '—'}</td>
                        <td className="text-end">{e.gunlukFiyat!=null?<span style={{color:'#696cff'}}>{fmt(e.gunlukFiyat)} TL</span>:'—'}</td>
                        <td>
                          {e.etkinlikTuru==='Toplanti'
                            ? <span className="badge bg-label-info">Toplanti</span>
                            : e.egitimTipi==='Yuzyuze'
                              ? <span className="badge bg-label-success">Yuzyuze</span>
                              : <span className="badge bg-label-primary">Online</span>}
                        </td>
                        <td className="text-end">{e.masraf&&e.masraf>0?<span className="text-muted">{fmt(e.masraf)} TL</span>:'—'}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <button className="btn btn-outline-primary btn-sm py-0 px-1" onClick={()=>startEdit(e)} disabled={editId!==null} title="Duzenle"><i className="ri ri-pencil-line"/></button>
                            <button className="btn btn-outline-danger btn-sm py-0 px-1" onClick={()=>sil(e.id)} title="Sil"><i className="ri ri-delete-bin-line"/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paging */}
          {toplamSayfa > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <small className="text-muted">{filtered.length} kayit, {toplamSayfa} sayfa</small>
              <div className="d-flex gap-1">
                <button className="btn btn-outline-secondary btn-sm" onClick={()=>setSayfa(1)} disabled={sayfa===1}>«</button>
                <button className="btn btn-outline-secondary btn-sm" onClick={()=>setSayfa(s=>Math.max(1,s-1))} disabled={sayfa===1}>‹</button>
                <span className="btn btn-sm disabled">{sayfa} / {toplamSayfa}</span>
                <button className="btn btn-outline-secondary btn-sm" onClick={()=>setSayfa(s=>Math.min(toplamSayfa,s+1))} disabled={sayfa===toplamSayfa}>›</button>
                <button className="btn btn-outline-secondary btn-sm" onClick={()=>setSayfa(toplamSayfa)} disabled={sayfa===toplamSayfa}>»</button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
