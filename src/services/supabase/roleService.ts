import { supabase } from "@/integrations/supabase/client";

export const roleService = {
  /**
   * Verifica o role do utilizador diretamente na BD
   * Esta função deve ser usada para operações sensíveis em vez de confiar no localStorage
   */
  async getUserRole(email: string): Promise<{ role: string | null; isAdmin: boolean }> {
    if (!email) {
      return { role: null, isAdmin: false };
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('role, is_admin')
        .eq('email', email.trim().toLowerCase())
        .eq('active', true)
        .single();

      if (error || !data) {
        console.error('Error fetching user role:', error);
        return { role: null, isAdmin: false };
      }

      return { 
        role: data.role, 
        isAdmin: data.role === 'admin' || data.is_admin === true 
      };
    } catch (error) {
      console.error('Error in getUserRole:', error);
      return { role: null, isAdmin: false };
    }
  },

  /**
   * Verifica se o utilizador é admin diretamente na BD
   */
  async isAdmin(email: string): Promise<boolean> {
    const { isAdmin } = await this.getUserRole(email);
    return isAdmin;
  },

  /**
   * Obtém o email do utilizador atual do localStorage de forma segura
   * NOTA: O email é usado apenas para lookup, o role é sempre verificado na BD
   */
  getCurrentUserEmail(): string | null {
    try {
      const stored = localStorage.getItem('mysqlConnection');
      if (!stored) return null;
      
      const session = JSON.parse(stored);
      return session?.email || null;
    } catch {
      return null;
    }
  },

  /**
   * Verifica se o utilizador atual é admin (verificando na BD)
   */
  async isCurrentUserAdmin(): Promise<boolean> {
    const email = this.getCurrentUserEmail();
    if (!email) return false;
    
    return this.isAdmin(email);
  }
};
