'use strict';

window.SehirAcilis = (() => {
  const assets = ['acilis-sahil.jpg', 'acilis-pist.jpg', 'acilis-sehir.jpg'];
  const stepMs = 3000;
  const durationMs = 30000;

  function create() {
    const overlay = document.createElement('dialog');
    overlay.className = 'sehir-acilis';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'sehir-acilis-title');
    overlay.innerHTML = `
      <div class="sehir-acilis-frames" aria-hidden="true"></div>
      <div class="sehir-acilis-shade" aria-hidden="true"></div>
      <header class="sehir-acilis-heading">
        <h2 id="sehir-acilis-title" tabindex="-1"><span>Sahil</span> <span>Şehri</span></h2>
      </header>
      <div class="sehir-acilis-bottom">
        <div class="sehir-acilis-status">
          <div class="sehir-acilis-readout" aria-hidden="true">
            <span class="sehir-acilis-label">loading sory mod</span>
            <span class="sehir-acilis-number"><span data-count>10</span><span class="sehir-acilis-percent">%</span></span>
          </div>
          <div class="sehir-acilis-track" role="progressbar" aria-label="Açılış ilerlemesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="10"></div>
          <p class="sehir-acilis-preparing" role="status" hidden>Sahne hazırlanıyor.</p>
        </div>
        <button type="button" class="sehir-acilis-skip" hidden>Atla</button>
      </div>`;

    const container = overlay.querySelector('.sehir-acilis-frames');
    const count = overlay.querySelector('[data-count]');
    const track = overlay.querySelector('.sehir-acilis-track');
    const preparing = overlay.querySelector('.sehir-acilis-preparing');
    const skip = overlay.querySelector('button');
    const previousFocus = document.activeElement;
    const start = performance.now();
    let browserModal = false;
    let engineReady = false;
    let opened = true;
    let active = -1;
    let lastCount = 10;
    let timer;
    const frames = assets.map((source, index) => {
      const image = document.createElement('img');
      image.className = 'sehir-acilis-frame';
      image.alt = '';
      image.decoding = 'async';
      image.fetchPriority = index === 0 ? 'high' : 'low';
      const frame = { image, loaded: false };
      image.addEventListener('load', () => {
        frame.loaded = true;
        tick();
      });
      image.addEventListener('error', () => { image.hidden = true; });
      image.src = source;
      container.append(image);
      return frame;
    });

    function showScene(elapsed) {
      const desired = Math.min(frames.length - 1, Math.floor(elapsed / (durationMs / frames.length)));
      let nearest = -1;
      for (let index = 0; index < frames.length; index++) {
        if (!frames[index].loaded) continue;
        if (nearest === -1 || Math.abs(index - desired) < Math.abs(nearest - desired)) nearest = index;
      }
      if (nearest < 0 || nearest === active) return;
      if (active >= 0) frames[active].image.classList.remove('is-on');
      active = nearest;
      frames[active].image.classList.add('is-on');
    }

    function tick() {
      if (!opened) return;
      const elapsed = Math.max(0, performance.now() - start);
      const shown = Math.min(100, (Math.floor(elapsed / stepMs) + 1) * 10);
      if (shown !== lastCount) {
        count.textContent = String(shown);
        overlay.style.setProperty('--intro-progress', `${shown}%`);
        track.setAttribute('aria-valuenow', String(shown));
        lastCount = shown;
      }
      showScene(elapsed);
      preparing.hidden = engineReady || elapsed < durationMs;
      if (elapsed >= durationMs && engineReady) finish();
    }

    function finish(animate = true) {
      if (!opened) return;
      opened = false;
      window.clearInterval(timer);
      const dismiss = () => {
        if (browserModal && overlay.open) overlay.close();
        else overlay.removeAttribute('open');
        overlay.remove();
        frames.forEach(({ image }) => image.removeAttribute('src'));
        frames.length = 0;
        if (previousFocus && previousFocus !== document.body && previousFocus.isConnected) {
          previousFocus.focus({ preventScroll: true });
        }
      };
      if (animate && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        overlay.classList.add('is-ending');
        window.setTimeout(dismiss, 350);
      } else dismiss();
    }

    overlay.addEventListener('cancel', event => { event.preventDefault(); });
    skip.addEventListener('click', () => { if (engineReady) finish(); });
    document.body.append(overlay);
    try {
      if (typeof overlay.showModal === 'function') {
        overlay.showModal();
        browserModal = true;
      }
    } catch {
      browserModal = false;
    }
    if (!browserModal) overlay.setAttribute('open', '');
    overlay.querySelector('h2').focus({ preventScroll: true });
    timer = window.setInterval(tick, 125);
    tick();

    return {
      ready() {
        if (!opened || engineReady) return;
        engineReady = true;
        skip.hidden = false;
        tick();
      },
      fail() { finish(false); },
      isOpen() { return opened; },
    };
  }

  return { create };
})();
