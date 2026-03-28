import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/tr'
import type { SlotInfo } from 'react-big-calendar'

moment.locale('tr')
const localizer = momentLocalizer(moment)

export type EtkinlikTur = 'gerceklesen' | 'planlanan' | 'beklenen'

export interface TakvimEtkinlik {
  id: number
  title: string
  start: Date
  end: Date
  tur: EtkinlikTur
  gunlukFiyat?: number | null
  allDay?: boolean
}

interface TakvimWidgetProps {
  etkinlikler: TakvimEtkinlik[]
  onNavigate?: (date: Date) => void
  onSelectEvent?: (event: TakvimEtkinlik) => void
  onSelectSlot?: (slot: SlotInfo) => void
}

function eventPropGetter(event: TakvimEtkinlik, slotDate: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const slot = new Date(slotDate)
  slot.setHours(0, 0, 0, 0)

  if (event.tur === 'beklenen') {
    return { style: { backgroundColor: '#f06292', borderColor: '#c2185b', color: '#fff' } }
  }
  if (slot <= today) {
    return { style: { backgroundColor: '#4caf50', borderColor: '#388e3c', color: '#fff' } }
  }
  return { style: { backgroundColor: '#ffb300', borderColor: '#f57f17', color: '#333' } }
}

const messages = {
  today:     'Bugün',
  previous:  '‹',
  next:      '›',
  month:     'Ay',
  week:      'Hafta',
  day:       'Gün',
  agenda:    'Ajanda',
  date:      'Tarih',
  time:      'Saat',
  event:     'Etkinlik',
  noEventsInRange: 'Bu aralıkta etkinlik yok.',
}

export function TakvimWidget({ etkinlikler, onNavigate, onSelectEvent, onSelectSlot }: TakvimWidgetProps) {
  return (
    <div style={{ height: 680 }}>
      <Calendar
        localizer={localizer}
        events={etkinlikler}
        startAccessor="start"
        endAccessor="end"
        eventPropGetter={eventPropGetter as never}
        onNavigate={onNavigate}
        onSelectEvent={onSelectEvent as never}
        onSelectSlot={onSelectSlot}
        selectable
        messages={messages}
        culture="tr"
        style={{ height: '100%' }}
      />
    </div>
  )
}
