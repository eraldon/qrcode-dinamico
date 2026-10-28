/**
 * QR CODE GENERATION & STYLING ENGINE
 * Uses qr-code-styling library
 */

(function (window) {
  'use strict';

  class QRManager {
    constructor() {
      this.activeInstances = new Map();
    }

    /**
     * Monta o link absoluto que o QR Code vai conter.
     * Este link é FIXO para o QR Code (aponta para r.html?c=SLUG).
     * O destino real é buscado no Supabase/banco pelo r.html.
     */
    buildRedirectUrl(slug) {
      const cleanSlug = encodeURIComponent((slug || '').trim().toLowerCase());
      
      // 1. Verifica se o usuário configurou uma URL Base personalizada (ex: domínio ou Vercel)
      const customBase = (localStorage.getItem('dynq_custom_base_url') || '').trim().replace(/\/+$/, '');
      if (customBase && (customBase.startsWith('http://') || customBase.startsWith('https://'))) {
        return `${customBase}/r.html?c=${cleanSlug}`;
      }

      // 2. Se estiver rodando como arquivo local no PC (file:///)
      if (window.location.protocol === 'file:') {
        const cleanHref = window.location.href.split('index.html')[0].split('?')[0].split('#')[0];
        const folder = cleanHref.endsWith('/') ? cleanHref : cleanHref + '/';
        return `${folder}r.html?c=${cleanSlug}`;
      }

      // 3. Padrão web normal (http / https)
      let base = window.location.origin;
      let path = window.location.pathname.replace(/\/index\.html$/i, '').replace(/\/+$/, '');

      return `${base}${path}/r.html?c=${cleanSlug}`;
    }

    /**
     * Cria e renderiza um QR code em um container DOM
     */
    renderQRCode(container, options = {}) {
      if (!container) return null;
      container.innerHTML = '';

      const {
        slug = 'test',
        size = 180,
        foregroundColor = '#000000',
        backgroundColor = '#ffffff',
        dotStyle = 'square',
        cornerStyle = 'square',
        logoUrl = null
      } = options;

      const dynamicUrl = this.buildRedirectUrl(slug);

      // Mapeamento de estilos suportados pelo qr-code-styling
      const validDotStyles = ['square', 'dots', 'rounded', 'classy', 'extra-rounded'];
      const safeDotStyle = validDotStyles.includes(dotStyle) ? dotStyle : 'square';

      const validCornerStyles = ['square', 'dot', 'extra-rounded'];
      const safeCornerStyle = validCornerStyles.includes(cornerStyle) ? cornerStyle : 'square';

      const qrOptions = {
        width: size,
        height: size,
        type: 'canvas',
        data: dynamicUrl,
        margin: 6,
        qrOptions: {
          typeNumber: 0,
          mode: 'Byte',
          errorCorrectionLevel: 'Q' // Nível Q permite adicionar logos e mantém leitura fácil
        },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.35,
          margin: 4,
          crossOrigin: 'anonymous'
        },
        dotsOptions: {
          color: foregroundColor,
          type: safeDotStyle
        },
        backgroundOptions: {
          color: backgroundColor
        },
        cornersSquareOptions: {
          color: foregroundColor,
          type: safeCornerStyle
        },
        cornersDotOptions: {
          color: foregroundColor,
          type: safeCornerStyle === 'dot' ? 'dot' : 'square'
        }
      };

      if (logoUrl) {
        qrOptions.image = logoUrl;
      }

      // Se a biblioteca QRCodeStyling estiver carregada
      if (typeof window.QRCodeStyling !== 'undefined') {
        const qrInstance = new window.QRCodeStyling(qrOptions);
        qrInstance.append(container);
        return qrInstance;
      } else {
        // Fallback básico se CDN não tiver carregado (QR com API pública segura)
        const fallbackImg = document.createElement('img');
        fallbackImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(dynamicUrl)}&color=${foregroundColor.replace('#', '')}&bgcolor=${backgroundColor.replace('#', '')}`;
        fallbackImg.alt = `QR Code: ${slug}`;
        fallbackImg.style.width = `${size}px`;
        fallbackImg.style.height = `${size}px`;
        fallbackImg.style.display = 'block';
        container.appendChild(fallbackImg);

        return {
          download: async ({ name, extension }) => {
            const link = document.createElement('a');
            link.href = fallbackImg.src;
            link.download = `${name}.${extension}`;
            link.click();
          }
        };
      }
    }

    /**
     * Faz download do QR Code em alta definição (PNG ou SVG)
     */
    async download(qrInstance, filename = 'qrcode-dinamico', format = 'png') {
      if (!qrInstance) return;

      try {
        if (typeof qrInstance.download === 'function') {
          await qrInstance.download({
            name: filename,
            extension: format
          });
        }
      } catch (err) {
        console.error('Erro ao baixar QR code:', err);
      }
    }
  }

  window.qrManager = new QRManager();
})(window);
