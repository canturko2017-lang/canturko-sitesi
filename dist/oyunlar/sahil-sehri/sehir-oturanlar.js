'use strict';

window.SehirOturanlar = (() => {
  // Two locations match the existing central parasol loungers in sehir-sahili.js.
  const loungeSpots = [
    { x: 431.466985 - .62, z: -44, angle: -.220903 },
    { x: 433.508200 - .62, z: 15, angle: -.246899 },
  ];
  const visitors = [
    { seat: 'lounger', spot: loungeSpots[0], skin: 0xad785a, hair: 0x292221, shirt: 0x397281, shorts: 0x354753, phase: .5 },
    { seat: 'towel', x: 430.0, z: -11.8, yaw: 1.12, skin: 0xd6ad92, hair: 0x63422d, shirt: 0xead6ad, shorts: 0x478183, fabric: 0x2c8b86, phase: 2.3 },
    { seat: 'chair', x: 433.4, z: 3.6, yaw: 1.83, skin: 0x9b6346, hair: 0x2d2520, shirt: 0xe09d71, shorts: 0x475568, fabric: 0x3a7e93, drink: true, phase: 1.1 },
    { seat: 'lounger', spot: loungeSpots[1], skin: 0xbe8e70, hair: 0x463029, shirt: 0x53517b, shorts: 0xd3cab0, phase: 3.2 },
    { seat: 'towel', x: 437.1, z: 28.6, yaw: 1.32, skin: 0x835641, hair: 0x2d231e, shirt: 0x9e665c, shorts: 0xd8b277, fabric: 0xaa4f4d, phase: 4.7 },
    { seat: 'chair', x: 433.0, z: 41.5, yaw: 1.04, skin: 0xc79b7f, hair: 0x564133, shirt: 0x557963, shorts: 0x55575d, fabric: 0xc08c4c, phase: 5.8 },
  ];

  function create(T, scene, shore) {
    const group = new T.Group();
    group.name = 'Kumsalda oturanlar';
    scene.add(group);

    const egg = new T.SphereGeometry(1, 14, 10);
    const crown = new T.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI * .58);
    const box = new T.BoxGeometry(1, 1, 1);
    const tapered = new T.CylinderGeometry(.78, 1, 1, 9);
    const tube = new T.CylinderGeometry(1, 1, 1, 9);
    const shadow = new T.CircleGeometry(1, 20);
    const material = (color, roughness = .78) => new T.MeshStandardMaterial({ color, roughness });
    const aluminium = material(0xc7c4b4, .48);
    const bottlePaint = material(0x83afa9, .43);
    const cap = material(0x31544d, .58);
    const shade = new T.MeshBasicMaterial({ color: 0x3b3528, transparent: true, opacity: .16, depthWrite: false });
    const up = new T.Vector3(0, 1, 0);
    const axis = new T.Vector3();

    function part(parent, geometry, paint, x, y, z, sx, sy, sz) {
      const mesh = new T.Mesh(geometry, paint);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      parent.add(mesh);
      return mesh;
    }

    function align(mesh, a, b, width) {
      const length = axis.subVectors(b, a).length();
      mesh.position.copy(a).lerp(b, .5);
      mesh.scale.set(width, length, width);
      if (length > .001) mesh.quaternion.setFromUnitVectors(up, axis.multiplyScalar(1 / length));
    }

    function segment(parent, paint, from, to, width, shape = tapered) {
      const mesh = part(parent, shape, paint, 0, 0, 0, 1, 1, 1);
      align(mesh, from, to, width);
      return mesh;
    }

    function sandHeight(x, z) {
      const boundary = shore.limitAt(z);
      if (x <= boundary - 16) {
        return T.MathUtils.lerp(-.095, -.106, T.MathUtils.clamp((x - 416) / (boundary - 432), 0, 1));
      }
      return T.MathUtils.lerp(-.106, -.115, T.MathUtils.clamp((x - boundary + 16) / 9, 0, 1));
    }

    function towel(parent, ground, color) {
      const mesh = new T.PlaneGeometry(1.03, 1.72, 7, 11);
      mesh.rotateX(-Math.PI / 2);
      const points = mesh.getAttribute('position');
      const colors = [];
      const field = new T.Color(color);
      const border = new T.Color(0xf0e0bf);
      for (let i = 0; i < points.count; i++) {
        const x = points.getX(i), z = points.getZ(i);
        points.setY(i, Math.sin(x * 18 + z * 5) * .006);
        const tone = (Math.abs(x) > .4 || Math.abs(z) > .7) ? border : field;
        colors.push(tone.r, tone.g, tone.b);
      }
      mesh.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
      mesh.computeVertexNormals();
      const fabric = new T.MeshStandardMaterial({ vertexColors: true, roughness: .95 });
      part(parent, mesh, fabric, 0, ground + .017, .02, 1, 1, 1);
      for (const side of [-1, 1]) {
        part(parent, box, aluminium, 0, ground + .012, .02 + side * .863, .98, .012, .026);
      }
    }

    function chair(parent, ground, color) {
      const fabric = material(color, .91);
      const seatY = ground + .37;
      part(parent, box, fabric, 0, seatY, .01, .55, .052, .53);
      const back = part(parent, box, fabric, 0, seatY + .235, -.30, .54, .47, .042);
      back.rotation.x = -.19;
      for (const side of [-1, 1]) {
        const x = side * .249;
        const footFront = new T.Vector3(x, ground + .012, .33);
        const footRear = new T.Vector3(x, ground + .012, -.33);
        const seatFront = new T.Vector3(x, seatY, .225);
        const seatRear = new T.Vector3(x, seatY, -.225);
        segment(parent, aluminium, footFront, seatRear, .018, tube);
        segment(parent, aluminium, footRear, seatFront, .018, tube);
        segment(parent, aluminium, seatRear, new T.Vector3(x, seatY + .48, -.35), .019, tube);
      }
      return seatY + .027;
    }

    function sitter(profile) {
      const actor = new T.Group();
      group.add(actor);
      let x = profile.x, z = profile.z, yaw = profile.yaw;
      if (profile.spot) {
        const { angle } = profile.spot;
        x = profile.spot.x + Math.cos(angle) * .51;
        z = profile.spot.z - Math.sin(angle) * .51;
        yaw = angle + Math.PI / 2;
      }
      actor.position.set(x, 0, z);
      actor.rotation.y = yaw;
      const ground = sandHeight(x, z);
      const onTowel = profile.seat === 'towel';
      if (onTowel) towel(actor, ground, profile.fabric);
      const seat = profile.seat === 'chair' ? chair(actor, ground, profile.fabric) : onTowel ? ground + .023 : .30;
      const cast = part(actor, shadow, shade, 0, ground + .02, .17, .44, .62, 1);
      cast.rotation.x = -Math.PI / 2;

      const body = new T.Group();
      const hipY = seat + .12;
      body.position.y = hipY;
      actor.add(body);
      const skin = material(profile.skin, .60);
      const hair = material(profile.hair);
      const shirt = material(profile.shirt);
      const shorts = material(profile.shorts);
      part(body, egg, shorts, 0, .03, 0, .175, .126, .155);
      const chest = new T.Group();
      body.add(chest);
      part(chest, egg, shirt, 0, .245, -.018, .201, .248, .147);
      part(chest, egg, shirt, 0, .404, -.023, .223, .137, .151);
      part(chest, egg, skin, 0, .536, -.015, .068, .091, .067);

      const head = new T.Group();
      head.position.set(0, .626, -.01);
      chest.add(head);
      part(head, egg, skin, 0, .042, .01, .102, .139, .112);
      part(head, crown, hair, 0, .06, -.016, .108, .127, .115);
      part(head, egg, skin, 0, .025, .119, .029, .025, .026);
      for (const side of [-1, 1]) {
        part(head, egg, skin, side * .101, .033, .009, .026, .041, .021);
        part(head, egg, hair, side * .036, .068, .110, .017, .009, .009);
      }

      const hands = [];
      for (const side of [-1, 1]) {
        const hip = new T.Vector3(side * .086, -.021, .034);
        const knee = onTowel ? new T.Vector3(side * .222, .171, .381) : new T.Vector3(side * .118, -.053, .406);
        const ankle = onTowel
          ? new T.Vector3(-side * .061, ground - hipY + .069, .536 + side * .04)
          : new T.Vector3(side * .133, ground - hipY + .072, .581);
        const hem = hip.clone().lerp(knee, .75);
        segment(body, shorts, hip, hem, .085);
        segment(body, skin, hem, knee, .072);
        part(body, egg, skin, knee.x, knee.y, knee.z, .068, .066, .070);
        segment(body, skin, knee, ankle, .057);
        const foot = part(body, egg, skin, ankle.x, ground - hipY + .05, ankle.z + .073, .055, .047, .116);
        if (onTowel) foot.rotation.y = side * -.51;

        const shoulder = new T.Vector3(side * .203, .42, -.028);
        const elbow = new T.Vector3(side * (onTowel ? .204 : .246), .199, .10);
        const sleeve = shoulder.clone().lerp(elbow, .44);
        segment(chest, shirt, shoulder, sleeve, .063);
        segment(chest, skin, sleeve, elbow, .051);
        part(chest, egg, skin, elbow.x, elbow.y, elbow.z, .043, .044, .043);
        const isHolding = side === 1 && profile.drink;
        const rest = new T.Vector3(side * (onTowel ? .192 : .13), isHolding ? .23 : .073 + (onTowel ? .10 : 0), isHolding ? .285 : .33);
        const wrist = rest.clone();
        const forearm = segment(chest, skin, elbow, wrist, .0405);
        const hand = new T.Group();
        hand.position.copy(wrist);
        chest.add(hand);
        part(hand, egg, skin, 0, -.013, .027, .043, .030, .076);
        if (isHolding) {
          part(hand, tube, bottlePaint, .008, .057, .057, .032, .138, .032);
          part(hand, tube, cap, .008, .135, .057, .022, .020, .022);
        }
        hands.push({ wrist, rest, elbow, forearm, hand, side, isHolding });
      }
      return { actor, chest, head, hands, profile };
    }

    const actors = visitors.map(sitter);
    return {
      update(timeSeconds, playerPosition) {
        group.visible = !playerPosition || (Math.abs(playerPosition.x - 433) < 155 && Math.abs(playerPosition.z) < 165);
        if (!group.visible) return;
        for (const person of actors) {
          const t = timeSeconds, phase = person.profile.phase;
          person.chest.rotation.x = -.067 + .022 * Math.sin(t * 1.42 + phase);
          person.head.rotation.y = .22 * Math.sin(t * .48 + phase);
          person.head.rotation.x = -.036 + .047 * Math.sin(t * .71 + phase);
          for (const hand of person.hands) {
            const sway = Math.sin(t * 1.28 + phase + hand.side);
            hand.wrist.copy(hand.rest);
            hand.wrist.y += sway * (hand.isHolding ? .024 : .008);
            hand.wrist.z += sway * .012;
            align(hand.forearm, hand.elbow, hand.wrist, .0405);
            hand.hand.position.copy(hand.wrist);
          }
        }
      },
    };
  }

  return { create };
})();
