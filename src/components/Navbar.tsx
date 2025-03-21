
import React, { useState } from 'react';
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
  Database, LogOut, Users, Calendar, Home,
  ListChecks, UserCog, UserPlus, Pencil, Users as UsersIcon,
  BellRing, Menu, X
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
  };

  const navigateToHome = () => {
    navigate('/dashboard');
    setIsMenuOpen(false);
  };

  const navigateToCalendar = () => {
    navigate('/dashboard/schedule');
    setIsMenuOpen(false);
  };

  const navigateToUserSchedules = () => {
    navigate('/dashboard/user-schedules');
    setIsMenuOpen(false);
  };

  const navigateToProfile = () => {
    navigate('/dashboard/profile');
    setIsMenuOpen(false);
    toast({
      title: "Em desenvolvimento",
      description: "Esta funcionalidade está a ser implementada",
    });
  };

  const navigateToAnnouncements = () => {
    navigate('/dashboard/announcements');
    setIsMenuOpen(false);
  };

  const renderMenuContent = () => (
    <>
      <Button 
        variant="ghost" 
        className="flex items-center"
        onClick={navigateToHome}
      >
        <Home className="h-4 w-4 mr-2" />
        Home
      </Button>

      {role === 'admin' && (
        <>
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>
                  <Users className="h-4 w-4 mr-2" />
                  Utilizadores
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="p-4 w-[220px]">
                    <ul className="space-y-2">
                      <li>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start"
                          onClick={navigateToUserManagement}
                        >
                          <UsersIcon className="h-4 w-4 mr-2" />
                          Gerir Utilizadores
                        </Button>
                      </li>
                      <li>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start"
                          onClick={navigateToUserManagement}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Criar Utilizador
                        </Button>
                      </li>
                      <li>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start"
                          onClick={navigateToUserManagement}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar Utilizadores
                        </Button>
                      </li>
                    </ul>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <Button 
                  variant="ghost" 
                  className="flex items-center"
                  onClick={navigateToCalendar}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Escala
                </Button>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <Button 
                  variant="ghost" 
                  className="flex items-center"
                  onClick={navigateToUserSchedules}
                >
                  <ListChecks className="h-4 w-4 mr-2" />
                  Escalas dos Utilizadores
                </Button>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Button 
                  variant="ghost" 
                  className="flex items-center"
                  onClick={navigateToAnnouncements}
                >
                  <BellRing className="h-4 w-4 mr-2" />
                  AVISOS
                </Button>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <NavigationMenuTrigger>
                  <UserCog className="h-4 w-4 mr-2" />
                  Meu Menu
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="p-4 w-[200px]">
                    <ul className="space-y-2">
                      <li>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start"
                          onClick={navigateToProfile}
                        >
                          O Meu Perfil
                        </Button>
                      </li>
                      <li>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start"
                          onClick={navigateToProfile}
                        >
                          Definições
                        </Button>
                      </li>
                    </ul>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </>
      )}

      {!role.includes('admin') && (
        <Button 
          variant="ghost" 
          className="flex items-center"
          onClick={navigateToCalendar}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Escala
        </Button>
      )}
    </>
  );

  // Mobile menu with sheet component
  const renderMobileMenu = () => (
    <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col gap-4 py-8">
        <div className="flex items-center mb-6">
          <Database className="h-6 w-6 text-brand-indigo mr-2" />
          <span className="font-semibold">Cruz Vermelha Amares</span>
        </div>
        
        <Button 
          variant="ghost" 
          className="justify-start"
          onClick={navigateToHome}
        >
          <Home className="h-4 w-4 mr-2" />
          Home
        </Button>
        
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
              onClick={navigateToCalendar}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Escala
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
              onClick={navigateToAnnouncements}
            >
              <BellRing className="h-4 w-4 mr-2" />
              AVISOS
            </Button>
            
            <Button 
              variant="ghost" 
              className="justify-start"
              onClick={navigateToProfile}
            >
              <UserCog className="h-4 w-4 mr-2" />
              O Meu Perfil
            </Button>
          </>
        )}
        
        {!role.includes('admin') && (
          <Button 
            variant="ghost" 
            className="justify-start"
            onClick={navigateToCalendar}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Escala
          </Button>
        )}
        
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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-brand-indigo" />
            <h1 className="text-xl font-semibold text-gray-900 hidden sm:block">Escalas Cruz Vermelha Amares</h1>
            <h1 className="text-xl font-semibold text-gray-900 sm:hidden">CV Amares</h1>
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
          
          {/* Mobile menu */}
          <div className="md:hidden flex items-center">
            {renderMobileMenu()}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
