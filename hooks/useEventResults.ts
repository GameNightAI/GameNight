import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { Poll, PollEvent } from '@/types/poll';

interface EventDateResult {
  date: PollEvent;
  ranking: number;
}

interface EventResult {
  event: Poll & {
    poll_events: PollEvent[];
    location?: string;
    start_time?: string | null;
    end_time?: string | null;
    use_same_location?: boolean;
    use_same_time?: boolean;
    date_specific_options?: Record<string, any>;
  };
  eventDates: PollEvent[];
  dateResults: EventDateResult[];
  loading: boolean;
  error: string | null;
}

export const useEventResults = (eventId: string | string[] | undefined) => {
  const [event, setEvent] = useState<EventResult['event'] | null>(null);
  const [eventDates, setEventDates] = useState<PollEvent[]>([]);
  const [dateResults, setDateResults] = useState<EventDateResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track the last eventId to prevent unnecessary re-fetches
  const lastEventIdRef = useRef<string | null>(null);

  const loadEventResults = useCallback(async (id: string) => {
    // Prevent duplicate requests for the same eventId
    if (lastEventIdRef.current === id) {
      return;
    }

    lastEventIdRef.current = id;

    try {
      setLoading(true);
      setError(null);

      // Load event details (only polls that have poll_events - these are events)
      const { data: eventData, error: eventError } = await supabase
        .from('polls')
        .select(`
          *,
          poll_events!inner(
            id,
            event_date,
            start_time,
            end_time,
            location
          )
        `)
        .eq('id', id)
        .single();

      if (eventError) {
        console.error('Event error:', eventError);
        throw new Error('Event not found or this is not an event poll');
      }

      if (!eventData) {
        throw new Error('Event not found or this is not an event poll');
      }

      setEvent(eventData);

      // Load event dates
      const { data: datesData, error: datesError } = await supabase
        .from('poll_events')
        .select('*')
        .eq('poll_id', id)
        .order('event_date', { ascending: true });

      if (datesError) {
        console.error('Event dates error:', datesError);
        throw datesError;
      }

      setEventDates(datesData || []);

      // Create basic date results (without RSVP data for now)
      if (datesData) {
        const results: EventDateResult[] = datesData.map((date, index) => ({
          date,
          ranking: index + 1, // Simple ranking by date order
        }));

        setDateResults(results);
      }

    } catch (err) {
      console.error('Error in loadEventResults:', err);
      setError((err as Error).message || 'Failed to load event results');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (eventId && typeof eventId === 'string') {
      loadEventResults(eventId);
    }
  }, [eventId, loadEventResults]);

  const reload = useCallback(() => {
    if (eventId && typeof eventId === 'string') {
      lastEventIdRef.current = null; // Reset the ref to allow re-fetch
      loadEventResults(eventId);
    }
  }, [eventId, loadEventResults]);

  return {
    event,
    eventDates,
    dateResults,
    loading,
    error,
    reload,
  };
};
