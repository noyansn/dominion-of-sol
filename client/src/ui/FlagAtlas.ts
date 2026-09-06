import * as PIXI from 'pixi.js';

export interface FlagDescriptor {
  layout: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  emblem: string;
}

export interface FactionFlagConfig {
  id: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  symbol: 'star' | 'chevron' | 'shield' | 'sun' | 'diamond' | 'cross' | 'anchor' | 'hexagon' | 'eagle' | 'trident';
}

export const FACTION_FLAGS: Record<string, FactionFlagConfig> = {
  flag_sol: { id: 'flag_sol', primaryColor: '#1E3A8A', secondaryColor: '#3B82F6', accentColor: '#FDE047', symbol: 'star' },
  flag_vanguard: { id: 'flag_vanguard', primaryColor: '#7F1D1D', secondaryColor: '#EF4444', accentColor: '#FFFFFF', symbol: 'chevron' },
  flag_verdant: { id: 'flag_verdant', primaryColor: '#064E3B', secondaryColor: '#10B981', accentColor: '#FBBF24', symbol: 'shield' },
  flag_solaris: { id: 'flag_solaris', primaryColor: '#78350F', secondaryColor: '#F59E0B', accentColor: '#FEF08A', symbol: 'sun' },
  flag_aether: { id: 'flag_aether', primaryColor: '#4C1D95', secondaryColor: '#8B5CF6', accentColor: '#E0E7FF', symbol: 'diamond' },
  flag_pact: { id: 'flag_pact', primaryColor: '#831843', secondaryColor: '#EC4899', accentColor: '#FFFFFF', symbol: 'cross' },
  flag_nordic: { id: 'flag_nordic', primaryColor: '#164E63', secondaryColor: '#06B6D4', accentColor: '#E2E8F0', symbol: 'anchor' },
  flag_obsidian: { id: 'flag_obsidian', primaryColor: '#1A2E05', secondaryColor: '#84CC16', accentColor: '#FEF08A', symbol: 'hexagon' },
  flag_lakota: { id: 'flag_lakota', primaryColor: '#7C2D12', secondaryColor: '#1E293B', accentColor: '#FEF08A', symbol: 'sun' },
};

export class FlagAtlas {
  private textures: Map<string, PIXI.Texture> = new Map();

  public getTexture(flagId: string): PIXI.Texture {
    if (this.textures.has(flagId)) {
      return this.textures.get(flagId)!;
    }

    const config = FACTION_FLAGS[flagId] || FACTION_FLAGS['flag_sol'];
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Flag background base
      ctx.fillStyle = config.primaryColor;
      ctx.fillRect(0, 0, 48, 32);

      // Secondary stripe or diagonal
      ctx.fillStyle = config.secondaryColor;
      ctx.fillRect(0, 8, 48, 16);

      // Border outline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, 47, 31);

      // Center Emblem / Symbol
      ctx.fillStyle = config.accentColor;
      ctx.strokeStyle = config.accentColor;
      ctx.lineWidth = 2;

      const cx = 24;
      const cy = 16;

      switch (config.symbol) {
        case 'star':
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const x = cx + Math.cos(angle) * 6;
            const y = cy + Math.sin(angle) * 6;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          break;

        case 'chevron':
          ctx.beginPath();
          ctx.moveTo(cx - 6, cy - 5);
          ctx.lineTo(cx, cy + 5);
          ctx.lineTo(cx + 6, cy - 5);
          ctx.stroke();
          break;

        case 'shield':
          ctx.beginPath();
          ctx.moveTo(cx - 5, cy - 6);
          ctx.lineTo(cx + 5, cy - 6);
          ctx.lineTo(cx + 5, cy + 1);
          ctx.quadraticCurveTo(cx, cy + 7, cx, cy + 7);
          ctx.quadraticCurveTo(cx - 5, cy + 1, cx - 5, cy - 6);
          ctx.fill();
          break;

        case 'sun':
          ctx.beginPath();
          ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx, cy, 7, 0, Math.PI * 2);
          ctx.setLineDash([2, 2]);
          ctx.stroke();
          ctx.setLineDash([]);
          break;

        case 'diamond':
          ctx.beginPath();
          ctx.moveTo(cx, cy - 6);
          ctx.lineTo(cx + 6, cy);
          ctx.lineTo(cx, cy + 6);
          ctx.lineTo(cx - 6, cy);
          ctx.closePath();
          ctx.fill();
          break;

        case 'cross':
          ctx.fillRect(cx - 1.5, cy - 6, 3, 12);
          ctx.fillRect(cx - 6, cy - 1.5, 12, 3);
          break;

        case 'hexagon':
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const x = cx + Math.cos(angle) * 5.5;
            const y = cy + Math.sin(angle) * 5.5;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          break;

        default:
          ctx.beginPath();
          ctx.arc(cx, cy, 4, 0, Math.PI * 2);
          ctx.fill();
      }
    }

    const texture = PIXI.Texture.from(canvas);
    this.textures.set(flagId, texture);
    return texture;
  }

  public serializeDescriptor(descriptor: FlagDescriptor): string {
    const normalized = this.normalizeDescriptor(descriptor);
    return JSON.stringify(normalized);
  }

  public normalizeDescriptor(descriptor: FlagDescriptor): FlagDescriptor {
    const layouts = new Set(['solid', 'horizontalBicolor', 'horizontalTricolor', 'verticalBicolor', 'verticalTricolor', 'cross', 'diagonal', 'chevron']);
    const emblems = new Set(['none', 'star', 'circle', 'sun', 'crescent', 'diamond', 'shield', 'eagle']);
    const cleanColor = (value: string, fallback: string) => /^#[0-9a-f]{6}$/i.test(value || '') ? value.toUpperCase() : fallback;
    return {
      layout: layouts.has(descriptor?.layout) ? descriptor.layout : 'horizontalBicolor',
      primaryColor: cleanColor(descriptor?.primaryColor, '#1E3A8A'),
      secondaryColor: cleanColor(descriptor?.secondaryColor, '#07131C'),
      accentColor: cleanColor(descriptor?.accentColor, '#FDE047'),
      emblem: emblems.has(descriptor?.emblem) ? descriptor.emblem : 'none',
    };
  }

  public getTextureForDescriptor(descriptor: FlagDescriptor): PIXI.Texture {
    const normalized = this.normalizeDescriptor(descriptor);
    const key = `custom:${this.serializeDescriptor(normalized)}`;
    const cached = this.textures.get(key);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = 48; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const { layout, primaryColor, secondaryColor, accentColor, emblem } = normalized;
      ctx.fillStyle = primaryColor; ctx.fillRect(0, 0, 48, 32);
      ctx.fillStyle = secondaryColor;
      if (layout === 'horizontalBicolor') ctx.fillRect(0, 16, 48, 16);
      else if (layout === 'horizontalTricolor') { ctx.fillRect(0, 11, 48, 10); ctx.fillStyle = primaryColor; ctx.fillRect(0, 21, 48, 11); }
      else if (layout === 'verticalBicolor') ctx.fillRect(24, 0, 24, 32);
      else if (layout === 'verticalTricolor') { ctx.fillRect(16, 0, 16, 32); ctx.fillStyle = primaryColor; ctx.fillRect(32, 0, 16, 32); }
      else if (layout === 'diagonal') { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(48, 32); ctx.lineTo(48, 0); ctx.closePath(); ctx.fill(); }
      else if (layout === 'chevron') { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(24, 16); ctx.lineTo(0, 32); ctx.closePath(); ctx.fill(); }
      else if (layout === 'cross') { ctx.fillRect(20, 0, 8, 32); ctx.fillRect(0, 12, 48, 8); }
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1; ctx.strokeRect(.5, .5, 47, 31);
      ctx.fillStyle = accentColor; ctx.strokeStyle = accentColor; ctx.lineWidth = 2;
      const cx = 24, cy = 16;
      if (emblem === 'circle' || emblem === 'sun') ctx.arc(cx, cy, emblem === 'sun' ? 5 : 4, 0, Math.PI * 2), ctx.fill();
      else if (emblem === 'diamond') { ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 6, cy); ctx.lineTo(cx, cy + 6); ctx.lineTo(cx - 6, cy); ctx.closePath(); ctx.fill(); }
      else if (emblem === 'shield') { ctx.beginPath(); ctx.moveTo(cx - 5, cy - 6); ctx.lineTo(cx + 5, cy - 6); ctx.lineTo(cx + 4, cy + 2); ctx.quadraticCurveTo(cx, cy + 7, cx, cy + 7); ctx.quadraticCurveTo(cx - 4, cy + 2, cx - 5, cy - 6); ctx.fill(); }
      else if (emblem === 'star' || emblem === 'eagle') {
        ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? 3 : 6; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.fill();
      } else if (emblem === 'crescent') {
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = secondaryColor; ctx.arc(cx + 3, cy - 2, 5, 0, Math.PI * 2); ctx.fill();
      }
    }
    const texture = PIXI.Texture.from(canvas);
    this.textures.set(key, texture);
    return texture;
  }
}

export const flagAtlas = new FlagAtlas();
