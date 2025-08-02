import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface ScheduleNotificationsProps {
  isAdmin: boolean;
}

interface ScheduleUpdate {
  id: string;
  user_email: string;
  user_name: string;
  month: string;
  updated_at: string;
  created_at: string;
}

const ScheduleNotifications: React.FC<ScheduleNotificationsProps> = ({ isAdmin }) => {
  const [scheduleUpdates, setScheduleUpdates] = useState<ScheduleUpdate[]>([]);
  const [lastChecked, setLastChecked] = useState<string>(() => {
    return localStorage.getItem('lastScheduleCheck') || new Date().toISOString();
  });

  const loadRecentScheduleUpdates = async () => {
    if (!isAdmin) return;

    try {
      // Get schedules updated after last check
      const { data, error } = await supabase
        .from('schedules')
        .select('id, user_email, user_name, month, updated_at, created_at')
        .gt('updated_at', lastChecked)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setScheduleUpdates(data || []);
    } catch (error) {
      console.error('Error loading schedule updates:', error);
    }
  };

  const markAsViewed = () => {
    const now = new Date().toISOString();
    setLastChecked(now);
    localStorage.setItem('lastScheduleCheck', now);
    setScheduleUpdates([]);
  };

  useEffect(() => {
    if (!isAdmin) return;

    loadRecentScheduleUpdates();

    // Set up real-time subscription for schedule changes
    const channel = supabase
      .channel('schedule-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules'
        },
        (payload) => {
          console.log('Schedule change detected:', payload);
          loadRecentScheduleUpdates();
        }
      )
      .subscribe();

    // Poll for updates every 30 seconds
    const interval = setInterval(loadRecentScheduleUpdates, 30000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [isAdmin, lastChecked]);

  if (!isAdmin || scheduleUpdates.length === 0) {
    return null;
  }

  const getUpdateType = (schedule: ScheduleUpdate) => {
    const createdDate = new Date(schedule.created_at);
    const updatedDate = new Date(schedule.updated_at);
    const timeDiff = updatedDate.getTime() - createdDate.getTime();
    
    // If updated within 5 minutes of creation, consider it new
    return timeDiff < 5 * 60 * 1000 ? 'Nova' : 'Atualizada';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {scheduleUpdates.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {scheduleUpdates.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-white">
        <div className="p-3 border-b flex justify-between items-center">
          <h3 className="font-semibold text-sm">Escalas Submetidas</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={markAsViewed}
            className="text-xs h-6"
          >
            Marcar como visto
          </Button>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {scheduleUpdates.map((schedule, index) => (
            <React.Fragment key={schedule.id}>
              <DropdownMenuItem className="p-3 cursor-default">
                <div className="w-full">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{schedule.user_name}</p>
                      <p className="text-xs text-gray-500">{schedule.user_email}</p>
                    </div>
                    <Badge 
                      variant={getUpdateType(schedule) === 'Nova' ? 'default' : 'secondary'}
                      className="text-xs ml-2"
                    >
                      {getUpdateType(schedule)}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-gray-600 mt-1">
                    <div>Escala: {schedule.month}</div>
                    <div className="text-gray-400">
                      {new Date(schedule.updated_at).toLocaleDateString('pt-PT')} às{' '}
                      {new Date(schedule.updated_at).toLocaleTimeString('pt-PT', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
              
              {index < scheduleUpdates.length - 1 && <DropdownMenuSeparator />}
            </React.Fragment>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ScheduleNotifications;