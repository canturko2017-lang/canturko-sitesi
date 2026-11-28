'use strict';

(() => {
  const silhouette = [
    [-2.65, .028, .047, .025], [-2.53, .24, .131, -.012], [-2.36, .395, .236, -.032],
    [-2.04, .504, .326, -.036], [-1.61, .579, .431, -.031], [-1.10, .596, .484, 0],
    [-.63, .558, .494, .012], [-.11, .523, .457, .023], [.44, .445, .385, .029],
    [1.04, .344, .296, .026], [1.60, .232, .201, .025], [2.14, .142, .143, .038],
    [2.59, .096, .126, .055], [2.79, .076, .114, .066],
  ];
  const twoPi = Math.PI * 2;

  function skinMaterial(THREE, time) {
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: .47,
      metalness: .02,
      side: THREE.DoubleSide,
    });
    material.onBeforeCompile = shader => {
      shader.uniforms.sharkClock = time;
      shader.vertexShader = `
        uniform float sharkClock;
        float swimBend(float z) {
          float flexible = smoothstep(-1.0, 2.9, z);
          return sin(sharkClock * 4.4 - z * 1.82) * flexible * flexible * 0.51;
        }
      ` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader
        .replace('#include <beginnormal_vertex>', `
          #include <beginnormal_vertex>
          float bendSlope = (swimBend(position.z + .016) - swimBend(position.z - .016)) / .032;
          objectNormal.z -= bendSlope * objectNormal.x;
        `)
        .replace('#include <begin_vertex>', `
          #include <begin_vertex>
          transformed.x += swimBend(position.z);
        `);
    };
    return material;
  }

  function sculpt(THREE) {
    const vertices = [], colors = [], indices = [];
    const ventral = new THREE.Color(0xc8ceca);
    const flank = new THREE.Color(0x71868f);
    const back = new THREE.Color(0x334750);
    const finBack = new THREE.Color(0x485e67);
    const finEdge = new THREE.Color(0x273b43);
    const shadow = new THREE.Color(0x2b3738);
    const eye = new THREE.Color(0x101b1e);
    const glint = new THREE.Color(0x8ea6ab);
    const shade = new THREE.Color();

    function point(x, y, z, color) {
      const index = vertices.length / 3;
      vertices.push(x, y, z);
      colors.push(color.r, color.g, color.b);
      return index;
    }

    function appendLoops(start, loopCount, steps, reverse = false) {
      for (let i = 0; i < loopCount - 1; i++) {
        for (let j = 0; j < steps; j++) {
          const a = start + i * steps + j;
          const b = start + i * steps + (j + 1) % steps;
          if (reverse) indices.push(a, a + steps, b, b, a + steps, b + steps);
          else indices.push(a, b, a + steps, b, b + steps, a + steps);
        }
      }
    }

    const bodySides = 26;
    for (const [z, width, height, centerY] of silhouette) {
      for (let side = 0; side < bodySides; side++) {
        const angle = side / bodySides * twoPi;
        const heightRatio = Math.sin(angle);
        const pale = 1 - THREE.MathUtils.smoothstep(heightRatio, -.65, -.31);
        const dorsal = THREE.MathUtils.smoothstep(heightRatio, -.15, .79);
        shade.copy(flank).lerp(back, dorsal).lerp(ventral, pale);
        shade.multiplyScalar(.98 + .024 * Math.cos(z * 14 + angle * 4));
        point(width * Math.cos(angle), centerY + height * heightRatio, z, shade);
      }
    }
    appendLoops(0, silhouette.length, bodySides);

    // Every fin is a tapered solid foil made from closed chord cross-sections.
    function fin(sections, axis, invert = false) {
      const start = vertices.length / 3;
      const sides = 10;
      for (let i = 0; i < sections.length; i++) {
        const [leading, trailing, thickness] = sections[i];
        const tip = i / (sections.length - 1);
        for (let j = 0; j < sides; j++) {
          const angle = j / sides * twoPi;
          const chord = .5 - .5 * Math.cos(angle);
          const bulge = Math.sin(angle);
          const depth = thickness * bulge * (1 - .35 * chord);
          shade.copy(finBack).lerp(finEdge, .30 * chord + .49 * tip);
          if (axis[1] && bulge < 0) shade.lerp(ventral, .85 * -bulge);
          point(
            THREE.MathUtils.lerp(leading[0], trailing[0], chord) + axis[0] * depth,
            THREE.MathUtils.lerp(leading[1], trailing[1], chord) + axis[1] * depth,
            THREE.MathUtils.lerp(leading[2], trailing[2], chord) + axis[2] * depth,
            shade,
          );
        }
      }
      appendLoops(start, sections.length, sides, invert);
    }

    fin([
      [[0, .432, -.76], [0, .405, .76], .103],
      [[0, .763, -.53], [0, .740, .59], .071],
      [[0, 1.137, -.20], [0, 1.098, .38], .046],
      [[.018, 1.408, .028], [.019, 1.347, .238], .023],
      [[.034, 1.510, .129], [.034, 1.502, .171], .010],
      [[.040, 1.522, .159], [.040, 1.519, .171], .003],
    ], [1, 0, 0]);

    for (const side of [-1, 1]) {
      fin([
        [[side * .50, -.129, -1.32], [side * .45, -.294, -.28], .065],
        [[side * .83, -.23, -1.10], [side * .80, -.34, -.18], .049],
        [[side * 1.18, -.39, -.81], [side * 1.13, -.43, -.02], .033],
        [[side * 1.53, -.55, -.50], [side * 1.41, -.54, .065], .020],
        [[side * 1.71, -.59, -.24], [side * 1.68, -.61, -.13], .005],
      ], [0, 1, 0], side < 0);
      fin([
        [[side * .285, -.159, 1.0], [side * .232, -.197, 1.59], .043],
        [[side * .51, -.28, 1.17], [side * .49, -.31, 1.61], .028],
        [[side * .70, -.395, 1.43], [side * .67, -.395, 1.54], .007],
      ], [0, 1, 0], side < 0);
    }

    fin([
      [[0, .204, 1.56], [0, .184, 2.12], .049],
      [[0, .41, 1.76], [0, .36, 2.03], .030],
      [[0, .543, 1.94], [0, .53, 1.99], .008],
    ], [1, 0, 0]);
    fin([
      [[0, .031, 2.56], [0, .079, 2.99], .089],
      [[0, .38, 2.66], [0, .34, 2.98], .058],
      [[0, .71, 2.83], [0, .69, 3.08], .040],
      [[0, .98, 3.08], [0, .95, 3.24], .023],
      [[0, 1.15, 3.31], [0, 1.14, 3.35], .005],
    ], [1, 0, 0]);
    fin([
      [[0, .070, 2.64], [0, .076, 2.98], .083],
      [[0, -.28, 2.74], [0, -.25, 3.00], .054],
      [[0, -.55, 2.88], [0, -.53, 3.095], .032],
      [[0, -.79, 3.08], [0, -.777, 3.19], .015],
      [[0, -.905, 3.28], [0, -.895, 3.33], .004],
    ], [1, 0, 0], true);

    function combine(geometry, color, at = [0, 0, 0], size = [1, 1, 1]) {
      const position = geometry.getAttribute('position');
      const first = vertices.length / 3;
      for (let i = 0; i < position.count; i++) point(
        at[0] + position.getX(i) * size[0], at[1] + position.getY(i) * size[1], at[2] + position.getZ(i) * size[2], color,
      );
      if (geometry.index) for (const index of geometry.index.array) indices.push(first + index);
      else for (let i = 0; i < position.count; i++) indices.push(first + i);
      geometry.dispose();
    }

    function line(coordinates, radius, color) {
      const path = new THREE.CatmullRomCurve3(coordinates.map(position => new THREE.Vector3(...position)));
      combine(new THREE.TubeGeometry(path, 8, radius, 5, false), color);
    }

    function bodySide(z, y) {
      const index = silhouette.findIndex(station => station[0] >= z);
      const a = silhouette[index - 1], b = silhouette[index];
      const fraction = (z - a[0]) / (b[0] - a[0]);
      const w = THREE.MathUtils.lerp(a[1], b[1], fraction);
      const h = THREE.MathUtils.lerp(a[2], b[2], fraction);
      const center = THREE.MathUtils.lerp(a[3], b[3], fraction);
      return w * Math.sqrt(Math.max(0, 1 - ((y - center) / h) ** 2));
    }

    for (const side of [-1, 1]) {
      const eyeY = .101, eyeZ = -2.065;
      const eyeX = side * (bodySide(eyeZ, eyeY) + .009);
      combine(new THREE.SphereGeometry(1, 10, 7), eye, [eyeX, eyeY, eyeZ], [.032, .053, .056]);
      combine(new THREE.SphereGeometry(1, 6, 4), glint, [eyeX + side * .027, eyeY + .017, eyeZ - .012], [.008, .009, .012]);
      const nostrilY = -.08, nostrilZ = -2.40;
      const nostrilX = side * (bodySide(nostrilZ, nostrilY) + .003);
      combine(new THREE.SphereGeometry(1, 6, 4), shadow, [nostrilX, nostrilY, nostrilZ], [.010, .018, .020]);
      for (let i = 0; i < 5; i++) {
        const z = -1.60 + i * .091;
        const path = [.19 - i * .012, .061, -.092, -.204 + i * .012].map((y, step) => {
          const curve = z + [0, .039, .047, .023][step];
          return [side * (bodySide(curve, y) + .006), y, curve];
        });
        line(path, .0115, shadow);
      }
      const mouth = [[-.267, -2.40], [-.300, -2.25], [-.310, -2.09], [-.288, -1.95]].map(([y, z]) =>
        [side * (bodySide(z, y) + .007), y, z],
      );
      line(mouth, .0115, shadow);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    geometry.boundingSphere.radius += .55;
    return geometry;
  }

  function create(THREE, scene, shore) {
    const time = { value: 0 };
    const shark = new THREE.Mesh(sculpt(THREE), skinMaterial(THREE, time));
    shark.name = 'Sahildeki köpekbalığı';
    scene.add(shark);

    // The loop stays landward of the central yacht. Arc-length sampling keeps its speed even through bends.
    const anchors = [[17.7, -34], [17.1, -14], [16.3, 12], [13.6, 29], [11, 18], [11, -10], [12, -29], [14.8, -38]];
    const points = anchors.map(([offshore, z]) => new THREE.Vector3(shore.limitAt(z) + offshore, 0, z));
    const patrol = new THREE.CatmullRomCurve3(points, true, 'centripetal');
    patrol.arcLengthDivisions = 320;
    const point = new THREE.Vector3();
    const ahead = new THREE.Vector3();
    const behind = new THREE.Vector3();

    let foam;
    function surface(x, z, clock) {
      return shore.waveHeightAt?.(x, z, clock) ?? shore.waterLevel;
    }

    function makeRipple() {
      const count = 16;
      const positions = new Float32Array(count * 2 * 2 * 3);
      const shades = new Float32Array(count * 2 * 2 * 4);
      const indices = [];
      for (let side = 0; side < 2; side++) {
        for (let index = 0; index < count; index++) {
          const u = index / (count - 1);
          const opacity = Math.sin(Math.PI * u) * (1 - .8 * u) * .41;
          const vertex = (side * count + index) * 2;
          for (let edge = 0; edge < 2; edge++) shades.set([.64, .89, .88, opacity], (vertex + edge) * 4);
          if (index < count - 1) indices.push(vertex, vertex + 1, vertex + 2, vertex + 1, vertex + 3, vertex + 2);
        }
      }
      const geometry = new THREE.BufferGeometry();
      const buffer = new THREE.BufferAttribute(positions, 3);
      buffer.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute('position', buffer);
      geometry.setAttribute('color', new THREE.BufferAttribute(shades, 4));
      geometry.setIndex(indices);
      const material = new THREE.MeshBasicMaterial({
        vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: .56,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = 'Köpekbalığı su izi';
      mesh.renderOrder = 4;
      mesh.frustumCulled = false;
      scene.add(mesh);
      return { count, positions, buffer };
    }

    function update(seconds, playerPosition) {
      if (!Number.isFinite(seconds)) return;
      const unit = ((seconds / 62 + .075) % 1 + 1) % 1;
      patrol.getPointAt(unit, point);
      patrol.getPointAt((unit + .003) % 1, ahead);
      patrol.getPointAt((unit + .997) % 1, behind);
      const yaw = Math.atan2(behind.x - ahead.x, behind.z - ahead.z);
      const proximity = playerPosition
        ? 1 - THREE.MathUtils.smoothstep(Math.hypot(playerPosition.x - point.x, playerPosition.z - point.z), 1, 5)
        : 0;
      const depth = .814 + .069 * Math.sin(seconds * 1.47) + proximity * .19;
      shark.position.set(point.x, surface(point.x, point.z, seconds) - depth, point.z);
      shark.rotation.set(Math.sin(seconds * 1.28) * .018, yaw, Math.sin(seconds * 1.95) * .035, 'YXZ');
      time.value = seconds;

      const sine = Math.sin(yaw), cosine = Math.cos(yaw);
      for (let side = 0; side < 2; side++) {
        for (let index = 0; index < foam.count; index++) {
          const u = index / (foam.count - 1);
          const forward = .10 + u * 4.3;
          const spread = (.075 + u * .44 + Math.sin(u * 12 - seconds * 2.12) * .022) * (side ? 1 : -1);
          const offset = (side * foam.count + index) * 6;
          for (let edge = 0; edge < 2; edge++) {
            const right = spread + (edge ? .060 : -.060);
            const x = point.x + right * cosine + forward * sine;
            const z = point.z + forward * cosine - right * sine;
            foam.positions[offset + edge * 3] = x;
            foam.positions[offset + edge * 3 + 1] = surface(x, z, seconds) + .038;
            foam.positions[offset + edge * 3 + 2] = z;
          }
        }
      }
      foam.buffer.needsUpdate = true;
    }

    foam = makeRipple();
    update(0);
    return { update };
  }

  window.SehirKopekbaligi = { create };
})();
