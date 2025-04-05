import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { Loader2, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabaseService } from "@/services/supabaseService";

const loginSchema = z.object({
  email: z.string().email({
    message: "Por favor, introduza um email válido.",
  }),
  password: z.string().min(6, {
    message: "Password deve ter pelo menos 6 caracteres.",
  }),
});

const resetSchema = z.object({
  email: z.string().email({
    message: "Por favor, introduza um email válido.",
  }),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, {
    message: "Password atual deve ter pelo menos 6 caracteres.",
  }),
  newPassword: z.string().min(8, {
    message: "Nova password deve ter pelo menos 8 caracteres.",
  }).refine(
    (password) => /[A-Z]/.test(password),
    { message: "Password deve conter pelo menos uma letra maiúscula." }
  ).refine(
    (password) => /[0-9]/.test(password),
    { message: "Password deve conter pelo menos um número." }
  ).refine(
    (password) => /[^A-Za-z0-9]/.test(password),
    { message: "Password deve conter pelo menos um caractere especial." }
  ),
  confirmPassword: z.string().min(8, {
    message: "Confirmação da password deve ter pelo menos 8 caracteres.",
  })
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: "As passwords não coincidem.",
    path: ["confirmPassword"]
  }
);

type LoginFormValues = z.infer<typeof loginSchema>;
type ResetFormValues = z.infer<typeof resetSchema>;
type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string, role: string } | null>(null);
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const resetForm = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: "",
    },
  });

  const changePasswordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('mysqlConnection');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.isConnected) {
        navigate('/dashboard');
      }
    }
  }, [navigate]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    
    try {
      const result = await supabaseService.checkLogin(data.email, data.password);
      
      if (result.success && result.user) {
        if (result.user.needsPasswordChange) {
          // If user needs to change password, show the change password dialog
          setCurrentUser({ email: data.email, role: result.user.role });
          setShowChangePassword(true);
        } else {
          // Store login info
          localStorage.setItem('mysqlConnection', JSON.stringify({
            email: data.email,
            role: result.user.role,
            isConnected: true
          }));
          
          toast({
            title: "Login bem sucedido",
            description: `Bem-vindo, ${data.email}`,
          });
          
          // Redirect to dashboard
          navigate('/dashboard');
        }
      } else {
        throw new Error("Credenciais inválidas");
      }
    } catch (error) {
      console.error("Erro no login:", error);
      toast({
        title: "Falha no login",
        description: "Email ou password inválidos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRequestReset = async (data: ResetFormValues) => {
    try {
      await supabaseService.requestPasswordReset(data.email);
      
      toast({
        title: "Pedido enviado",
        description: "O pedido de reset de password foi enviado com sucesso.",
      });
      
      resetForm.reset();
    } catch (error) {
      console.error("Erro ao solicitar reset:", error);
      toast({
        title: "Falha no pedido",
        description: "Não foi possível solicitar o reset da password.",
        variant: "destructive",
      });
    }
  };

  const onChangePassword = async (data: ChangePasswordFormValues) => {
    if (!currentUser) return;
    
    setIsLoading(true);
    
    try {
      await supabaseService.changePassword(currentUser.email, data.newPassword);
      
      toast({
        title: "Password alterada",
        description: "A sua password foi alterada com sucesso.",
      });
      
      // Store login info
      localStorage.setItem('mysqlConnection', JSON.stringify({
        email: currentUser.email,
        role: currentUser.role,
        isConnected: true
      }));
      
      // Close dialog and redirect
      setShowChangePassword(false);
      navigate('/dashboard');
    } catch (error) {
      console.error("Erro ao alterar password:", error);
      toast({
        title: "Falha ao alterar password",
        description: "Não foi possível alterar a password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="https://amares.cruzvermelha.pt/images/site/Amares.webp" 
              alt="Cruz Vermelha Amares" 
              className="h-24 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Disponibilidades CVAmares</h1>
          <p className="text-gray-600 mt-2">Inicie sessão para aceder ao sistema</p>
        </div>
        
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Introduza as suas credenciais para aceder ao sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="admin@gmail.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex flex-col gap-2">
                  <Button type="submit" className="w-full bg-brand-indigo hover:bg-brand-darkblue" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        A iniciar sessão...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full" type="button">
                        <KeyRound className="mr-2 h-4 w-4" />
                        Pedir Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Pedir Reset de Password</DialogTitle>
                        <DialogDescription>
                          Introduza o seu email para solicitar um reset de password.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Form {...resetForm}>
                        <form onSubmit={resetForm.handleSubmit(onRequestReset)} className="space-y-4">
                          <FormField
                            control={resetForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input placeholder="seu@email.com" type="email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <DialogFooter>
                            <Button type="submit">Enviar Pedido</Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-gray-500">
            Admin padrão: admin@gmail.com / password: CVAmares
          </CardFooter>
        </Card>
        
        {/* Password Change Dialog */}
        <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Password</DialogTitle>
              <DialogDescription>
                É necessário alterar a sua password antes de continuar.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...changePasswordForm}>
              <form onSubmit={changePasswordForm.handleSubmit(onChangePassword)} className="space-y-4">
                <FormField
                  control={changePasswordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password Atual</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={changePasswordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-gray-500">
                        A password deve ter pelo menos 8 caracteres, incluindo uma letra maiúscula, 
                        um número e um caractere especial.
                      </p>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={changePasswordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        A alterar...
                      </>
                    ) : (
                      "Confirmar"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Login;
