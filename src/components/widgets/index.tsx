import type { Sector, Widget } from '../../lib/types';
import { TodoWidget } from './TodoWidget';
import { GoalsWidget } from './GoalsWidget';
import { CalendarWidget } from './CalendarWidget';
import { DatesWidget, MeetingsWidget } from './EventWidgets';
import { ContactsWidget } from './ContactsWidget';
import { EmbedWidget, ImageWidget, LinkWidget, NotesWidget, QuoteWidget } from './MediaWidgets';
import { HabitsWidget } from './HabitsWidget';
import { CollectionWidget } from './CollectionWidget';
import { TrackerWidget } from './TrackerWidget';
import { PapersWidget } from './PapersWidget';
import { FollowUpsWidget } from './FollowUpsWidget';
import { CountdownWidget, JournalWidget, MaterialsWidget, ThermometerWidget, WheelWidget } from './SmallWidgets';
import { SpreadWidget } from './SpreadWidget';

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
    case 'collection': return <CollectionWidget widget={widget} sector={sector} />;
    case 'tracker': return <TrackerWidget widget={widget} sector={sector} />;
    case 'papers': return <PapersWidget widget={widget} sector={sector} />;
    case 'followups': return <FollowUpsWidget widget={widget} sector={sector} />;
    case 'journal': return <JournalWidget widget={widget} sector={sector} />;
    case 'countdown': return <CountdownWidget widget={widget} sector={sector} />;
    case 'thermometer': return <ThermometerWidget widget={widget} sector={sector} />;
    case 'wheel': return <WheelWidget widget={widget} sector={sector} />;
    case 'materials': return <MaterialsWidget widget={widget} sector={sector} />;
    case 'spread': return <SpreadWidget widget={widget} sector={sector} />;
    default: return null;
  }
}
