// ════════════════════════════════════════════════════════════
// STAGE CRONO GRAVITY · audio.js
// Módulo centralizado de audio. ÚNICO punto donde se usa
// SpeechSynthesisUtterance. El resto de la app usa esta API.
//
// REGLA 1 (Capacitor-readiness): este archivo se reemplazará en
// la versión nativa por TTS nativo (Capacitor Text-to-Speech),
// que es más confiable, no requiere "unlock" inicial, y no se
// pisa con otras apps tan fácilmente.
//
// LIMITACIÓN PWA-ONLY: speechSynthesis requiere un gesto de
// usuario para "desbloquearse" la primera vez (por eso unlock()
// se llama dentro del tap del botón "iniciar"). Esto no aplica
// en Capacitor.
// ════════════════════════════════════════════════════════════

const SC_Audio = {
  _enabled: true,
  _unlocked: false,

  isAvailable() {
    return 'speechSynthesis' in window;
  },

  isEnabled() {
    return this._enabled && this.isAvailable();
  },

  setEnabled(v) {
    this._enabled = !!v;
  },

  toggle() {
    this._enabled = !this._enabled;
    return this._enabled;
  },

  // Debe llamarse DENTRO de un gesto del usuario (tap, click)
  // para que el navegador permita TTS más tarde.
  unlock() {
    if (this._unlocked || !this.isAvailable()) return;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
      this._unlocked = true;
    } catch (e) {}
  },

  // priority=true cancela cualquier audio en curso para hablar
  // este mensaje inmediatamente.
  speak(txt, priority = false) {
    if (!this.isEnabled() || !txt) return;
    try {
      if (priority) window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(txt);
      u.lang = 'es-CL';
      u.rate = 0.95;
      u.pitch = 1.0;
      u.volume = 1.0;
      const v = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('es'));
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  },

  cancel() {
    if (!this.isAvailable()) return;
    try { window.speechSynthesis.cancel(); } catch (e) {}
  },
};
