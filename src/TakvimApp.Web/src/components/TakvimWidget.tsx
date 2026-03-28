import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, DatesSetArg, EventContentArg } from '@fullcalendar/core'

export type EtkinlikTur = 'gerceklesen' | 'planlanan' | 'beklenen' | 'toplanti'

export interface TakvimEtkinlik {
  id: number
  title: string
  start: Date
  end: Date
  tur: EtkinlikTur
  gunlukFiyat?: number | null
  allDay?: boolean
  etkinlikTuru?: string
  yer?: string | null
  aciklama?: string | null
  egitimTipi?: string | null
  masraf?: number | null
  kurumId?: number | null
  kurumAdi?: string | null
  beklenenGunSayisi?: number
}

interface FCEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  backgroundColor: string
  borderColor: string
  textColor: string
  extendedProps: {
    originalId: number
    tur: EtkinlikTur
    gunlukFiyat?: number | null
    etkinlikTuru?: string
  }
}

function etkinligiDonustur(e: TakvimEtkinlik): FCEvent[] {
  const bugun = new Date()
  bugun.setHours(0, 0, 0, 0)
  const yarin = new Date(bugun)
  yarin.setDate(yarin.getDate() + 1)

  const base = {
    allDay: true,
    extendedProps: { originalId: e.id, tur: e.tur, gunlukFiyat: e.gunlukFiyat, etkinlikTuru: e.etkinlikTuru },
  }

  if (e.tur === 'beklenen') {
    return [{ ...base, id: String(e.id) + '_b', title: e.title, start: e.start, end: e.end,
      backgroundColor: '#f06292', borderColor: '#c2185b', textColor: '#fff' }]
  }

  // Toplantı → mavi (tarihten bağımsız, bölünmez)
  if (e.etkinlikTuru === 'Toplanti') {
    return [{ ...base, id: String(e.id) + '_t', title: e.title, start: e.start, end: e.end,
      backgroundColor: '#2196F3', borderColor: '#1565C0', textColor: '#fff' }]
  }

  const eStart = new Date(e.start); eStart.setHours(0, 0, 0, 0)
  const eEnd   = new Date(e.end);   eEnd.setHours(0, 0, 0, 0)

  // Tamamen geçmiş (iCal DTEND exclusive olduğu için <= kullanıyoruz)
  if (eEnd <= bugun) {
    return [{ ...base, id: String(e.id) + '_g', title: e.title, start: e.start, end: e.end,
      backgroundColor: '#4caf50', borderColor: '#388e3c', textColor: '#fff' }]
  }
  // Tamamen gelecek
  if (eStart >= yarin) {
    return [{ ...base, id: String(e.id) + '_p', title: e.title, start: e.start, end: e.end,
      backgroundColor: '#ffb300', borderColor: '#f57f17', textColor: '#333' }]
  }
  // Bugünü kapsıyor — yeşil + sarı böl
  const result: FCEvent[] = []
  if (eStart < bugun) {
    result.push({ ...base, id: String(e.id) + '_g', title: e.title, start: e.start, end: bugun,
      backgroundColor: '#4caf50', borderColor: '#388e3c', textColor: '#fff' })
  }
  result.push({ ...base, id: String(e.id) + '_bg', title: e.title, start: bugun, end: bugun,
    backgroundColor: '#4caf50', borderColor: '#388e3c', textColor: '#fff' })
  if (eEnd >= yarin) {
    result.push({ ...base, id: String(e.id) + '_p', title: e.title, start: yarin, end: e.end,
      backgroundColor: '#ffb300', borderColor: '#f57f17', textColor: '#333' })
  }
  return result
}

interface TakvimWidgetProps {
  etkinlikler: TakvimEtkinlik[]
  onDatesSet?: (start: Date, end: Date) => void
  onSelectEvent?: (event: TakvimEtkinlik) => void
  isMobile?: boolean
}

export function TakvimWidget({ etkinlikler, onDatesSet, onSelectEvent, isMobile }: TakvimWidgetProps) {
  const fcEvents: FCEvent[] = etkinlikler.flatMap(etkinligiDonustur)

  function handleEventClick(arg: EventClickArg) {
    if (!onSelectEvent) return
    const props = arg.event.extendedProps as FCEvent['extendedProps']
    const original = etkinlikler.find(e => e.id === props.originalId)
    if (original) onSelectEvent(original)
  }

  function handleDatesSet(arg: DatesSetArg) {
    if (onDatesSet) onDatesSet(arg.start, arg.end)
  }

  function renderEventContent(arg: EventContentArg) {
    return (
      <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', padding: '1px 3px' }}>
        <span>{arg.event.title}</span>
      </div>
    )
  }

  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
      initialView={isMobile ? 'listMonth' : 'dayGridMonth'}
      headerToolbar={isMobile ? {
        left: 'prev,next',
        center: 'title',
        right: 'dayGridMonth,listMonth',
      } : {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,listMonth',
      }}
      buttonText={{ today: 'Bugün', month: 'Ay', week: 'Hafta', day: 'Gün', list: 'Liste' }}
      locale="tr"
      events={fcEvents as never}
      eventClick={handleEventClick}
      datesSet={handleDatesSet}
      eventContent={renderEventContent}
      height={isMobile ? 'auto' : 680}
      firstDay={1}
      dayMaxEvents={isMobile ? 2 : 3}
      moreLinkText={(n) => `+${n}`}
    />
  )
}
