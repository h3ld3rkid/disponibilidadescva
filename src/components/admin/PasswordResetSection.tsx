
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/supabase/authService";
import { RefreshCw, Key, Check } from 'lucide-react';

const PasswordResetSection = () => {
  const [resetRequests, setResetRequests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resettingEmails, setResettingEmails] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const loadResetRequests = async () => {
    try {
      setIsLoading(true);
      const requests = await authService.getPasswordResetRequests();
      setResetRequests(requests);
    } catch (error) {
      console.error('Error loading reset requests:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar os pedidos de reset.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      setResettingEmails(prev => new Set(prev).add(email));
      
      const result = await authService.resetPassword(email);
      
      if (result.success) {
        toast({
          title: "Password reposta",
          description: `A password do utilizador ${email} foi reposta para "CVAmares".`,
        });
        
        // Remove from reset requests list
        setResetRequests(prev => prev.filter(req => req !== email));
      } else {
        throw new Error('Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "Erro ao repor password",
        description: `Não foi possível repor a password para ${email}.`,
        variant: "destructive",
      });
    } finally {
      setResettingEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(email);
        return newSet;
      });
    }
  };

  useEffect(() => {
    loadResetRequests();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Reset de Passwords
        </CardTitle>
        <CardDescription>
          Gerir pedidos de reset de password dos utilizadores
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {resetRequests.length} pedido{resetRequests.length !== 1 ? 's' : ''} pendente{resetRequests.length !== 1 ? 's' : ''}
          </p>
          <Button
            onClick={loadResetRequests}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {resetRequests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Key className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Não há pedidos de reset pendentes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {resetRequests.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary">Pendente</Badge>
                  <span className="font-medium">{email}</span>
                </div>
                
                <Button
                  onClick={() => handleResetPassword(email)}
                  disabled={resettingEmails.has(email)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {resettingEmails.has(email) ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      A repor...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Repor para CVAmares
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Ao repor a password, o utilizador terá de usar "CVAmares" 
            para fazer login e será obrigatório alterar a password no primeiro acesso.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PasswordResetSection;
