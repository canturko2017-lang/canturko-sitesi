'use strict';

(() => {
  const cityWest = -1390;
  const cityEnd = 1250;
  const baseLand = -.115;
  const coastWidth = 128;

  const smooth = (start, end, value) => {
    const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
    return t * t * (3 - 2 * t);
  };

  function create(THREE, scene, shore) {
    const world = new THREE.Group();
    world.name = 'Uzak kara ve deniz';
    scene.add(world);
    const seaLevel = shore.waterLevel;

    function shoreX(z) {
      const distance = Math.abs(z) - cityEnd;
      const bends = 410 * Math.sin((z - 300) * .00057) + 230 * Math.sin(z * .00145 + .2);
      return shore.limitAt(z) + smooth(0, 1800, distance) * bends;
    }

    function heightAt(x, z) {
      const inland = shoreX(z) - x;
      if (inland < 0) return seaLevel;
      const beyondCity = Math.max(cityWest - x, Math.abs(z) - cityEnd);
      const fade = smooth(40, 850, beyondCity) * smooth(125, 930, inland);
      const hills = 13 + 6.7 * Math.sin(x * .00123 + z * .00052 + .7) +
        4.6 * Math.sin(-x * .00077 + z * .00139 - 1.1) + 3.3 * Math.cos(x * .00186 + z * .0012);
      return baseLand + fade * hills;
    }

    // The first part of coastX agrees with the high-detail beach in sehir-sahili.js.
    const shoreline = `
      const float cityWest = ${cityWest.toFixed(1)};
      const float cityEnd = ${cityEnd.toFixed(1)};
      float originalCoastX(float z) {
        return 455.0 + 7.0 * sin(z * .012 + .62) + 3.0 * sin(z * .029 - .81);
      }
      float coastX(float z) {
        float bends = 410.0 * sin((z - 300.0) * .00057) + 230.0 * sin(z * .00145 + .2);
        return originalCoastX(z) + smoothstep(0.0, 1800.0, abs(z) - cityEnd) * bends;
      }
      float outerCity(vec2 p) { return max(cityWest - p.x, abs(p.y) - cityEnd); }
    `;
    const landGeometry = new THREE.PlaneGeometry(2, 2, 112, 112).rotateX(-Math.PI / 2);
    const vertices = landGeometry.attributes.position;
    function concentrate(coordinate) {
      return coordinate * (.28 + .72 * coordinate * coordinate);
    }
    for (let index = 0; index < vertices.count; index++) {
      vertices.setX(index, concentrate(vertices.getX(index)));
      vertices.setZ(index, concentrate(vertices.getZ(index)));
    }

    const ground = new THREE.MeshStandardMaterial({ color: 0x819071, roughness: .87, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
    ground.onBeforeCompile = shader => {
      const sandGrain = new THREE.Color(0xddd5c1);
      shader.uniforms.inlandSandColor = { value: new THREE.Color(0xe1cb9c).multiply(sandGrain) };
      shader.uniforms.drySandColor = { value: new THREE.Color(0xffe2a8).multiply(sandGrain) };
      shader.uniforms.wetSandColor = { value: new THREE.Color(0xb18d64).multiply(sandGrain) };
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `
        #include <common>
        varying vec2 landXZ;
        ${shoreline}
        float terrainAt(vec2 p) {
          float inland = coastX(p.y) - p.x;
          float fade = smoothstep(40.0, 850.0, outerCity(p)) * smoothstep(125.0, 930.0, inland);
          float hills = 13.0 + 6.7 * sin(p.x * .00123 + p.y * .00052 + .7)
            + 4.6 * sin(-p.x * .00077 + p.y * .00139 - 1.1) + 3.3 * cos(p.x * .00186 + p.y * .0012);
          return ${baseLand} + fade * hills;
        }
      `).replace('#include <beginnormal_vertex>', `
        #include <beginnormal_vertex>
        landXZ = (modelMatrix * vec4(position, 1.0)).xz;
        float landY = terrainAt(landXZ);
        vec2 slope = (vec2(terrainAt(landXZ + vec2(12.0, 0.0)), terrainAt(landXZ + vec2(0.0, 12.0))) - landY) / 12.0;
        objectNormal = vec3(-slope.x * modelMatrix[0][0], 1.0, -slope.y * modelMatrix[2][2]);
      `).replace('#include <begin_vertex>', `
        #include <begin_vertex>
        transformed.y += landY;
      `);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
        #include <common>
        varying vec2 landXZ;
        uniform vec3 inlandSandColor, drySandColor, wetSandColor;
        ${shoreline}
      `).replace('#include <color_fragment>', `
        #include <color_fragment>
        float coastline = coastX(landXZ.y);
        float shoreDistance = coastline - landXZ.x;
        if (shoreDistance < 0.0 || (abs(landXZ.y) < cityEnd - 1.35 && landXZ.x > cityWest + 1.35)) discard;
        float textureWeight = smoothstep(7.0, 490.0, outerCity(landXZ));
        float distanceFade = 1.0 - smoothstep(800.0, 5600.0, distance(cameraPosition.xz, landXZ));
        float patches = sin(landXZ.x * .011 + landXZ.y * .008 + 1.9 * sin(landXZ.y * .0017))
          * cos(landXZ.y * .006 - landXZ.x * .008);
        float largeFields = sin(landXZ.y * .0035 + 1.7 * sin(landXZ.x * .0023));
        vec3 country = diffuseColor.rgb * (vec3(1.0) + vec3(.082, .143, .074) * largeFields);
        country *= 1.0 + .086 * patches * distanceFade;
        diffuseColor.rgb = mix(diffuseColor.rgb, country, textureWeight);
        float beachStart = 410.0 + coastline - originalCoastX(landXZ.y);
        float continuousBeach = smoothstep(beachStart, beachStart + 1.3, landXZ.x);
        float widerCoast = 1.0 - smoothstep(13.0, 51.0, shoreDistance);
        float shoreSand = mix(continuousBeach, widerCoast, smoothstep(26.0, 330.0, abs(landXZ.y) - cityEnd));
        vec3 sand = mix(wetSandColor, drySandColor, smoothstep(1.0, 7.0, shoreDistance));
        sand = mix(sand, inlandSandColor, smoothstep(16.0, 48.0, shoreDistance));
        diffuseColor.rgb = mix(diffuseColor.rgb, sand, shoreSand);
      `);
    };

    const land = new THREE.Mesh(landGeometry, ground);
    land.frustumCulled = false;
    world.add(land);

    const time = { value: 0 };
    const seaMaterial = new THREE.ShaderMaterial({
      fog: true,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        time,
        seaY: { value: seaLevel },
        shallows: { value: new THREE.Color(0x75c8c0) },
        teal: { value: new THREE.Color(0x188faf) },
        blue: { value: new THREE.Color(0x17669b) },
        sky: { value: new THREE.Color(0x96c7e6) },
      },
      vertexShader: `
        #include <fog_pars_vertex>
        varying vec2 seaXZ;
        void main() {
          seaXZ = (modelMatrix * vec4(position, 1.0)).xz;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: `
        #include <fog_pars_fragment>
        uniform float time, seaY;
        uniform vec3 shallows, teal, blue, sky;
        varying vec2 seaXZ;
        ${shoreline}
        void main() {
          vec2 p = seaXZ;
          float depth = p.x - coastX(p.y);
          if (depth < -.8 || (abs(p.y) < cityEnd && depth < ${coastWidth.toFixed(1)})) discard;
          float a = dot(p, vec2(.38, .14)) + time * 1.14;
          float b = dot(p, vec2(-.26, .41)) - time * .84;
          float c = dot(p, vec2(1.32, .62)) + time * 1.62;
          float d = dot(p, vec2(-1.74, 1.24)) - time * 1.02;
          vec3 view = cameraPosition - vec3(p.x, seaY, p.y);
          float distanceToCamera = length(view);
          vec3 viewDirection = view / max(.001, distanceToCamera);
          float outsideWater = max(abs(p.y) - cityEnd, depth - 1450.0);
          float filterWeight = smoothstep(18.0, 325.0, outsideWater);
          float swellDetail = 1.0 - filterWeight * smoothstep(150.0, 1300.0, distanceToCamera);
          float rippleDetail = 1.0 - filterWeight * smoothstep(85.0, 375.0, distanceToCamera);
          vec3 normal = normalize(vec3(
            (cos(a) * .11 - cos(b) * .089) * swellDetail + (cos(c) * .055 - cos(d) * .043) * rippleDetail,
            1.0,
            (cos(a) * .058 + cos(b) * .135) * swellDetail + (cos(c) * .052 + cos(d) * .04) * rippleDetail
          ));
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
          vec3 seaFloor = mix(vec3(.39, .34, .19), vec3(.11, .22, .19), smoothstep(7.0, 67.0, depth));
          sea = mix(seaFloor, sea, opacity);
          gl_FragColor = vec4(sea, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }
      `,
    });
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), seaMaterial);
    sea.position.y = seaLevel - .265;
    sea.frustumCulled = false;
    world.add(sea);

    // Extend the seabed below the join so oblique views through the old shallow water cannot see sky.
    const bedPositions = [], bedColors = [], bedIndices = [];
    const bedProfile = [
      [-1.2, -.49, 0xb18d64], [1.8, -.5, 0xb18d64], [5, -1.2, 0xb3a77f],
      [13, -2.7, 0xb3a77f], [31, -5.8, 0x46706c], [63, -9.3, 0x46706c], [128, -14, 0x46706c],
    ];
    const grain = new THREE.Color(0xddd5c1);
    for (const end of [-1, 1]) {
      for (let row = 0; row <= 16; row++) {
        const z = end * (cityEnd - 2 + 4 * row);
        for (const [column, [depth, y, color]] of bedProfile.entries()) {
          const first = bedPositions.length / 3;
          const next = first + bedProfile.length;
          bedPositions.push(shoreX(z) + depth, y - .025, z);
          const bedColor = new THREE.Color(color).multiply(grain);
          bedColors.push(bedColor.r, bedColor.g, bedColor.b);
          if (row === 16 || column === bedProfile.length - 1) continue;
          if (end > 0) bedIndices.push(first, next, first + 1, first + 1, next, next + 1);
          else bedIndices.push(first, first + 1, next, first + 1, next + 1, next);
        }
      }
    }
    const bedGeometry = new THREE.BufferGeometry();
    bedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bedPositions, 3));
    bedGeometry.setAttribute('color', new THREE.Float32BufferAttribute(bedColors, 3));
    bedGeometry.setIndex(bedIndices);
    bedGeometry.computeVertexNormals();
    scene.add(new THREE.Mesh(bedGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .965 })));

    function update(cameraPosition, fogFar = 740, elapsed = time.value) {
      const radius = Math.ceil(Math.max(1350, fogFar * 2.25) / 64) * 64;
      world.position.x = Math.round(cameraPosition.x / 32) * 32;
      world.position.z = Math.round(cameraPosition.z / 32) * 32;
      land.scale.set(radius, 1, radius);
      sea.scale.set(radius, 1, radius);
      time.value = elapsed;
    }

    update(new THREE.Vector3());
    return { update, heightAt };
  }

  window.SehirUzakDunya = { create };
})();
