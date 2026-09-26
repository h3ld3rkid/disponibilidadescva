import { supabase } from '@/integrations/supabase/client';
import { getResolvedServicesForMech } from '@/services/scheduleGridService';

interface CachedService {
  date: string;
  startTime?: string;
  mechanographicNumber: string;
  isGray?: boolean;
}

/**
 * Refresh the user_service_cache row for the given user based on the current
 * XLSX schedule. Merges with any existing cache so that months NOT covered
 * by the current XLSX are preserved (past months are not wiped).
 *
 * Safe to call in the background — errors are swallowed and logged.
 */
export const syncUserServiceCache = async (
  userEmail: string,
  mechNumber?: string
): Promise<void> => {
  if (!userEmail) return;

  try {
    let mech = mechNumber ? String(mechNumber) : '';
    if (!mech) {
      const { data } = await supabase
        .from('users')
        .select('mechanographic_number')
        .eq('email', userEmail)
        .maybeSingle();
      mech = String(data?.mechanographic_number || '');
    }
    if (!mech) return;

    const resolved = await getResolvedServicesForMech(mech);


    const newEntries: CachedService[] = resolved.map(r => ({
      date: r.date,
      startTime: r.startTime,
      mechanographicNumber: r.mechanographicNumber,
      isGray: r.isGray || false,
    }));

    // Months (YYYY-MM) covered by the new upload
    const newMonths = new Set<string>();
    for (const e of newEntries) {
      const [, mm, yyyy] = e.date.split('/');
      if (mm && yyyy) newMonths.add(`${yyyy}-${mm}`);
    }

    const { data: existing } = await supabase
      .from('user_service_cache')
      .select('services')
      .eq('user_email', userEmail)
      .maybeSingle();

    const previous: any[] = Array.isArray(existing?.services)
      ? (existing!.services as any[])
      : [];

    const preserved = previous.filter(p => {
      if (!p?.date) return false;
      const [, mm, yyyy] = String(p.date).split('/');
      return !newMonths.has(`${yyyy}-${mm}`);
    });

    const merged = [...preserved, ...newEntries].sort((a, b) => {
      const [da, ma, ya] = String(a.date).split('/').map(Number);
      const [db, mb, yb] = String(b.date).split('/').map(Number);
      return (
        new Date(ya, ma - 1, da).getTime() -
        new Date(yb, mb - 1, db).getTime()
      );
    });

    await supabase.from('user_service_cache').upsert(
      {
        user_email: userEmail,
        mechanographic_number: mech,
        services: merged,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_email' }
    );
  } catch (err) {
    console.warn('[serviceCacheSync] Failed to refresh cache:', err);
  }
};

/**
 * Refresh the service cache for ALL users (used after the admin updates the
 * schedule XLSX) so calendar subscriptions pick up the new services.
 */
export const syncAllUsersServiceCache = async (): Promise<{ total: number; synced: number }> => {
  const { resolveScheduleByMech } = await import('@/services/scheduleGridService');
  await resolveScheduleByMech(true);
  const { data: users } = await supabase
    .from('users')
    .select('email, mechanographic_number');
  const list = (users || []).filter(u => u.email && u.mechanographic_number);
  let synced = 0;
  for (const u of list) {
    await syncUserServiceCache(u.email, String(u.mechanographic_number));
    synced++;
  }
  return { total: list.length, synced };
};
