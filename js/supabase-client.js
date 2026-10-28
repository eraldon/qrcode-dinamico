/**
 * SUPABASE CLIENT & LOCALSTORAGE FALLBACK ENGINE
 * DynamiQR - Dynamic QR Code Manager
 */

(function (window) {
  'use strict';

  const STORAGE_KEY_CONFIG = 'dynq_supabase_config';
  const STORAGE_KEY_LOCAL_DATA = 'dynq_local_qrcodes';
  const STORAGE_KEY_LOCAL_SCANS = 'dynq_local_scans';

  // Dados iniciais de demonstração para quando o usuário abrir a primeira vez sem configurar o Supabase
  const DEFAULT_DEMO_DATA = [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      slug: 'cardapio',
      title: 'Cardápio Digital - Restaurante',
      destination_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
      category: 'Restaurante',
      scans_count: 142,
      status: 'active',
      foreground_color: '#0f172a',
      background_color: '#ffffff',
      dot_style: 'rounded',
      corner_style: 'extra-rounded',
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      last_scanned_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      slug: 'instagram',
      title: 'Campanha Instagram Oficial',
      destination_url: 'https://instagram.com',
      category: 'Marketing',
      scans_count: 89,
      status: 'active',
      foreground_color: '#6366f1',
      background_color: '#ffffff',
      dot_style: 'classy',
      corner_style: 'dot',
      created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      last_scanned_at: new Date(Date.now() - 14400000).toISOString()
    },
    {
      id: 'a0000000-0000-0000-0000-000000000003',
      slug: 'portfolio',
      title: 'Meu Cartão / Portfólio',
      destination_url: 'https://github.com',
      category: 'Pessoal',
      scans_count: 35,
      status: 'active',
      foreground_color: '#059669',
      background_color: '#ffffff',
      dot_style: 'dots',
      corner_style: 'rounded',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
      last_scanned_at: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  class SupabaseService {
    constructor() {
      this.client = null;
      this.mode = 'local'; // 'supabase' ou 'local'
      this.config = this.loadConfig();
      this.init();
    }

    loadConfig() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.warn('Erro ao ler config do Supabase do localStorage:', e);
      }
      return { url: '', anonKey: '' };
    }

    saveConfig(url, anonKey) {
      const sanitizedUrl = (url || '').trim().replace(/\/+$/, '');
      const sanitizedKey = (anonKey || '').trim();
      this.config = { url: sanitizedUrl, anonKey: sanitizedKey };
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(this.config));
      return this.init();
    }

    init() {
      if (this.config.url && this.config.anonKey && window.supabase) {
        try {
          this.client = window.supabase.createClient(this.config.url, this.config.anonKey);
          this.mode = 'supabase';
          console.log('[SupabaseService] Inicializado em modo SUPABASE CLOUD.');
          return true;
        } catch (err) {
          console.error('[SupabaseService] Falha ao instanciar cliente Supabase:', err);
          this.mode = 'local';
        }
      } else {
        this.client = null;
        this.mode = 'local';
        console.log('[SupabaseService] Inicializado em MODO LOCAL (LocalStorage).');
        this.initLocalData();
      }
      return false;
    }

    initLocalData() {
      if (!localStorage.getItem(STORAGE_KEY_LOCAL_DATA)) {
        localStorage.setItem(STORAGE_KEY_LOCAL_DATA, JSON.stringify(DEFAULT_DEMO_DATA));
      }
      if (!localStorage.getItem(STORAGE_KEY_LOCAL_SCANS)) {
        localStorage.setItem(STORAGE_KEY_LOCAL_SCANS, JSON.stringify([]));
      }
    }

    isSupabaseMode() {
      return this.mode === 'supabase' && !!this.client;
    }

    async testConnection() {
      if (!this.isSupabaseMode()) {
        return { success: false, message: 'Credenciais do Supabase não configuradas.' };
      }
      try {
        const { data, error } = await this.client.from('qr_codes').select('count', { count: 'exact', head: true });
        if (error) {
          if (error.code === '42P01') {
            return {
              success: false,
              message: 'Conectado ao Supabase, porém a tabela "qr_codes" ainda não foi criada. Por favor, execute o script SQL!'
            };
          }
          return { success: false, message: 'Erro no Supabase: ' + error.message };
        }
        return { success: true, message: 'Conexão com Supabase estabelecida com sucesso!' };
      } catch (err) {
        return { success: false, message: 'Falha de rede ou URL inválida: ' + err.message };
      }
    }

    // ==========================================
    // CRUD DE QR CODES
    // ==========================================

    async listQRCodes() {
      if (this.isSupabaseMode()) {
        try {
          const { data, error } = await this.client
            .from('qr_codes')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;
          return data || [];
        } catch (err) {
          console.warn('[SupabaseService] Erro ao listar do Supabase, fallback para local:', err);
        }
      }

      // Local fallback
      try {
        const raw = localStorage.getItem(STORAGE_KEY_LOCAL_DATA);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }

    async getQRCodeBySlug(slug) {
      const cleanSlug = (slug || '').trim().toLowerCase();
      if (this.isSupabaseMode()) {
        try {
          const { data, error } = await this.client
            .from('qr_codes')
            .select('*')
            .eq('slug', cleanSlug)
            .maybeSingle();

          if (error) throw error;
          if (data) return data;
        } catch (err) {
          console.warn('[SupabaseService] Erro ao buscar por slug no Supabase:', err);
        }
      }

      // Local fallback
      const list = await this.listQRCodes();
      return list.find(item => item.slug.toLowerCase() === cleanSlug) || null;
    }

    generateUUID() {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        try {
          return crypto.randomUUID();
        } catch (e) {}
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    async createQRCode(qrData) {
      const slug = (qrData.slug || this.generateSlug()).trim().toLowerCase();
      
      // Valida se slug já existe
      const existing = await this.getQRCodeBySlug(slug);
      if (existing) {
        throw new Error(`O código/slug "${slug}" já está em uso. Escolha outro.`);
      }

      const newRecord = {
        slug: slug,
        title: (qrData.title || 'Novo QR Code Dinâmico').trim(),
        destination_url: (qrData.destination_url || '').trim(),
        category: qrData.category || 'Geral',
        scans_count: 0,
        status: qrData.status || 'active',
        foreground_color: qrData.foreground_color || '#000000',
        background_color: qrData.background_color || '#ffffff',
        dot_style: qrData.dot_style || 'square',
        corner_style: qrData.corner_style || 'square',
        logo_url: qrData.logo_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_scanned_at: null
      };

      if (this.isSupabaseMode()) {
        try {
          // No Supabase, omitimos o 'id' para que a coluna gen_random_uuid() gere o UUID v4 automaticamente
          const { data, error } = await this.client
            .from('qr_codes')
            .insert([newRecord])
            .select()
            .single();

          if (error) {
            console.error('[SupabaseService] Erro retornado pelo Supabase:', error);
            throw error;
          }
          return data;
        } catch (err) {
          console.error('[SupabaseService] Erro ao inserir no Supabase:', err);
          throw err;
        }
      }

      // Salva no LocalStorage com UUID válido
      newRecord.id = this.generateUUID();
      const list = await this.listQRCodes();
      list.unshift(newRecord);
      localStorage.setItem(STORAGE_KEY_LOCAL_DATA, JSON.stringify(list));
      return newRecord;
    }

    /**
     * O CORAÇÃO DO QR CODE DINÂMICO:
     * Altera somente o link de destino sem alterar o slug ou a imagem do QR Code!
     */
    async updateDestinationUrl(id, newDestinationUrl) {
      const sanitizedUrl = (newDestinationUrl || '').trim();
      if (!sanitizedUrl.startsWith('http://') && !sanitizedUrl.startsWith('https://')) {
        throw new Error('A URL de destino deve começar com http:// ou https://');
      }

      const updates = {
        destination_url: sanitizedUrl,
        updated_at: new Date().toISOString()
      };

      if (this.isSupabaseMode()) {
        try {
          const { data, error } = await this.client
            .from('qr_codes')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;
          return data;
        } catch (err) {
          console.error('[SupabaseService] Erro ao atualizar destination_url:', err);
          throw err;
        }
      }

      // Local fallback
      const list = await this.listQRCodes();
      const idx = list.findIndex(item => item.id === id);
      if (idx === -1) throw new Error('QR Code não encontrado.');
      list[idx] = { ...list[idx], ...updates };
      localStorage.setItem(STORAGE_KEY_LOCAL_DATA, JSON.stringify(list));
      return list[idx];
    }

    async updateQRCode(id, updates) {
      updates.updated_at = new Date().toISOString();

      if (this.isSupabaseMode()) {
        try {
          const { data, error } = await this.client
            .from('qr_codes')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;
          return data;
        } catch (err) {
          console.error('[SupabaseService] Erro ao atualizar:', err);
          throw err;
        }
      }

      // Local
      const list = await this.listQRCodes();
      const idx = list.findIndex(item => item.id === id);
      if (idx === -1) throw new Error('QR Code não encontrado.');
      list[idx] = { ...list[idx], ...updates };
      localStorage.setItem(STORAGE_KEY_LOCAL_DATA, JSON.stringify(list));
      return list[idx];
    }

    async deleteQRCode(id) {
      if (this.isSupabaseMode()) {
        try {
          const { error } = await this.client
            .from('qr_codes')
            .delete()
            .eq('id', id);

          if (error) throw error;
          return true;
        } catch (err) {
          console.error('[SupabaseService] Erro ao excluir do Supabase:', err);
          throw err;
        }
      }

      const list = await this.listQRCodes();
      const filtered = list.filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEY_LOCAL_DATA, JSON.stringify(filtered));
      return true;
    }

    async toggleStatus(id) {
      const list = await this.listQRCodes();
      const target = list.find(item => item.id === id);
      if (!target) throw new Error('QR Code não encontrado.');
      const newStatus = target.status === 'active' ? 'paused' : 'active';
      return await this.updateQRCode(id, { status: newStatus });
    }

    /**
     * Registra o scan e retorna a URL de destino
     */
    async recordScan(slug, userAgent, referrer) {
      const cleanSlug = (slug || '').trim().toLowerCase();

      if (this.isSupabaseMode()) {
        try {
          // 1. Tenta função RPC atômica record_qr_scan se existir
          try {
            const { data: rpcUrl, error: rpcError } = await this.client.rpc('record_qr_scan', {
              target_slug: cleanSlug,
              client_ua: userAgent || navigator.userAgent,
              client_ref: referrer || document.referrer || null
            });

            if (!rpcError && rpcUrl) {
              return {
                success: true,
                destination_url: rpcUrl,
                paused: rpcUrl === 'PAUSED'
              };
            }
          } catch (rpcEx) {
            console.warn('[SupabaseService] RPC não disponível, usando consulta direta:', rpcEx);
          }

          // 2. Busca direta no Supabase com maybeSingle (não dispara exceção se não encontrar)
          const { data: qr, error: selectErr } = await this.client
            .from('qr_codes')
            .select('*')
            .ilike('slug', cleanSlug)
            .maybeSingle();

          if (qr) {
            if (qr.status === 'paused') {
              return { success: false, paused: true };
            }

            // Tenta atualizar contadores em background (sem bloquear o redirecionamento caso falhe)
            (async () => {
              try {
                await this.client
                  .from('qr_codes')
                  .update({
                    scans_count: (Number(qr.scans_count) || 0) + 1,
                    last_scanned_at: new Date().toISOString()
                  })
                  .eq('id', qr.id);

                await this.client
                  .from('qr_scans')
                  .insert([{
                    qr_code_id: qr.id,
                    slug: cleanSlug,
                    user_agent: userAgent || navigator.userAgent,
                    referrer: referrer || document.referrer
                  }]);
              } catch (cntErr) {
                console.warn('[SupabaseService] Aviso ao computar scan em background:', cntErr);
              }
            })();

            return { success: true, destination_url: qr.destination_url };
          }
        } catch (err) {
          console.warn('[SupabaseService] Erro ao buscar no Supabase, tentando local:', err);
        }
      }

      // 3. Fallback LocalStorage (caso o QR Code tenha sido criado localmente)
      const list = await this.listQRCodes();
      const target = list.find(item => (item.slug || '').toLowerCase() === cleanSlug);
      
      if (!target) {
        return { success: false, message: `O QR Code com o código "${slug}" não foi localizado no Supabase nem localmente.` };
      }
      
      if (target.status === 'paused') {
        return { success: false, paused: true };
      }

      target.scans_count = (Number(target.scans_count) || 0) + 1;
      target.last_scanned_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY_LOCAL_DATA, JSON.stringify(list));

      // Salva histórico de scans locais
      try {
        const scansRaw = localStorage.getItem(STORAGE_KEY_LOCAL_SCANS);
        const scans = scansRaw ? JSON.parse(scansRaw) : [];
        scans.push({
          qr_code_id: target.id,
          slug: cleanSlug,
          scanned_at: new Date().toISOString(),
          user_agent: navigator.userAgent
        });
        localStorage.setItem(STORAGE_KEY_LOCAL_SCANS, JSON.stringify(scans.slice(-100)));
      } catch (e) {}

      return { success: true, destination_url: target.destination_url };
    }

    generateSlug(length = 6) {
      const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }
  }

  // Exportar globalmente
  window.supabaseService = new SupabaseService();

})(window);
