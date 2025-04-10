
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BellRing } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "@/components/ui/carousel";

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
  const { toast } = useToast();
  const [isHomePage, setIsHomePage] = useState<boolean>(false);

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
        
        // Debug what we're showing
        console.log("Active announcements found:", activeAnnouncements.length);
      } catch (error) {
        console.error('Error parsing announcements:', error);
        setAnnouncements([]);
      }
    }
  };

  useEffect(() => {
    // Check if we're on the home page to avoid duplicate announcements
    const currentPath = window.location.pathname;
    setIsHomePage(currentPath === '/dashboard' || currentPath === '/dashboard/');
    
    // Don't load announcements on home page (they're already shown there)
    if (!isHomePage) {
      // Load announcements initially
      loadAnnouncements();
      
      // Add event listener for announcements changes
      const handleAnnouncementsChange = () => {
        console.log("Announcements changed event received");
        loadAnnouncements();
      };
      
      window.addEventListener('announcementsChanged', handleAnnouncementsChange);
      
      // Check for new announcements every minute
      const interval = setInterval(loadAnnouncements, 60000);
      
      return () => {
        window.removeEventListener('announcementsChanged', handleAnnouncementsChange);
        clearInterval(interval);
      };
    }
  }, [isHomePage]);

  if (announcements.length === 0 || isHomePage) {
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
          {announcements.length > 1 ? (
            <Carousel className="w-full relative mx-auto">
              <CarouselContent>
                {announcements.map((announcement) => (
                  <CarouselItem key={announcement.id}>
                    <Alert className="bg-[#FEF3F2] border-red-300">
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
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-0 md:-left-12" />
              <CarouselNext className="right-0 md:-right-12" />
            </Carousel>
          ) : (
            <Alert className="bg-[#FEF3F2] border-red-300">
              <AlertTitle className="text-red-700 font-semibold flex items-center justify-between">
                <span>{announcements[0].title}</span>
                <span className="text-xs font-normal text-gray-500">
                  {format(new Date(announcements[0].startDate), "dd/MM/yyyy", { locale: pt })} a {format(new Date(announcements[0].endDate), "dd/MM/yyyy", { locale: pt })}
                </span>
              </AlertTitle>
              <AlertDescription className="text-gray-700 whitespace-pre-wrap mt-2">
                {announcements[0].content}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnnouncementsList;
