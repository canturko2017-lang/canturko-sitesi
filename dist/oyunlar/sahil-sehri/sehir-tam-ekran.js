'use strict';

window.SehirTamEkran = (() => {
  const styles = `
    .sehir-fullscreen-help, .sehir-fullscreen-help * { box-sizing: border-box; }
    .sehir-fullscreen-help { position: fixed; z-index: 5; top: 50%; left: 50%; right: auto; bottom: auto; transform: translate(-50%, -50%); width: min(420px, calc(100% - 26px)); max-width: none; max-height: calc(100vh - 30px); max-height: calc(100dvh - 30px); margin: 0; overflow: auto; overscroll-behavior: contain; padding: 18px; background: #142c35; color: #f4faf8; border: 1px solid #839f9e; border-radius: 16px; box-shadow: 0 18px 55px #071313ad; font: 16px/1.5 Arial,sans-serif; }
    .sehir-fullscreen-help:not([open]), .sehir-fullscreen-help [hidden], .sehir-fullscreen-curtain[hidden] { display: none; }
    .sehir-fullscreen-help::backdrop, .sehir-fullscreen-curtain { background: #071c268a; }
    .sehir-fullscreen-curtain { position: fixed; z-index: 5; inset: 0; }
    .sehir-fullscreen-help h2 { margin: 0; font-size: 1.44rem; line-height: 1.16; letter-spacing: -.025em; }
    .sehir-fullscreen-help p { margin: 10px 0 0; }
    .sehir-fullscreen-help ol { padding-left: 1.45rem; margin: 12px 0 16px; }
    .sehir-fullscreen-help li + li { margin-top: 5px; }
    .sehir-fullscreen-help button { min-width: 86px; min-height: 44px; padding: 8px 12px; margin-top: 12px; background: #d4e8bd; color: #182d25; border: 1px solid #d4e8bd; border-radius: 9px; font: 750 1rem/1.1 Arial,sans-serif; cursor: pointer; }
    .sehir-fullscreen-help button:hover { background: #e6f3d9; }
    .sehir-fullscreen-help button:focus-visible { outline: 2px solid #ffda92; outline-offset: 3px; }
    @media (max-width: 400px), (max-height: 420px) { .sehir-fullscreen-help { padding: 13px; } }
  `;

  function create({ button, target = document.documentElement } = {}) {
    const standaloneMode = window.matchMedia?.('(display-mode: standalone)');
    const fullscreenMode = window.matchMedia?.('(display-mode: fullscreen)');
    const appleTouchDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const activeNative = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement ||
      document.webkitCurrentFullScreenElement || document.webkitIsFullScreen);
    const appView = () => Boolean(navigator.standalone || standaloneMode?.matches);
    let help = null;
    let curtain = null;
    let closeButton = null;
    let helpOpen = false;
    let nativeDialog = false;
    let previousFocus = null;
    let pending = false;
    let legacyPending = false;

    function update() {
      const native = activeNative();
      const installed = appView();
      const externalFullscreen = Boolean(fullscreenMode?.matches);
      const label = native ? 'Tam ekrandan çık' : installed ? 'Uygulama görünümü' : 'Tam ekran';
      if (button.textContent !== label) button.textContent = label;
      button.title = label;
      button.setAttribute('aria-pressed', String(native || installed || externalFullscreen));
      button.setAttribute('aria-busy', String(pending));
    }

    function holdFocus(event) {
      if (helpOpen && !nativeDialog && !help.contains(event.target)) closeButton.focus({ preventScroll: true });
    }

    function finishClosing() {
      if (!helpOpen) return;
      helpOpen = false;
      nativeDialog = false;
      curtain.hidden = true;
      button.removeAttribute('aria-controls');
      document.removeEventListener('focusin', holdFocus);
      const restore = previousFocus && previousFocus !== document.body && previousFocus.isConnected ? previousFocus : button;
      previousFocus = null;
      restore.focus({ preventScroll: true });
    }

    function closeHelp() {
      if (!helpOpen) return;
      if (nativeDialog && typeof help.close === 'function') help.close();
      else help.removeAttribute('open');
      finishClosing();
    }

    function prepareHelp() {
      if (help) return;
      if (!document.getElementById('sehir-fullscreen-help-style')) {
        const style = document.createElement('style');
        style.id = 'sehir-fullscreen-help-style';
        style.textContent = styles;
        document.head.append(style);
      }
      curtain = document.createElement('div');
      curtain.className = 'sehir-fullscreen-curtain';
      curtain.setAttribute('aria-hidden', 'true');
      curtain.hidden = true;
      curtain.addEventListener('click', closeHelp);

      help = document.createElement('dialog');
      help.id = 'sehir-fullscreen-help';
      help.className = 'sehir-fullscreen-help';
      help.setAttribute('role', 'dialog');
      help.setAttribute('aria-modal', 'true');
      help.setAttribute('aria-labelledby', 'sehir-fullscreen-help-title');
      help.setAttribute('aria-describedby', 'sehir-fullscreen-help-intro');
      help.innerHTML = `
        <h2 id="sehir-fullscreen-help-title"></h2>
        <p id="sehir-fullscreen-help-intro"></p>
        <ol id="sehir-fullscreen-ios-steps" hidden>
          <li>Safari’de <strong>Paylaş</strong> düğmesine dokun. Bazı sürümlerde önce sayfa menüsünü açman gerekir.</li>
          <li><strong>Ana Ekrana Ekle</strong> seçeneğini seç.</li>
          <li>Varsa <strong>Web Uygulaması Olarak Aç</strong> seçeneğini aç ve <strong>Ekle</strong> düğmesine dokun.</li>
          <li>Ana ekrandaki Sahil Şehri simgesinden oyunu aç.</li>
        </ol>
        <button type="button">Tamam</button>`;
      closeButton = help.querySelector('button');
      closeButton.addEventListener('click', closeHelp);
      help.addEventListener('close', finishClosing);
      help.addEventListener('cancel', event => { event.preventDefault(); closeHelp(); });
      help.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        closeHelp();
      });
      document.body.append(curtain, help);
    }

    function showHelp(reason = 'unsupported') {
      if (helpOpen) return;
      prepareHelp();
      const showSteps = reason === 'unsupported' && appleTouchDevice;
      const title = help.querySelector('h2');
      const intro = help.querySelector('p');
      if (reason === 'app-view') {
        title.textContent = 'Uygulama görünümü';
        intro.textContent = 'Oyun Ana Ekrandan uygulama görünümünde açık.';
      } else if (reason === 'exit' || reason === 'browser-view') {
        title.textContent = 'Tarayıcının tam ekranı';
        intro.textContent = 'Bu görünümü kapatmak için tarayıcının tam ekran menüsünü kullanabilirsin.';
      } else if (showSteps) {
        title.textContent = 'Ana Ekrana Ekle';
        intro.textContent = 'Bu tarayıcı oyunun tam ekran isteğini açamadı. Sahil Şehri’ni Ana Ekrana ekleyip uygulama gibi açabilirsin.';
      } else {
        title.textContent = 'Tam ekran açılamadı';
        intro.textContent = 'Bu tarayıcı oyunun tam ekran isteğini açamadı. Tarayıcının görünüm menüsünde tam ekran seçeneği varsa onu kullanabilirsin.';
      }
      help.querySelector('ol').hidden = !showSteps;
      previousFocus = document.activeElement;
      helpOpen = true;
      button.setAttribute('aria-controls', help.id);
      try {
        if (typeof help.showModal === 'function') {
          help.showModal();
          nativeDialog = true;
        }
      } catch {
        nativeDialog = false;
      }
      if (!nativeDialog) {
        curtain.hidden = false;
        help.setAttribute('open', '');
        document.addEventListener('focusin', holdFocus);
      }
      closeButton.focus({ preventScroll: true });
    }

    async function tryMethods(receiver, methods) {
      for (const name of methods) {
        if (typeof receiver[name] !== 'function') continue;
        legacyPending = name.startsWith('webkit');
        try {
          const request = receiver[name]();
          if (request && typeof request.then === 'function') {
            await request;
            legacyPending = false;
          }
          return true;
        } catch {
          legacyPending = false;
        }
      }
      return false;
    }

    async function toggle() {
      if (pending || helpOpen) return;
      pending = true;
      update();
      try {
        if (activeNative()) {
          const exited = await tryMethods(document, ['exitFullscreen', 'webkitExitFullscreen', 'webkitCancelFullScreen']);
          if (!exited) showHelp('exit');
        } else if (appView()) {
          showHelp('app-view');
        } else if (fullscreenMode?.matches) {
          showHelp('browser-view');
        } else {
          const methods = [];
          if (document.fullscreenEnabled !== false) methods.push('requestFullscreen');
          if (document.webkitFullscreenEnabled !== false) methods.push('webkitRequestFullscreen', 'webkitRequestFullScreen');
          if (!await tryMethods(target, methods)) showHelp();
        }
      } finally {
        pending = false;
        update();
      }
    }

    function onFullscreenChange() {
      legacyPending = false;
      update();
    }

    function onLegacyError() {
      if (!legacyPending) return;
      legacyPending = false;
      if (!activeNative()) showHelp();
    }

    function watchDisplay(media) {
      if (typeof media?.addEventListener === 'function') media.addEventListener('change', update);
      else media?.addListener?.(update);
    }

    button.addEventListener('click', toggle);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenerror', onLegacyError);
    watchDisplay(standaloneMode);
    watchDisplay(fullscreenMode);
    window.addEventListener('pageshow', update);
    update();
    return { update, closeHelp, isHelpOpen: () => helpOpen };
  }

  return { create };
})();
