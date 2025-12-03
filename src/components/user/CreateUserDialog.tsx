
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { userService } from "@/services/supabase/userService";
import { Loader, Plus } from 'lucide-react';

interface CreateUserDialogProps {
  onUserCreated: () => void;
}

const CreateUserDialog = ({ onUserCreated }: CreateUserDialogProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mechanographicNumber, setMechanographicNumber] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [categoria, setCategoria] = useState<'Condutor' | 'Socorrista' | 'Estagiario' | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string>('');
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name || !email || !mechanographicNumber) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await userService.createUser({
        name,
        email,
        mechanographic_number: mechanographicNumber,
        role,
        categoria: categoria || null,
      });

      setTemporaryPassword(result.temporaryPassword);

      toast({
        title: "Utilizador criado",
        description: `Utilizador criado com sucesso. Password temporária: ${result.temporaryPassword}`,
        duration: 10000,
      });

      setName('');
      setEmail('');
      setMechanographicNumber('');
      setRole('user');
      setCategoria('');
      setIsOpen(false);
      onUserCreated();
    } catch (error: any) {
      console.error("Error creating user:", error);
      
      let errorMessage = "Ocorreu um erro ao criar o utilizador.";
      
      if (error?.code === '23505') {
        if (error.message.includes('users_email_key')) {
          errorMessage = "Este email já está em uso. Por favor, use um email diferente.";
        } else if (error.message.includes('users_mechanographic_number_key')) {
          errorMessage = "Este número mecanográfico já está em uso.";
        } else {
          errorMessage = "Já existe um utilizador com estes dados.";
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro ao criar utilizador",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Criar Novo Utilizador
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Utilizador</DialogTitle>
          <DialogDescription>
            Adicionar um novo utilizador ao sistema
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="João Silva"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="joao@exemplo.com"
            />
          </div>
          <div>
            <Label htmlFor="mechanographicNumber">Número Mecanográfico</Label>
            <Input
              type="text"
              id="mechanographicNumber"
              value={mechanographicNumber}
              onChange={(e) => setMechanographicNumber(e.target.value)}
              placeholder="12345"
            />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as 'admin' | 'user')}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="categoria">Categoria</Label>
            <Select value={categoria || 'none'} onValueChange={(value) => setCategoria(value === 'none' ? '' : value as 'Condutor' | 'Socorrista' | 'Estagiario')}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar Categoria (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                <SelectItem value="Condutor">Condutor</SelectItem>
                <SelectItem value="Socorrista">Socorrista</SelectItem>
                <SelectItem value="Estagiario">Estagiário</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button disabled={isLoading} type="submit">
              {isLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  A criar...
                </>
              ) : (
                "Criar Utilizador"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserDialog;
