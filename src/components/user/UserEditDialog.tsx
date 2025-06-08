
import React from 'react';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { userService } from "@/services/supabase/userService";
import { Loader2 } from "lucide-react";

// Define the form schema with Zod
const userEditSchema = z.object({
  name: z.string().min(2, {
    message: "Nome deve ter pelo menos 2 caracteres.",
  }),
  email: z.string().email({
    message: "Por favor, introduza um email válido.",
  }),
  mechanographicNumber: z.string().min(1, {
    message: "Número mecanográfico é obrigatório.",
  }),
  role: z.enum(["admin", "user"], {
    required_error: "Por favor, selecione um nível de acesso.",
  }),
});

type UserEditValues = z.infer<typeof userEditSchema>;

// Use consistent User interface
interface User {
  id: string;
  name: string;
  email: string;
  mechanographic_number: string;
  role: 'admin' | 'user';
  active: boolean;
  needs_password_change?: boolean;
}

interface UserEditDialogProps {
  user: User;
  open: boolean;
  onClose: () => void;
  onUserUpdated: (user: User) => void;
}

const UserEditDialog = ({ user, open, onClose, onUserUpdated }: UserEditDialogProps) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();
  
  const form = useForm<UserEditValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      mechanographicNumber: user.mechanographic_number,
      role: user.role,
    },
  });
  
  const handleSubmit = async (data: UserEditValues) => {
    setIsSubmitting(true);
    
    try {
      const updatedUser = await userService.updateUser(user.id, {
        name: data.name,
        email: data.email,
        mechanographic_number: data.mechanographicNumber,
        role: data.role,
      });
      
      onUserUpdated(updatedUser);
      
      toast({
        title: "Utilizador atualizado",
        description: "Os dados do utilizador foram atualizados com sucesso.",
      });
      
      onClose();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o utilizador.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Utilizador</DialogTitle>
          <DialogDescription>
            Faça alterações aos dados do utilizador aqui.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="João Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="utilizador@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="mechanographicNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número Mecanográfico</FormLabel>
                  <FormControl>
                    <Input placeholder="12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Acesso</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um nível de acesso" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">Utilizador</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A atualizar...
                  </>
                ) : (
                  "Guardar Alterações"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UserEditDialog;
