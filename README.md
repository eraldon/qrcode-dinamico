# 📱 DynamiQR Studio - Sistema de QR Code Dinâmico com Supabase

Um sistema web completo, moderno e responsivo desenvolvido com **HTML, CSS, JavaScript e Supabase** que permite criar QR Codes dinâmicos e **alterar o link de destino a qualquer momento sem precisar reimprimir ou alterar a imagem do QR Code**.

---

## 💡 Como Funciona o QR Code Dinâmico?

1. **Link Fixo (O QR Code Impresso):**
   - O QR Code codifica um link permanente do sistema (por exemplo: `https://seusite.com/r.html?c=cardapio`).
   - Essa imagem nunca precisa ser alterada, podendo ser impressa em milhares de cardápios, panfletos, cartões de visita ou embalagens.

2. **O Redirecionador (`r.html`):**
   - Quando alguém escaneia o QR Code, o navegador acessa o `r.html`.
   - O sistema consulta no **Supabase** qual é a URL de destino cadastrada para aquele código.
   - O contador de leituras (*scans*) é incrementado e a data do último acesso é registrada.
   - O usuário é instantaneamente redirecionado para o link final.

3. **Alteração em 1 Clique no Painel:**
   - No painel administrativo (`index.html`), basta clicar em **"Alterar Destino"**, digitar a nova URL e salvar.
   - O QR Code impresso no papel passará a redirecionar para o novo link imediatamente!

---

## 🚀 Funcionalidades Principais

- ⚡ **Alteração Instantânea de Destino**: Mude para onde o QR Code aponta sem mexer na imagem física.
- 🎨 **Estúdio de Estilização Visual**:
  - Cores customizadas (módulos e fundo).
  - Estilos de pontos (arredondados, clássicos, elegantes, pontilhados).
  - Estilos dos cantos/olhos do QR.
  - Pré-visualização em tempo real conforme você personaliza.
- 📊 **Métricas de Acesso**:
  - Total de QR Codes ativos.
  - Total de leituras (scans) computadas.
  - Indicador de QR Code mais escaneado.
  - Horário do último acesso registrado.
- 💾 **Integração com Supabase + Modo Local (Zero-Config)**:
  - Funciona imediatamente em **Modo Local (LocalStorage)** com dados de teste para você experimentar sem precisar configurar nada.
  - Conexão nativa com **Supabase Cloud** para sincronização em múltiplos dispositivos e persistência em banco PostgreSQL.
- ⏸ **Pausar e Ativar Links**: Desative temporariamente o redirecionamento com 1 clique (exibe tela avisando que o link está em manutenção).
- 📥 **Download em Alta Definição**: Exporte o QR Code em formato PNG de alta resolução pronto para impressão gráfica.
- 📋 **Copiar Link Dinâmico**: Copie o endereço curto para envio em redes sociais.

---

## 📁 Estrutura de Arquivos

```text
qrcode-dinamico/
├── index.html            # Painel administrativo e estúdio de criação
├── r.html                # Motor de redirecionamento dinâmico e registro de scans
├── schema.sql            # Script SQL pronto para executar no Supabase
├── README.md             # Documentação completa
├── css/
│   └── styles.css        # Sistema de design moderno, tema escuro e glassmorphism
└── js/
    ├── supabase-client.js # Camada de integração com Supabase e fallback local
    ├── qr-manager.js      # Motor de renderização e download com qr-code-styling
    └── app.js             # Controlador da interface, filtros, busca e modais
```

---

## 🛠️ Como Conectar ao seu Supabase

### Passo 1: Executar o Script SQL
1. Acesse o painel do seu projeto no [Supabase](https://supabase.com).
2. Vá no menu **SQL Editor** no painel lateral esquerdo.
3. Clique em **New query**, cole todo o conteúdo do arquivo [`schema.sql`](schema.sql) e clique em **Run**.
4. Este script criará:
   - A tabela `qr_codes` (com suporte a customização visual, slugs e contadores).
   - A tabela `qr_scans` (registro analítico detalhado).
   - A função atômica `record_qr_scan` para contagem rápida de scans.
   - As políticas de segurança RLS (*Row Level Security*).

### Passo 2: Conectar no Painel DynamiQR
1. Abra o arquivo `index.html` em seu navegador.
2. Clique no botão **"Supabase"** ou na pílula de status no canto superior direito.
3. Preencha:
   - **Project URL**: (ex: `https://xyzcompany.supabase.co`)
   - **Anon / Public Key**: (sua chave pública encontrada em *Project Settings > API*)
4. Clique em **Testar Conexão** e depois em **Salvar e Conectar**.
5. Pronto! Seus QR Codes agora são salvos diretamente na nuvem do Supabase!

---

## 🌐 Como Publicar na Web (Hospedagem Gratuita)

Como o projeto é 100% estático (HTML, CSS e JS nativos), você pode hospedá-lo gratuitamente em plataformas como:
- **Vercel** (Basta arrastar a pasta do projeto ou conectar ao GitHub)
- **Netlify**
- **GitHub Pages**
- **Cloudflare Pages**

Ao publicar em seu domínio (ex: `https://meuprojeto.vercel.app`), todos os links dinâmicos gerados passarão a usar o seu domínio oficial automaticamente!
