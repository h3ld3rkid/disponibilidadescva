
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { 
  LogOut, Users, Calendar, Home,
  ListChecks, UserCog, FileText, Pencil, Users as UsersIcon,
  BellRing, Menu, FileUp, Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface NavbarProps {
  email: string;
  role: string;
}

const Navbar = ({ email, role }: NavbarProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside admin menu to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setAdminMenuOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('mysqlConnection');
    toast({
      title: "Sessão terminada",
      description: "Terminou a sessão com sucesso",
    });
    navigate('/login');
  };

  const navigateToUserManagement = () => {
    navigate('/dashboard/users');
    setIsMenuOpen(false);
    setAdminMenuOpen(false);
  };

  const navigateToHome = () => {
    navigate('/dashboard');
    setIsMenuOpen(false);
  };

  const navigateToCalendar = () => {
    navigate('/dashboard/schedule');
    setIsMenuOpen(false);
  };

  const navigateToCurrentSchedule = () => {
    navigate('/dashboard/current-schedule');
    setIsMenuOpen(false);
  };

  const navigateToUserSchedules = () => {
    navigate('/dashboard/user-schedules');
    setIsMenuOpen(false);
    setAdminMenuOpen(false);
  };

  const navigateToProfile = () => {
    navigate('/dashboard/profile');
    setIsMenuOpen(false);
  };

  const navigateToAnnouncements = () => {
    navigate('/dashboard/announcements');
    setIsMenuOpen(false);
    setAdminMenuOpen(false);
  };

  const navigateToScheduleUpload = () => {
    navigate('/dashboard/schedule-upload');
    setIsMenuOpen(false);
    setAdminMenuOpen(false);
  };

  const toggleAdminMenu = () => {
    setAdminMenuOpen(!adminMenuOpen);
  };

  const renderMenuContent = () => (
    <>
      <Button 
        variant="ghost" 
        className="flex items-center"
        onClick={navigateToHome}
      >
        <Home className="h-4 w-4 mr-2" />
        Início
      </Button>

      <Button 
        variant="ghost" 
        className="flex items-center"
        onClick={navigateToCalendar}
      >
        <Calendar className="h-4 w-4 mr-2" />
        Inserir Escala
      </Button>
      
      <Button 
        variant="ghost" 
        className="flex items-center"
        onClick={navigateToCurrentSchedule}
      >
        <FileText className="h-4 w-4 mr-2" />
        Escala Atual
      </Button>
      
      {role === 'admin' && (
        <Button 
          variant="ghost" 
          className="flex items-center"
          onClick={navigateToAnnouncements}
        >
          <BellRing className="h-4 w-4 mr-2" />
          Avisos
        </Button>
      )}

      {role === 'admin' && (
        <div className="relative" ref={adminMenuRef}>
          <Button 
            variant="ghost" 
            onClick={toggleAdminMenu}
            className="flex items-center"
          >
            <Settings className="h-4 w-4 mr-2" />
            Administração
          </Button>
          
          {adminMenuOpen && (
            <div className="absolute top-full left-0 mt-2 bg-white shadow-lg rounded-md p-2 z-50 min-w-[200px]">
              <Button 
                variant="ghost" 
                className="w-full justify-start mb-1"
                onClick={navigateToUserManagement}
              >
                <UsersIcon className="h-4 w-4 mr-2" />
                Gerir Utilizadores
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start mb-1"
                onClick={navigateToAnnouncements}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar Avisos
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start mb-1"
                onClick={navigateToUserSchedules}
              >
                <ListChecks className="h-4 w-4 mr-2" />
                Escalas dos Utilizadores
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={navigateToScheduleUpload}
              >
                <FileUp className="h-4 w-4 mr-2" />
                Carregar Escala Atual
              </Button>
            </div>
          )}
        </div>
      )}

      <Button 
        variant="ghost" 
        className="flex items-center"
        onClick={navigateToProfile}
      >
        <UserCog className="h-4 w-4 mr-2" />
        Meu Perfil
      </Button>
    </>
  );

  const renderMobileMenu = () => (
    <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col gap-4 py-8">
        <div className="flex items-center mb-6">
          <img 
            src="https://amares.cruzvermelha.pt/images/site/Amares.webp" 
            alt="Cruz Vermelha Amares" 
            className="h-8 object-contain mr-2" 
          />
          <span className="font-semibold">Cruz Vermelha Amares</span>
        </div>
        
        <Button 
          variant="ghost" 
          className="justify-start"
          onClick={navigateToHome}
        >
          <Home className="h-4 w-4 mr-2" />
          Início
        </Button>
        
        <Button 
          variant="ghost" 
          className="justify-start"
          onClick={navigateToCalendar}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Inserir Escala
        </Button>
        
        <Button 
          variant="ghost" 
          className="justify-start"
          onClick={navigateToCurrentSchedule}
        >
          <FileText className="h-4 w-4 mr-2" />
          Escala Atual
        </Button>
        
        {role === 'admin' && (
          <Button 
            variant="ghost" 
            className="justify-start"
            onClick={navigateToAnnouncements}
          >
            <BellRing className="h-4 w-4 mr-2" />
            Avisos
          </Button>
        )}
        
        {role === 'admin' && (
          <>
            <Button 
              variant="ghost" 
              className="justify-start"
              onClick={navigateToUserManagement}
            >
              <Users className="h-4 w-4 mr-2" />
              Gerir Utilizadores
            </Button>
            
            <Button 
              variant="ghost" 
              className="justify-start"
              onClick={navigateToUserSchedules}
            >
              <ListChecks className="h-4 w-4 mr-2" />
              Escalas dos Utilizadores
            </Button>
            
            <Button 
              variant="ghost" 
              className="justify-start"
              onClick={navigateToScheduleUpload}
            >
              <FileUp className="h-4 w-4 mr-2" />
              Carregar Escala Atual
            </Button>
          </>
        )}
        
        <Button 
          variant="ghost" 
          className="justify-start"
          onClick={navigateToProfile}
        >
          <UserCog className="h-4 w-4 mr-2" />
          O Meu Perfil
        </Button>
        
        <div className="mt-auto">
          <p className="text-sm text-gray-600 mb-2">
            {email}
            {role === 'admin' && <span className="ml-1 text-brand-indigo">(Admin)</span>}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="flex items-center gap-1 w-full"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 w-full">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="https://amares.cruzvermelha.pt/images/site/Amares.webp" 
              alt="Cruz Vermelha Amares" 
              className="h-8 object-contain" 
            />
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            {renderMenuContent()}
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden lg:inline">
                Sessão iniciada como <span className="font-medium">{email}</span>
                {role === 'admin' && <span className="ml-1 text-brand-indigo">(Admin)</span>}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="flex items-center gap-1"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
          
          <div className="md:hidden flex items-center">
            {renderMobileMenu()}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
