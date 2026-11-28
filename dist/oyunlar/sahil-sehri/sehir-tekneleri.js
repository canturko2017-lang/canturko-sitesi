'use strict';

(() => {
  function create(THREE, scene) {
    const harbor = new THREE.Group();
    harbor.name = 'Açık deniz tekneleri';
    scene.add(harbor);

    const paint = (color, roughness = .45, metalness = .08) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const materials = {
      white: paint(0xf7f4e9, .31), navy: paint(0x233a4b, .36), hullBlue: paint(0x35596c, .38),
      glass: paint(0x213b49, .12, .26), glassLight: paint(0x3c6070, .2, .21),
      dark: paint(0x293336, .64), silver: paint(0xb9cbcd, .33, .67),
      teak: paint(0xc4a177, .77), seam: paint(0x8c7456, .79), upholstery: paint(0xd6c1a5, .71),
      sail: new THREE.MeshStandardMaterial({ roughness: .82, side: THREE.DoubleSide, vertexColors: true }),
      port: new THREE.MeshBasicMaterial({ color: 0xd64336 }), starboard: new THREE.MeshBasicMaterial({ color: 0x60d2a1 }),
    };
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
    const up = new THREE.Vector3(0, 1, 0);
    const unitSphere = new THREE.SphereGeometry(1, 12, 8);
    const parts = [];

    function add(geometry, material, position = [0, 0, 0], size = [1, 1, 1], rotation = null) {
      const matrix = new THREE.Matrix4().compose(
        new THREE.Vector3(...position), rotation || new THREE.Quaternion(), new THREE.Vector3(...size),
      );
      parts.push({ geometry, material, matrix });
    }

    function box(material, x, y, z, w, h, d) {
      add(unitBox, material, [x, y, z], [w, h, d]);
    }

    function sphere(material, x, y, z, width, height, depth) {
      add(unitSphere, material, [x, y, z], [width, height, depth]);
    }

    function rod(material, start, end, radius) {
      const a = new THREE.Vector3(...start);
      const b = new THREE.Vector3(...end);
      const delta = b.clone().sub(a);
      const center = a.clone().lerp(b, .5);
      const rotation = new THREE.Quaternion().setFromUnitVectors(up, delta.clone().normalize());
      add(unitCylinder, material, center.toArray(), [radius, delta.length(), radius], rotation);
    }

    function meshGroup(name) {
      const byMaterial = new Map();
      for (const part of parts.splice(0)) {
        const copy = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
        copy.applyMatrix4(part.matrix);
        let batch = byMaterial.get(part.material);
        if (!batch) byMaterial.set(part.material, batch = { position: [], normal: [], color: [] });
        for (const attribute of ['position', 'normal', 'color']) {
          const values = copy.getAttribute(attribute)?.array;
          if (!values) continue;
          for (const value of values) batch[attribute].push(value);
        }
        copy.dispose();
        if (part.geometry !== unitBox && part.geometry !== unitCylinder && part.geometry !== unitSphere) part.geometry.dispose();
      }
      const group = new THREE.Group();
      group.name = name;
      for (const [material, batch] of byMaterial) {
        const geometry = new THREE.BufferGeometry();
        for (const attribute of ['position', 'normal', 'color']) {
          if (batch[attribute].length) geometry.setAttribute(attribute, new THREE.Float32BufferAttribute(batch[attribute], 3));
        }
        geometry.computeBoundingSphere();
        group.add(new THREE.Mesh(geometry, material));
      }
      harbor.add(group);
      return group;
    }

    function geometryFromPositions(positions, indices) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      if (indices) geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    }

    function hull(stations, color, deckMaterial) {
      const edges = 16;
      const positions = [];
      const indices = [];
      const deck = [];
      for (const [z, w, top, keel] of stations) {
        for (let side = 0; side <= edges; side++) {
          const angle = side / edges * Math.PI;
          positions.push(-Math.cos(angle) * w, top + (keel - top) * Math.sin(angle) ** .7, z);
        }
        deck.push(-w, top + .03, z, w, top + .03, z);
      }
      const deckIndices = [];
      for (let i = 0; i < stations.length - 1; i++) {
        for (let j = 0; j < edges; j++) {
          const a = i * (edges + 1) + j;
          const b = a + edges + 1;
          indices.push(a, a + 1, b, b, a + 1, b + 1);
        }
        const a = i * 2;
        deckIndices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
      }
      add(geometryFromPositions(positions, indices), color);
      add(geometryFromPositions(deck, deckIndices), deckMaterial);

      for (const end of [0, stations.length - 1]) {
        const [z, , top, keel] = stations[end];
        const cap = [0, (top + keel) / 2, z];
        for (let k = 0; k <= edges; k++) {
          const offset = (end * (edges + 1) + k) * 3;
          cap.push(...positions.slice(offset, offset + 3));
        }
        const capIndices = [];
        for (let k = 1; k <= edges; k++) capIndices.push(...(end ? [0, k, k + 1] : [0, k + 1, k]));
        capIndices.push(...(end ? [0, edges + 1, 1] : [0, 1, edges + 1]));
        add(geometryFromPositions(cap, capIndices), color);
      }
    }

    // Chamfered sections give the glazing and superstructure a true wraparound shape.
    function volume(stations, material) {
      const positions = [];
      for (const [z, width, lo, hi, taper = .84] of stations) {
        positions.push(-width, lo, z, width, lo, z, width * taper, hi, z, -width * taper, hi, z);
      }
      const indices = [0, 2, 1, 0, 3, 2];
      for (let i = 0; i < stations.length - 1; i++) {
        for (let edge = 0; edge < 4; edge++) {
          const a = i * 4 + edge;
          const b = i * 4 + (edge + 1) % 4;
          indices.push(a, b, a + 4, b, b + 4, a + 4);
        }
      }
      const last = (stations.length - 1) * 4;
      indices.push(last, last + 1, last + 2, last, last + 2, last + 3);
      const shell = geometryFromPositions(positions, indices);
      const flat = shell.toNonIndexed();
      shell.dispose();
      flat.computeVertexNormals();
      add(flat, material);
    }

    function railing(stations, offset = .14, height = .72) {
      for (const side of [-1, 1]) {
        let previous;
        for (const [z, width, top] of stations) {
          const foot = [side * Math.max(.04, width - offset), top + .06, z];
          const head = [foot[0], top + height, z];
          rod(materials.silver, foot, head, .033);
          if (previous) rod(materials.silver, previous, head, .047);
          previous = head;
        }
      }
    }

    function hullWindows(stations, y, positions, paneLength) {
      const firstFacet = Math.PI / 16;
      function halfBeamAt(z) {
        const end = stations.findIndex(station => station[0] > z);
        const [[zA, widthA, topA, keelA], [zB, widthB, topB, keelB]] = stations.slice(end - 1, end + 1);
        const fraction = (z - zA) / (zB - zA);
        const interpolate = (a, b) => a + (b - a) * fraction;
        const beam = interpolate(widthA, widthB);
        const top = interpolate(topA, topB);
        const keel = interpolate(keelA, keelB);
        const facetDepth = (top - keel) * Math.sin(firstFacet) ** .7;
        return beam * (1 - (1 - Math.cos(firstFacet)) * (top - y) / facetDepth);
      }
      for (const side of [-1, 1]) {
        for (let i = 0; i < positions.length; i++) {
          const z = positions[i];
          const pane = i % 3 === 0 ? materials.glassLight : materials.glass;
          const a = halfBeamAt(z - paneLength / 2);
          const b = halfBeamAt(z + paneLength / 2);
          const angle = Math.atan2(side * (b - a), paneLength);
          const rotation = new THREE.Quaternion().setFromAxisAngle(up, angle);
          add(unitBox, pane, [side * (halfBeamAt(z) + .012), y, z], [.091, .44, paneLength], rotation);
        }
      }
    }

    function yacht() {
      const stations = [
        [-22.4, .045, 3.18, .87], [-21, .66, 3.11, .13], [-18.4, 1.65, 2.95, -.76],
        [-15.2, 2.72, 2.78, -1.20], [-11.5, 3.62, 2.65, -1.47], [-6, 4.10, 2.54, -1.51],
        [2, 4.28, 2.51, -1.55], [10, 4.14, 2.43, -1.46], [16, 3.94, 2.39, -1.26],
        [19.75, 3.67, 2.30, -.93], [20.55, 3.40, 2.17, -.65],
      ];
      hull(stations, materials.white, materials.teak);
      volume([[-13.7, .65, 2.62, 2.86], [-9, 3.14, 2.57, 3.24], [12.9, 3.62, 2.43, 3.24], [15.6, 3.37, 2.41, 2.94]], materials.white);
      volume([[-11.5, 1.56, 2.92, 3.40], [-8.2, 3.1, 3.01, 4.58], [-2.4, 3.39, 3.02, 4.62], [11, 3.34, 3.02, 4.43], [13.7, 3.05, 2.99, 3.87]], materials.glass);
      volume([[-8.8, 1.6, 4.33, 4.67], [-6.5, 3.28, 4.40, 4.83], [10.5, 3.47, 4.25, 4.70], [13.9, 3.34, 4.13, 4.46]], materials.white);
      volume([[-6.3, .76, 4.72, 5.16], [-3.1, 2.46, 4.72, 6.03], [4.6, 2.62, 4.67, 5.97], [7.6, 2.30, 4.59, 5.32]], materials.glassLight);
      volume([[-3.5, 1.36, 5.85, 6.08], [-1.4, 2.66, 5.88, 6.29], [6.9, 2.67, 5.74, 6.04], [8.9, 2.31, 5.58, 5.77]], materials.white);
      railing(stations.filter((_, index) => index !== 1 && index !== 9), .12, .74);
      railing([[9.2, 3.14, 4.57], [10.9, 3.12, 4.51], [13.3, 3.0, 4.46]], .13, .53);
      hullWindows(stations, 1.993, [-1, 1.8, 4.1, 6.3], 1.15);
      hullWindows(stations, 1.89, [10, 12.08, 14.3], 1.08);
      for (const side of [-1, 1]) {
        for (const z of [-5.8, -.6, 4.6, 9.1]) rod(materials.white,
          [side * 3.34, 3.04, z], [side * 2.90, 4.53, z], .075);
        box(materials.white, side * 2.28, 2.78, 16.71, 1.13, .46, 3.45);
        box(materials.upholstery, side * 2.30, 3.04, 16.76, 1.05, .16, 3.35);
        for (const z of [15.10, 16.06, 16.98, 17.91]) box(materials.seam, side * 2.29, 3.125, z, 1.02, .018, .024);
      }
      box(materials.teak, 0, 1.97, 21.03, 5.95, .25, 1.34);
      box(materials.teak, 0, 1.69, 21.56, 5.23, .24, .72);
      box(materials.white, 0, 6.35, 2.4, 1.23, .24, 1.43);
      rod(materials.silver, [0, 6.38, 2.42], [0, 8.69, 3.05], .126);
      rod(materials.silver, [-1.21, 7.26, 2.67], [1.21, 7.26, 2.67], .061);
      box(materials.white, 0, 7.68, 2.79, 1.91, .18, .43);
      sphere(materials.white, 1.5, 6.81, 4.04, .48, .44, .48);
      sphere(materials.white, -1.5, 6.81, 4.04, .48, .44, .48);
      rod(materials.silver, [0, 2.47, 19.78], [0, 4.47, 20.38], .04);
      box(materials.port, -3.34, 4.38, 7.44, .16, .17, .25);
      box(materials.starboard, 3.34, 4.38, 7.44, .16, .17, .25);
      return meshGroup('Motor yat');
    }

    function speedboat(name, hullColor) {
      const stations = [
        [-9.7, .044, 1.37, .32], [-8.56, .66, 1.32, -.03], [-6.62, 1.33, 1.22, -.45],
        [-4.18, 1.93, 1.08, -.59], [-.4, 2.26, .98, -.68], [4.75, 2.31, .94, -.59],
        [8.06, 2.14, .91, -.42], [8.90, 1.90, .82, -.28],
      ];
      hull(stations, hullColor, materials.teak);
      volume([[-5.19, .54, 1.15, 1.37], [-3.76, 1.48, 1.06, 1.92], [2.65, 1.79, .99, 1.62], [5.34, 1.65, .94, 1.48]], materials.white);
      volume([[-3.91, .87, 1.38, 1.55], [-2.52, 1.48, 1.56, 2.70], [.35, 1.62, 1.56, 2.63], [2.59, 1.38, 1.49, 2.25]], materials.glass);
      volume([[-2.82, .91, 2.56, 2.72], [-2.13, 1.49, 2.60, 2.83], [2.24, 1.58, 2.34, 2.61], [3.25, 1.49, 2.27, 2.42]], materials.white);
      railing(stations.slice(0, 5), .095, .45);
      for (const side of [-1, 1]) {
        box(materials.white, side * 1.08, 1.17, 6.23, 1.12, .46, 2.05);
        box(materials.upholstery, side * 1.08, 1.45, 6.22, 1.05, .16, 1.95);
        box(materials.dark, side * .61, .40, 8.97, .27, .25, .24);
      }
      rod(materials.silver, [0, 2.73, .84], [0, 3.43, 1.13], .038);
      box(materials.teak, 0, .69, 9.47, 3.56, .17, 1.02);
      return meshGroup(name);
    }

    function sail(tip, tack, clew, billow) {
      const positions = [];
      const colors = [];
      const indices = [];
      const subdivisions = 12;
      const light = new THREE.Color(0xf4f1df);
      const blueStripe = new THREE.Color(0x5a7c89);
      const panel = new THREE.Color(0xd4d9d2);
      for (let i = 0; i <= subdivisions; i++) {
        const height = i / subdivisions;
        for (let j = 0; j <= subdivisions; j++) {
          const span = j / subdivisions;
          const z = tack[2] * (1 - span) + clew[2] * span;
          const y = tack[1] * (1 - span) + clew[1] * span;
          const curve = Math.sin(span * Math.PI) * Math.sin(height * Math.PI) * billow;
          positions.push(curve + tack[0] * (1 - height), y * (1 - height) + tip[1] * height, z * (1 - height) + tip[2] * height);
          const color = i === 1 || i === 2 ? blueStripe : j === subdivisions || i === 5 || i === 9 ? panel : light;
          colors.push(color.r, color.g, color.b);
        }
      }
      for (let i = 0; i < subdivisions; i++) {
        for (let j = 0; j < subdivisions; j++) {
          const a = i * (subdivisions + 1) + j;
          const b = a + subdivisions + 1;
          indices.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
      const geometry = geometryFromPositions(positions, indices);
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      add(geometry, materials.sail);
    }

    function sailboat() {
      const stations = [
        [-12.61, .07, 1.53, .18], [-11.53, .86, 1.36, -.20], [-8.6, 1.67, 1.27, -.74],
        [-4.98, 2.36, 1.12, -.93], [.94, 2.61, 1.08, -1.01], [6.50, 2.52, 1.09, -.88],
        [10.47, 2.17, 1.04, -.44], [11.36, 1.92, .96, -.28],
      ];
      hull(stations, materials.white, materials.teak);
      railing(stations, .095, .57);
      volume([[-7.28, .74, 1.20, 1.48], [-4.26, 1.44, 1.13, 1.94], [2.54, 1.55, 1.11, 1.97], [6.14, 1.32, 1.09, 1.56]], materials.white);
      volume([[-5.12, .68, 1.41, 1.56], [-3.62, 1.43, 1.49, 1.82], [2.11, 1.49, 1.51, 1.81], [4.46, 1.35, 1.37, 1.58]], materials.glassLight);
      rod(materials.silver, [0, 1.68, -.22], [0, 24.6, .28], .112);
      rod(materials.silver, [0, 4.34, .07], [.14, 4.23, 7.92], .078);
      rod(materials.silver, [0, 23.85, .18], [0, 1.61, -11.74], .022);
      rod(materials.silver, [0, 23.85, .18], [0, 1.35, 10.7], .022);
      sail([0, 24.04, .22], [.08, 4.52, .34], [.16, 4.38, 8.2], 1.16);
      sail([0, 20.51, -.97], [.03, 1.96, -11.22], [.13, 3.92, -.80], .83);
      box(materials.upholstery, 0, 1.25, 8.28, 2.70, .33, 1.84);
      return meshGroup('Yelkenli');
    }

    function wake() {
      const material = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, tint: { value: new THREE.Color(0xd8f3ef) } },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform vec3 tint;
          varying vec2 vUv;
          void main() {
            float aft = 1.0 - vUv.y;
            float edge = abs(vUv.x - 0.5) - (0.07 + aft * 0.365);
            edge += sin(aft * 43.0 - time * 3.0) * (0.009 + aft * 0.012);
            float foam = 1.0 - smoothstep(0.008, 0.026 + aft * 0.014, abs(edge));
            float propwash = exp(-pow((vUv.x - 0.5) / (0.045 + aft * 0.093), 2.0)) * exp(-aft * 4.8);
            float streak = 0.64 + 0.36 * sin(time * 4.1 - aft * 94.0 + vUv.x * 46.0);
            float opacity = (foam * 0.23 + propwash * 0.23 * streak) * smoothstep(0.0, 0.037, aft) * pow(1.0 - aft, 1.12);
            gl_FragColor = vec4(tint, opacity);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
      });
      const group = new THREE.Group();
      const waterTrail = new THREE.Mesh(new THREE.PlaneGeometry(16, 31), material);
      waterTrail.rotation.x = -Math.PI / 2;
      waterTrail.position.z = 24.3;
      group.add(waterTrail);
      harbor.add(group);
      return { group, material };
    }

    const boats = [
      { model: yacht(), x: 490, z: 6, yaw: -.18, phase: .6 },
      { model: sailboat(), x: 524, z: -83, yaw: .30, phase: 2.1 },
      { model: speedboat('Kabinli motor teknesi', materials.hullBlue), x: 532, z: 110, phase: .35, speed: .117, route: [10, 38], trail: wake() },
      { model: speedboat('Beyaz motor teknesi', materials.white), x: 548, z: -220, phase: 2.15, speed: .095, route: [12, 42], trail: wake() },
      { model: speedboat('Demirli gezi teknesi', materials.navy), x: 483, z: 245, yaw: .14, phase: 3.6 },
    ];

    function update(timeSeconds) {
      if (!Number.isFinite(timeSeconds)) return;
      for (const boat of boats) {
        const wave = timeSeconds * .84 + boat.phase;
        let x = boat.x + Math.sin(wave * .62) * .8;
        let z = boat.z + Math.cos(wave * .51) * 1.2;
        let yaw = boat.yaw + Math.sin(wave * .43) * .045;
        if (boat.route) {
          const turn = timeSeconds * boat.speed + boat.phase;
          const [width, length] = boat.route;
          x = boat.x + width * Math.cos(turn);
          z = boat.z + length * Math.sin(turn);
          yaw = Math.atan2(width * Math.sin(turn), -length * Math.cos(turn));
          boat.trail.group.position.set(x, .12, z);
          boat.trail.group.rotation.y = yaw;
          boat.trail.material.uniforms.time.value = timeSeconds;
        }
        boat.model.position.set(x, -.06 + Math.sin(wave) * .18, z);
        boat.model.rotation.set(Math.sin(wave * .74) * .012, yaw, Math.cos(wave * .57) * .021, 'YXZ');
      }
    }

    update(0);
    return { update };
  }

  window.SehirTekneleri = { create };
})();
