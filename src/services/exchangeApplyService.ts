import { supabase } from "@/integrations/supabase/client";

export interface ServiceEntryLike {
  date: string; // DD/MM/YYYY
  mechanographicNumber: string;
  rawText: string;
  isGray?: boolean;
}

/**
 * Convert YYYY-MM-DD (DB) to DD/MM/YYYY (UI).
 */
const isoToPt = (iso: string): string => {
  if (!iso) return '';
  // Handle full timestamps too (e.g., 2026-04-18T00:00:00)
  const datePart = iso.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length !== 3) return '';
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

/**
 * Apply accepted shift exchanges to a user's service list.
 * - If the user OFFERED a date in an accepted exchange => remove that date.
 * - If the user RECEIVED a date in an accepted exchange => add that date.
 *
 * Broadcasts (offered_date='') are skipped because the requester didn't trade
 * one of their own dates — only the target's date moved to the requester.
 * Actually: in a broadcast, the requester proposes "I want this date";
 * when accepted, the target gives that date to the requester and the requester
 * gives... nothing concrete via broadcast. We treat broadcast acceptance as
 * a transfer of requested_date only when both sides have valid dates.
 */
export const applyAcceptedExchangesToServices = async (
  userEmail: string,
  mechNumber: string,
  entries: ServiceEntryLike[]
): Promise<ServiceEntryLike[]> => {
  if (!userEmail || !mechNumber) return entries;

  try {
    const { data, error } = await supabase
      .from('shift_exchange_requests')
      .select('requester_email, target_email, requested_date, offered_date, status')
      .eq('status', 'accepted')
      .or(`requester_email.eq.${userEmail},target_email.eq.${userEmail}`);

    if (error) {
      console.error('Error loading accepted exchanges:', error);
      return entries;
    }

    if (!data || data.length === 0) return entries;

    const datesToRemove = new Set<string>(); // PT format
    const datesToAdd = new Set<string>();    // PT format

    for (const ex of data) {
      const requestedPt = isoToPt(ex.requested_date);
      const offeredPt = isoToPt(ex.offered_date);

      if (ex.requester_email === userEmail) {
        // User asked for requested_date and gave offered_date
        if (offeredPt) datesToRemove.add(offeredPt);
        if (requestedPt) datesToAdd.add(requestedPt);
      } else if (ex.target_email === userEmail) {
        // User gave requested_date and received offered_date
        if (requestedPt) datesToRemove.add(requestedPt);
        if (offeredPt) datesToAdd.add(offeredPt);
      }
    }

    console.log('🔄 Applying accepted exchanges:', {
      remove: Array.from(datesToRemove),
      add: Array.from(datesToAdd),
    });

    // Remove traded-away dates
    const filtered = entries.filter(e => !datesToRemove.has(e.date));

    // Add received dates (avoid duplicates)
    const existingDates = new Set(filtered.map(e => e.date));
    for (const d of datesToAdd) {
      if (!existingDates.has(d)) {
        filtered.push({
          date: d,
          mechanographicNumber: mechNumber,
          rawText: '(Recebido por troca)',
          isGray: false,
        });
      }
    }

    // Sort chronologically
    filtered.sort((a, b) => {
      const [da, ma, ya] = a.date.split('/').map(Number);
      const [db, mb, yb] = b.date.split('/').map(Number);
      return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
    });

    return filtered;
  } catch (err) {
    console.error('Error applying exchanges:', err);
    return entries;
  }
};
