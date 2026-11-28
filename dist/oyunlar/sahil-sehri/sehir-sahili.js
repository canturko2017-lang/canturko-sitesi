'use strict';

(() => {
  const beachStart = 408;
  const coastExtent = 690;
  const segmentCount = 172;
  const tau = Math.PI * 2;
  const waterLevel = -.211;

  function limitAt(z) {
    return 455 + 7 * Math.sin(z * .012 + .62) + 3 * Math.sin(z * .029 - .81);
  }

  function waveHeightAt(x, z, time) {
    const depth = Math.max(0, Math.min(1, (x - limitAt(z)) / 34));
    const swell = .024 + .14 * depth * depth * (3 - 2 * depth);
    return waterLevel + swell * (Math.sin(x * .155 + z * .07 + time * 1.15) +
      .52 * Math.sin(z * .146 - x * .099 + time * .78));
  }

  function randomSource(seed) {
    return () => {
      seed = seed * 16807 % 2147483647;
      return seed / 2147483647;
    };
  }

  function texture(THREE, width, height, paint) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    paint(canvas.getContext('2d'), width, height);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    return map;
  }

  function texturedSand(THREE) {
    const map = texture(THREE, 256, 256, (ctx, width, height) => {
      const next = randomSource(127523);
      ctx.fillStyle = '#ddd5c1';
      ctx.fillRect(0, 0, width, height);
      const grain = ['#f5eed756', '#9c806b37', '#c0a87a57', '#fff7e670', '#80685127'];
      for (let index = 0; index < 6700; index++) {
        ctx.fillStyle = grain[index % grain.length];
        ctx.fillRect(next() * width, next() * height, .42 + next() * 2.9, .35 + next() * 1.72);
      }
    });
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    return map;
  }

  function coastStrip(THREE, columns, sample) {
    const positions = [], uv = [], colors = [], shoreDistances = [], indices = [];
    for (let row = 0; row <= segmentCount; row++) {
      const z = -coastExtent + 2 * coastExtent * row / segmentCount;
      for (let column = 0; column < columns; column++) {
        const point = sample(z, column);
        positions.push(point.x, point.y, z);
        uv.push(point.x / 5.7, z / 5.7);
        shoreDistances.push(point.x - limitAt(z));
        if (point.color) colors.push(point.color.r, point.color.g, point.color.b);
        if (row === segmentCount || column === columns - 1) continue;
        const first = row * columns + column;
        indices.push(first, first + columns, first + 1, first + 1, first + columns, first + columns + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setAttribute('shoreDistance', new THREE.Float32BufferAttribute(shoreDistances, 1));
    if (colors.length) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  function beachSurface(THREE) {
    const inland = new THREE.Color(0xe1cb9c), dry = new THREE.Color(0xffe2a8), wet = new THREE.Color(0xb18d64);
    const shallowBed = new THREE.Color(0xb3a77f), deepBed = new THREE.Color(0x46706c);
    const profile = [
      (z, shore) => [beachStart, -.129, inland],
      (z, shore) => [416, -.095, inland],
      (z, shore) => [shore - 16, -.106, dry],
      (z, shore) => [shore - 7, -.115, dry],
      (z, shore) => [shore - 3.6, -.149, wet],
      (z, shore) => [shore - .4, -.184, wet],
      (z, shore) => [shore + 1.8, -.44, wet],
      (z, shore) => [shore + 5, -1.2, shallowBed],
      (z, shore) => [shore + 13, -2.7, shallowBed],
      (z, shore) => [shore + 31, -5.8, deepBed],
      (z, shore) => [shore + 63, -9.3, deepBed],
      (z, shore) => [shore + 128, -14, deepBed],
    ];
    const sand = coastStrip(THREE, profile.length, (z, column) => {
      const [x, y, color] = profile[column](z, limitAt(z));
      return { x, y, color: color.clone().multiplyScalar(1 + .043 * Math.sin(z * .17 + column * 1.1)) };
    });
    return new THREE.Mesh(sand, new THREE.MeshStandardMaterial({
      map: texturedSand(THREE), vertexColors: true, roughness: .965,
    }));
  }

  function seawater(THREE) {
    const depths = [-1.5, 0, 2.9, 6, 11, 19, 29, 44, 68, 100, 149, 217, 318, 475, 780];
    const geometry = coastStrip(THREE, depths.length, (z, column) => ({ x: limitAt(z) + depths[column], y: waterLevel }));
    const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      time: { value: 0 },
      shallows: { value: new THREE.Color(0x75c8c0) },
      teal: { value: new THREE.Color(0x188faf) },
      blue: { value: new THREE.Color(0x17669b) },
      sky: { value: new THREE.Color(0x96c7e6) },
    }]);
    const material = new THREE.ShaderMaterial({
      fog: true, transparent: true, depthWrite: false, uniforms,
      vertexShader: `
        #include <fog_pars_vertex>
        uniform float time;
        attribute float shoreDistance;
        varying float depth;
        varying vec3 seaPosition;
        void main() {
          depth = shoreDistance;
          vec3 surface = position;
          float swell = .024 + .14 * smoothstep(0.0, 34.0, depth);
          surface.y += swell * (sin(surface.x * .155 + surface.z * .07 + time * 1.15)
            + .52 * sin(surface.z * .146 - surface.x * .099 + time * .78));
          seaPosition = (modelMatrix * vec4(surface, 1.0)).xyz;
          vec4 mvPosition = modelViewMatrix * vec4(surface, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: `
        #include <fog_pars_fragment>
        uniform float time;
        uniform vec3 shallows, teal, blue, sky;
        varying float depth;
        varying vec3 seaPosition;
        void main() {
          vec2 p = seaPosition.xz;
          float a = dot(p, vec2(.38, .14)) + time * 1.14;
          float b = dot(p, vec2(-.26, .41)) - time * .84;
          float c = dot(p, vec2(1.32, .62)) + time * 1.62;
          float d = dot(p, vec2(-1.74, 1.24)) - time * 1.02;
          vec3 normal = normalize(vec3(
            cos(a) * .11 - cos(b) * .089 + cos(c) * .055 - cos(d) * .043,
            1.0,
            cos(a) * .058 + cos(b) * .135 + cos(c) * .052 + cos(d) * .04
          ));
          vec3 viewDirection = normalize(cameraPosition - seaPosition);
          float distanceToCamera = distance(cameraPosition, seaPosition);
          float horizon = pow(1.0 - max(0.0, dot(normal, viewDirection)), 3.6);
          vec3 sea = mix(shallows, teal, smoothstep(-.8, 28.0, depth));
          sea = mix(sea, blue, smoothstep(23.0, 195.0, depth));
          sea = mix(sea, sky, .35 * horizon);
          float textureFade = 1.0 - smoothstep(75.0, 260.0, distanceToCamera);
          sea *= 1.0 + textureFade * (.074 * sin(a) + .047 * sin(b) + .033 * sin(c));
          float band = depth + .64 * sin(p.y * .086 + time * .86) + .28 * sin(p.y * .56 + time * 1.7);
          float curl = .57 + .45 * sin(time * 1.4 + p.y * .115);
          float foam = (1.0 - smoothstep(.015, .69, abs(band - curl))) * (.83 - .31 * sin(p.y * 2.1 + p.x * 3.4));
          float trailing = pow(max(0.0, cos(band * 1.25 + time * .85)), 15.0)
            * smoothstep(.2, 1.6, depth) * (1.0 - smoothstep(1.6, 10.5, depth));
          sea = mix(sea, vec3(.82, .96, .947), clamp(foam * .88 + trailing * .26, 0.0, 1.0) * textureFade);
          vec3 sunDirection = normalize(vec3(.76, .47, -.33));
          vec3 halfDirection = normalize(sunDirection + viewDirection);
          float specular = max(0.0, dot(normal, halfDirection));
          float glimmer = pow(specular, 91.0) * (.34 + .54 * textureFade) + pow(specular, 23.0) * .094;
          sea += vec3(1.0, .88, .67) * glimmer;
          float opacity = mix(.44, .84, smoothstep(-.8, 65.0, depth));
          float reflection = clamp(horizon * .8 + max(foam, 0.0) * .45 + glimmer, 0.0, 1.0);
          opacity = mix(opacity, 1.0, max(reflection, smoothstep(56.0, 110.0, depth)));
          gl_FragColor = vec4(sea, opacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }
      `,
    });
    return new THREE.Mesh(geometry, material);
  }

  function instanceBatch(THREE, group, geometry, material, count, configure) {
    const batch = new THREE.InstancedMesh(geometry, material, count);
    const pose = new THREE.Object3D();
    for (let index = 0; index < count; index++) {
      pose.position.set(0, 0, 0);
      pose.scale.set(1, 1, 1);
      pose.rotation.set(0, 0, 0);
      configure(pose, index, batch);
      pose.updateMatrix();
      batch.setMatrixAt(index, pose.matrix);
    }
    batch.computeBoundingSphere();
    group.add(batch);
  }

  function plankTexture(THREE) {
    return texture(THREE, 256, 256, (ctx, width, height) => {
      const next = randomSource(405412);
      for (let plank = 0; plank < 8; plank++) {
        const y = height / 8 * plank;
        ctx.fillStyle = ['#aa8b69', '#b79671', '#9c7a5b', '#b59677'][plank % 4];
        ctx.fillRect(0, y, width, height / 8);
        ctx.fillStyle = '#594634';
        ctx.fillRect(0, y, width, 1.5);
        for (let grain = 0; grain < 86; grain++) {
          ctx.fillStyle = grain % 3 ? '#562e1a22' : '#ffeaad40';
          ctx.fillRect(next() * width, y + 3 + next() * 27, 2 + next() * 59, .4 + next() * .9);
        }
      }
    });
  }

  function boardwalk(THREE, group) {
    const map = plankTexture(THREE);
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(1, 156);
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 838), new THREE.MeshStandardMaterial({ map, roughness: .93 }));
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(412.4, -.044, 0);
    group.add(walk);

    const markerMap = texture(THREE, 384, 128, (ctx, width, height) => {
      ctx.fillStyle = '#245c62';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#e5ddbe';
      ctx.lineWidth = 5;
      ctx.strokeRect(8, 8, width - 16, height - 16);
      ctx.fillStyle = '#f8efd6';
      ctx.font = 'bold 47px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SAHİL', width / 2, height / 2);
    });
    const markerSpots = [-305, -170, -38, 104, 242, 363];
    const wood = new THREE.MeshStandardMaterial({ color: 0x937257, roughness: .92 });
    instanceBatch(THREE, group, new THREE.BoxGeometry(.2, 2.42, .2), wood, markerSpots.length, (pose, i) => {
      pose.position.set(416.6, 1.095, markerSpots[i]);
    });
    instanceBatch(THREE, group, new THREE.PlaneGeometry(2.65, .89),
      new THREE.MeshStandardMaterial({ map: markerMap, roughness: .79 }), markerSpots.length, (pose, i) => {
        pose.position.set(416.46, 2.02, markerSpots[i]);
        pose.rotation.y = -Math.PI / 2;
      });
  }

  function palmFrond(THREE) {
    const vertices = [], colors = [];
    const dark = new THREE.Color(0x477044), light = new THREE.Color(0x7c9653);
    function triangle(a, b, c, color) {
      vertices.push(...a, ...b, ...c);
      for (let index = 0; index < 3; index++) colors.push(color.r, color.g, color.b);
    }
    for (let index = 0; index < 16; index++) {
      const at = .15 + index * .052;
      const y = Math.sin(Math.PI * at) * .87 - at * at * .95;
      const x = at * 3.2;
      const span = Math.sin(at * Math.PI) * .52 + .05;
      for (const side of [-1, 1]) {
        const mid = [x + .22, y - .085, span * side * .55];
        const tip = [x + .64, y - .27 - at * .115, span * side];
        const color = (index % 3 === 0 ? light : dark).clone().multiplyScalar(.93 + .14 * at);
        triangle([x, y, 0], [x + .28, y - .08, span * side * .41], mid, color);
        triangle([x, y, 0], mid, tip, color);
        triangle(mid, [x + .29, y - .11, span * side * .63], tip, dark);
      }
    }
    for (let index = 0; index < 15; index++) {
      const at = index / 15, next = (index + 1) / 15;
      const a = Math.sin(Math.PI * at) * .87 - at * at * .95;
      const b = Math.sin(Math.PI * next) * .87 - next * next * .95;
      triangle([at * 3.2, a, -.028], [next * 3.2, b, -.01], [at * 3.2, a, .028], light);
      triangle([at * 3.2, a, .028], [next * 3.2, b, -.01], [next * 3.2, b, .01], light);
    }
    const shape = new THREE.BufferGeometry();
    shape.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    shape.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    shape.computeVertexNormals();
    return shape;
  }

  function palms(THREE, group) {
    const locations = [-450, -374, -308, -243, -150, -73, -19, 50, 133, 205, 279, 339, 406, 472];
    const next = randomSource(83);
    const sites = locations.map(z => ({ x: 419 + next() * 5.2, z, height: 5.3 + next() * 3.4, lean: next() - .65 }));
    const bark = texture(THREE, 128, 192, (ctx, width, height) => {
      ctx.fillStyle = '#8f7359';
      ctx.fillRect(0, 0, width, height);
      for (let y = 5; y < height; y += 12) {
        ctx.fillStyle = '#674f3e';
        ctx.fillRect(0, y, width, 2.2);
        ctx.fillStyle = '#baa187';
        ctx.fillRect(0, y + 2.3, width, 1.3);
      }
    });
    const stems = new THREE.MeshStandardMaterial({ map: bark, roughness: .91 });
    instanceBatch(THREE, group, new THREE.CylinderGeometry(.86, 1, 1, 7), stems, sites.length * 6, (pose, index) => {
      const site = sites[Math.floor(index / 6)], part = index % 6, fraction = (part + .5) / 6;
      const lean = site.lean * (fraction + fraction * fraction);
      pose.position.set(site.x + lean, - .103 + site.height * fraction, site.z + fraction * .36);
      const radius = .36 * .86 ** part;
      pose.scale.set(radius, site.height / 5.92, radius);
      pose.rotation.z = - site.lean * (.15 + fraction * .24);
    });
    const leaf = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, vertexColors: true, roughness: .95 });
    instanceBatch(THREE, group, palmFrond(THREE), leaf, sites.length * 10, (pose, index) => {
      const site = sites[Math.floor(index / 10)], fan = index % 10;
      pose.position.set(site.x + site.lean * 2, site.height - .13, site.z + .36);
      pose.rotation.y = fan * tau / 10 + site.lean;
      pose.rotation.z = (fan % 3) * .19 - .17;
      pose.scale.setScalar(.73 + (fan * 31 % 11) * .046);
    });
  }

  function beachSeating(THREE, group) {
    const next = randomSource(661);
    const spots = [-447, -394, -256, -214, -193, -133, -111, -45, 16, 69, 93, 147, 181, 221, 285, 315, 379, 432]
      .map(z => ({ x: 429.1 + 7 * next(), z, angle: (next() - .5) * .6 }));
    const canvas = new THREE.ConeGeometry(2.15, .78, 12, 1, true);
    const frame = new THREE.MeshStandardMaterial({ color: 0xf0e9d4, roughness: .65 });
    const shades = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .91 });
    const colors = [0xf1d0ab, 0xf0a34f, 0x55a5ad, 0xffdfb2, 0xd3725c, 0x826c9b].map(color => new THREE.Color(color));
    instanceBatch(THREE, group, canvas, shades, spots.length, (pose, index, batch) => {
      const seat = spots[index];
      pose.position.set(seat.x, 2.98, seat.z);
      pose.rotation.y = seat.angle;
      batch.setColorAt(index, colors[index % colors.length]);
    });
    instanceBatch(THREE, group, new THREE.CylinderGeometry(.051, .069, 2.94, 6), frame, spots.length, (pose, index) => {
      pose.position.set(spots[index].x, 1.39, spots[index].z);
    });
    const bed = new THREE.MeshStandardMaterial({ color: 0xe5cead, roughness: .85 });
    instanceBatch(THREE, group, new THREE.BoxGeometry(2.05, .24, .77), bed, spots.length * 2, (pose, index) => {
      const seat = spots[Math.floor(index / 2)];
      pose.position.set(seat.x - .62, .18, seat.z + (index % 2 ? -1.0 : 1.0));
      pose.rotation.y = seat.angle;
    });
  }

  function beachGrasses(THREE, group) {
    const blade = new THREE.BufferGeometry();
    blade.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, .102,0,0, .076,.48,.062, .094,.79,.13], 3));
    blade.setIndex([0, 1, 2, 0, 2, 3]);
    blade.computeVertexNormals();
    const leaf = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .99 });
    const next = randomSource(31419), colors = [0x958e52, 0xac9c59, 0x6f7a44].map(color => new THREE.Color(color));
    const clumps = Array.from({ length: 115 }, () => ({ x: 417 + next() * 6.1, z: -482 + next() * 964 }));
    instanceBatch(THREE, group, blade, leaf, clumps.length * 11, (pose, index, batch) => {
      const clump = clumps[Math.floor(index / 11)];
      pose.position.set(clump.x + (next() - .5) * .86, -.12, clump.z + (next() - .5) * .94);
      pose.scale.setScalar(.3 + next() * .96);
      pose.rotation.y = next() * tau;
      batch.setColorAt(index, colors[index % colors.length]);
    });
  }

  function create(THREE, scene) {
    const coast = new THREE.Group();
    coast.name = 'Güneşli Sahil';
    const sea = seawater(THREE);
    const sand = beachSurface(THREE);
    sand.name = 'Kumsal';
    sea.name = 'Açık deniz';
    coast.add(sand, sea);
    boardwalk(THREE, coast);
    beachGrasses(THREE, coast);
    palms(THREE, coast);
    beachSeating(THREE, coast);
    scene.add(coast);
    return {
      update(timeSeconds) {
        sea.material.uniforms.time.value = timeSeconds;
      },
    };
  }

  window.SehirSahili = { limitAt, waterLevel, waveHeightAt, create };
})();
