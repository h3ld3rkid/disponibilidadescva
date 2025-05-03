
import React from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { BellRing } from "lucide-react";

interface Announcement {
  id: number;
  title: string;
  content: string;
  startDate: Date;
  endDate: Date;
  createdBy: string;
}

const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);

  React.useEffect(() => {
    const loadAnnouncements = () => {
      const storedAnnouncements = localStorage.getItem('announcements');
      if (storedAnnouncements) {
        try {
          const parsedAnnouncements = JSON.parse(storedAnnouncements);
          const now = new Date();
          
          // Process announcements - make sure dates are correctly parsed
          const activeAnnouncements = parsedAnnouncements
            .map((announcement: any) => ({
              ...announcement,
              startDate: new Date(announcement.startDate),
              endDate: new Date(announcement.endDate)
            }))
            .filter((announcement: Announcement) => 
              now >= announcement.startDate && now <= announcement.endDate
            );
          
          console.log('Loaded active announcements in banner:', activeAnnouncements);
          setAnnouncements(activeAnnouncements);
        } catch (error) {
          console.error('Error loading announcements:', error);
          setAnnouncements([]);
        }
      } else {
        console.log('No announcements found in localStorage');
      }
    };

    // Initial load
    loadAnnouncements();
    
    // Set up listeners for announcement changes
    window.addEventListener('announcementsChanged', loadAnnouncements);
    
    // Check for new announcements every minute
    const interval = setInterval(loadAnnouncements, 60000);

    return () => {
      window.removeEventListener('announcementsChanged', loadAnnouncements);
      clearInterval(interval);
    };
  }, []);

  if (announcements.length === 0) {
    return null;
  }

  const SingleAnnouncement = ({ announcement }: { announcement: Announcement }) => (
    <Alert className="bg-[#FEF3F2] border-red-300 mb-0">
      <AlertTitle className="text-red-700 font-semibold flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5" />
          {announcement.title}
        </div>
        <span className="text-xs font-normal text-gray-500">
          {format(announcement.startDate, "dd/MM/yyyy", { locale: pt })} a {format(announcement.endDate, "dd/MM/yyyy", { locale: pt })}
        </span>
      </AlertTitle>
      <AlertDescription className="text-gray-700 mt-2">
        {announcement.content}
      </AlertDescription>
    </Alert>
  );

  return (
    <div className="w-full bg-white border-b">
      <div className="container mx-auto px-4 py-2">
        {announcements.length > 1 ? (
          <Carousel>
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
      </div>
    </div>
  );
};

export default AnnouncementBanner;
