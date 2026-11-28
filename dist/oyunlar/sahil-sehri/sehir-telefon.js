'use strict';

window.SehirTelefon = (() => {
  const routes = {
    airport: { label: 'Havalimanı', point: [86, 39], shape: 'M4 20h16M6 20v-9l6-5 6 5v9M9 14h6m-3 0v6M3 11l9-7 9 7', note: 'Terminal, uçak pisti ve helikopter alanı havalimanında. Yön göstergesini takip et.' },
    airplane: { label: 'Uçak', point: [111, 25], shape: 'M12 3v18m0-14 8 6v3l-8-3-8 3v-3zm0 11 3 3m-3-3-3 3', note: 'Pistte park eden uçağa yaklaş. Uçuş kontrolleri araca bindiğinde görünür.' },
    helicopter: { label: 'Helikopter', point: [109, 62], shape: 'M3 5h18m-9 0v4m0 8H6l-3-3V9h5l4 3h4l3-3h2v3l-4 5h-5m-4 0v3m8-3v3M6 20h12', note: 'Helikopteri terminal yakınındaki iniş alanında bulabilirsin.' },
    shore: { label: 'Kumsal', point: [221, 76], shape: 'M3 11a9 9 0 0 1 18 0H3zm9 0v7m-7 2c2-2 4 2 7 0s5-2 7 0', note: 'Kumsala doğru sür, kıyıda araçtan inip yürüyerek veya yüzerek devam et.' },
    jetSki: { label: 'Jet ski', point: [251, 74], shape: 'M3 15h15l3-3m-15 0 3-5h4l2 5m-3-5 4-2M3 19c3-2 4 2 8 0s6-2 10 0', note: 'Jet ski kıyıya yakın suda. Yanına yüz ve araca binme düğmesini kullan.' },
  };
  const desert = { label: 'Çöl kasabası', point: [59, 83], note: 'Yön göstergesi çöl kasabasını işaret ediyor.' };
  const phoneIcon = 'M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 15h4';
  const icon = shape => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${shape}"/></svg>`;

  const stylesheet = `
    .sehir-phone-launch { position: fixed; z-index: 4; right: max(16px, env(safe-area-inset-right)); top: 46%; transform: translateY(-50%); display: grid; place-items: center; gap: 2px; width: 62px; height: 58px; padding: 6px 4px; background: #152e37; color: #f4fcf6; border: 1px solid #83a6ab; border-radius: 12px; box-shadow: 0 5px 18px #0e1f2b57; font: 700 13px/1 Arial,sans-serif; cursor: pointer; }
    .sehir-phone-launch svg { width: 21px; height: 21px; color: #bcf0c8; }
    .sehir-phone-launch:hover { background: #244653; }
    .inv-open .sehir-phone-launch, .city-ended .sehir-phone-launch { display: none; }
    .sehir-phone-dialog, .sehir-phone-dialog * { box-sizing: border-box; }
    .sehir-phone-dialog { position: fixed; z-index: 7; top: 50%; right: max(18px, env(safe-area-inset-right)); bottom: auto; left: auto; transform: translateY(-50%); overflow: auto; overscroll-behavior: contain; scrollbar-width: thin; width: min(364px, calc(100% - 26px)); max-width: none; max-height: calc(100vh - 22px); max-height: calc(100dvh - 22px); margin: 0; padding: 15px; background: #112a2e; color: #fbfff9; border: 5px solid #314b4f; border-radius: 23px; box-shadow: 0 16px 46px #07161ccb, inset 0 0 0 1px #58777559; font: 16px/1.36 Arial,sans-serif; }
    .sehir-phone-dialog:not([open]), .sehir-phone-curtain[hidden] { display: none; }
    .sehir-phone-dialog::backdrop, .sehir-phone-curtain { background: #0a1c2282; }
    .sehir-phone-curtain { position: fixed; z-index: 6; inset: 0; }
    .sehir-phone-head { display: flex; align-items: center; justify-content: space-between; gap: 7px; margin-bottom: 9px; }
    .sehir-phone-head h2 { margin: 0; font-size: 23px; line-height: 1.08; letter-spacing: -.025em; }
    .sehir-phone-close { width: 43px; height: 43px; flex: 0 0 43px; color: #fff; background: #1b383c; border: 1px solid #5d7e7d; border-radius: 11px; font: 600 23px/1 Arial,sans-serif; cursor: pointer; }
    .sehir-phone-close:hover { background: #2b5051; }
    .sehir-phone-map { position: relative; display: block; width: 100%; height: 106px; overflow: hidden; background: #334647; border: 1px solid #527374; border-radius: 12px; }
    .sehir-phone-map > svg { display: block; width: 100%; height: 100%; }
    .sehir-phone-map-name { position: absolute; bottom: 5px; left: 6px; max-width: calc(100% - 12px); padding: 4px 7px; border-radius: 6px; background: #153039f0; color: #f6f9ea; font-size: 13px; font-weight: 700; }
    .sehir-phone-facts { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 5px; margin: 9px 0 11px; }
    .sehir-phone-facts div { min-width: 0; padding: 5px 7px; border-radius: 7px; background: #1b3538; }
    .sehir-phone-facts dt { color: #b6cbca; font-size: 13px; }
    .sehir-phone-facts dd { margin: 2px 0 0; overflow: hidden; color: #f4f8e9; font-size: 14px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
    .sehir-phone-routes { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 6px; }
    .sehir-phone-route { display: flex; align-items: center; gap: 6px; min-height: 44px; padding: 6px 8px; color: #e6f1ee; background: #1d373b; border: 1px solid #47686b; border-radius: 8px; font: 700 14px/1.18 Arial,sans-serif; text-align: left; cursor: pointer; }
    .sehir-phone-route > svg { flex: 0 0 17px; width: 17px; height: 17px; opacity: .88; }
    .sehir-phone-route:hover { background: #27494a; }
    .sehir-phone-route[aria-pressed="true"] { background: #c0e5b8; border-color: #c0e5b8; color: #203629; }
    .sehir-phone-desk { margin-top: 10px; padding: 8px 9px; border-left: 3px solid #a4cea5; background: #203738; border-radius: 0 6px 6px 0; }
    .sehir-phone-desk strong { display: block; color: #d2ecd0; font-size: 14px; }
    .sehir-phone-desk p { margin: 3px 0 0; color: #e3ece3; font-size: 14px; }
    .sehir-phone-launch:focus-visible, .sehir-phone-dialog button:focus-visible { outline: 2px solid #ffd797; outline-offset: 2px; }
    @media (max-width: 560px) {
      .sehir-phone-launch { right: max(8px, env(safe-area-inset-right)); top: 49%; width: 58px; height: 51px; }
      .sehir-phone-dialog { left: 50%; right: auto; transform: translate(-50%, -50%); padding: 12px; border-radius: 20px; }
    }
    @media (max-height: 425px) {
      .sehir-phone-map { height: 78px; }
      .sehir-phone-dialog { padding: 10px; border-width: 4px; }
    }
  `;

  function create({ onRoute = () => {}, onToggle = () => {} } = {}) {
    if (!document.getElementById('sehir-phone-style')) {
      const style = document.createElement('style');
      style.id = 'sehir-phone-style';
      style.textContent = stylesheet;
      document.head.append(style);
    }

    const launcher = document.createElement('button');
    launcher.id = 'sehir-phone-toggle';
    launcher.className = 'sehir-phone-launch';
    launcher.type = 'button';
    launcher.title = 'Telefon (P)';
    launcher.setAttribute('aria-haspopup', 'dialog');
    launcher.setAttribute('aria-controls', 'sehir-phone-dialog');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.innerHTML = `${icon(phoneIcon)}<span>Telefon</span>`;

    const curtain = document.createElement('div');
    curtain.className = 'sehir-phone-curtain';
    curtain.hidden = true;
    curtain.setAttribute('aria-hidden', 'true');

    const panel = document.createElement('dialog');
    panel.id = 'sehir-phone-dialog';
    panel.className = 'sehir-phone-dialog';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'sehir-phone-title');
    panel.innerHTML = `
      <header class="sehir-phone-head">
        <h2 id="sehir-phone-title">Şehir telefonu</h2>
        <button class="sehir-phone-close" type="button" aria-label="Telefonu kapat">×</button>
      </header>
      <div class="sehir-phone-map">
        <svg viewBox="0 0 310 103" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d="M0 0H310V103H0z" fill="#2f4442"/>
          <path d="M230 -10C213 20 239 33 223 56C213 70 236 78 229 112H315V-10z" fill="#315f70"/>
          <path d="M226 -10C209 20 235 33 219 56C209 70 232 78 225 112" fill="none" stroke="#c4b888" stroke-width="4"/>
          <path d="M18 4H97V52H18zM21 61H120V93H21zM124 15H194V84H124z" fill="#42605a"/>
          <path d="M1 54h219M117 0v102M164 0v103M27 83h104M15 32h193M202 3v93M59 4v48" fill="none" stroke="#738480" stroke-width="2"/>
          <path d="M53 15h55M53 19h55" fill="none" stroke="#abc1bf" stroke-width="1"/>
          <path d="M191 59Q150 44 221 76" class="sehir-phone-map-route" fill="none" stroke="#d8edbd" stroke-width="2.0" stroke-dasharray="5 4" stroke-linecap="round"/>
          <circle cx="191" cy="59" r="3" fill="#accfc7"/>
          <circle cx="221" cy="76" r="6" class="sehir-phone-marker" fill="#f6d68f" stroke="#183033" stroke-width="2"/>
        </svg>
        <span class="sehir-phone-map-name">Kumsal rotası</span>
      </div>
      <dl class="sehir-phone-facts">
        <div><dt>Araç</dt><dd class="sehir-phone-vehicle">Yaya</dd></div>
        <div><dt>Hız</dt><dd class="sehir-phone-speed">0 km/sa</dd></div>
        <div><dt>İrtifa</dt><dd class="sehir-phone-altitude">0 m</dd></div>
      </dl>
      <div class="sehir-phone-routes" role="group" aria-label="Rota seç"></div>
      <div class="sehir-phone-desk">
        <strong>Oyun içi danışma</strong>
        <p class="sehir-phone-note" role="status" aria-live="polite"></p>
      </div>`;

    const closeButton = panel.querySelector('.sehir-phone-close');
    const routeControls = panel.querySelector('.sehir-phone-routes');
    const note = panel.querySelector('.sehir-phone-note');
    const routeName = panel.querySelector('.sehir-phone-map-name');
    const marker = panel.querySelector('.sehir-phone-marker');
    const mapLine = panel.querySelector('.sehir-phone-map-route');
    const vehicleLabel = panel.querySelector('.sehir-phone-vehicle');
    const speedLabel = panel.querySelector('.sehir-phone-speed');
    const altitudeLabel = panel.querySelector('.sehir-phone-altitude');
    const deskTitle = panel.querySelector('.sehir-phone-desk strong');
    const buttons = new Map();
    const state = { destination: 'shore', vehicle: 'Yaya', speed: 0, altitude: 0 };
    const has = Object.prototype.hasOwnProperty;
    let opened = false;
    let fallback = false;
    let previousFocus = null;
    let displayedRoute;

    function text(node, value) {
      if (node.textContent !== value) node.textContent = value;
    }

    function renderRoute() {
      if (displayedRoute === state.destination) return;
      displayedRoute = state.destination;
      const route = routes[state.destination] || desert;
      const [x, y] = route.point;
      marker.setAttribute('cx', String(x));
      marker.setAttribute('cy', String(y));
      mapLine.setAttribute('d', `M191 59Q${(x + 191) / 2} ${Math.min(51, y + 6)} ${x} ${y}`);
      text(routeName, `${route.label} rotası`);
      text(deskTitle, ['airport', 'airplane', 'helicopter'].includes(state.destination) ? 'Havalimanı danışma · Oyun içi' : 'Oyun içi danışma');
      text(note, route.note);
      for (const [key, control] of buttons) control.setAttribute('aria-pressed', String(key === state.destination));
    }

    function measure(value, unit) {
      if (Number.isFinite(value)) return `${Math.max(0, Math.round(Math.abs(value)))} ${unit}`;
      return typeof value === 'string' && value.trim() ? value : `0 ${unit}`;
    }

    function update(values = {}) {
      if (has.call(values, 'destination') && (has.call(routes, values.destination) || values.destination === 'desert')) state.destination = values.destination;
      if (has.call(values, 'vehicle')) state.vehicle = values.vehicle;
      if (has.call(values, 'speed')) state.speed = values.speed;
      if (has.call(values, 'altitude')) state.altitude = values.altitude;
      if (!opened) return;
      renderRoute();
      const vehicle = typeof state.vehicle === 'object' ? state.vehicle?.label || state.vehicle?.name || state.vehicle?.type : state.vehicle;
      text(vehicleLabel, vehicle ? String(vehicle) : 'Yaya');
      text(speedLabel, measure(state.speed, 'km/sa'));
      text(altitudeLabel, measure(state.altitude, 'm'));
    }

    for (const [key, route] of Object.entries(routes)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sehir-phone-route';
      button.dataset.route = key;
      button.setAttribute('aria-pressed', 'false');
      button.innerHTML = icon(route.shape);
      button.append(document.createTextNode(route.label));
      button.addEventListener('click', () => {
        update({ destination: key });
        onRoute(key);
      });
      buttons.set(key, button);
      routeControls.append(button);
    }

    function constrainFocus(event) {
      if (opened && fallback && !panel.contains(event.target)) closeButton.focus({ preventScroll: true });
    }

    function open() {
      if (opened) return;
      previousFocus = document.activeElement;
      opened = true;
      launcher.setAttribute('aria-expanded', 'true');
      try {
        if (typeof panel.showModal !== 'function') throw new Error('Dialog API unavailable');
        panel.showModal();
      } catch {
        fallback = true;
        curtain.hidden = false;
        panel.setAttribute('open', '');
        document.addEventListener('focusin', constrainFocus);
      }
      update();
      closeButton.focus({ preventScroll: true });
      onToggle(true);
    }

    function finishClose() {
      if (!opened) return;
      opened = false;
      fallback = false;
      curtain.hidden = true;
      launcher.setAttribute('aria-expanded', 'false');
      document.removeEventListener('focusin', constrainFocus);
      const restore = previousFocus && previousFocus !== document.body && previousFocus.isConnected ? previousFocus : launcher;
      previousFocus = null;
      restore.focus({ preventScroll: true });
      onToggle(false);
    }

    function close() {
      if (!opened) return;
      if (!fallback && typeof panel.close === 'function') panel.close();
      else panel.removeAttribute('open');
      finishClose();
    }

    function toggle() {
      if (opened) close();
      else open();
    }

    launcher.addEventListener('click', toggle);
    closeButton.addEventListener('click', close);
    curtain.addEventListener('click', close);
    panel.addEventListener('cancel', event => { event.preventDefault(); close(); });
    panel.addEventListener('close', finishClose);
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    });
    panel.addEventListener('click', event => {
      if (event.target !== panel) return;
      const bounds = panel.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    });

    document.body.append(launcher, curtain, panel);
    return { toggle, open, close, isOpen: () => opened, update };
  }

  return { create };
})();
