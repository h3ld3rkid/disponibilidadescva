
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BellRing } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "@/components/ui/carousel";
import { announcementService, Announcement } from "@/services/supabase/announcementService";

const AnnouncementsList = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnnouncements = async () => {
      setIsLoading(true);
      try {
        const activeAnnouncements = await announcementService.getActiveAnnouncements();
        console.log('Loaded announcements in AnnouncementsList:', activeAnnouncements.length, 'active announcements');
        setAnnouncements(activeAnnouncements);
      } catch (error) {
        console.error('Error loading announcements:', error);
        setAnnouncements([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Load announcements immediately
    loadAnnouncements();
    
    // Listen for the custom event
    window.addEventListener('announcementsChanged', loadAnnouncements);
    
    // Refresh announcements every minute to check for expiry
    const interval = setInterval(loadAnnouncements, 60000);

    return () => {
      window.removeEventListener('announcementsChanged', loadAnnouncements);
      clearInterval(interval);
    };
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Avisos Importantes
          </CardTitle>
          <CardDescription>A carregar avisos...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (announcements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Avisos Importantes
          </CardTitle>
          <CardDescription>Não existem avisos ativos no momento.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const SingleAnnouncement = ({ announcement }: { announcement: Announcement }) => (
    <Alert className="bg-[#FEF3F2] border-red-300">
      <AlertTitle className="text-red-700 font-semibold flex items-center justify-between">
        <span>{announcement.title}</span>
        <span className="text-xs font-normal text-gray-500">
          {format(announcement.startDate, "dd/MM/yyyy", { locale: pt })} a {format(announcement.endDate, "dd/MM/yyyy", { locale: pt })}
        </span>
      </AlertTitle>
      <AlertDescription className="text-gray-700 whitespace-pre-wrap mt-2">
        {announcement.content}
      </AlertDescription>
    </Alert>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-lg gap-2">
          <BellRing className="h-5 w-5 text-red-500" />
          Avisos Importantes
        </CardTitle>
        <CardDescription>Avisos ativos para todos os voluntários</CardDescription>
      </CardHeader>
      <CardContent>
        {announcements.length > 1 ? (
          <Carousel className="w-full relative mx-auto">
            <CarouselContent>
              {announcements.map((announcement) => (
                <CarouselItem key={announcement.id}>
                  <SingleAnnouncement announcement={announcement} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-0 md:-left-12" />
            <CarouselNext className="right-0 md:-right-12" />
          </Carousel>
        ) : (
          <SingleAnnouncement announcement={announcements[0]} />
        )}
      </CardContent>
    </Card>
  );
};

export default AnnouncementsList;
