'use strict';

(() => {
  const hullSections = [
    [-1.59, .033, .175, .054], [-1.49, .167, .169, -.084], [-1.34, .288, .159, -.212],
    [-1.14, .394, .146, -.290], [-.88, .504, .124, -.331], [-.59, .568, .102, -.355],
    [-.24, .605, .087, -.363], [.12, .623, .075, -.364], [.50, .620, .068, -.349],
    [.86, .608, .065, -.319], [1.18, .582, .060, -.268], [1.40, .543, .056, -.220],
    [1.52, .467, .056, -.173],
  ];

  function makeCraft(T) {
    const materials = {
      shell: new T.MeshStandardMaterial({ color: 0xe8a025, roughness: .34, metalness: .16 }),
      accent: new T.MeshStandardMaterial({ color: 0x39aba4, roughness: .3, metalness: .12 }),
      underbody: new T.MeshStandardMaterial({ color: 0x242b32, roughness: .47, metalness: .12 }),
      rubber: new T.MeshStandardMaterial({ color: 0x1b2229, roughness: .91 }),
      seat: new T.MeshStandardMaterial({ color: 0x34404a, roughness: .83 }),
      chrome: new T.MeshStandardMaterial({ color: 0x84939a, roughness: .37, metalness: .68 }),
      display: new T.MeshStandardMaterial({ color: 0x357981, emissive: 0x285956, emissiveIntensity: .31, roughness: .22 }),
    };
    const sections = new Map();
    const boxGeometry = new T.BoxGeometry(1, 1, 1);
    const tubeGeometry = new T.CylinderGeometry(1, 1, 1, 10);
    const vertical = new T.Vector3(0, 1, 0);

    function part(material, geometry, at = [0, 0, 0], size = [1, 1, 1], rotation = null) {
      const batch = sections.get(material) || { points: [], normals: [], indices: [] };
      if (!sections.has(material)) sections.set(material, batch);
      const offset = batch.points.length / 3;
      const matrix = new T.Matrix4().compose(new T.Vector3(...at), rotation || new T.Quaternion(), new T.Vector3(...size));
      const copy = geometry.clone().applyMatrix4(matrix);
      const attribute = copy.getAttribute('position');
      for (const point of attribute.array) batch.points.push(point);
      for (const normal of copy.getAttribute('normal').array) batch.normals.push(normal);
      if (copy.index) {
        for (const index of copy.index.array) batch.indices.push(index + offset);
      } else {
        for (let index = 0; index < attribute.count; index++) batch.indices.push(index + offset);
      }
      copy.dispose();
      if (geometry !== boxGeometry && geometry !== tubeGeometry) geometry.dispose();
    }

    function box(material, width, height, depth, x, y, z) {
      part(material, boxGeometry, [x, y, z], [width, height, depth]);
    }

    function rod(material, from, to, radius) {
      const start = new T.Vector3(...from);
      const end = new T.Vector3(...to);
      const axis = end.clone().sub(start);
      const orientation = new T.Quaternion().setFromUnitVectors(vertical, axis.clone().normalize());
      part(material, tubeGeometry, start.lerp(end, .5).toArray(), [radius, axis.length(), radius], orientation);
    }

    function surface(material, vertices, indices) {
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      part(material, geometry);
    }

    function longitudinalSkin(material, stations, makeRing, count) {
      const vertices = [];
      const indices = [];
      for (const station of stations) vertices.push(...makeRing(station).flat());
      for (let row = 0; row < stations.length - 1; row++) {
        for (let col = 0; col < count - 1; col++) {
          const front = row * count + col;
          const rear = front + count;
          indices.push(front, rear, front + 1, front + 1, rear, rear + 1);
        }
      }
      for (const row of [0, stations.length - 1]) {
        const start = row * count;
        for (let col = 1; col < count - 1; col++) {
          if (row) indices.push(start, start + col + 1, start + col);
          else indices.push(start, start + col, start + col + 1);
        }
      }
      surface(material, vertices, indices);
    }

    longitudinalSkin('underbody', hullSections, ([z, width, top, keel]) => [
      [width, top, z], [width * .981, top - .084, z], [width * .79, (top + keel) / 2 - .041, z],
      [width * .36, keel + .079, z], [0, keel, z],
      [-width * .36, keel + .079, z], [-width * .79, (top + keel) / 2 - .041, z],
      [-width * .981, top - .084, z], [-width, top, z],
    ], 9);

    longitudinalSkin('shell', hullSections, ([z, width, top]) => [
      [-width * .984, top - .012, z], [-width * .897, top + .072, z], [-width * .57, top + .108, z],
      [0, top + .12, z], [width * .57, top + .108, z], [width * .897, top + .072, z], [width * .984, top - .012, z],
    ], 7);

    // Upper cowling and saddle both have curved shoulders with closed end caps.
    const body = [
      [-1.42, .085, .211, .272], [-1.28, .188, .233, .356], [-1.06, .294, .228, .406],
      [-.86, .348, .202, .477], [-.63, .337, .192, .559], [-.41, .295, .172, .602],
      [-.24, .221, .169, .541], [-.07, .197, .167, .418], [.15, .168, .161, .357],
      [.47, .181, .157, .297], [.75, .225, .149, .266], [1.02, .206, .146, .208],
    ];
    const rounding = ([z, width, base, top]) => [
      [-width, base, z], [-width * .907, top - .038, z], [-width * .58, top - .009, z], [0, top, z],
      [width * .58, top - .009, z], [width * .907, top - .038, z], [width, base, z],
    ];
    longitudinalSkin('shell', body, rounding, 7);
    longitudinalSkin('seat', [
      [-.43, .104, .381, .407], [-.24, .167, .326, .452], [.01, .217, .300, .464],
      [.29, .235, .284, .49], [.59, .248, .235, .477], [.88, .228, .203, .391],
      [1.00, .186, .191, .320],
    ], rounding, 7);

    for (const side of [-1, 1]) {
      for (let index = 0; index < hullSections.length - 1; index++) {
        const [startZ, startWidth, startTop] = hullSections[index];
        const [endZ, endWidth, endTop] = hullSections[index + 1];
        rod('rubber', [side * startWidth, startTop, startZ], [side * endWidth, endTop, endZ], .026);
      }
      const colorStripe = [
        [side * .19, .24, -1.27], [side * .298, .309, -1.045], [side * .34, .353, -.848],
        [side * .319, .415, -.646], [side * .30, .405, -.480], [side * .285, .323, -.522],
        [side * .288, .269, -.882],
      ];
      const triangles = [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6];
      if (side < 0) for (let i = 0; i < triangles.length; i += 3) [triangles[i + 1], triangles[i + 2]] = [triangles[i + 2], triangles[i + 1]];
      surface('accent', colorStripe.flat(), triangles);
      box('rubber', .242, .024, 1.43, side * .403, .164, .448);
      for (let stride = 0; stride < 12; stride++) box('seat', .196, .009, .015,
        side * .406, .180, -.198 + stride * .115,
      );
      rod('rubber', [side * .263, .279, .708], [side * .226, .254, 1.01], .024);
    }

    box('rubber', .662, .030, .348, 0, .169, 1.273);
    for (let step = 0; step < 4; step++) box('seat', .615, .014, .016, 0, .185, 1.139 + step * .075);
    rod('chrome', [-.197, .216, 1.389], [-.175, .274, 1.486], .027);
    rod('chrome', [-.175, .274, 1.486], [.175, .274, 1.486], .027);
    rod('chrome', [.175, .274, 1.486], [.197, .216, 1.389], .027);
    const nozzleRotation = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2);
    part('chrome', tubeGeometry, [0, -.099, 1.485], [.121, .152, .121], nozzleRotation);
    part('rubber', tubeGeometry, [0, -.098, 1.569], [.088, .033, .088], nozzleRotation);
    rod('accent', [0, .265, -1.46], [0, .339, -1.212], .016);
    rod('rubber', [0, .526, -.580], [0, .710, -.451], .057);

    function bakeInto(parent) {
      for (const [material, batch] of sections) {
        const geometry = new T.BufferGeometry();
        geometry.setAttribute('position', new T.Float32BufferAttribute(batch.points, 3));
        geometry.setAttribute('normal', new T.Float32BufferAttribute(batch.normals, 3));
        geometry.setIndex(batch.indices);
        geometry.computeBoundingSphere();
        parent.add(new T.Mesh(geometry, materials[material]));
      }
      sections.clear();
    }

    const craft = new T.Group();
    craft.name = 'Turuncu deniz motosikleti';
    bakeInto(craft);
    const steeringBar = new T.Group();
    steeringBar.name = 'Jet ski gidonu';
    steeringBar.position.set(0, .700, -.452);
    rod('chrome', [-.25, -.007, .018], [0, .001, -.016], .023);
    rod('chrome', [0, .001, -.016], [.25, -.007, .018], .023);
    box('rubber', .280, .079, .172, 0, .012, -.049);
    box('display', .158, .026, .107, 0, .057, -.066);
    for (const side of [-1, 1]) {
      rod('rubber', [side * .242, -.008, .023], [side * .354, -.019, .065], .036);
      rod('chrome', [side * .301, -.035, .088], [side * .350, -.060, .120], .010);
    }
    bakeInto(steeringBar);
    craft.add(steeringBar);
    boxGeometry.dispose();
    tubeGeometry.dispose();
    return { craft, steeringBar };
  }

  function createWake(T, scene) {
    const count = 30;
    const history = Array.from({ length: count }, () => ({ x: 0, z: 0, yaw: 0, speed: 0, time: -10 }));
    const points = new Float32Array(count * 3 * 2 * 3);
    const colors = new Float32Array(count * 3 * 2 * 4);
    const faces = [];
    for (let lane = 0; lane < 3; lane++) {
      for (let i = 0; i < count - 1; i++) {
        const start = (lane * count + i) * 2;
        faces.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
      }
    }
    const geometry = new T.BufferGeometry();
    const position = new T.BufferAttribute(points, 3).setUsage(T.DynamicDrawUsage);
    const color = new T.BufferAttribute(colors, 4).setUsage(T.DynamicDrawUsage);
    geometry.setAttribute('position', position);
    geometry.setAttribute('color', color);
    geometry.setIndex(faces);
    const material = new T.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: T.DoubleSide });
    const mesh = new T.Mesh(geometry, material);
    mesh.name = 'Jet ski su izi';
    mesh.renderOrder = 5;
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add(mesh);
    let head = 0;
    let filled = 0;
    let lastTime = -Infinity;
    let lastX = Infinity;
    let lastZ = Infinity;

    function update(time, x, z, yaw, speed, waterAt) {
      if (time < lastTime || Math.hypot(x - lastX, z - lastZ) > 12) {
        head = 0;
        filled = 0;
        lastTime = -Infinity;
        lastX = x;
        lastZ = z;
      }
      if (Math.abs(speed) > .75 && time - lastTime > .085) {
        head = (head + count - 1) % count;
        const record = history[head];
        const direction = speed < 0 ? -1 : 1;
        record.x = x + Math.sin(yaw) * 1.51 * direction;
        record.z = z + Math.cos(yaw) * 1.51 * direction;
        record.yaw = yaw;
        record.speed = Math.abs(speed) * (speed < 0 ? .30 : 1);
        record.time = time;
        filled = Math.min(count, filled + 1);
        lastTime = time;
        lastX = x;
        lastZ = z;
      }
      mesh.visible = filled > 1 && time - lastTime <= 2.6;
      if (!mesh.visible) return;
      for (let lane = 0; lane < 3; lane++) {
        for (let i = 0; i < count; i++) {
          const sample = history[(head + Math.min(i, filled - 1)) % count];
          const age = T.MathUtils.clamp(time - sample.time, 0, 2.6);
          const fade = i < filled ? 1 - age / 2.6 : 0;
          const strength = Math.min(sample.speed / 14, 1);
          const turbulence = Math.sin(sample.time * 22 + lane * 3) * .031;
          const spread = lane === 1 ? turbulence : (lane - 1) * (.17 + age * (.21 + strength * .57));
          const width = (lane === 1 ? .09 : .037) + age * (lane === 1 ? .093 : .040);
          const angleX = Math.cos(sample.yaw), angleZ = -Math.sin(sample.yaw);
          const brightness = (lane === 1 ? .63 : .37) * strength * fade * fade;
          for (let edge = 0; edge < 2; edge++) {
            const offset = spread + (edge ? width : -width);
            const px = sample.x + angleX * offset;
            const pz = sample.z + angleZ * offset;
            const vertex = (lane * count + i) * 2 + edge;
            points.set([px, waterAt(px, pz, time) + (.055 + lane * .004), pz], vertex * 3);
            colors.set([.73, .925, .930, brightness], vertex * 4);
          }
        }
      }
      position.needsUpdate = true;
      color.needsUpdate = true;
    }

    return { update };
  }

  function create(T, scene, shore) {
    const waterAt = (x, z, time) => shore.waveHeightAt?.(x, z, time) ?? shore.waterLevel;
    const { craft, steeringBar } = makeCraft(T);
    const group = new T.Group();
    group.name = 'Jet ski';
    group.add(craft);
    scene.add(group);
    const deck = new T.Object3D();
    deck.name = 'Sürücü oturma noktası';
    deck.position.set(0, .49, .28);
    craft.add(deck);

    const stationMaterial = new T.MeshBasicMaterial({ color: 0xa8eee3, opacity: .58, transparent: true, depthWrite: false });
    const station = new T.Group();
    station.name = 'Jet ski biniş halkası';
    station.renderOrder = 4;
    for (const angle of [0, Math.PI]) {
      const arc = new T.Mesh(new T.TorusGeometry(.97, .017, 6, 26, Math.PI * .76), stationMaterial);
      arc.rotation.set(-Math.PI / 2, 0, angle + Math.PI * .12, 'XYZ');
      arc.renderOrder = 4;
      station.add(arc);
    }
    scene.add(station);
    const wake = createWake(T, scene);
    let filteredLean = 0;
    let lastTime;

    function update(seconds, speed = 0, steer = 0) {
      if (!Number.isFinite(seconds)) return;
      const { x, z } = group.position;
      const yaw = group.rotation.y;
      const magnitude = Math.min(Math.abs(speed), 25);
      const power = magnitude / 25;
      const settle = lastTime === undefined ? 1 : 1 - Math.exp(-Math.max(0, Math.min(.20, seconds - lastTime)) * 8.5);
      lastTime = seconds;
      filteredLean += (T.MathUtils.clamp(steer, -1, 1) * power * .245 - filteredLean) * settle;
      const dx = Math.sin(yaw), dz = Math.cos(yaw);
      const bow = waterAt(x - dx, z - dz, seconds);
      const stern = waterAt(x + dx, z + dz, seconds);
      const surfaceLevel = waterAt(x, z, seconds);
      const sideA = waterAt(x + dz * .39, z - dx * .39, seconds);
      const sideB = waterAt(x - dz * .39, z + dx * .39, seconds);
      group.position.y = surfaceLevel + .057 + power * .084;
      const pitch = (bow - stern) * .38 + power * (speed < 0 ? -.015 : .074);
      const roll = (sideA - sideB) * .47 - filteredLean;
      craft.rotation.set(T.MathUtils.clamp(pitch, -.21, .21), 0, T.MathUtils.clamp(roll, -.29, .29));
      steeringBar.rotation.y = T.MathUtils.clamp(-steer * .26, -.26, .26);
      station.position.set(x - .01, surfaceLevel + .047, z + .58);
      station.visible = magnitude < .48;
      station.rotation.y = yaw;
      stationMaterial.opacity = .39 + .17 * Math.sin(seconds * 2.75);
      wake.update(seconds, x, z, yaw, speed, waterAt);
    }

    return { group, deck, update };
  }

  window.SehirJetSki = { create };
})();
