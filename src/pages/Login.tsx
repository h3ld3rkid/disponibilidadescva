import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabaseService } from '@/services/supabase';
import { sessionManager } from '@/services/sessionManager';
import Footer from '@/components/ui/footer';
import { Eye, EyeOff, KeyRound, Loader2, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot password state
  const [showForgotDialog, setShowForgotDialog] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    const session = sessionManager.getCurrentSession();
    if (session) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await supabaseService.checkLogin(email, password);
      if (response.success && response.user) {
        sessionManager.createSession({
          email: response.user.email,
          role: response.user.role,
          isConnected: true,
          name: response.user.name
        });

        toast({
          title: "Login bem-sucedido",
          description: "Bem-vindo ao sistema de Escalas Cruz Vermelha Amares.",
          variant: "default"
        });

        if (response.user.needsPasswordChange) {
          navigate('/dashboard/profile');
          toast({
            title: "Alteração de password necessária",
            description: "Por favor altere a sua password padrão.",
            variant: "default"
          });
        } else {
          navigate('/dashboard');
        }
      } else {
        if (response.locked) {
          toast({
            title: "User Bloqueado",
            description: "Socorrista bloqueado por tentativa de login errada, contatar o administrador.",
            variant: "destructive"
          });
        } else if (response.remainingAttempts !== undefined) {
          toast({
            title: "Erro de Login",
            description: `Erro de login, dispõe de mais ${response.remainingAttempts} tentativa(s).`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Erro de Login",
            description: "Email ou palavra-passe incorretos.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Erro de Conexão",
        description: "Ocorreu um erro ao conectar ao servidor.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      toast({
        title: "Email obrigatório",
        description: "Introduza o seu email para recuperar a password.",
        variant: "destructive"
      });
      return;
    }

    setForgotLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('self-reset-password', {
        body: { email: forgotEmail.trim().toLowerCase() }
      });

      if (error) {
        throw error;
      }

      if (data?.noTelegram) {
        toast({
          title: "Telegram não configurado",
          description: data.message || "Este utilizador não tem o Telegram configurado. Contacte o administrador.",
          variant: "destructive"
        });
      } else if (data?.success) {
        toast({
          title: "Password enviada",
          description: data.message || "Verifique o seu Telegram para a nova password temporária.",
        });
        setShowForgotDialog(false);
        setForgotEmail('');
      } else {
        toast({
          title: "Aviso",
          description: data?.message || "Se o email existir e tiver Telegram, receberá a nova password.",
        });
        setShowForgotDialog(false);
        setForgotEmail('');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar o pedido. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <img src="https://amares.cruzvermelha.pt/images/site/Amares.webp" alt="Cruz Vermelha Amares" className="h-16 mb-6" />
      
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Disponibilidade Socorristas</CardTitle>
          <CardDescription className="text-center">
            Cruz Vermelha - Delegação de Amares
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu.email@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Palavra-passe</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'A processar...' : 'Entrar'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => {
                setForgotEmail(email);
                setShowForgotDialog(true);
              }}
            >
              <KeyRound className="h-4 w-4 mr-1" />
              Esqueci-me da password
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>Sistema desenvolvido para a Cruz Vermelha - Delegação de Amares</p>
      </div>
      <Footer />

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotDialog} onOpenChange={setShowForgotDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Recuperar Password
            </DialogTitle>
            <DialogDescription>
              Será enviada uma password temporária para o seu Telegram. No próximo login, será obrigado a alterar a password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="seu.email@exemplo.com"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleForgotPassword()}
              />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Nota:</strong> É necessário ter o Telegram configurado no seu perfil. 
                Caso não tenha, contacte o administrador.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowForgotDialog(false)}
                disabled={forgotLoading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleForgotPassword}
                disabled={forgotLoading || !forgotEmail.trim()}
              >
                {forgotLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    A enviar...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Enviar para Telegram
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
