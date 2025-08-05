
import { supabase } from "@/integrations/supabase/client";

export interface Announcement {
  id?: string;
  title: string;
  content: string;
  startDate: Date;
  endDate: Date;
  createdBy: string;
}

export const announcementService = {
  // Create announcement
  async createAnnouncement(announcement: Announcement): Promise<{ success: boolean; id?: string }> {
    console.log('Supabase: Creating announcement', announcement);
    
    try {
      // Insert into Supabase
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          title: announcement.title,
          content: announcement.content,
          start_date: announcement.startDate.toISOString(),
          end_date: announcement.endDate.toISOString(),
          created_by: announcement.createdBy
        })
        .select('id')
        .single();
        
      if (error) throw error;
      
      // Trigger an event to notify other components that announcements have changed
      window.dispatchEvent(new Event('announcementsChanged'));
      
      return { success: true, id: data.id };
    } catch (error) {
      console.error('Error creating announcement:', error);
      return { success: false };
    }
  },
  
  // Update announcement
  async updateAnnouncement(id: string, announcement: Announcement): Promise<{ success: boolean }> {
    console.log('Supabase: Updating announcement', id, announcement);
    
    try {
      // Update in Supabase
      const { error } = await supabase
        .from('announcements')
        .update({
          title: announcement.title,
          content: announcement.content,
          start_date: announcement.startDate.toISOString(),
          end_date: announcement.endDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (error) throw error;
      
      // Trigger an event to notify other components that announcements have changed
      window.dispatchEvent(new Event('announcementsChanged'));
      
      return { success: true };
    } catch (error) {
      console.error('Error updating announcement:', error);
      return { success: false };
    }
  },
  
  // Delete announcement
  async deleteAnnouncement(id: string): Promise<{ success: boolean }> {
    console.log('Supabase: Deleting announcement', id);
    
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Trigger an event to notify other components that announcements have changed
      window.dispatchEvent(new Event('announcementsChanged'));
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting announcement:', error);
      return { success: false };
    }
  },
  
  // Get active announcements (current date is between start and end date)
  async getActiveAnnouncements(): Promise<Announcement[]> {
    console.log('Supabase: Getting active announcements');
    
    try {
      const now = new Date().toISOString();
      
      // Get from Supabase
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .lte('start_date', now)
        .gte('end_date', now)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          title: item.title,
          content: item.content,
          startDate: new Date(item.start_date),
          endDate: new Date(item.end_date),
          createdBy: item.created_by
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error getting active announcements:', error);
      return [];
    }
  },
  
  // Get all announcements
  async getAllAnnouncements(): Promise<Announcement[]> {
    console.log('Supabase: Getting all announcements');
    
    try {
      // Get from Supabase
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          title: item.title,
          content: item.content,
          startDate: new Date(item.start_date),
          endDate: new Date(item.end_date),
          createdBy: item.created_by
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error getting all announcements:', error);
      return [];
    }
  },
  
  // Set up real-time subscription for announcement changes
  setupRealtimeSubscription(callback: () => void) {
    const channel = supabase
      .channel('announcements-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'announcements' 
        }, 
        (payload) => {
          console.log('Realtime announcement change detected:', payload);
          callback();
        })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }
};
