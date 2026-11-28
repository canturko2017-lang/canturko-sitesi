'use strict';

(() => {
  function palette(T) {
    const paint = (color, roughness = .4, metalness = .12, extra = {}) =>
      new T.MeshStandardMaterial({ color, roughness, metalness, ...extra });
    return {
      body: paint(0xffffff, .39, .22, { vertexColors: true }),
      ivory: paint(0xeeede4, .34, .24, { side: T.DoubleSide }),
      teal: paint(0x2d6676, .36, .27, { side: T.DoubleSide }),
      orange: paint(0xce652c, .39, .17, { side: T.DoubleSide }),
      black: paint(0x263037, .60, .16, { side: T.DoubleSide }),
      silver: paint(0xa4afb0, .37, .59),
      glazing: paint(0x284857, .18, .35, { side: T.DoubleSide }),
      glassTint: paint(0x7693a0, .25, .25, { side: T.DoubleSide }),
      rubber: paint(0x292c2e, .94),
      beaconRed: paint(0xab322a, .35, .14, { emissive: 0xec311d, emissiveIntensity: .07 }),
      beaconGreen: paint(0x338062, .38, .11, { emissive: 0x4bcaa5, emissiveIntensity: .07 }),
      beaconWhite: paint(0xc4d3ce, .25, .11, { emissive: 0xd8ecda, emissiveIntensity: .07 }),
    };
  }

  function builder(T) {
    const box = new T.BoxGeometry(1, 1, 1);
    const tube = new T.CylinderGeometry(1, 1, 1, 12);
    const sphere = new T.SphereGeometry(1, 13, 9);
    const yAxis = new T.Vector3(0, 1, 0);
    const buckets = new Map();

    function add(material, geometry, at = [0, 0, 0], size = [1, 1, 1], rotation = null) {
      let bucket = buckets.get(material);
      if (!bucket) {
        bucket = { positions: [], normals: [], colors: [], indices: [] };
        buckets.set(material, bucket);
      }
      const offset = bucket.positions.length / 3;
      const pose = new T.Matrix4().compose(new T.Vector3(...at), rotation || new T.Quaternion(), new T.Vector3(...size));
      const copy = geometry.clone().applyMatrix4(pose);
      const points = copy.getAttribute('position');
      for (const value of points.array) bucket.positions.push(value);
      for (const value of copy.getAttribute('normal').array) bucket.normals.push(value);
      const colors = copy.getAttribute('color');
      if (colors) for (const value of colors.array) bucket.colors.push(value);
      if (copy.index) {
        for (const value of copy.index.array) bucket.indices.push(offset + value);
      } else {
        for (let i = 0; i < points.count; i++) bucket.indices.push(offset + i);
      }
      copy.dispose();
      if (geometry !== box && geometry !== tube && geometry !== sphere) geometry.dispose();
    }

    function rod(material, from, to, radius) {
      const a = new T.Vector3(...from);
      const b = new T.Vector3(...to);
      const line = b.clone().sub(a);
      const rotation = new T.Quaternion().setFromUnitVectors(yAxis, line.clone().normalize());
      add(material, tube, a.lerp(b, .5).toArray(), [radius, line.length(), radius], rotation);
    }

    function cylinder(material, position, radius, width, axis) {
      const rotation = new T.Quaternion().setFromUnitVectors(yAxis, new T.Vector3(...axis));
      add(material, tube, position, [radius, width, radius], rotation);
    }

    function mesh(material, positions, indices, colors = null) {
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      if (indices) geometry.setIndex(indices);
      if (colors) geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
      geometry.computeVertexNormals();
      add(material, geometry);
    }

    function panel(material, corners) {
      const indices = [];
      for (let index = 1; index < corners.length - 1; index++) indices.push(0, index, index + 1);
      mesh(material, corners.flat(), indices);
    }

    function build(group) {
      for (const [material, batch] of buckets) {
        const geometry = new T.BufferGeometry();
        geometry.setAttribute('position', new T.Float32BufferAttribute(batch.positions, 3));
        geometry.setAttribute('normal', new T.Float32BufferAttribute(batch.normals, 3));
        if (batch.colors.length) geometry.setAttribute('color', new T.Float32BufferAttribute(batch.colors, 3));
        geometry.setIndex(batch.indices);
        geometry.computeBoundingSphere();
        group.add(new T.Mesh(geometry, material));
      }
      box.dispose();
      tube.dispose();
      sphere.dispose();
    }

    return {
      mesh, panel, rod, cylinder, build,
      box: (material, position, size) => add(material, box, position, size),
      ball: (material, position, size) => add(material, sphere, position, size),
    };
  }

  function fuselage(T, b, materials, stations, livery) {
    const sides = 28;
    const vertices = [], indices = [], colors = [];
    const shades = livery.map(color => new T.Color(color));
    const sample = new T.Color();
    const strips = [];
    for (let i = 0; i < stations.length - 1; i++) {
      const start = stations[i], end = stations[i + 1];
      const count = Math.max(1, Math.ceil((end[0] - start[0]) / .28));
      for (let part = 0; part < count; part++) strips.push(start.map((value, k) => T.MathUtils.lerp(value, end[k], part / count)));
    }
    strips.push(stations.at(-1));
    for (const [z, width, center, height] of strips) {
      for (let face = 0; face < sides; face++) {
        const theta = face / sides * Math.PI * 2;
        const plane = Math.sin(theta);
        vertices.push(width * Math.cos(theta), center + height * plane, z);
        const band = plane + .065 * Math.sin(z * 1.24) + Math.max(0, Math.min(.38, (z - 1.17) * .105));
        sample.copy(shades[0]).lerp(shades[1], 1 - T.MathUtils.smoothstep(band, -.44, -.24));
        const stripe = T.MathUtils.smoothstep(band, -.37, -.30) * (1 - T.MathUtils.smoothstep(band, -.23, -.145));
        sample.lerp(shades[2], stripe * .91);
        colors.push(sample.r, sample.g, sample.b);
      }
    }
    for (let i = 0; i < strips.length - 1; i++) {
      for (let side = 0; side < sides; side++) {
        const a = i * sides + side;
        const b = i * sides + (side + 1) % sides;
        indices.push(a, b, a + sides, b, b + sides, a + sides);
      }
    }
    for (let end = 0; end < 2; end++) {
      const offset = end ? (strips.length - 1) * sides : 0;
      for (let side = 1; side < sides - 1; side++) {
        if (end) indices.push(offset, offset + side, offset + side + 1);
        else indices.push(offset, offset + side + 1, offset + side);
      }
    }
    b.mesh(materials.body, vertices, indices, colors);

    function at(z) {
      const index = stations.findIndex(station => station[0] >= z);
      if (index <= 0) return (index < 0 ? stations.at(-1) : stations[0]).slice(1);
      const a = stations[index - 1], next = stations[index];
      const fraction = (z - a[0]) / (next[0] - a[0]);
      return a.slice(1).map((value, k) => T.MathUtils.lerp(value, next[k + 1], fraction));
    }
    return {
      at,
      surface(z, theta, lift = .022) {
        const [width, center, height] = at(z);
        return [(width + lift) * Math.cos(theta), center + (height + lift) * Math.sin(theta), z];
      },
    };
  }

  function wrappedWindow(b, model, material, zRange, fromAngle, toAngle, rounding = .070) {
    const columns = 6, rows = 4;
    const vertices = [], indices = [];
    for (let row = 0; row <= rows; row++) {
      const along = row / rows;
      const baseZ = zRange[0] + (zRange[1] - zRange[0]) * along;
      for (let column = 0; column <= columns; column++) {
        const across = column / columns;
        const angle = fromAngle + (toAngle - fromAngle) * across;
        const chamfer = (Math.pow(2 * across - 1, 4) * (1 - 2 * along)) * rounding;
        vertices.push(...model.surface(baseZ + chamfer, angle, .0265));
        if (row === rows || column === columns) continue;
        const a = row * (columns + 1) + column;
        const next = a + columns + 1;
        indices.push(a, next, a + 1, a + 1, next, next + 1);
      }
    }
    b.mesh(material, vertices, indices);
  }

  function wing(b, material, stations, side) {
    const vertices = [], indices = [];
    const outlines = stations.map(([x, y, front, back, thickness]) => {
      const at = ratio => front + (back - front) * ratio;
      return [
        [side * x, y, front], [side * x, y + .66 * thickness, at(.12)],
        [side * x, y + thickness, at(.34)], [side * x, y + .58 * thickness, at(.72)],
        [side * x, y + .006, back], [side * x, y - .34 * thickness, at(.60)],
        [side * x, y - .41 * thickness, at(.27)], [side * x, y - .16 * thickness, at(.075)],
      ];
    });
    const count = outlines[0].length;
    for (const outline of outlines) vertices.push(...outline.flat());
    for (let row = 0; row < outlines.length - 1; row++) {
      for (let column = 0; column < count; column++) {
        const a = row * count + column;
        const next = row * count + (column + 1) % count;
        if (side > 0) indices.push(a, next, a + count, next, next + count, a + count);
        else indices.push(a, a + count, next, next, a + count, next + count);
      }
    }
    const offset = (outlines.length - 1) * count;
    for (let i = 1; i < count - 1; i++) indices.push(offset, offset + i, offset + i + 1);
    b.mesh(material, vertices, indices);
  }

  function fin(b, face, material, thickness) {
    b.panel(material, face.map(([y, z]) => [thickness, y, z]));
    b.panel(material, face.map(([y, z]) => [-thickness, y, z]));
    for (let index = 0; index < face.length; index++) {
      const [y, z] = face[index];
      const [nextY, nextZ] = face[(index + 1) % face.length];
      b.panel(material, [[-thickness, y, z], [thickness, y, z], [thickness, nextY, nextZ], [-thickness, nextY, nextZ]]);
    }
  }

  function tire(b, materials, x, z, radius, width) {
    b.cylinder(materials.rubber, [x, radius, z], radius, width, [1, 0, 0]);
    for (const side of [-1, 1]) {
      b.cylinder(materials.silver, [x + side * (width / 2 + .018), radius, z], radius * .62, .034, [1, 0, 0]);
      b.cylinder(materials.black, [x + side * (width / 2 + .040), radius, z], radius * .28, .026, [1, 0, 0]);
    }
  }

  function rotor(T, parent, name, mount, axis, radius, count, tipColor, rate) {
    const pivot = new T.Group();
    pivot.name = name;
    pivot.position.set(...mount);
    parent.add(pivot);
    const pieces = new T.Group();
    const face = axis === 'y' ? 'horizontal' : axis === 'x' ? 'lateral' : 'forward';
    pivot.add(pieces);
    const black = new T.MeshStandardMaterial({ color: 0x272d2e, roughness: .52, side: T.DoubleSide });
    const bright = new T.MeshStandardMaterial({ color: tipColor, roughness: .43, side: T.DoubleSide });
    const hub = new T.MeshStandardMaterial({ color: 0xb2bab8, roughness: .27, metalness: .53 });
    function coordinates(radial, chord, depth) {
      if (face === 'horizontal') return [chord, depth, radial];
      if (face === 'lateral') return [depth, radial, chord];
      return [chord, radial, depth];
    }
    const b = builder(T);
    for (let blade = 0; blade < count; blade++) {
      const rotation = blade / count * Math.PI * 2;
      const axisVector = new T.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
      const rotate = (r, chord, depth) => new T.Vector3(...coordinates(r, chord, depth)).applyAxisAngle(axisVector, rotation).toArray();
      const root = radius * .12, middle = radius * .84, edge = radius * .94;
      const breadth = Math.min(.21, radius * .105);
      b.panel(black, [rotate(root, -.38 * breadth, 0), rotate(middle, -.56 * breadth, .016), rotate(edge, -.43 * breadth, .012),
        rotate(edge, .33 * breadth, -.014), rotate(middle, .53 * breadth, -.028), rotate(root, .39 * breadth, -.013)]);
      b.panel(bright, [rotate(edge, -.43 * breadth, .012), rotate(radius, -.39 * breadth, .003),
        rotate(radius, .13 * breadth, -.012), rotate(edge, .33 * breadth, -.014)]);
    }
    b.build(pieces);
    const hubBuilder = builder(T);
    const pinAxis = [axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0];
    hubBuilder.cylinder(hub, [0, 0, 0], Math.min(radius * .155, .245), Math.min(radius * .16, .265), pinAxis);
    if (axis === 'z') hubBuilder.ball(hub, [0, 0, -.13], [.186, .186, .253]);
    hubBuilder.build(pivot);

    const uniforms = { visibility: { value: 0 }, phase: { value: 0 }, segments: { value: count } };
    const blur = new T.Mesh(new T.CircleGeometry(radius * 1.006, 44), new T.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, side: T.DoubleSide,
      vertexShader: `
        varying vec2 discUV;
        void main(){ discUV=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
      `,
      fragmentShader: `
        varying vec2 discUV;
        uniform float visibility, phase, segments;
        void main(){
          vec2 p=(discUV-.5)*2.0;
          float r=length(p);
          float angle=atan(p.y,p.x);
          float burst=pow(.50+.50*sin(angle*segments-phase),2.5);
          float ring=exp(-pow((r-.93)*13.0,2.0));
          float alpha=(.036+.135*burst+.095*ring)*visibility*(1.0-smoothstep(.91,1.0,r))*smoothstep(.08,.28,r);
          gl_FragColor=vec4(mix(vec3(.230,.281,.294),vec3(.850,.873,.769),ring*.54),alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    }));
    if (axis === 'y') blur.rotation.x = -Math.PI / 2;
    if (axis === 'x') blur.rotation.y = Math.PI / 2;
    blur.name = `${name} hareket izi`;
    blur.visible = false;
    pivot.add(blur);
    let phase = 0;
    let spool = 0;
    let lastTime;
    function update(time, power, active) {
      if (!Number.isFinite(time)) return;
      const elapsed = lastTime === undefined ? 0 : T.MathUtils.clamp(time - lastTime, 0, .14);
      lastTime = time;
      const target = active ? .31 + .69 * T.MathUtils.clamp(power, 0, 1) : 0;
      const easing = 1 - Math.exp(-elapsed * (active ? 4.6 : 2.1));
      spool += (target - spool) * easing;
      phase = (phase + spool * rate * elapsed) % (Math.PI * 2);
      pieces.rotation[axis] = phase;
      pieces.visible = spool < .57;
      // Opposite phase shift avoids drawing the blurred rotor as a motionless disc.
      uniforms.phase.value = phase * count * .65;
      uniforms.visibility.value = T.MathUtils.smoothstep(spool, .27, .69);
      blur.visible = uniforms.visibility.value > .005;
    }
    return update;
  }

  function makeAirplane(T, scene) {
    const group = new T.Group();
    group.name = 'Kıyı yolcu uçağı';
    const m = palette(T), b = builder(T);
    const model = fuselage(T, b, m, [
      [-5.06, .294, 2.075, .299], [-4.83, .430, 2.095, .443], [-4.40, .541, 2.111, .512],
      [-3.88, .661, 2.16, .592], [-3.28, .822, 2.167, .757], [-2.52, .932, 2.126, .895],
      [-1.70, .977, 2.096, .960], [-.92, .996, 2.088, .958], [.15, .990, 2.079, .931],
      [1.40, .948, 2.081, .883], [2.40, .789, 2.102, .717], [3.30, .543, 2.167, .519],
      [4.14, .361, 2.248, .360], [4.88, .217, 2.336, .229], [5.29, .083, 2.383, .106],
    ], [0xeaece4, 0x315c68, 0xcf5d2d]);
    for (const side of [-1, 1]) {
      const angle = radians => side > 0 ? radians : Math.PI - radians;
      wrappedWindow(b, model, m.glazing, [-3.68, -2.57], angle(.348), angle(1.315), .09);
      wrappedWindow(b, model, m.glassTint, [-2.38, -1.70], angle(.314), angle(.81), .063);
      for (const z of [-1.47, -.66, .16, .95]) wrappedWindow(b, model, m.glazing, [z, z + .586], angle(.255), angle(.72), .086);
      const seam = [[-.08, .13], [.96, .13], [.96, -.78], [-.08, -.78], [-.08, .13]].map(([z, theta]) => model.surface(z, angle(theta), .033));
      for (let i = 0; i < seam.length - 1; i++) b.rod(m.black, seam[i], seam[i + 1], .013);
      b.rod(m.silver, model.surface(.75, angle(-.10), .043), model.surface(.90, angle(-.10), .043), .024);

      wing(b, m.ivory, [[.70, 2.910, -2.03, .73, .226], [1.72, 2.922, -1.99, .663, .207],
        [3.82, 3.008, -1.84, .454, .174], [6.30, 3.124, -1.41, .20, .113]], side);
      wing(b, m.orange, [[6.29, 3.125, -1.41, .198, .112], [6.64, 3.144, -1.34, .103, .09], [6.77, 3.154, -1.27, -.002, .055]], side);
      b.rod(m.silver, [side * .744, 1.412, -.54], [side * 3.55, 2.923, -.70], .065);
      b.rod(m.silver, [side * .79, 1.426, .041], [side * 3.55, 2.929, -.665], .038);
      b.rod(m.black, [side * 1.41, 3.018, .36], [side * 5.87, 3.183, -.12], .017);
      b.ball(side < 0 ? m.beaconRed : m.beaconGreen, [side * 6.73, 3.198, -1.049], [.103, .063, .079]);
      wing(b, m.teal, [[.16, 2.349, 3.68, 5.21, .094], [1.24, 2.386, 3.92, 5.28, .070], [2.13, 2.407, 4.16, 5.31, .043]], side);
      b.rod(m.silver, [side * .582, 1.25, .382], [side * 1.446, .359, .452], .107);
      b.rod(m.silver, [side * .541, 1.195, .89], [side * 1.42, .398, .459], .073);
      tire(b, m, side * 1.446, .452, .413, .237);
    }

    const divider = [-3.58, -3.31, -3.03, -2.70].map(z => model.surface(z, Math.PI / 2, .037));
    for (let i = 0; i < divider.length - 1; i++) b.rod(m.ivory, divider[i], divider[i + 1], .033);
    fin(b, [[2.355, 3.26], [2.712, 3.54], [4.259, 4.36], [4.342, 4.82], [4.09, 5.01], [2.416, 5.28]], m.teal, .067);
    fin(b, [[3.757, 4.17], [4.259, 4.36], [4.342, 4.82], [4.09, 5.01], [3.724, 5.067]], m.orange, .072);
    b.rod(m.silver, [0, 1.65, -3.315], [0, .285, -3.777], .086);
    b.rod(m.silver, [-.095, .88, -3.605], [-.146, .31, -3.77], .061);
    b.rod(m.silver, [.095, .88, -3.605], [.146, .31, -3.77], .061);
    tire(b, m, 0, -3.777, .297, .201);
    b.ball(m.beaconWhite, [0, 4.366, 4.67], [.079, .074, .084]);
    b.ball(m.beaconWhite, [0, 1.83, -4.973], [.156, .068, .06]);
    b.rod(m.black, [-.476, 1.647, -4.68], [-.541, 1.609, -3.97], .047);
    b.rod(m.silver, [0, 3.067, -1.46], [0, 3.325, -1.342], .023);
    b.build(group);

    const prop = rotor(T, group, 'Uçağın burun pervanesi', [0, 2.085, -5.202], 'z', 1.31, 3, 0xe3a44b, 94);
    scene.add(group);
    return {
      group, boarding: new T.Vector3(-1.41, 0, .42), radius: 3.5,
      update(time, power = 0, active = false) {
        prop(time, power, active);
        m.beaconRed.emissiveIntensity = active ? .89 : .08;
        m.beaconGreen.emissiveIntensity = active ? .90 : .08;
        m.beaconWhite.emissiveIntensity = active ? .25 + Math.pow(Math.max(0, Math.cos(time * 3.5)), 18) * 1.3 : .06;
      },
    };
  }

  function makeHelicopter(T, scene) {
    const group = new T.Group();
    group.name = 'Kıyı hizmet helikopteri';
    const m = palette(T), b = builder(T);
    const model = fuselage(T, b, m, [
      [-3.84, .16, 1.78, .20], [-3.63, .57, 1.83, .514], [-3.33, .84, 1.89, .71],
      [-2.96, 1.037, 1.914, .879], [-2.53, 1.14, 1.964, .979], [-1.98, 1.176, 2.006, .997],
      [-1.25, 1.204, 1.996, 1.017], [-.46, 1.235, 2.002, 1.003], [.33, 1.194, 2.003, .973],
      [1.01, 1.123, 2.015, .902], [1.62, .917, 2.031, .748], [2.14, .592, 2.109, .518],
      [2.63, .435, 2.18, .384], [3.40, .343, 2.303, .301], [4.31, .267, 2.472, .237],
      [5.34, .192, 2.642, .196], [6.02, .121, 2.751, .153],
    ], [0xe3ddc9, 0x215c63, 0xe17c2e]);
    for (const side of [-1, 1]) {
      const angle = radians => side > 0 ? radians : Math.PI - radians;
      wrappedWindow(b, model, m.glazing, [-3.63, -2.29], angle(-.08), angle(1.47), .099);
      wrappedWindow(b, model, m.glazing, [-2.20, -1.16], angle(-.045), angle(.851), .082);
      wrappedWindow(b, model, m.glassTint, [-1.03, -.19], angle(.067), angle(.715), .085);
      wrappedWindow(b, model, m.glazing, [-.02, .83], angle(.071), angle(.695), .082);
      const seam = [[-1.12, .82], [.974, .82], [.974, -.69], [-1.12, -.69], [-1.12, .82]].map(([z, a]) => model.surface(z, angle(a), .031));
      for (let i = 0; i < seam.length - 1; i++) b.rod(m.black, seam[i], seam[i + 1], .015);
      b.rod(m.silver, model.surface(.81, angle(-.14), .040), model.surface(.96, angle(-.14), .04), .022);
      b.rod(m.silver, [side * .593, 1.23, -1.66], [side * 1.273, .098, -1.73], .090);
      b.rod(m.silver, [side * .663, 1.24, .88], [side * 1.283, .098, .99], .090);
      b.rod(m.black, [side * 1.28, .090, -2.39], [side * 1.28, .090, 2.251], .090);
      b.rod(m.black, [side * 1.28, .090, -2.39], [side * 1.277, .147, -2.83], .086);
      b.rod(m.black, [side * 1.277, .147, -2.83], [side * 1.264, .342, -3.10], .078);
      b.rod(m.silver, [side * 1.289, .360, -.967], [side * 1.289, .354, .93], .037);
      wing(b, m.teal, [[.177, 2.61, 4.46, 5.47, .061], [.84, 2.64, 4.64, 5.47, .044], [1.21, 2.68, 4.8, 5.41, .028]], side);
      b.ball(side < 0 ? m.beaconRed : m.beaconGreen, model.surface(.63, angle(-.092), .062), [.083, .059, .091]);
      b.ball(m.black, [side * .63, 2.989, .228], [.22, .116, .56]);
      b.rod(m.silver, [side * .513, 3.063, .56], [side * .392, 3.079, .98], .056);
    }

    const cap = [-3.58, -3.32, -3.00, -2.63, -2.33].map(z => model.surface(z, Math.PI / 2, .036));
    for (let i = 0; i < cap.length - 1; i++) b.rod(m.ivory, cap[i], cap[i + 1], .032);
    fin(b, [[2.654, 5.16], [3.755, 5.64], [3.723, 6.016], [2.772, 6.129]], m.teal, .069);
    fin(b, [[3.436, 5.497], [3.755, 5.64], [3.723, 6.016], [3.438, 6.046]], m.orange, .073);
    b.rod(m.black, [0, 2.660, 5.79], [0, 1.991, 6.08], .058);
    b.rod(m.silver, [0, 3.007, -.53], [0, 3.716, -.48], .129);
    b.ball(m.teal, [0, 3.06, -.48], [.441, .216, .644]);
    b.ball(m.beaconWhite, [0, 3.778, 5.816], [.074, .065, .070]);
    b.ball(m.beaconWhite, [0, 1.432, -3.475], [.163, .086, .082]);
    b.build(group);

    const spin = rotor(T, group, 'Helikopter ana rotoru', [0, 3.713, -.478], 'y', 5.49, 3, 0xf4d16b, 66);
    const tailSpin = rotor(T, group, 'Helikopter kuyruk rotoru', [.261, 2.917, 5.787], 'x', .826, 2, 0xe8af48, 113);
    scene.add(group);
    return {
      group, boarding: new T.Vector3(-1.53, 0, .07), radius: 3.30,
      update(time, power = 0, active = false) {
        spin(time, power, active);
        tailSpin(time, power, active);
        m.beaconRed.emissiveIntensity = active ? .86 : .08;
        m.beaconGreen.emissiveIntensity = active ? .91 : .08;
        m.beaconWhite.emissiveIntensity = active ? .27 + Math.pow(Math.max(0, Math.sin(time * 4.8)), 16) * 1.3 : .07;
      },
    };
  }

  function create(THREE, scene) {
    return { airplane: makeAirplane(THREE, scene), helicopter: makeHelicopter(THREE, scene) };
  }

  window.SehirHavaAraclari = { create };
})();
