
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { 
  Database, LogOut, Users, CalendarPlus, 
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
      title: "Logged out",
      description: "Successfully logged out",
    });
    navigate('/login');
  };

  const navigateToUserManagement = () => {
    navigate('/dashboard/users');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-brand-indigo" />
            <h1 className="text-xl font-semibold text-gray-900">MySQL Connect Portal</h1>
          </div>
          
          <div className="flex items-center space-x-6">
            {role === 'admin' && (
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>
                      <Users className="h-4 w-4 mr-2" />
                      Users
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
                              Manage Users
                            </Button>
                          </li>
                          <li>
                            <Button 
                              variant="ghost" 
                              className="w-full justify-start"
                              onClick={navigateToUserManagement}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Create User
                            </Button>
                          </li>
                          <li>
                            <Button 
                              variant="ghost" 
                              className="w-full justify-start"
                              onClick={navigateToUserManagement}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Users
                            </Button>
                          </li>
                        </ul>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <Button variant="ghost" className="flex items-center">
                      <CalendarPlus className="h-4 w-4 mr-2" />
                      Inserir Escala
                    </Button>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <Button variant="ghost" className="flex items-center">
                      <ListChecks className="h-4 w-4 mr-2" />
                      Escalas dos users
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
                            <Button variant="ghost" className="w-full justify-start">
                              My Profile
                            </Button>
                          </li>
                          <li>
                            <Button variant="ghost" className="w-full justify-start">
                              Settings
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
                Logged in as <span className="font-medium">{email}</span>
                {role === 'admin' && <span className="ml-1 text-brand-indigo">(Admin)</span>}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="flex items-center gap-1"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
