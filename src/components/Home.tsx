import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { Calendar, ClipboardList, Briefcase, User, Bell, RefreshCw } from 'lucide-react';
import { useTabVisibility } from '@/hooks/useTabVisibility';

interface HomeProps {
  userEmail: string;
  isAdmin: boolean;
}

const Home: React.FC<HomeProps> = ({ userEmail, isAdmin }) => {
  const navigate = useNavigate();
  const { isTabVisible } = useTabVisibility();

  const quickActions = [
    {
      title: 'Escala',
      description: 'Ver escala atual',
      icon: Calendar,
      path: '/dashboard/current-schedule',
      gradient: 'from-sky-400 to-blue-600',
      iconBg: 'bg-white/20',
      tabKey: 'current-schedule',
    },
    {
      title: 'Disponibilidade',
      description: 'Submeter disponibilidade',
      icon: ClipboardList,
      path: '/dashboard/schedule',
      gradient: 'from-emerald-400 to-green-600',
      iconBg: 'bg-white/20',
      tabKey: 'schedule',
    },
    {
      title: 'Meus Serviços',
      description: 'Ver os meus serviços',
      icon: Briefcase,
      path: '/dashboard/my-services',
      gradient: 'from-fuchsia-400 to-purple-600',
      iconBg: 'bg-white/20',
      tabKey: 'my-services',
    },
    {
      title: 'Trocas',
      description: 'Gerir pedidos de troca',
      icon: RefreshCw,
      path: '/dashboard/exchanges',
      gradient: 'from-orange-400 to-red-500',
      iconBg: 'bg-white/20',
      tabKey: 'exchanges',
    },
    {
      title: 'Perfil',
      description: 'Editar perfil',
      icon: User,
      path: '/dashboard/profile',
      gradient: 'from-slate-400 to-slate-700',
      iconBg: 'bg-white/20',
      tabKey: 'profile',
    },
    {
      title: 'Avisos',
      description: 'Ver avisos',
      icon: Bell,
      path: '/dashboard/announcements',
      gradient: 'from-rose-400 to-red-600',
      iconBg: 'bg-white/20',
      adminOnly: true,
      tabKey: 'announcements',
    }
  ];

  const visibleActions = quickActions.filter(action => {
    if (action.adminOnly && !isAdmin) return false;
    if (!isAdmin && action.tabKey && !isTabVisible(action.tabKey)) return false;
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <Card className="w-full">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle>Acesso Rápido</CardTitle>
          <CardDescription>Navegue rapidamente para as funcionalidades principais.</CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {visibleActions.map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${action.gradient} p-4 text-white shadow-md transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary aspect-square sm:aspect-auto sm:min-h-[130px] flex flex-col items-center justify-center gap-2 text-center`}
              >
                <div className={`${action.iconBg} rounded-full p-2.5 backdrop-blur-sm transition-transform group-hover:scale-110`}>
                  <action.icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.25} />
                </div>
                <span className="font-semibold text-sm sm:text-base leading-tight">{action.title}</span>
                <span className="text-[11px] sm:text-xs opacity-90 leading-tight px-1 line-clamp-2">{action.description}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
