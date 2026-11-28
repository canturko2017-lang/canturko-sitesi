'use strict';

window.SehirBinalari = (() => {
  function texture(T, entrance) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ddd1bc';
    ctx.fillRect(0, 0, 512, 256);
    for (let y = 0; y < 256; y += 18) {
      ctx.fillStyle = y % 36 ? '#c6b8a3' : '#e9dfce';
      ctx.fillRect(0, y, 512, 1);
    }
    for (let row = 0; row < 5; row += 1) {
      const y = 18 + row * 46;
      ctx.fillStyle = '#eee3ce';
      ctx.fillRect(0, y - 11, 512, 5);
      for (let column = 0; column < 8; column += 1) {
        const x = 12 + column * 64;
        const door = entrance && row === 4 && (column === 3 || column === 4);
        const height = door ? 40 : 29;
        const windowGlass = ctx.createLinearGradient(x, y, x + 40, y + height);
        windowGlass.addColorStop(0, '#b4d6df');
        windowGlass.addColorStop(.47, '#587e8d');
        windowGlass.addColorStop(1, '#253e49');
        ctx.fillStyle = '#a99a83';
        ctx.fillRect(x - 2, y - 2, 44, height + 4);
        ctx.fillStyle = windowGlass;
        ctx.fillRect(x, y, 40, height);
        ctx.fillStyle = 'rgba(228,244,247,.29)';
        ctx.beginPath();
        ctx.moveTo(x, y + 11);
        ctx.lineTo(x + 24, y);
        ctx.lineTo(x + 35, y);
        ctx.lineTo(x, y + 26);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ecdfc8';
        ctx.fillRect(x + 18, y, 3, height);
        if (!door) ctx.fillRect(x, y + 10, 40, 2);
        ctx.fillRect(x - 3, y + height, 46, 3);
      }
    }
    const map = new T.CanvasTexture(canvas);
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = 8;
    return map;
  }

  function create(T, scene, reserved = () => false) {
    const surface = (color, properties = {}) => new T.MeshStandardMaterial({ color, roughness: .87, ...properties });
    const stone = surface(0xe2d5be);
    const roof = surface(0x6a5245);
    const sidewalk = surface(0xbab7ae);
    const asphalt = surface(0x41474a);
    const stripe = surface(0xe8d9af);
    const wall = surface(0xffffff, { map: texture(T, false) });
    const front = surface(0xffffff, { map: texture(T, true) });
    const balcony = surface(0xb3a48c);
    const railing = surface(0x56717a, { roughness: .26 });
    const hedge = surface(0x627f47);
    const trunk = surface(0x7b6050);
    const ground = surface(0x819071);
    const box = new T.BoxGeometry(1, 1, 1);
    const curb = new T.CylinderGeometry(.42, .66, 1, 8);
    const foliage = new T.IcosahedronGeometry(.6, 2);
    const batches = new Map();
    const transform = new T.Object3D();
    function piece(material, x, y, z, width, height, depth, geometry = box) {
      if (!batches.has(material)) batches.set(material, { geometry, matrices: [] });
      transform.position.set(x, y, z);
      transform.scale.set(width, height, depth);
      transform.updateMatrix();
      batches.get(material).matrices.push(transform.matrix.clone());
    }

    piece(ground, -50, -.2, 0, 920, .2, 960);
    for (let road = -400; road <= 400; road += 80) {
      piece(sidewalk, road, -.082, 0, 23.6, .14, 828);
      piece(sidewalk, 0, -.08, road, 823, .14, 23.6);
      piece(asphalt, road, -.04, 0, 20, .1, 820);
      piece(asphalt, 0, -.037, road, 817, .1, 20);
      for (let along = -385; along < 400; along += 8) {
        if (Math.abs(Math.round(along / 80) * 80 - along) < 12) continue;
        piece(stripe, road, .017, along, .18, .012, 3.3);
        piece(stripe, along, .02, road, 3.3, .012, .18);
      }
    }

    const buildings = [];
    for (let x = -360; x <= 360; x += 80) {
      for (let z = -360; z <= 360; z += 80) {
        if (reserved(x, z)) continue;
        // Repeat the same courtyard block across the city, including its street-facing entrance.
        piece(sidewalk, x, -.06, z, 55, .16, 52);
        piece(railing, x + 3, .027, z + 3, 49, .012, 46);
        piece(wall, x, 11.2, z, 48, 22.4, 45);
        piece(stone, x, .45, z, 48.35, .9, 45.35);
        // A thin panel keeps the horizontal UVs of the base block on the entrance facade.
        piece(front, x, 11.2, z + 22.53, 48, 22.4, .05);
        piece(stone, x, 22.3, z, 48.6, .56, 45.6);
        piece(roof, x, 22.72, z, 47.7, .54, 44.7);
        piece(stone, x, 23.2, z, 23, .5, 13);
        piece(roof, x, 23.62, z, 22.5, .35, 12.5);
        for (let floor = 1; floor <= 4; floor += 1) {
          const y = floor * 4.03 + 1.1;
          for (const side of [-1, 1]) {
            piece(balcony, x, y, z + side * 22.83, 44, .20, .9);
            piece(railing, x, y + .47, z + side * 23.24, 43.6, .64, .09);
            piece(balcony, x + side * 24.28, y, z, .82, .20, 41);
            piece(railing, x + side * 24.65, y + .47, z, .09, .64, 40.6);
          }
        }
        piece(roof, x, 3.3, z + 23.26, 11, .28, 2.35);
        for (const side of [-1, 1]) {
          piece(trunk, x + side * 28, 1.9, z + 24.5, 1, 3.8, 1, curb);
          piece(hedge, x + side * 28, 4.05, z + 24.5, 4.8, 4.2, 4.8, foliage);
        }
        buildings.push({ x, z, halfWidth: 24.7, halfDepth: 23.8 });
      }
    }

    for (const [material, { geometry, matrices }] of batches) {
      const batch = new T.InstancedMesh(geometry, material, matrices.length);
      matrices.forEach((matrix, index) => batch.setMatrixAt(index, matrix));
      batch.computeBoundingSphere();
      scene.add(batch);
    }
    return buildings;
  }

  return { create };
})();
