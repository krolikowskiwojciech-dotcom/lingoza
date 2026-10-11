// „Wyślij wynik”: systemowe okienko udostępniania (SMS, Mail, WhatsApp…), bez niego schowek, a na końcu pole do skopiowania.

import { h, wyczysc } from './dom.js';
import { ik } from './grafiki.js';

export function przyciskWyslij(tekst, klasa = 'btn zielony szeroki') {
  const status = h('p', { class: 'wyslij-status', role: 'status' });
  const btn = h('button', { class: klasa, type: 'button' }, ik('wyslij'), ' Wyślij wynik');
  btn.onclick = async () => {
    btn.disabled = true;
    wyczysc(status);
    try {
      if (navigator.share) {
        try { await navigator.share({ title: 'Lingoza — wynik', text: tekst }); status.textContent = 'Wysłane? Super!'; return; }
        catch (e) { if (e.name === 'AbortError') return; }
      }
      if (navigator.clipboard?.writeText) {
        try { await navigator.clipboard.writeText(tekst); status.textContent = 'Skopiowano — wklej w wiadomości.'; return; } catch { /* dalej */ }
      }
      const pole = h('textarea', { class: 'pole wyslij-kopiuj', readonly: true }, tekst);
      status.append('Zaznacz i skopiuj:', pole);
      pole.select();
    } finally { btn.disabled = false; }
  };
  return h('div', { class: 'wyslij' }, btn, status);
}

export const minuty = (ms) => Math.max(1, Math.round(ms / 60000));
export const procent = (a, b) => Math.round((a / Math.max(1, b)) * 100);
