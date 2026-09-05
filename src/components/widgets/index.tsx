import type { Sector, Widget } from '../../lib/types';
import { TodoWidget } from './TodoWidget';
import { GoalsWidget } from './GoalsWidget';
import { CalendarWidget } from './CalendarWidget';
import { DatesWidget, MeetingsWidget } from './EventWidgets';
import { ContactsWidget } from './ContactsWidget';
import { EmbedWidget, ImageWidget, LinkWidget, NotesWidget, QuoteWidget } from './MediaWidgets';
import { HabitsWidget } from './HabitsWidget';

export function WidgetBody({ widget, sector }: { widget: Widget; sector: Sector }) {
  switch (widget.type) {
    case 'todo': return <TodoWidget widget={widget} sector={sector} />;
    case 'goals': return <GoalsWidget widget={widget} sector={sector} />;
    case 'calendar': return <CalendarWidget widget={widget} sector={sector} />;
    case 'meetings': return <MeetingsWidget widget={widget} sector={sector} />;
    case 'dates': return <DatesWidget widget={widget} sector={sector} />;
    case 'contacts': return <ContactsWidget widget={widget} sector={sector} />;
    case 'notes': return <NotesWidget widget={widget} sector={sector} />;
    case 'quote': return <QuoteWidget widget={widget} sector={sector} />;
    case 'image': return <ImageWidget widget={widget} sector={sector} />;
    case 'link': return <LinkWidget widget={widget} sector={sector} />;
    case 'embed': return <EmbedWidget widget={widget} sector={sector} />;
    case 'habits': return <HabitsWidget widget={widget} sector={sector} />;
    default: return null;
  }
}
