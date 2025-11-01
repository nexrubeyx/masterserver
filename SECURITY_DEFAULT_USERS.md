# Notas de Segurança - Sistema de Usuários Padrão

## ⚠️ AVISO IMPORTANTE DE SEGURANÇA

As senhas padrão fornecidas em `src/config/defaultUsers.json` são **INSEGURAS** e destinadas apenas para desenvolvimento e testes.

### ❌ NÃO USE EM PRODUÇÃO
- `admin123` é uma senha fraca e facilmente adivinhável
- `tester123` é uma senha fraca e facilmente adivinhável

### ✅ ANTES DE USAR EM PRODUÇÃO

1. **Altere TODAS as senhas padrão**
   ```json
   {
     "username": "admin",
     "password": "Use_Uma_Senha_Forte_Com_Min_16_Caracteres!@#",
     "email": "admin@seudominio.com",
     "permission": 4
   }
   ```

2. **Use senhas fortes que incluam:**
   - Mínimo 16 caracteres
   - Letras maiúsculas e minúsculas
   - Números
   - Símbolos especiais
   - Não use palavras do dicionário

3. **Considere usar geradores de senha:**
   ```bash
   # Gerar senha aleatória forte (Linux/Mac)
   openssl rand -base64 32
   ```

4. **Proteja o arquivo de configuração:**
   - Não commite senhas reais no Git
   - Use variáveis de ambiente para ambientes sensíveis
   - Restrinja permissões do arquivo:
   ```bash
   chmod 600 src/config/defaultUsers.json
   ```

5. **Adicione ao .gitignore:**
   ```
   # Se você personalizou com senhas reais
   src/config/defaultUsers.json
   ```

## Boas Práticas Adicionais

### 1. Gerenciamento de Credenciais
- Use um gerenciador de senhas para armazenar as credenciais de admin
- Documente onde as credenciais estão armazenadas de forma segura
- Não compartilhe senhas via email, chat ou documentos não criptografados

### 2. Princípio do Menor Privilégio
- Não dê permissão MASTER (4) a menos que absolutamente necessário
- Use níveis menores (GM=3, CM=2) sempre que possível
- Crie usuários específicos para cada administrador em vez de compartilhar credenciais

### 3. Auditoria
- Revise periodicamente quem tem acesso de admin
- Remova contas que não são mais necessárias
- Monitore logs de autenticação

### 4. Rotação de Senhas
- Altere senhas de admin periodicamente
- Para alterar senha de um usuário padrão:
  1. Delete o usuário do MongoDB
  2. Atualize a senha no JSON
  3. Reinicie o servidor

### 5. Ambientes Separados
- Use senhas diferentes para desenvolvimento, teste e produção
- Nunca use credenciais de produção em ambiente de desenvolvimento

## O Que o Sistema Já Faz por Segurança

✅ **Hashing de Senhas com Bcrypt**
- As senhas são automaticamente hasheadas com bcrypt (10 rounds)
- Nunca são armazenadas em texto plano no banco de dados

✅ **Idempotência**
- Executar múltiplas vezes não cria duplicatas
- Previne acumulação de contas não intencionais

✅ **Validação de Entrada**
- Verifica existência antes de criar
- Tratamento de erros robusto

## Checklist de Segurança para Produção

Antes de usar em produção, verifique:

- [ ] Alteradas TODAS as senhas padrão para senhas fortes
- [ ] Arquivo `defaultUsers.json` protegido (chmod 600)
- [ ] Senhas documentadas em gerenciador de senhas seguro
- [ ] Usuários desnecessários removidos do JSON
- [ ] Backup das credenciais em local seguro
- [ ] Equipe treinada sobre não compartilhar credenciais
- [ ] Processo definido para rotação de senhas
- [ ] Monitoramento de logs de autenticação configurado

## Em Caso de Comprometimento

Se você suspeitar que as credenciais foram comprometidas:

1. **Imediato:**
   - Altere as senhas imediatamente no banco de dados
   - Delete o usuário comprometido do MongoDB
   - Atualize o JSON com nova senha
   - Reinicie o servidor

2. **Investigação:**
   - Revise logs de acesso para atividades suspeitas
   - Identifique quando e como ocorreu o comprometimento
   - Verifique se houve acesso não autorizado aos dados

3. **Prevenção:**
   - Implemente autenticação de dois fatores (se disponível)
   - Fortaleça políticas de senha
   - Aumente monitoramento

## Contato

Para questões de segurança, entre em contato com o administrador do sistema.
