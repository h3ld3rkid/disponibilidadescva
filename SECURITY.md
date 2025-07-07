# Guia de Segurança - Sistema de Escalas Cruz Vermelha Amares

## ✅ Melhorias de Segurança Implementadas

### 1. 🔐 Políticas de Palavra-passe Fortes
- **Validação obrigatória**: Senhas devem ter mínimo 8 caracteres, incluindo:
  - Pelo menos uma letra maiúscula
  - Pelo menos uma letra minúscula  
  - Pelo menos um número
  - Pelo menos um símbolo especial
- **Indicador visual** de força da senha no formulário de alteração
- **Feedback em tempo real** durante a criação de senhas

### 2. 🛡️ Row Level Security (RLS) Reforçada
**Tabela `users`:**
- Utilizadores só veem seus próprios dados
- Administradores têm acesso completo
- Apenas administradores podem criar novos utilizadores

**Tabela `schedules`:**
- Utilizadores só acedem às suas próprias escalas
- Administradores veem todas as escalas
- Apenas administradores podem eliminar escalas

**Tabela `shift_exchange_requests`:**
- Utilizadores só veem pedidos de troca onde são requerente ou destinatário
- Administradores veem todos os pedidos

**Tabela `announcements`:**
- Apenas administradores podem gerir anúncios
- Todos podem visualizar anúncios ativos

**Tabela `security_logs`:**
- Apenas administradores podem ver logs de segurança

### 3. 📊 Sistema de Monitorização de Segurança
- **Dashboard de segurança** para administradores em `/dashboard/security`
- **Logs automáticos** de todos os eventos de segurança:
  - Logins bem-sucedidos
  - Tentativas de login falhadas
  - Alterações de senha
  - Atividades suspeitas
- **Detecção automática** de atividades suspeitas:
  - Múltiplas tentativas de login falhadas (>5 em 15 minutos)
  - Trigger automático para registar padrões anómalos

### 4. 🔒 Gestão de Sessões Seguras
- **Timeout automático** de sessão após 30 minutos de inatividade
- **Validação de integridade** da sessão
- **Limpeza automática** de sessões inválidas
- **Monitorização de atividade** do utilizador

### 5. 🍪 Configurações de Cookies Seguras
**Para implementar no servidor (recomendações):**
```javascript
// Configurações recomendadas para cookies de sessão
{
  httpOnly: true,     // Previne acesso via JavaScript
  secure: true,       // Apenas HTTPS
  sameSite: 'strict', // Proteção CSRF
  maxAge: 1800000     // 30 minutos
}
```

## 🚀 Configurações Adicionais Recomendadas

### No Supabase Dashboard:

#### 1. Ativar MFA (Multi-Factor Authentication)
1. Aceder a **Authentication > Settings**
2. Ativar **Enable Multi-factor Authentication**
3. Configurar provedores MFA (TOTP recomendado)

#### 2. Configurar Rate Limiting
1. Ir para **Authentication > Rate Limits**
2. Definir limites para:
   - Login attempts: 5 por minuto
   - Password reset: 3 por hora
   - Sign up: 5 por hora

#### 3. Configurar Políticas de Sessão
1. Em **Authentication > Settings**:
   - **JWT Expiry**: 3600 (1 hora)
   - **Refresh Token Rotation**: Enabled
   - **Session timeout**: 1800 (30 minutos)

#### 4. Ativar Audit Logs
1. Ir para **Settings > Audit Logs**
2. Ativar logging para todas as operações críticas

### 6. 🔍 Monitorização e Alertas

#### Dashboard de Segurança inclui:
- **Estatísticas em tempo real** (24h):
  - Total de logins
  - Tentativas falhadas
  - Atividades suspeitas
  - Utilizadores únicos
- **Logs detalhados** de eventos de segurança
- **Alertas visuais** para atividades suspeitas
- **Atualização automática** a cada 30 segundos

#### Eventos monitorizados:
- `successful_login` - Login bem-sucedido
- `failed_login` - Tentativa de login falhada
- `suspicious_activity` - Atividade suspeita detectada
- `password_changed` - Senha alterada
- `password_change_failed` - Falha na alteração de senha

## 🔧 Manutenção de Segurança

### Verificações Regulares:
1. **Semanalmente**: Revisar logs de segurança no dashboard
2. **Mensalmente**: Auditar utilizadores ativos e permissões
3. **Trimestralmente**: Rever e atualizar políticas de segurança

### Ações em Caso de Atividade Suspeita:
1. Verificar detalhes no dashboard de segurança
2. Se necessário, desativar conta temporariamente
3. Forçar reset de senha para contas comprometidas
4. Documentar incidente nos logs

## 📞 Contactos de Segurança

Para reportar problemas de segurança ou incidentes:
- **Email de segurança**: [definir email específico]
- **Administrador do sistema**: [contacto do responsável técnico]

---

**⚠️ Importante**: Este sistema processa dados pessoais e deve cumprir o RGPD. Garantir que todos os acessos são legitimados e que os dados são protegidos adequadamente.