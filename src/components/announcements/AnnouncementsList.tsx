
import React from 'react';
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

interface Announcement {
  id: number;
  title: string;
  content: string;
  startDate: Date;
  endDate: Date;
  createdBy: string;
}

const AnnouncementsList = () => {
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);

  React.useEffect(() => {
    const loadAnnouncements = () => {
      const storedAnnouncements = localStorage.getItem('announcements');
      if (storedAnnouncements) {
        try {
          const parsedAnnouncements = JSON.parse(storedAnnouncements);
          const now = new Date();
          
          // Filter to show only current announcements
          const activeAnnouncements = parsedAnnouncements
            .map((announcement: any) => ({
              ...announcement,
              startDate: new Date(announcement.startDate),
              endDate: new Date(announcement.endDate)
            }))
            .filter((announcement: Announcement) => 
              now >= announcement.startDate && now <= announcement.endDate
            );
          
          setAnnouncements(activeAnnouncements);
          console.log('Loaded announcements in AnnouncementsList:', activeAnnouncements);
        } catch (error) {
          console.error('Error loading announcements:', error);
          setAnnouncements([]);
        }
      }
    };

    loadAnnouncements();
    window.addEventListener('announcementsChanged', loadAnnouncements);
    const interval = setInterval(loadAnnouncements, 60000);

    return () => {
      window.removeEventListener('announcementsChanged', loadAnnouncements);
      clearInterval(interval);
    };
  }, []);

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
