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
      color: 'bg-blue-500 hover:bg-blue-600',
      tabKey: 'current-schedule',
    },
    {
      title: 'Disponibilidade',
      description: 'Submeter disponibilidade',
      icon: ClipboardList,
      path: '/dashboard/schedule',
      color: 'bg-green-500 hover:bg-green-600',
      tabKey: 'schedule',
    },
    {
      title: 'Meus Serviços',
      description: 'Ver os meus serviços',
      icon: Briefcase,
      path: '/dashboard/my-services',
      color: 'bg-purple-500 hover:bg-purple-600',
      tabKey: 'my-services',
    },
    {
      title: 'Trocas',
      description: 'Gerir pedidos de troca',
      icon: RefreshCw,
      path: '/dashboard/exchanges',
      color: 'bg-orange-500 hover:bg-orange-600',
      tabKey: 'exchanges',
    },
    {
      title: 'Perfil',
      description: 'Editar perfil',
      icon: User,
      path: '/dashboard/profile',
      color: 'bg-slate-500 hover:bg-slate-600',
      tabKey: 'profile',
    },
    {
      title: 'Avisos',
      description: 'Ver avisos',
      icon: Bell,
      path: '/dashboard/announcements',
      color: 'bg-red-500 hover:bg-red-600',
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
    <div className="container mx-auto px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Acesso Rápido</CardTitle>
          <CardDescription>Navegue rapidamente para as funcionalidades principais</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-center gap-4">
            {visibleActions.map((action) => (
                <Button
                  key={action.path}
                  variant="outline"
                  className={`h-auto flex flex-col items-center justify-center gap-2 p-4 text-white border-0 w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.75rem)] lg:w-[calc(16.666%-0.875rem)] min-w-[140px] ${action.color}`}
                  onClick={() => navigate(action.path)}
                >
                  <action.icon className="h-8 w-8" />
                  <span className="font-medium text-sm">{action.title}</span>
                  <span className="text-xs opacity-80 text-center">{action.description}</span>
                </Button>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
