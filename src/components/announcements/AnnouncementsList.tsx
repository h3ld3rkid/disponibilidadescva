
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BellRing } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: number;
  title: string;
  content: string;
  startDate: Date;
  endDate: Date;
  createdBy: string;
}

const AnnouncementsList = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const loadAnnouncements = () => {
    const storedAnnouncements = localStorage.getItem('announcements');
    if (storedAnnouncements) {
      try {
        const parsedAnnouncements = JSON.parse(storedAnnouncements).map((announcement: any) => ({
          ...announcement,
          startDate: new Date(announcement.startDate),
          endDate: new Date(announcement.endDate)
        }));
        // Filter announcements to show only active ones (current date is between startDate and endDate)
        const now = new Date();
        const activeAnnouncements = parsedAnnouncements.filter((announcement: Announcement) => 
          now >= new Date(announcement.startDate) && now <= new Date(announcement.endDate)
        );
        setAnnouncements(activeAnnouncements);
      } catch (error) {
        console.error('Error parsing announcements:', error);
        setAnnouncements([]);
      }
    }
  };

  useEffect(() => {
    // Load announcements initially
    loadAnnouncements();
    
    // Add event listener for announcements changes
    const handleAnnouncementsChange = () => {
      loadAnnouncements();
    };
    
    window.addEventListener('announcementsChanged', handleAnnouncementsChange);
    
    // Check for new announcements every minute
    const interval = setInterval(loadAnnouncements, 60000);
    
    return () => {
      window.removeEventListener('announcementsChanged', handleAnnouncementsChange);
      clearInterval(interval);
    };
  }, []);

  if (announcements.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg gap-2">
            <BellRing className="h-5 w-5 text-red-500" />
            Avisos Importantes
          </CardTitle>
          <CardDescription>Avisos ativos para todos os voluntários</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Alert key={announcement.id} className="bg-[#FEF3F2] border-red-300">
                <AlertTitle className="text-red-700 font-semibold flex items-center justify-between">
                  <span>{announcement.title}</span>
                  <span className="text-xs font-normal text-gray-500">
                    {format(new Date(announcement.startDate), "dd/MM/yyyy", { locale: pt })} a {format(new Date(announcement.endDate), "dd/MM/yyyy", { locale: pt })}
                  </span>
                </AlertTitle>
                <AlertDescription className="text-gray-700 whitespace-pre-wrap mt-2">
                  {announcement.content}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnnouncementsList;
