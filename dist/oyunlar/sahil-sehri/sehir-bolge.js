(() => {
  'use strict';

  function create(THREE, scene) {
    const district = new THREE.Group();
    district.name = 'Güneş Körfezi ve çöl mahallesi';
    scene.add(district);

    const bounds = [];
    const batches = new Map();
    const materials = new Map();
    const pose = new THREE.Object3D();
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const cactusStem = new THREE.CylinderGeometry(.43, .51, 1, 8);
    const stoneGeometry = new THREE.IcosahedronGeometry(.5, 0);
    const wingGeometry = new THREE.BufferGeometry();
    wingGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, -1.8, 11.6, .55, 2.7, 11.6, .55, 4.3,
      0, 0, -1.8, 11.6, .55, 4.3, 0, 0, 4.9
    ], 3));
    wingGeometry.computeVertexNormals();

    function material(color) {
      if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .82 }));
      return materials.get(color);
    }

    function instance(geometry, surface, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) {
      if (!batches.has(geometry)) batches.set(geometry, new Map());
      const group = batches.get(geometry);
      if (!group.has(surface)) group.set(surface, []);
      pose.position.set(x, y, z);
      pose.rotation.set(rx, ry, rz);
      pose.scale.set(w, h, d);
      pose.updateMatrix();
      group.get(surface).push(pose.matrix.clone());
    }

    function box(color, x, y, z, w, h, d, yaw = 0) {
      instance(unitBox, material(color), x, y, z, w, h, d, 0, yaw);
    }

    function solid(x, z, w, h, d) {
      bounds.push({ x, z, halfWidth: w / 2, halfDepth: d / 2, height: h });
    }

    let seed = 34119;
    function random() {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    function canvasMap(width, height, paint) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      paint(canvas.getContext('2d'));
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return map;
    }

    const sandMap = canvasMap(256, 256, ctx => {
      ctx.fillStyle = '#bf9b6e';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 3200; i++) {
        ctx.fillStyle = random() > .5 ? '#e5c697' : '#91734e';
        ctx.globalAlpha = .08 + random() * .24;
        ctx.fillRect(random() * 256, random() * 256, .35 + random() * 2.1, .35 + random() * 1.3);
      }
    });
    sandMap.wrapS = sandMap.wrapT = THREE.RepeatWrapping;
    sandMap.repeat.set(5, 5);
    const sand = new THREE.MeshStandardMaterial({ map: sandMap, roughness: 1 });
    const cactus = material(0x587653);
    const scrub = material(0x777949);
    const dryRock = material(0xa88b6a);

    function cactusAt(x, y, z, height) {
      instance(cactusStem, cactus, x, y + height * .48, z, .43, height * .96, .43);
      instance(stoneGeometry, cactus, x, y + height * .94, z, .45, .42, .45);
      for (const side of [-1, 1]) {
        const branchY = y + height * (side < 0 ? .58 : .4);
        instance(cactusStem, cactus, x + side * .32, branchY, z, .31, .58, .31, 0, 0, -.92 * side);
        instance(cactusStem, cactus, x + side * .55, branchY + .32, z, .26, .68, .26, 0, 0, -.12 * side);
        instance(stoneGeometry, cactus, x + side * .59, branchY + .65, z, .28, .36, .28);
      }
    }

    function yardDetails(x, z) {
      for (let i = 0; i < 22; i++) {
        const px = x + (random() - .5) * 54;
        const pz = z + (random() - .5) * 53;
        if (Math.abs(px - x) < 22 && Math.abs(pz - z) < 19) continue;
        const size = .36 + random() * .8;
        const low = i % 3 === 0;
        instance(stoneGeometry, low ? dryRock : scrub, px, size * .15, pz, size * 1.4, size * .56, size, 0, random() * 6.28);
      }
      cactusAt(x - 22, 0, z + 8, 2.35 + random() * 1.1);
      cactusAt(x + 24, 0, z - 17, 1.7 + random());
    }

    const peakedRoof = new THREE.BufferGeometry();
    peakedRoof.setAttribute('position', new THREE.Float32BufferAttribute([
      -.5, 0, -.5, .5, 0, -.5, 0, 1, -.5,
      .5, 0, .5, -.5, 0, .5, 0, 1, .5,
      -.5, 0, -.5, 0, 1, -.5, 0, 1, .5,
      -.5, 0, -.5, 0, 1, .5, -.5, 0, .5,
      0, 1, -.5, .5, 0, -.5, .5, 0, .5,
      0, 1, -.5, .5, 0, .5, 0, 1, .5
    ], 3));
    peakedRoof.computeVertexNormals();
    const terracotta = new THREE.MeshStandardMaterial({ color: 0xa45838, roughness: .92, side: THREE.DoubleSide });
    const paleFrame = 0xe5d3b6;
    const darkGlass = 0x3b5961;

    function bungalow(x, z, stucco, pitched) {
      const height = 4.45;
      box(0xbfaf98, x, .02, z, 19.6, .19, 15.5);
      box(stucco, x, height / 2 + .09, z, 18.2, height, 14.2);
      solid(x, z, 18.2, height + (pitched ? 2.6 : .7), 14.2);
      if (pitched) {
        instance(peakedRoof, terracotta, x, 4.55, z, 19.7, 2.55, 15.4);
        for (const side of [-1, 1]) box(0x9a543a, x + side * 9.75, 4.57, z, .27, .29, 15.45);
      } else {
        box(0x866659, x, 4.71, z, 19.05, .39, 14.98);
        box(0xe3c9a7, x, 4.98, z, 18.75, .22, 14.65);
      }
      const front = z + 7.11;
      box(0x694e40, x + 3.1, 1.35, front, 1.51, 2.64, .14);
      box(paleFrame, x + 3.1, 2.75, front + .01, 1.84, .2, .19);
      box(0xdbc39f, x + 3.1, .12, front + .75, 2.9, .24, 1.66);
      box(0x8b5c45, x + 3.1, 3.17, front + .89, 3.5, .22, 1.88);
      for (const side of [-1, 1]) box(0x7c6553, x + 3.1 + side * 1.53, 1.63, front + 1.65, .18, 3.12, .18);
      for (const offset of [-5.6, -.6, 6.5]) {
        box(paleFrame, x + offset, 2.45, front, 2.63, 1.73, .17);
        box(darkGlass, x + offset, 2.45, front + .1, 2.24, 1.41, .072);
        box(paleFrame, x + offset, 2.45, front + .145, .065, 1.43, .05);
        box(0xc1ad8a, x + offset, 1.53, front + .17, 2.76, .15, .26);
      }
      for (const side of [-1, 1]) {
        for (const offset of [-3.75, 2.1]) {
          box(paleFrame, x + side * 9.125, 2.44, z + offset, .19, 1.54, 2.15);
          box(darkGlass, x + side * 9.23, 2.44, z + offset, .06, 1.25, 1.8);
        }
      }
      box(0xcfc1a7, x + 3.1, .016, z + 12.67, 2.05, .054, 10.4);
    }

    const stuccos = [0xead6b8, 0xe4c09d, 0xc99873, 0xddc8b3];
    for (const x of [-360, -280, -200]) {
      for (const z of [200, 280, 360]) {
        instance(unitBox, sand, x, -.09, z, 57.1, .16, 57.1);
        yardDetails(x, z);
        if (x === -360 && z === 360) continue;
        bungalow(x - 12.2, z - 4, stuccos[Math.floor(random() * stuccos.length)], random() < .78);
        bungalow(x + 12.2, z + 4, stuccos[Math.floor(random() * stuccos.length)], random() < .56);
      }
    }

    function hillHeight(x, z) {
      const hump = Math.max(0, 1 - ((x + 363) / 22) ** 2 - ((z - 362) / 23) ** 2);
      const ridge = Math.max(0, 1 - ((x + 375) / 17) ** 2 - ((z - 371) / 17) ** 2);
      return hump ** 1.32 * 12.2 + ridge ** 2 * 3.35 + hump * Math.cos((x + z) * .52) * .37;
    }

    const hillGeometry = new THREE.PlaneGeometry(56, 56, 28, 28).rotateX(-Math.PI / 2);
    const hillPositions = hillGeometry.attributes.position;
    const hillColors = [];
    const hillColor = new THREE.Color();
    for (let i = 0; i < hillPositions.count; i++) {
      const x = -360 + hillPositions.getX(i);
      const z = 360 + hillPositions.getZ(i);
      const y = hillHeight(x, z);
      hillPositions.setY(i, y - .014);
      const band = .5 + .43 * Math.sin(y * 1.49 + x * .21) + random() * .08;
      hillColor.setHSL(.079 + y * .0007, .39, .39 + band * .16);
      hillColors.push(hillColor.r, hillColor.g, hillColor.b);
    }
    hillGeometry.setAttribute('color', new THREE.Float32BufferAttribute(hillColors, 3));
    hillGeometry.computeVertexNormals();
    const hill = new THREE.Mesh(hillGeometry, new THREE.MeshStandardMaterial({ map: sandMap, vertexColors: true, roughness: 1 }));
    hill.position.set(-360, .035, 360);
    district.add(hill);
    solid(-363, 362, 29, 13, 29);
    for (const [x, z, height] of [[-374, 368, 2.4], [-353, 362, 2.9], [-369, 344, 2.2], [-350, 351, 2.65]]) {
      cactusAt(x, hillHeight(x, z), z, height);
    }

    const hillSign = new THREE.Group();
    hillSign.position.set(-359, 12.75, 354.6);
    hillSign.rotation.y = 2.35;
    const hillMap = canvasMap(1024, 192, ctx => {
      ctx.font = '900 139px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 13;
      ctx.strokeStyle = '#3a3027';
      ctx.strokeText('GÜNEŞ TEPESİ', 512, 103, 977);
      ctx.fillStyle = '#fff5e2';
      ctx.fillText('GÜNEŞ TEPESİ', 512, 96, 977);
    });
    hillSign.add(new THREE.Mesh(new THREE.PlaneGeometry(24, 4.5), new THREE.MeshBasicMaterial({ map: hillMap, transparent: true, alphaTest: .42 })));
    for (const x of [-10, -5, 0, 5, 10]) {
      const post = new THREE.Mesh(unitBox, material(0x775b45));
      post.scale.set(.15, 7, .17);
      post.position.set(x, -4.02, -.08);
      hillSign.add(post);
    }
    district.add(hillSign);

    const pavementMap = canvasMap(256, 256, ctx => {
      ctx.fillStyle = '#f4f4f2';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 3600; i++) {
        ctx.fillStyle = i % 3 === 0 ? '#a0a2a0' : '#ffffff';
        ctx.globalAlpha = .16 + random() * .41;
        ctx.fillRect(random() * 256, random() * 256, .8 + random() * 1.8, .8 + random() * 1.3);
      }
    });
    pavementMap.wrapS = pavementMap.wrapT = THREE.RepeatWrapping;
    pavementMap.repeat.set(4, 4);
    const tarmac = new THREE.MeshStandardMaterial({ color: 0x383d40, map: pavementMap, roughness: .96 });
    const taxi = new THREE.MeshStandardMaterial({ color: 0x55595a, map: pavementMap, roughness: .96 });
    const apron = new THREE.MeshStandardMaterial({ color: 0x81817a, map: pavementMap, roughness: .96 });
    const yellow = 0xe4ba65;
    const white = 0xe3e6db;
    const runway = { x: 225, xLimit: 14, zMin: -413, zMax: -206, y: .12 };
    const helipad = { x: 278, z: -219, radius: 9.5, y: .15 };
    const flight = {
      airplane: { x: runway.x, y: runway.y, z: -222, yaw: 0 },
      helicopter: { x: helipad.x, y: helipad.y, z: helipad.z, yaw: 0 },
      runway,
      helipad,
    };
    const runwayLength = runway.zMax - runway.zMin;
    const runwayCenter = (runway.zMin + runway.zMax) / 2;
    const airportGround = 0x9b936d;
    box(airportGround, 292.7, -.027, -298.75, 198.4, .19, 192.2);
    box(airportGround, runway.x, -.032, -403.4, 37, .19, 24.6);
    instance(unitBox, tarmac, runway.x, runway.y - .04, runwayCenter, runway.xLimit * 2, .08, runwayLength);
    instance(unitBox, taxi, 256.5, .081, -299, 9, .079, 158);
    for (const z of [-369, -296, -230]) instance(unitBox, taxi, 245.5, .081, z, 13, .079, 9);
    instance(unitBox, taxi, 280.2, .081, -342.5, 38.4, .079, 12);
    instance(unitBox, apron, 344.9, .081, -343.7, 91, .079, 81.4);
    box(0xc1baaa, 326, .09, -287, 66, .15, 35);
    instance(unitBox, taxi, 320, .081, -236.8, 20, .079, 69.7);
    instance(unitBox, taxi, 369.5, .081, -240, 79, .079, 19.9);
    box(0xaaa89a, 352, .063, -252, 40, .079, 26);

    const sidewalk = 0xbebaaa;
    box(sidewalk, 283.4, .092, -239.3, 73.2, .048, 3.2);
    box(sidewalk, 246.2, .092, -230.4, 3.15, .048, 17.8);
    box(sidewalk, 242.95, .092, -221.5, 8, .048, 3.2);
    box(sidewalk, helipad.x, .092, -233.2, 3.2, .048, 12.2);
    for (let offset = -1.2; offset <= 1.21; offset += .6) {
      box(white, 256.5, .142, -239.3 + offset, 9, .015, .27);
      box(white, 246.2 + offset, .142, -230, .28, .015, 9);
    }

    const padSurface = new THREE.CylinderGeometry(helipad.radius, helipad.radius, .1, 48);
    instance(padSurface, tarmac, helipad.x, helipad.y - .05, helipad.z, 1, 1, 1);
    const padLine = new THREE.RingGeometry(helipad.radius - .7, helipad.radius - .46, 48).rotateX(-Math.PI / 2);
    instance(padLine, material(yellow), helipad.x, helipad.y + .022, helipad.z, 1, 1, 1);
    for (const side of [-1, 1]) box(white, helipad.x + side * 1.7, helipad.y + .014, helipad.z, .58, .016, 4.7);
    box(white, helipad.x, helipad.y + .015, helipad.z, 3.25, .018, .59);

    for (const side of [-1, 1]) {
      box(white, runway.x + side * 12.5, .14, runwayCenter, .22, .016, runwayLength - 4.1);
      for (let i = 0; i < 4; i++) {
        for (const z of [runway.zMin + 6.3, runway.zMax - 6.3]) {
          box(white, runway.x + side * (2.2 + i * 2.05), .14, z, .92, .016, 5.1);
        }
      }
    }
    for (let z = runway.zMin + 24; z <= runway.zMax - 24; z += 10.75) box(white, runway.x, .14, z, .47, .016, 5.15);
    for (const [text, z, rotation] of [['18', runway.zMin + 15.3, Math.PI], ['36', runway.zMax - 15.3, 0]]) {
      const map = canvasMap(256, 128, ctx => {
        ctx.fillStyle = '#dddcd2';
        ctx.font = '900 112px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(text, 128, 109);
      });
      const label = new THREE.Mesh(new THREE.PlaneGeometry(4.7, 2.8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: .45 }));
      label.position.set(runway.x, .15, z);
      label.rotation.y = rotation;
      district.add(label);
    }
    box(yellow, 256.5, .14, -299, .14, .015, 141.7);
    box(yellow, 281, .14, -342.5, 50, .016, .17);
    box(yellow, 341, .14, -357, 80, .015, .24);
    for (const x of [315, 343, 371]) {
      box(yellow, x, .14, -335.2, .18, .015, 38.8);
      box(white, x, .14, -315.7, 5.8, .015, .2);
    }
    for (let x = 334; x <= 370; x += 4.4) box(white, x, .137, -253, .11, .017, 10.5);
    for (let i = 0; i < 7; i++) box(white, 319, .14, -267.2 + i * .8, 8.5, .015, .39);

    const runwayLamp = new THREE.MeshBasicMaterial({ color: 0xbad8ff });
    const approachLamp = new THREE.MeshBasicMaterial({ color: 0x88e8b9 });
    const lampGeometry = new THREE.SphereGeometry(.21, 6, 4);
    for (let z = runway.zMin + 5.5; z <= runway.zMax - 3; z += 9.2) {
      for (const side of [-1, 1]) instance(lampGeometry, runwayLamp, runway.x + side * 14.5, .18, z, 1, 1, 1);
    }
    for (let z = -373; z <= -223; z += 9.2) {
      instance(lampGeometry, runwayLamp, 251.7, .18, z, .65, .65, .65);
    }
    for (const z of [runway.zMin + .65, runway.zMax - .65]) {
      for (let x = runway.x - 11; x <= runway.x + 11; x += 3.15) instance(lampGeometry, approachLamp, x, .17, z, 1, 1, 1);
    }
    for (let angle = Math.PI / 8; angle < Math.PI * 2; angle += Math.PI / 4) {
      const rim = helipad.radius - .36;
      instance(lampGeometry, approachLamp, helipad.x + Math.sin(angle) * rim, .22, helipad.z + Math.cos(angle) * rim, .6, .6, .6);
    }

    const terminalWhite = 0xe0ded3;
    box(0xf0ebdf, 326, 3.92, -287.5, 55, 7.55, 23.3);
    box(0x495962, 326, 7.88, -287.5, 56.9, .77, 24.85);
    box(terminalWhite, 326, 8.42, -287.5, 56.4, .31, 24.55);
    box(0x9ca9ad, 326, 8.7, -288.1, 47, .32, 12.7);
    box(0xadc5cc, 326, 8.95, -287.1, 40, .45, 5.7);
    solid(326, -287.5, 55, 9, 23.3);
    box(0x4e626c, 326, 5.3, -274.16, 55.15, .52, 5.55);
    box(0xc6cacc, 326, 5.67, -274.16, 55.2, .19, 5.68);
    const terminalGlass = 0x6f9ba7;
    for (let i = -8; i <= 8; i++) {
      const x = 326 + i * 3.05;
      box(terminalGlass, x, 3.51, -275.77, 2.8, 2.9, .11);
      box(0x9dbec3, x, 6.33, -275.772, 2.83, 1.21, .11);
      box(0xafb7ba, x - 1.52, 4.23, -275.54, .11, 5.98, .15);
      box(0x608490, x, 4.06, -299.18, 2.85, 4, .13);
      if (i % 3 === 0) box(0x8f9694, x, 2.48, -272.07, .27, 4.79, .31);
    }
    box(0x50727f, 320, 1.52, -275.665, 4.45, 2.98, .09);
    box(0xd4d8d4, 320, 1.51, -275.6, .09, 2.98, .065);
    for (const x of [317.78, 322.22]) box(0xb8c8c9, x, 1.54, -275.61, .15, 3.14, .09);
    for (const x of [314.3, 342.4]) {
      box(0xb6bdbf, x, 3.7, -310, 3.1, 2.2, 22.8);
      box(terminalGlass, x + 1.58, 3.95, -310, .11, 1.15, 21.8);
      box(0x8b8c87, x, 1.45, -317.9, .58, 2.9, .58);
    }

    const towerBase = new THREE.CylinderGeometry(1.25, 1.95, 18.6, 12);
    instance(towerBase, material(0xd0c4ae), 377, 9.3, -284, 1, 1, 1);
    instance(new THREE.CylinderGeometry(3.65, 3.2, 3.1, 8), material(0x527783), 377, 19.75, -284, 1, 1, 1);
    instance(new THREE.CylinderGeometry(4, 3.44, .48, 8), material(0xe0ddd0), 377, 21.6, -284, 1, 1, 1);
    box(0x605f5a, 377, 22.48, -284, .18, 1.66, .18);
    const beacon = new THREE.Mesh(lampGeometry, new THREE.MeshBasicMaterial({ color: 0xff9b6a }));
    beacon.position.set(377, 23.38, -284);
    district.add(beacon);
    solid(377, -284, 4.2, 21.85, 4.2);

    function banner(text, x, y, z, w, h, background, size) {
      const map = canvasMap(1024, 144, ctx => {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, 1024, 144);
        ctx.fillStyle = '#f4f1e3';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `700 ${size}px Arial, sans-serif`;
        ctx.fillText(text, 512, 75, 965);
      });
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map }));
      panel.position.set(x, y, z);
      district.add(panel);
    }

    banner('GÜNEŞ KÖRFEZİ HAVALİMANI', 326, 7.91, -275.045, 32, 1.75, '#425763', 75);
    box(0x315b61, 331, 2.8, -230, 13.18, 1.72, .24);
    for (const side of [-1, 1]) box(0x7b9090, 331 + side * 5.3, 1.62, -230, .15, 3.24, .15);
    banner('TERMİNAL  ↖', 331, 2.8, -229.87, 13.14, 1.66, '#315b61', 86);

    function boardingSign(title, x, z, width, yaw) {
      const rows = Array.isArray(title) ? title : [title];
      const height = rows.length > 1 ? 1.55 : .87;
      const y = 2.08;
      box(0x294a57, x, y, z, width, height, .15, yaw);
      for (const side of [-1, 1]) {
        const offset = side * (width / 2 - .34);
        box(0x718489, x + Math.cos(yaw) * offset, .93, z - Math.sin(yaw) * offset, .1, 1.86, .1);
      }
      const map = canvasMap(768, 224, ctx => {
        ctx.fillStyle = '#244858';
        ctx.fillRect(0, 0, 768, 224);
        ctx.strokeStyle = '#b6d7d4';
        ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, 748, 204);
        ctx.fillStyle = '#fffae9';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `700 ${rows.length > 1 ? 63 : 112}px Arial, sans-serif`;
        rows.forEach((row, index) => ctx.fillText(row, 384, (index + 1) * 224 / (rows.length + 1), 700));
      });
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(width - .025, height - .022), new THREE.MeshBasicMaterial({ map }));
      panel.position.set(x + .079 * Math.sin(yaw), y, z + .079 * Math.cos(yaw));
      panel.rotation.y = yaw;
      district.add(panel);
    }

    boardingSign(['←  UÇAK', '↙  HELİKOPTER'], 309, -248, 6.9, 0);
    boardingSign(['UÇAK  ↑', 'HELİKOPTER  ←'], 282.2, -244.7, 6.35, Math.PI / 2);
    boardingSign('UÇAK BİNİŞ  →', 244.6, -217.9, 5.75, Math.PI);
    boardingSign('HELİKOPTER BİNİŞ  →', 287.7, -227.7, 5.8, Math.PI);

    for (const x of [196, 390]) {
      for (let z = -388; z <= -222; z += 7.4) {
        if (z > -261 && z < -228 && x === 390) continue;
        box(0x817e6f, x, .78, z, .16, 1.54, .16);
        box(0x9a9785, x, 1.45, z + 3.7, .045, .065, 7.4);
        box(0x9a9785, x, .39, z + 3.7, .045, .065, 7.4);
      }
    }

    const bodyGeometry = new THREE.LatheGeometry([
      new THREE.Vector2(.01, -13.8), new THREE.Vector2(.66, -13.6), new THREE.Vector2(1.26, -12.88),
      new THREE.Vector2(1.7, -11.65), new THREE.Vector2(1.78, -9.55), new THREE.Vector2(1.76, 7.25),
      new THREE.Vector2(1.48, 9.55), new THREE.Vector2(.74, 12.06), new THREE.Vector2(.01, 13.24)
    ], 24).rotateX(Math.PI / 2);
    const tailGeometry = new THREE.BufferGeometry();
    tailGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, .9, 6.2, 0, 6.7, 11.24, 0, 6.42, 13.05,
      0, .9, 6.2, 0, 6.42, 13.05, 0, .55, 12.55
    ], 3));
    tailGeometry.computeVertexNormals();
    const engineGeometry = new THREE.CylinderGeometry(.89, 1, 2.6, 16).rotateX(Math.PI / 2);
    const tireGeometry = new THREE.CylinderGeometry(.32, .32, .19, 9).rotateZ(Math.PI / 2);
    const intakeGeometry = new THREE.CircleGeometry(.72, 15);
    const wingMaterial = new THREE.MeshStandardMaterial({ color: 0xc8caca, roughness: .52, side: THREE.DoubleSide });

    function plane(x, y, z, angle, color, scale = 1) {
      const group = new THREE.Group();
      const livery = material(color);
      const tailMaterial = new THREE.MeshStandardMaterial({ color, roughness: .57, side: THREE.DoubleSide });
      function part(geometry, surface, px, py, pz, w = 1, h = 1, d = 1) {
        const mesh = new THREE.Mesh(geometry, surface);
        mesh.position.set(px, py, pz);
        mesh.scale.set(w, h, d);
        group.add(mesh);
        return mesh;
      }
      part(bodyGeometry, material(0xecece5), 0, 0, 0);
      part(tailGeometry, tailMaterial, 0, 0, 0);
      for (const side of [-1, 1]) {
        part(wingGeometry, wingMaterial, 0, -.5, 0, side, 1, 1);
        part(wingGeometry, wingMaterial, 0, .48, 10, side * .4, .79, .33);
        part(engineGeometry, livery, side * 4.65, -.95, .5);
        const intake = part(intakeGeometry, material(0x293138), side * 4.65, -.95, -.804);
        intake.rotation.y = Math.PI;
        part(tireGeometry, material(0x2e3335), side * 1.58, -1.9, 2.6);
        const cockpit = part(unitBox, material(0x425b68), side * .69, .74, -13.12, .97, .49, .078);
        cockpit.rotation.set(-.42, side * -.4, side * -.08);
      }
      const windows = new THREE.InstancedMesh(unitBox, material(0x49616b), 28);
      let index = 0;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 14; i++) {
          pose.position.set(side * 1.685, .5, -8.9 + i * 1.15);
          pose.rotation.set(0, 0, 0);
          pose.scale.set(.085, .39, .31);
          pose.updateMatrix();
          windows.setMatrixAt(index++, pose.matrix);
        }
      }
      group.add(windows);
      part(tireGeometry, material(0x2e3335), 0, -1.89, -9.4);
      group.position.set(x, y, z);
      group.rotation.y = angle;
      group.scale.setScalar(scale);
      district.add(group);
      return group;
    }

    plane(315, 2.34, -330.8, Math.PI, 0x557b91);
    plane(371, 2.34, -334.7, Math.PI * .97, 0xb77a52);
    solid(315, -330.8, 5.5, 8.8, 27);
    solid(371, -334.7, 6, 8.8, 27);
    const airborne = plane(326, 35, -349, 0, 0x688e91, .94);

    for (const [geometry, group] of batches) {
      for (const [surface, matrices] of group) {
        const mesh = new THREE.InstancedMesh(geometry, surface, matrices.length);
        matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
        mesh.computeBoundingSphere();
        district.add(mesh);
      }
    }

    function update(timeSeconds) {
      const angle = timeSeconds * .13 - .5;
      airborne.position.set(326 + Math.cos(angle) * 23, 36 + 4 * Math.sin(angle * 2), -349 + Math.sin(angle) * 49);
      airborne.rotation.set(-.043 * Math.cos(angle * 2), Math.atan2(23 * Math.sin(angle), -49 * Math.cos(angle)), -.15);
      beacon.material.color.setHex(Math.sin(timeSeconds * 6.1) > .47 ? 0xffbc82 : 0x9e3e30);
    }

    return { bounds, flight, update };
  }

  window.SehirBolge = { create };
})();
