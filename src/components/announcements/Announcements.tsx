
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { BellRing, Edit, Trash2, CalendarIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

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
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [editingId, setEditingId] = useState<number | null>(null);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("list");

  useEffect(() => {
    // Load announcements from localStorage
    loadAnnouncementsFromStorage();
  }, []);

  useEffect(() => {
    // Only save announcements to localStorage if they've been loaded
    if (announcements.length > 0 || document.readyState === 'complete') {
      saveAnnouncementsToStorage();
      
      // Dispatch event to notify other components that announcements have changed
      triggerAnnouncementsChangedEvent();
    }
  }, [announcements]);

  const loadAnnouncementsFromStorage = () => {
    const storedAnnouncements = localStorage.getItem('announcements');
    if (storedAnnouncements) {
      try {
        const parsedAnnouncements = JSON.parse(storedAnnouncements).map((announcement: any) => ({
          ...announcement,
          startDate: new Date(announcement.startDate),
          endDate: new Date(announcement.endDate)
        }));
        setAnnouncements(parsedAnnouncements);
      } catch (error) {
        console.error('Error parsing announcements:', error);
        setAnnouncements([]);
      }
    }
  };

  const saveAnnouncementsToStorage = () => {
    localStorage.setItem('announcements', JSON.stringify(announcements));
  };

  const triggerAnnouncementsChangedEvent = () => {
    const event = new CustomEvent('announcementsChanged', { 
      detail: { announcements } 
    });
    window.dispatchEvent(event);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !content) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }
    
    // Make sure dates are valid Date objects
    const validStartDate = startDate instanceof Date ? startDate : new Date(startDate);
    const validEndDate = endDate instanceof Date ? endDate : new Date(endDate);

    if (editingId !== null) {
      // Update existing announcement
      setAnnouncements(prev => 
        prev.map(item => 
          item.id === editingId 
            ? { ...item, title, content, startDate: validStartDate, endDate: validEndDate }
            : item
        )
      );
      toast({
        title: "Aviso atualizado",
        description: "O aviso foi atualizado com sucesso",
      });
    } else {
      // Create new announcement
      const newAnnouncement: Announcement = {
        id: Date.now(),
        title,
        content,
        startDate: validStartDate,
        endDate: validEndDate,
        createdBy: 'Admin', // In a real app, this would be the current user's name
      };
      
      setAnnouncements(prev => [...prev, newAnnouncement]);
      toast({
        title: "Aviso criado",
        description: "O novo aviso foi criado com sucesso",
      });
    }
    
    // Reset form and switch back to list tab
    resetForm();
    setActiveTab("list");
  };

  const handleEdit = (announcement: Announcement) => {
    setTitle(announcement.title);
    setContent(announcement.content);
    setStartDate(new Date(announcement.startDate));
    setEndDate(new Date(announcement.endDate));
    setEditingId(announcement.id);
    setActiveTab("create");
  };

  const handleDelete = (id: number) => {
    setAnnouncements(prev => prev.filter(item => item.id !== id));
    toast({
      title: "Aviso eliminado",
      description: "O aviso foi eliminado com sucesso",
    });
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setStartDate(new Date());
    setEndDate(new Date());
    setEditingId(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Lista de Avisos</TabsTrigger>
          <TabsTrigger value="create">Criar Aviso</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="h-5 w-5" />
                Avisos Ativos
              </CardTitle>
              <CardDescription>Gerir avisos para os voluntários</CardDescription>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  Não existem avisos criados.
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <Card key={announcement.id} className="w-full">
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
                          className="flex items-center gap-1"
                          onClick={() => handleEdit(announcement)}
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="flex items-center gap-1"
                            >
                              <Trash2 className="h-4 w-4" />
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
                                onClick={() => handleDelete(announcement.id)}
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
        
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingId !== null ? "Editar Aviso" : "Criar Novo Aviso"}
              </CardTitle>
              <CardDescription>
                Preencha os campos para {editingId !== null ? "atualizar o" : "criar um novo"} aviso
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input 
                    id="title" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="Título do aviso" 
                    required 
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Início</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "dd/MM/yyyy", { locale: pt }) : "Selecione uma data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => date && setStartDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Data de Fim</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "dd/MM/yyyy", { locale: pt }) : "Selecione uma data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => date && setEndDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="content">Conteúdo</Label>
                  <Textarea 
                    id="content" 
                    value={content} 
                    onChange={(e) => setContent(e.target.value)} 
                    placeholder="Conteúdo do aviso" 
                    rows={6} 
                    required 
                  />
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    resetForm();
                    setActiveTab("list");
                  }}
                >
                  {editingId !== null ? "Cancelar" : "Limpar"}
                </Button>
                <Button type="submit">
                  {editingId !== null ? "Atualizar" : "Criar"} Aviso
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Announcements;
