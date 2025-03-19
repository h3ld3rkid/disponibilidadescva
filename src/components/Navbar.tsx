
import React from 'react';
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
  Database, LogOut, Users, Calendar, 
  ListChecks, UserCog, UserPlus, Pencil, Users as UsersIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NavbarProps {
  email: string;
  role: string;
}

const Navbar = ({ email, role }: NavbarProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

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
  };

  const navigateToCalendar = () => {
    navigate('/dashboard');
  };

  const navigateToUserSchedules = () => {
    navigate('/dashboard/user-schedules');
  };

  const navigateToProfile = () => {
    navigate('/dashboard/profile');
    toast({
      title: "Em desenvolvimento",
      description: "Esta funcionalidade está a ser implementada",
    });
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-brand-indigo" />
            <h1 className="text-xl font-semibold text-gray-900">Escalas Cruz Vermelha Amares</h1>
          </div>
          
          <div className="flex items-center space-x-6">
            {role === 'admin' && (
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
                      Escalas Anteriores
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
            )}
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden md:inline">
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
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
