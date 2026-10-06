import * as THREE from 'three';
import type { SignDef } from './types';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d')! };
}

function noise(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, alpha: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n * alpha));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n * alpha));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * alpha));
  }
  ctx.putImageData(img, 0, 0);
}

function finish(c: HTMLCanvasElement, repeat = 1): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function makeBrickTexture(): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = canvas(S, S);
  ctx.fillStyle = '#2a2436';
  ctx.fillRect(0, 0, S, S);
  const rows = 8, bw = 64, bh = S / rows;
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? bw / 2 : 0;
    for (let x = -bw; x < S + bw; x += bw) {
      const shade = 60 + Math.random() * 30;
      const hue = 250 + Math.random() * 20;
      ctx.fillStyle = `hsl(${hue}, 14%, ${shade / 4 + 12}%)`;
      ctx.fillRect(x + off + 2, r * bh + 2, bw - 4, bh - 4);
      // highlight edge
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x + off + 2, r * bh + 2, bw - 4, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x + off + 2, r * bh + bh - 4, bw - 4, 2);
    }
  }
  // moss splotches
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = `rgba(90,150,90,${0.05 + Math.random() * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(Math.random() * S, Math.random() * S, 6 + Math.random() * 18, 4 + Math.random() * 10, Math.random() * 3, 0, 7);
    ctx.fill();
  }
  noise(ctx, S, S, 40, 1);
  return finish(c);
}

export function makeFloorTexture(): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = canvas(S, S);
  ctx.fillStyle = '#1b1826';
  ctx.fillRect(0, 0, S, S);
  const n = 4, ts = S / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const l = 16 + Math.random() * 8;
    ctx.fillStyle = `hsl(255, 12%, ${l}%)`;
    ctx.fillRect(i * ts + 3, j * ts + 3, ts - 6, ts - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(i * ts + 3, j * ts + 3, ts - 6, 3);
  }
  noise(ctx, S, S, 30, 1);
  return finish(c);
}

export function makeCrackedTexture(): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = canvas(S, S);
  ctx.fillStyle = '#17141f';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = 'hsl(255, 10%, 17%)';
  ctx.fillRect(4, 4, S - 8, S - 8);
  ctx.strokeStyle = '#05040a';
  ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    let x = S / 2 + (Math.random() - 0.5) * 40, y = S / 2 + (Math.random() - 0.5) * 40;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      x += (Math.random() - 0.5) * 70;
      y += (Math.random() - 0.5) * 70;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  noise(ctx, S, S, 30, 1);
  return finish(c);
}

export function makeMetalTexture(): THREE.CanvasTexture {
  const S = 128;
  const { c, ctx } = canvas(S, S);
  ctx.fillStyle = '#4a4f5c';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#3b3f4a';
  ctx.fillRect(6, 6, S - 12, S - 12);
  ctx.fillStyle = '#6a7080';
  for (const [x, y] of [[12, 12], [S - 12, 12], [12, S - 12], [S - 12, S - 12]]) {
    ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
  }
  noise(ctx, S, S, 24, 1);
  return finish(c);
}

export function makeTapeTexture(): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = canvas(S, 64);
  ctx.fillStyle = '#ffd60a';
  ctx.fillRect(0, 0, S, 64);
  ctx.fillStyle = '#111';
  for (let x = -64; x < S + 64; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x + 24, 0); ctx.lineTo(x - 8, 64); ctx.lineTo(x - 32, 64);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd60a';
  ctx.fillRect(0, 20, S, 24);
  ctx.fillStyle = '#111';
  ctx.font = 'bold 20px Rubik, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('DO NOT ENTER  •  CLOSED  •', 6, 32);
  return finish(c);
}

export function makeArrowTexture(): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = canvas(S, S);
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.moveTo(S / 2, 20); ctx.lineTo(S - 30, 120); ctx.lineTo(S / 2 + 40, 120); ctx.lineTo(S / 2 + 40, S - 30);
  ctx.lineTo(S / 2 - 40, S - 30); ctx.lineTo(S / 2 - 40, 120); ctx.lineTo(30, 120);
  ctx.closePath();
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeSkullTexture(): THREE.CanvasTexture {
  const S = 128;
  const { c, ctx } = canvas(S, S);
  ctx.clearRect(0, 0, S, S);
  ctx.font = '96px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff3b5c';
  ctx.fillText('☠', S / 2, S / 2 + 6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeExitSignTexture(): THREE.CanvasTexture {
  const { c, ctx } = canvas(256, 96);
  ctx.fillStyle = '#0a2e14';
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = '#7be495';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 244, 84);
  ctx.fillStyle = '#7be495';
  ctx.font = 'bold 64px Rubik, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT ➜', 128, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const STYLE_BG: Record<SignDef['style'], { bg: string; fg: string; border: string; font: string }> = {
  wood: { bg: '#6b4a2b', fg: '#f7e8c8', border: '#3c2814', font: 'Bangers' },
  metal: { bg: '#3a3f4b', fg: '#e8ecf5', border: '#171a20', font: 'Rubik' },
  paper: { bg: '#efe6cf', fg: '#221c16', border: '#c9b98f', font: 'Rubik' },
  neon: { bg: '#120a1e', fg: '#ff4fd8', border: '#ff4fd8', font: 'Bangers' },
};

export function makeSignTexture(sign: SignDef): THREE.CanvasTexture {
  const W = 512, H = 256;
  const { c, ctx } = canvas(W, H);
  const st = STYLE_BG[sign.style];
  ctx.fillStyle = st.bg;
  ctx.fillRect(0, 0, W, H);
  if (sign.style === 'wood') {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.08})`;
      ctx.fillRect(0, i * (H / 6), W, 3);
    }
  }
  if (sign.style === 'metal') noise(ctx, W, H, 40, 1);
  if (sign.style === 'paper') {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let i = 0; i < 20; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 30, 2);
  }
  ctx.strokeStyle = st.border;
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, W - 12, H - 12);
  if (sign.style === 'neon') {
    ctx.shadowColor = '#ff4fd8';
    ctx.shadowBlur = 24;
  }
  const lines = sign.lines.filter((l) => l.length > 0);
  const all = sign.author ? [...lines, sign.author] : lines;
  const n = all.length;
  const maxFont = sign.style === 'wood' || sign.style === 'neon' ? 58 : 46;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = st.fg;
  const lineH = Math.min(70, (H - 50) / n);
  all.forEach((line, i) => {
    let size = Math.min(maxFont, lineH * 0.9);
    const isAuthor = sign.author && i === n - 1;
    if (isAuthor) size *= 0.7;
    ctx.font = `${st.font === 'Rubik' ? '800 ' : ''}${size}px ${st.font}, Rubik, sans-serif`;
    while (ctx.measureText(line).width > W - 50 && size > 16) {
      size -= 2;
      ctx.font = `${st.font === 'Rubik' ? '800 ' : ''}${size}px ${st.font}, Rubik, sans-serif`;
    }
    const y = H / 2 + (i - (n - 1) / 2) * lineH;
    if (sign.style === 'paper' && !isAuthor) {
      // handwritten-ish tilt
      ctx.save();
      ctx.translate(W / 2, y);
      ctx.rotate((Math.random() - 0.5) * 0.04);
      ctx.fillText(line, 0, 0);
      ctx.restore();
    } else {
      ctx.fillText(line, W / 2, y);
    }
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function makeGraffitiTexture(msg: string, color: string, rough: boolean): THREE.CanvasTexture {
  const W = 512, H = 256;
  const { c, ctx } = canvas(W, H);
  ctx.clearRect(0, 0, W, H);
  const lines = msg.split('|');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lineH = Math.min(110, (H - 30) / lines.length);
  lines.forEach((line, i) => {
    let size = Math.min(rough ? 82 : 68, lineH * 0.92);
    ctx.font = `72px ${rough ? 'Bangers' : 'Rubik'}, sans-serif`;
    ctx.font = `${rough ? '' : '800 '}${size}px ${rough ? 'Bangers' : 'Rubik'}, sans-serif`;
    while (ctx.measureText(line).width > W - 60 && size > 18) {
      size -= 3;
      ctx.font = `${rough ? '' : '800 '}${size}px ${rough ? 'Bangers' : 'Rubik'}, sans-serif`;
    }
    const y = H / 2 + (i - (lines.length - 1) / 2) * lineH;
    ctx.save();
    ctx.translate(W / 2 + (Math.random() - 0.5) * 24, y);
    ctx.rotate((Math.random() - 0.5) * 0.09);
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = color;
    ctx.fillText(line, 0, 0);
    ctx.restore();
  });
  // paint drips
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = color;
  for (let i = 0; i < 6; i++) {
    const x = 40 + Math.random() * (W - 80);
    const y = Math.random() * H;
    const len = 8 + Math.random() * 46;
    ctx.fillRect(x, y, 2.5, len);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeLabelTexture(text: string, color = '#ffd166'): THREE.CanvasTexture {
  const { c, ctx } = canvas(128, 128);
  ctx.fillStyle = '#0b0a14';
  ctx.beginPath(); ctx.arc(64, 64, 60, 0, 7); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = '90px Bangers, Rubik, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
