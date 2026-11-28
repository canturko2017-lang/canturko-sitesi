'use strict';

function startGameRenderer() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x809ab1);
  scene.fog = new THREE.Fog(0x809ab1, 70, 250);
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, 400);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const canvas = renderer.domElement;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  document.body.prepend(canvas);
  scene.add(new THREE.HemisphereLight(0xcbe9ff, 0x615143, 2));
  const sun = new THREE.DirectionalLight(0xffd3a0, 2);
  sun.position.set(40, 80, 30);
  scene.add(sun);

  const obstacles = [];
  const materials = new Map();
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  function box(w, h, d, color, x, y, z, solid = false) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color }));
    const mesh = new THREE.Mesh(unitBox, materials.get(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    scene.add(mesh);
    if (solid) obstacles.push({ x, z, halfWidth: w / 2, halfDepth: d / 2 });
    return mesh;
  }

  box(360, .2, 360, 0x55644c, 0, -.2, 0);
  for (let i = -150; i <= 150; i += 50) {
    box(18, .1, 360, 0x383a3d, i, 0, 0);
    box(360, .1, 18, 0x383a3d, 0, .02, i);
    for (let j = -150; j <= 150; j += 50) {
      if (i === 0 && j === -100) continue;
      const height = 8 + Math.abs(i * 7 + j * 11) % 23;
      const color = [0x8a827e, 0xb2a291, 0x788087][Math.abs((i + j) / 50) % 3];
      box(25, height, 25, color, i + 25, height / 2, j + 25, true);
    }
  }

  const garage = new THREE.Vector3(23, 0, -75);
  box(24, .08, 12, 0x737478, 19, .026, garage.z);
  box(18, 5.2, 1, 0x586271, 22, 2.6, -80, true);
  box(18, 5.2, 1, 0x586271, 22, 2.6, -70, true);
  box(1, 5.2, 10, 0x404957, 31, 2.6, garage.z, true);
  box(18.6, .55, 11.4, 0x39495c, 22, 5.25, garage.z);
  box(.32, .27, 5, 0xf2b844, 13.05, 3.82, garage.z);
  for (const side of [-1, 1]) {
    box(14, .02, .12, 0xf6c454, 19, .078, garage.z + side * 2.55);
    box(.2, .33, 1.75, 0xffe3a0, 13, 4.75, garage.z + side * 3.38);
  }
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 136;
  const signPaint = signCanvas.getContext('2d');
  signPaint.fillStyle = '#223447';
  signPaint.fillRect(0, 0, 512, 136);
  signPaint.fillStyle = '#ffe8ad';
  signPaint.font = '800 91px Arial';
  signPaint.textAlign = 'center';
  signPaint.textBaseline = 'middle';
  signPaint.fillText('GARAJ', 256, 74);
  const signMap = new THREE.CanvasTexture(signCanvas);
  signMap.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 1.8), new THREE.MeshBasicMaterial({ map: signMap }));
  sign.name = 'Garaj tabelası';
  sign.rotation.y = -Math.PI / 2;
  sign.position.set(12.55, 4.9, garage.z);
  scene.add(sign);

  const cars = [
    { name: 'Kırmızı kupé', model: 'M4', color: 0xba3237, x: -4.2, z: -17, heading: 0 },
    { name: 'Mavi sedan', model: 'M5', color: 0x376696, x: 5.4, z: -32, heading: Math.PI },
    { name: 'Gri otomobil', model: 'M3', color: 0xa2adb5, x: 22, z: 5.4, heading: -Math.PI / 2 },
  ].map(({ name, model, color, x, z, heading }) => {
    const group = BMWAraclari.create(THREE, { model, color });
    group.name = name;
    group.position.set(x, .07, z);
    group.rotation.y = heading;
    scene.add(group);
    return { group, name, delivered: false };
  });
  const marker = new THREE.Mesh(
    new THREE.TorusGeometry(3.4, .115, 8, 36).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffd052 })
  );
  marker.name = 'Görev işareti';
  marker.visible = false;
  scene.add(marker);

  const player = new THREE.Group();
  player.name = 'Gece Şehri oyuncusu';
  player.position.set(0, .07, 8);
  scene.add(player);
  const profiles = SehirKarakterleri.profiles;
  const avatars = profiles.map(profile => SehirKarakterleri.create(THREE, profile));
  player.add(...avatars);

  const byId = id => document.getElementById(id);
  const selector = byId('characterSelect');
  const intro = byId('intro');
  const mission = byId('mission');
  const guidance = byId('guidance');
  const direction = byId('direction');
  const action = byId('interact');
  const delivered = byId('delivered');
  const keys = new Set();
  const aliases = { arrowup: 'w', arrowleft: 'a', arrowdown: 's', arrowright: 'd' };
  const up = new THREE.Vector3(0, 1, 0);
  const offset = new THREE.Vector3();
  const walking = new THREE.Vector3();
  let active = false;
  let current = null;
  let selected = 0;
  let deliveries = 0;
  let yaw = 0;
  let speed = 0;
  let stride = 0;
  let last = performance.now();

  for (const profile of profiles) selector.add(new Option(profile.name));
  function chooseCharacter() {
    selected = selector.selectedIndex;
    avatars.forEach((avatar, index) => { avatar.visible = index === selected; });
    byId('character').textContent = profiles[selected].name;
  }
  selector.addEventListener('change', chooseCharacter);
  chooseCharacter();

  function distanceTo(x, z, position = player.position) {
    return Math.hypot(x - position.x, z - position.z);
  }

  function nearestCar() {
    let nearest = null;
    let distance = Infinity;
    for (const car of cars) {
      if (car.delivered) continue;
      const next = distanceTo(car.group.position.x, car.group.position.z);
      if (next >= distance) continue;
      distance = next;
      nearest = car;
    }
    return { car: nearest, distance };
  }

  function blocked(x, z, clearance, vehicle) {
    if (x < -170 || x > 170 || z < -170 || z > 170) return true;
    if (obstacles.some(obstacle => Math.abs(x - obstacle.x) < obstacle.halfWidth + clearance &&
        Math.abs(z - obstacle.z) < obstacle.halfDepth + clearance)) return true;
    return cars.some(car => !car.delivered && car !== vehicle &&
      distanceTo(x, z, car.group.position) < 2.12 + clearance);
  }

  function move(position, dx, dz, clearance) {
    if (!blocked(position.x + dx, position.z, clearance, current)) position.x += dx;
    if (!blocked(position.x, position.z + dz, clearance, current)) position.z += dz;
  }

  function updateGuide() {
    const nearest = current ? null : nearestCar();
    const target = current ? garage : nearest.car?.group.position;
    let text = 'Tüm araçları garaja getirdin. Şehri keşfedebilirsin.';
    if (current) text = 'Araba çalındı. Sarı işareti takip edip garaja götür.';
    else if (nearest.car) text = 'Park edilmiş bir araba bul ve E ile al.';
    if (text !== mission.textContent) mission.textContent = text;
    const label = current ? 'Arabadan in (E)' : nearest.car && nearest.distance < 5.2 ? 'Arabayı al (E)' : 'Arabaya yaklaş';
    if (action.textContent !== label) action.textContent = label;
    action.disabled = !current && (!nearest.car || nearest.distance >= 5.2);
    marker.visible = Boolean(target);
    direction.hidden = !target;
    action.hidden = !target;
    if (!target) {
      guidance.textContent = '';
      return;
    }
    marker.position.set(target.x, .14, target.z);
    const dx = target.x - player.position.x;
    const dz = target.z - player.position.z;
    const bearing = Math.atan2(-dx, -dz);
    direction.style.transform = `rotate(${(yaw - bearing) * 180 / Math.PI}deg)`;
    const description = `${current ? 'Garaj' : nearest.car.name} · ${Math.round(Math.hypot(dx, dz))} m`;
    if (guidance.textContent !== description) guidance.textContent = description;
  }

  function exitCar() {
    const { position, rotation } = current.group;
    const side = Math.cos(rotation.y);
    const depth = -Math.sin(rotation.y);
    const space = [-2.85, 2.85, -3.8, 3.8].find(distance =>
      !blocked(position.x + side * distance, position.z + depth * distance, .38, current)
    );
    if (space === undefined) return false;
    player.position.set(position.x + side * space, .07, position.z + depth * space);
    player.rotation.y = yaw;
    player.visible = true;
    current = null;
    speed = 0;
    keys.clear();
    return true;
  }

  function interact() {
    if (!active) return;
    if (current) {
      exitCar();
    } else {
      const nearest = nearestCar();
      if (!nearest.car || nearest.distance >= 5.2) return;
      current = nearest.car;
      yaw = current.group.rotation.y;
      player.position.copy(current.group.position);
      player.visible = false;
      speed = 0;
      keys.clear();
      updateCamera(1);
    }
    updateGuide();
  }

  function deliverCar() {
    const car = current;
    if (!exitCar()) return;
    car.delivered = true;
    car.group.visible = false;
    deliveries++;
    delivered.textContent = `${deliveries} / ${cars.length} araç`;
  }

  function updateCamera(smoothing) {
    const position = player.position;
    offset.set(0, current ? 6.3 : 4.3, current ? 10.6 : 7.8).applyAxisAngle(up, yaw).add(position);
    camera.position.lerp(offset, smoothing);
    camera.lookAt(position.x, position.y + 1.05, position.z);
  }

  function update(dt) {
    const forward = Number(keys.has('w')) - Number(keys.has('s'));
    const steer = Number(keys.has('d')) - Number(keys.has('a'));
    if (current) {
      const group = current.group;
      const target = forward > 0 ? 18 : forward < 0 ? -6.2 : 0;
      speed += (target - speed) * (1 - Math.exp(-dt * 1.4));
      const turn = -steer * dt * 1.78 * Math.min(Math.abs(speed) / 4, 1) * Math.sign(speed);
      group.rotation.y += turn;
      yaw += turn;
      const heading = group.rotation.y;
      move(group.position, -Math.sin(heading) * speed * dt, -Math.cos(heading) * speed * dt, 1.1);
      player.position.copy(group.position);
      if (distanceTo(garage.x, garage.z) < 3.25) deliverCar();
    } else {
      walking.set(steer, 0, -forward).normalize().applyAxisAngle(up, yaw);
      move(player.position, walking.x * 7.5 * dt, walking.z * 7.5 * dt, .38);
      if (forward || steer) {
        player.rotation.y = Math.atan2(-walking.x, -walking.z);
        stride += dt * 9;
      }
      avatars[selected].userData.pose(forward || steer ? .46 * Math.sin(stride) : 0);
    }
    updateCamera(1 - Math.exp(-dt * 9));
    updateGuide();
  }

  function requestCamera() {
    if (document.pointerLockElement !== canvas) {
      Promise.resolve(canvas.requestPointerLock?.()).catch(() => {});
    }
  }

  byId('start').addEventListener('click', () => {
    if (opening?.isOpen()) return;
    intro.hidden = true;
    document.querySelector('.hud').hidden = false;
    document.querySelector('.help').hidden = false;
    action.hidden = false;
    active = true;
    updateGuide();
    requestCamera();
  });
  action.addEventListener('click', interact);
  canvas.addEventListener('pointerdown', () => { if (active) requestCamera(); });
  addEventListener('keydown', event => {
    if (!active || !event.key) return;
    const original = event.key.toLowerCase();
    const key = aliases[original] || original;
    if (aliases[original]) event.preventDefault();
    keys.add(key);
    if (event.repeat) return;
    if (key === 'e') interact();
    if (key === 'r') location.reload();
  });
  addEventListener('keyup', event => {
    const key = event.key.toLowerCase();
    keys.delete(aliases[key] || key);
  });
  addEventListener('blur', () => keys.clear());
  addEventListener('mousemove', event => {
    if (active && document.pointerLockElement === canvas) yaw -= event.movementX * .003;
  });
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  function loop(now) {
    const dt = Math.min((now - last) / 1000, .05);
    last = now;
    if (active) update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  updateCamera(1);
  renderer.render(scene, camera);
  opening?.ready();
  requestAnimationFrame(loop);
}

requestAnimationFrame(() => requestAnimationFrame(() => {
  try {
    startGameRenderer();
  } catch (error) {
    console.error(error);
    document.getElementById('error').hidden = false;
    document.getElementById('start').disabled = true;
    opening?.fail();
  }
}));
