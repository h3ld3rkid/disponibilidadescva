
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { BellRing } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "@/components/ui/carousel";

interface HomeProps {
  userEmail: string;
  isAdmin: boolean;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  startDate: Date;
  endDate: Date;
  createdBy: string;
}

const Home: React.FC<HomeProps> = ({ userEmail, isAdmin }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const { toast } = useToast();

  const loadAnnouncements = () => {
    const storedAnnouncements = localStorage.getItem('announcements');
    if (storedAnnouncements) {
      try {
        const parsedAnnouncements = JSON.parse(storedAnnouncements);
        const currentDate = new Date();
        const validAnnouncements = parsedAnnouncements.map((announcement: any) => ({
          ...announcement,
          startDate: new Date(announcement.startDate),
          endDate: new Date(announcement.endDate)
        })).filter((announcement: Announcement) => {
          const startDate = new Date(announcement.startDate);
          const endDate = new Date(announcement.endDate);
          return startDate <= currentDate && endDate >= currentDate;
        });
        setAnnouncements(validAnnouncements);
        console.log('Loaded announcements in Home:', validAnnouncements);
      } catch (error) {
        console.error('Error parsing announcements:', error);
        setAnnouncements([]);
      }
    } else {
      setAnnouncements([]);
    }
  };

  useEffect(() => {
    loadAnnouncements();
    
    const handleAnnouncementsChange = () => {
      console.log("Announcements changed event received in Home");
      loadAnnouncements();
    };
    
    window.addEventListener('announcementsChanged', handleAnnouncementsChange);
    
    const interval = setInterval(loadAnnouncements, 60000);
    
    return () => {
      window.removeEventListener('announcementsChanged', handleAnnouncementsChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Avisos
          </CardTitle>
          <CardDescription>Avisos importantes para os voluntários</CardDescription>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              Não existem avisos ativos de momento.
            </div>
          ) : announcements.length > 1 ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <Carousel className="w-full relative mx-auto">
                <CarouselContent>
                  {announcements.map((announcement) => (
                    <CarouselItem key={announcement.id}>
                      <Card className="w-full bg-blue-50 border-blue-200">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">{announcement.title}</CardTitle>
                            <div className="text-xs text-gray-500">
                              {format(new Date(announcement.startDate), "dd/MM/yyyy", { locale: pt })} a {format(new Date(announcement.endDate), "dd/MM/yyyy", { locale: pt })}
                            </div>
                          </div>
                          <CardDescription className="text-xs">
                            Publicado por: {announcement.createdBy}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="whitespace-pre-wrap text-sm">{announcement.content}</p>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-0 md:-left-12" />
                <CarouselNext className="right-0 md:-right-12" />
              </Carousel>
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <Card className="w-full bg-blue-50 border-blue-200">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{announcements[0].title}</CardTitle>
                    <div className="text-xs text-gray-500">
                      {format(new Date(announcements[0].startDate), "dd/MM/yyyy", { locale: pt })} a {format(new Date(announcements[0].endDate), "dd/MM/yyyy", { locale: pt })}
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    Publicado por: {announcements[0].createdBy}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{announcements[0].content}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
