
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { BellRing, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import AnnouncementForm from './AnnouncementForm';

interface Announcement {
  id: number;
  title: string;
  content: string;
  startDate: Date;
  endDate: Date;
  createdBy: string;
}

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeTab, setActiveTab] = useState("list");
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = () => {
    const storedAnnouncements = localStorage.getItem('announcements');
    if (storedAnnouncements) {
      try {
        const parsedAnnouncements = JSON.parse(storedAnnouncements);
        const processedAnnouncements = parsedAnnouncements.map((announcement: any) => ({
          ...announcement,
          startDate: new Date(announcement.startDate),
          endDate: new Date(announcement.endDate)
        }));
        setAnnouncements(processedAnnouncements);
      } catch (error) {
        console.error('Error loading announcements:', error);
        setAnnouncements([]);
      }
    }
  };

  const saveAnnouncements = (newAnnouncements: Announcement[]) => {
    localStorage.setItem('announcements', JSON.stringify(newAnnouncements));
    setAnnouncements(newAnnouncements);
    window.dispatchEvent(new Event('announcementsChanged'));
  };

  const handleCreateAnnouncement = (data: {
    title: string;
    content: string;
    startDate: Date;
    endDate: Date;
  }) => {
    const userConnection = localStorage.getItem('mysqlConnection');
    if (!userConnection) return;
    
    const userInfo = JSON.parse(userConnection);
    const newAnnouncement = {
      ...data,
      id: Date.now(),
      createdBy: userInfo.email
    };

    saveAnnouncements([...announcements, newAnnouncement]);
    toast({
      title: "Aviso criado",
      description: "O aviso foi criado com sucesso",
    });
    setActiveTab("list");
  };

  const handleEditAnnouncement = (data: {
    title: string;
    content: string;
    startDate: Date;
    endDate: Date;
  }) => {
    if (!editingAnnouncement) return;

    const updatedAnnouncements = announcements.map(announcement =>
      announcement.id === editingAnnouncement.id
        ? { ...announcement, ...data }
        : announcement
    );

    saveAnnouncements(updatedAnnouncements);
    toast({
      title: "Aviso atualizado",
      description: "O aviso foi atualizado com sucesso",
    });
    setEditingAnnouncement(null);
    setActiveTab("list");
  };

  const handleDeleteAnnouncement = (id: number) => {
    const filteredAnnouncements = announcements.filter(a => a.id !== id);
    saveAnnouncements(filteredAnnouncements);
    toast({
      title: "Aviso eliminado",
      description: "O aviso foi eliminado com sucesso",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Lista de Avisos</TabsTrigger>
          <TabsTrigger value="create">Criar Aviso</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="h-5 w-5" />
                Avisos
              </CardTitle>
              <CardDescription>Lista de todos os avisos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {announcements.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    Não existem avisos criados.
                  </p>
                ) : (
                  announcements.map((announcement) => (
                    <Card key={announcement.id}>
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
                        <p className="whitespace-pre-wrap">{announcement.content}</p>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingAnnouncement(announcement);
                            setActiveTab("create");
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirmar eliminação</DialogTitle>
                            </DialogHeader>
                            <p>Tem a certeza que deseja eliminar este aviso?</p>
                            <DialogFooter>
                              <Button
                                variant="destructive"
                                onClick={() => handleDeleteAnnouncement(announcement.id)}
                              >
                                Eliminar
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="mt-4">
          <AnnouncementForm
            onSubmit={editingAnnouncement ? handleEditAnnouncement : handleCreateAnnouncement}
            editingAnnouncement={editingAnnouncement || undefined}
            onCancel={() => {
              setEditingAnnouncement(null);
              setActiveTab("list");
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Announcements;
