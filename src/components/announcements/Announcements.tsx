
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { BellRing, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import AnnouncementForm from './AnnouncementForm';
import { announcementService, Announcement } from "@/services/supabase/announcementService";

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeTab, setActiveTab] = useState("list");
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAnnouncements();
    
    // Set up listener for announcement changes
    const handleAnnouncementsChange = () => {
      loadAnnouncements();
    };
    
    window.addEventListener('announcementsChanged', handleAnnouncementsChange);
    
    // Poll for updates every minute
    const interval = setInterval(() => {
      loadAnnouncements();
    }, 60000);
    
    return () => {
      window.removeEventListener('announcementsChanged', handleAnnouncementsChange);
      clearInterval(interval);
    };
  }, []);

  const loadAnnouncements = async () => {
    setIsLoading(true);
    try {
      const allAnnouncements = await announcementService.getAllAnnouncements();
      setAnnouncements(allAnnouncements);
      console.log('Loaded announcements in Announcements component:', allAnnouncements.length);
    } catch (error) {
      console.error('Error loading announcements:', error);
      setAnnouncements([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAnnouncement = async (data: {
    title: string;
    content: string;
    startDate: Date;
    endDate: Date;
  }) => {
    const userConnection = localStorage.getItem('mysqlConnection');
    if (!userConnection) {
      toast({
        title: "Erro",
        description: "Não foi possível identificar o utilizador",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const userInfo = JSON.parse(userConnection);
      const result = await announcementService.createAnnouncement({
        ...data,
        createdBy: userInfo.email
      });

      if (result.success) {
        toast({
          title: "Aviso criado",
          description: "O aviso foi criado com sucesso",
        });
        setActiveTab("list");
        loadAnnouncements();
      } else {
        throw new Error("Failed to create announcement");
      }
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast({
        title: "Erro ao criar aviso",
        description: "Ocorreu um erro ao criar o aviso",
        variant: "destructive",
      });
    }
  };

  const handleEditAnnouncement = async (data: {
    title: string;
    content: string;
    startDate: Date;
    endDate: Date;
  }) => {
    if (!editingAnnouncement || !editingAnnouncement.id) {
      toast({
        title: "Erro",
        description: "Não foi possível identificar o aviso a editar",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await announcementService.updateAnnouncement(
        editingAnnouncement.id,
        {
          ...data,
          createdBy: editingAnnouncement.createdBy
        }
      );

      if (result.success) {
        toast({
          title: "Aviso atualizado",
          description: "O aviso foi atualizado com sucesso",
        });
        setEditingAnnouncement(null);
        setActiveTab("list");
        loadAnnouncements();
      } else {
        throw new Error("Failed to update announcement");
      }
    } catch (error) {
      console.error("Error updating announcement:", error);
      toast({
        title: "Erro ao atualizar aviso",
        description: "Ocorreu um erro ao atualizar o aviso",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const result = await announcementService.deleteAnnouncement(id);
      
      if (result.success) {
        toast({
          title: "Aviso eliminado",
          description: "O aviso foi eliminado com sucesso",
        });
        loadAnnouncements();
      } else {
        throw new Error("Failed to delete announcement");
      }
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast({
        title: "Erro ao eliminar aviso",
        description: "Ocorreu um erro ao eliminar o aviso",
        variant: "destructive",
      });
    }
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
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  <p className="mt-2 text-gray-500">A carregar avisos...</p>
                </div>
              ) : announcements.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  Não existem avisos criados.
                </p>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
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
                                onClick={() => announcement.id && handleDeleteAnnouncement(announcement.id)}
                              >
                                Eliminar
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
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
