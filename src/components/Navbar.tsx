
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import {
  Menu, 
  X, 
  Home, 
  Calendar, 
  Users, 
  UserCheck, 
  Upload, 
  Megaphone, 
  Settings, 
  LogOut, 
  User,
  ArrowLeftRight,
  CalendarCheck,
  ChevronDown,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import ExchangeNotifications from '@/components/schedule/ExchangeNotifications';
import ScheduleNotifications from '@/components/schedule/ScheduleNotifications';
import { AdminNotifications } from '@/components/admin/AdminNotifications';
import { PushNotificationManager } from '@/components/push/PushNotificationManager';
import { userService } from "@/services/supabase/userService";
import { sessionManager } from '@/services/sessionManager';
import { roleService } from '@/services/supabase/roleService';

interface NavbarProps {
  email: string;
  role: string;
}

const Navbar: React.FC<NavbarProps> = ({ email, role }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [verifiedAdmin, setVerifiedAdmin] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Verificar role na BD ao montar o componente
  useEffect(() => {
    const verifyRole = async () => {
      const { isAdmin } = await roleService.getUserRole(email);
      setVerifiedAdmin(isAdmin);
    };
    verifyRole();
  }, [email]);

  // Usar role verificado na BD em vez do prop
  const isAdmin = verifiedAdmin;

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // Get user info from localStorage first
        const storedUser = localStorage.getItem('mysqlConnection');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUserInfo(parsedUser);
          
          // If mechanographic number is missing, fetch from database
          if (!parsedUser.mechanographic_number || parsedUser.mechanographic_number === 'N/A') {
            const allUsers = await userService.getAllUsers();
            const currentUser = allUsers.find(user => user.email === email);
            if (currentUser) {
              const updatedUser = {
                ...parsedUser,
                mechanographic_number: currentUser.mechanographic_number,
                name: currentUser.name
              };
              setUserInfo(updatedUser);
              localStorage.setItem('mysqlConnection', JSON.stringify(updatedUser));
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    fetchUserInfo();
  }, [email]);

  const handleLogout = () => {
    sessionManager.clearSession();
    toast({
      title: "Sessão terminada",
      description: "A sua sessão foi terminada com sucesso",
    });
    navigate('/login');
  };

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const userNavItems = [
    { path: '/dashboard', icon: Home, label: 'Início' },
    { path: '/dashboard/schedule', icon: Calendar, label: 'Disponibilidade' },
    { path: '/dashboard/current-schedule', icon: CalendarCheck, label: 'Escala' },
    { path: '/dashboard/my-services', icon: CalendarDays, label: 'Meus Serviços' },
    { path: '/dashboard/exchanges', icon: ArrowLeftRight, label: 'Trocas' },
    { path: '/dashboard/updated-schedule', icon: FileSpreadsheet, label: 'Escala Atualizada' },
    { path: '/dashboard/profile', icon: User, label: 'Perfil' },
  ];

  const adminNavItems = [
    { path: '/dashboard/users', icon: Users, label: 'Utilizadores' },
    { path: '/dashboard/user-schedules', icon: UserCheck, label: 'Escalas Recebidas' },
    { path: '/dashboard/announcements', icon: Megaphone, label: 'Avisos' },
    { path: '/dashboard/config/database', icon: Settings, label: 'Configurações' },
  ];

  const scheduleFileSubmenu = [
    { path: '/dashboard/schedule-upload', icon: Upload, label: 'Upload Escala Atual' },
    { path: '/dashboard/config/pdf-additional', icon: Settings, label: 'Configuração do Link PDF Adicional' },
    { path: '/dashboard/config/xlsx', icon: Settings, label: 'Configuração XLSX' },
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50 w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 w-full">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3 flex-shrink-0 min-w-0">
            <Link to="/dashboard" className="flex items-center space-x-3">
              <img 
                src="https://amares.cruzvermelha.pt/images/site/Amares.webp" 
                alt="Cruz Vermelha Portuguesa - Delegação de Amares" 
                className="h-8 w-auto flex-shrink-0"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <span className="font-semibold text-lg text-gray-900 hidden sm:block whitespace-nowrap">
                Escalas CVA
              </span>
            </Link>
          </div>

          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex items-center justify-center flex-1 px-4 overflow-hidden">
            <div className="flex items-center space-x-1 flex-wrap justify-center">
              {userNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    isActivePath(item.path)
                      ? 'bg-red-100 text-red-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              ))}
              
              {isAdmin && (
                <>
                  <div className="h-6 w-px bg-gray-300 mx-2 hidden lg:block" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap">
                        <Settings className="h-4 w-4 flex-shrink-0" />
                        <span className="hidden lg:inline">Administração</span>
                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-white z-50">
                      {adminNavItems.map((item, index) => (
                        <div key={item.path}>
                          <DropdownMenuItem asChild>
                            <Link
                              to={item.path}
                              className={`flex items-center space-x-2 w-full px-2 py-2 text-sm ${
                                isActivePath(item.path)
                                  ? 'bg-red-100 text-red-700'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          </DropdownMenuItem>
                          {index < adminNavItems.length - 1 && <DropdownMenuSeparator />}
                        </div>
                      ))}
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="flex items-center space-x-2 px-2 py-2 text-sm text-gray-600 hover:text-gray-900">
                          <CalendarCheck className="h-4 w-4" />
                          <span>Ficheiros Escala</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-56 bg-white z-50">
                          {scheduleFileSubmenu.map((item, index) => (
                            <div key={item.path}>
                              <DropdownMenuItem asChild>
                                <Link
                                  to={item.path}
                                  className={`flex items-center space-x-2 w-full px-2 py-2 text-sm ${
                                    isActivePath(item.path)
                                      ? 'bg-red-100 text-red-700'
                                      : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.label}</span>
                                </Link>
                              </DropdownMenuItem>
                              {index < scheduleFileSubmenu.length - 1 && <DropdownMenuSeparator />}
                            </div>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>

          {/* User Info and Actions */}
          <div className="flex items-center space-x-3 flex-shrink-0 min-w-0">
            {/* Admin Notifications */}
            {isAdmin && <AdminNotifications />}
            
            {/* Admin Schedule Notifications */}
            <ScheduleNotifications isAdmin={isAdmin} />
            
            {/* Exchange Notifications */}
            {userInfo?.email && (
              <ExchangeNotifications userEmail={userInfo.email} />
            )}
            
            {/* User Info */}
            <div className="hidden sm:flex flex-col items-end min-w-0">
              <span className="text-sm font-medium text-gray-900 max-w-32 truncate">
                {userInfo?.name || email}
              </span>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  Nº {userInfo?.mechanographic_number || 'N/A'}
                </span>
                {isAdmin && (
                  <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">
                    Admin
                  </span>
                )}
              </div>
            </div>

            {/* Logout Button */}
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-red-600 flex-shrink-0"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:ml-2 sm:inline">Sair</span>
            </Button>

            {/* Mobile Menu Button */}
            <Button
              onClick={() => setIsOpen(!isOpen)}
              variant="ghost"
              size="sm"
              className="md:hidden flex-shrink-0"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-2">
              {/* User Info Mobile */}
              <div className="px-3 py-2 bg-gray-50 rounded-md mb-2">
                <div className="text-sm font-medium text-gray-900">
                  {userInfo?.name || email}
                </div>
                <div className="text-xs text-gray-500 flex items-center space-x-2">
                  <span>Nº {userInfo?.mechanographic_number || 'N/A'}</span>
                  {isAdmin && (
                    <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium">
                      Admin
                    </span>
                  )}
                </div>
              </div>

              {/* Navigation Items */}
              {userNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActivePath(item.path)
                      ? 'bg-red-100 text-red-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
              
              {isAdmin && (
                <>
                  <div className="h-px bg-gray-300 my-2" />
                  <div className="text-xs font-medium text-gray-500 px-3 py-1">
                    Administração
                  </div>
                  {adminNavItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActivePath(item.path)
                          ? 'bg-red-100 text-red-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                  
                  <div className="text-xs font-medium text-gray-500 px-3 py-1 mt-2 border-t border-gray-200 pt-3">
                    Ficheiros Escala
                  </div>
                  {scheduleFileSubmenu.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActivePath(item.path)
                          ? 'bg-red-100 text-red-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  ))}

                   <div className="text-xs font-medium text-gray-500 px-3 py-1 mt-2 border-t border-gray-200 pt-3">
                     Notificações
                   </div>
                   <div className="px-3 py-2">
                     <PushNotificationManager userEmail={email} className="shadow-none" />
                   </div>
                 </>
               )}
             </div>
           </div>
         )}
       </div>
     </nav>
  );
};

export default Navbar;
