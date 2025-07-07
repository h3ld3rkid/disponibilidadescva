
import React, { useState, useEffect } from 'react';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Lock } from "lucide-react";
import { supabaseService } from "@/services/supabaseService";
import { securityService } from '@/services/securityService';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

// Form validation schemas
const profileSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres" }),
  email: z.string().email({ message: "Introduza um email válido" }),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Password atual é obrigatória" }),
  newPassword: z.string()
    .min(8, { message: "Nova password deve ter pelo menos 8 caracteres" })
    .regex(/[A-Z]/, { message: "Nova password deve conter pelo menos uma letra maiúscula" })
    .regex(/[a-z]/, { message: "Nova password deve conter pelo menos uma letra minúscula" })
    .regex(/[0-9]/, { message: "Nova password deve conter pelo menos um número" })
    .regex(/[^A-Za-z0-9]/, { message: "Nova password deve conter pelo menos um símbolo especial" }),
  confirmPassword: z.string().min(1, { message: "Confirme a nova password" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As passwords não coincidem",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

interface UserData {
  name: string;
  email: string;
  role: string;
  mechanographic_number: string;
  needs_password_change?: boolean;
}

const ProfileEdit = () => {
  const { toast } = useToast();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [defaultTab, setDefaultTab] = useState('profile');
  const [passwordStrength, setPasswordStrength] = useState({ isValid: false, score: 0, feedback: [] as string[] });

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // Fetch user data from localStorage
    const userConnection = localStorage.getItem('mysqlConnection');
    if (userConnection) {
      const userInfo = JSON.parse(userConnection);
      
      // Get the full user data from Supabase
      const fetchUserData = async () => {
        try {
          const users = await supabaseService.getAllUsers();
          const currentUser = users.find(user => user.email === userInfo.email);
          if (currentUser) {
            setUserData({
              name: currentUser.name,
              email: currentUser.email,
              role: currentUser.role,
              mechanographic_number: currentUser.mechanographic_number,
              needs_password_change: currentUser.needs_password_change
            });

            // Set needs password change state
            if (currentUser.needs_password_change) {
              setNeedsPasswordChange(true);
              setDefaultTab('password');
            }

            // Set form default values
            profileForm.reset({
              name: currentUser.name,
              email: currentUser.email,
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      };
      
      fetchUserData();
    }
  }, [profileForm]);

  const onProfileSubmit = async (data: ProfileFormValues) => {
    setIsProfileLoading(true);
    
    try {
      // In a real app, you would send this data to your backend API
      console.log("Profile update data:", data);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the local state/localStorage
      if (userData) {
        const updatedUserData = {
          ...userData,
          name: data.name,
          email: data.email,
        };
        
        setUserData(updatedUserData);
        
        // Update localStorage
        const userConnection = localStorage.getItem('mysqlConnection');
        if (userConnection) {
          const userInfo = JSON.parse(userConnection);
          localStorage.setItem('mysqlConnection', JSON.stringify({
            ...userInfo,
            email: data.email,
          }));
        }
      }
      
      toast({
        title: "Perfil atualizado",
        description: "As suas informações de perfil foram atualizadas com sucesso",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erro ao atualizar perfil",
        description: "Ocorreu um erro ao atualizar o seu perfil",
        variant: "destructive",
      });
    } finally {
      setIsProfileLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setIsPasswordLoading(true);
    
    try {
      // Get user info from localStorage
      const userConnection = localStorage.getItem('mysqlConnection');
      if (!userConnection) {
        throw new Error("User session not found");
      }
      
      const userInfo = JSON.parse(userConnection);
      
      // Validate password strength
      const validation = securityService.validatePasswordStrength(data.newPassword);
      if (!validation.isValid) {
        toast({
          title: "Password não é suficientemente forte",
          description: validation.feedback.join(', '),
          variant: "destructive",
        });
        return;
      }

      // Call the supabaseService to change the password
      const result = await supabaseService.changePassword(userInfo.email, data.newPassword);
      
      if (result.success) {
        // Clear password fields
        passwordForm.reset({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        
        // Update needs password change flag
        if (needsPasswordChange) {
          setNeedsPasswordChange(false);
        }
        
        toast({
          title: "Password atualizada",
          description: "A sua password foi atualizada com sucesso",
        });
      } else {
        throw new Error(result.message || "Failed to update password");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      toast({
        title: "Erro ao atualizar password",
        description: "Ocorreu um erro ao atualizar a sua password",
        variant: "destructive",
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  if (!userData) {
    return <div className="py-8 text-center">A carregar informações do utilizador...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>O Meu Perfil</CardTitle>
          <CardDescription>Visualize e atualize as suas informações pessoais</CardDescription>
        </CardHeader>
        <CardContent>
          {needsPasswordChange && (
            <Alert className="mb-6 bg-amber-50 border-amber-200">
              <InfoIcon className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Necessário alterar password</AlertTitle>
              <AlertDescription className="text-amber-700">
                Por motivos de segurança, deve alterar a sua password padrão antes de continuar a utilizar o sistema.
              </AlertDescription>
            </Alert>
          )}
          
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="profile">Perfil</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="mt-6">
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="seu-email@exemplo.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-2">
                    <FormLabel>Número Mecanográfico</FormLabel>
                    <Input 
                      value={userData.mechanographic_number}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div className="mt-2">
                    <div className="text-sm text-gray-500 mb-4">
                      <span className="font-medium text-gray-700">Função: </span>
                      {userData.role === 'admin' ? 'Administrador' : 'Utilizador'}
                    </div>
                  </div>
                  
                  <Button type="submit" className="bg-brand-indigo hover:bg-brand-darkblue" disabled={isProfileLoading}>
                    {isProfileLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        A guardar...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar alterações
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="password" className="mt-6">
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password atual</FormLabel>
                        <FormControl>
                          <Input placeholder="Introduza a sua password atual" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                   <FormField
                     control={passwordForm.control}
                     name="newPassword"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Nova password</FormLabel>
                         <FormControl>
                           <Input 
                             placeholder="Introduza a nova password" 
                             type="password" 
                             {...field}
                             onChange={(e) => {
                               field.onChange(e);
                               const strength = securityService.validatePasswordStrength(e.target.value);
                               setPasswordStrength(strength);
                             }}
                           />
                         </FormControl>
                         {field.value && (
                           <div className="mt-2 space-y-2">
                             <div className="flex space-x-1">
                               {[1, 2, 3, 4, 5, 6].map((level) => (
                                 <div
                                   key={level}
                                   className={`h-2 w-full rounded-full ${
                                     level <= passwordStrength.score
                                       ? level <= 2
                                         ? 'bg-red-500'
                                         : level <= 4
                                         ? 'bg-yellow-500'
                                         : 'bg-green-500'
                                       : 'bg-gray-200'
                                   }`}
                                 />
                               ))}
                             </div>
                             <div className="text-sm space-y-1">
                               {passwordStrength.feedback.map((feedback, index) => (
                                 <p
                                   key={index}
                                   className={
                                     passwordStrength.isValid && feedback === 'Senha forte!'
                                       ? 'text-green-600'
                                       : 'text-red-600'
                                   }
                                 >
                                   {feedback}
                                 </p>
                               ))}
                             </div>
                           </div>
                         )}
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                  
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar nova password</FormLabel>
                        <FormControl>
                          <Input placeholder="Confirme a nova password" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="bg-brand-indigo hover:bg-brand-darkblue" disabled={isPasswordLoading}>
                    {isPasswordLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        A atualizar...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Atualizar password
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileEdit;
