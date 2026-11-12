import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { EventDiscoveryView } from '../components/events/EventDiscoveryView';
import { EventDetailsView } from '../components/events/EventDetailsView';
import { EventCreatorModal } from '../components/events/EventCreatorModal';
import { EventOrganizerDashboard } from '../components/events/EventOrganizerDashboard';
import { EventAdminPanel } from '../components/events/EventAdminPanel';

export default function EventsPage() {
  // Navigation View Modes: 'discovery' | 'details' | 'organizer' | 'admin'
  const [viewMode, setViewMode] = useState<'discovery' | 'details' | 'organizer' | 'admin'>('discovery');
  const [selectedEventId, setSelectedEventId] = useState<string>('evt-1');
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setViewMode('details');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Sub-View Render */}
      {viewMode === 'discovery' && (
        <EventDiscoveryView
          onSelectEvent={handleSelectEvent}
          onCreateEventClick={() => setIsCreatorOpen(true)}
          onOpenOrganizerHub={() => setViewMode('organizer')}
        />
      )}

      {viewMode === 'details' && (
        <EventDetailsView
          eventId={selectedEventId}
          onBack={() => setViewMode('discovery')}
        />
      )}

      {viewMode === 'organizer' && (
        <EventOrganizerDashboard
          onBackToFeed={() => setViewMode('discovery')}
        />
      )}

      {viewMode === 'admin' && (
        <EventAdminPanel />
      )}

      {/* AI Event Creator Modal */}
      <AnimatePresence>
        {isCreatorOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <EventCreatorModal
              onClose={() => setIsCreatorOpen(false)}
              onEventCreated={() => setViewMode('discovery')}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
