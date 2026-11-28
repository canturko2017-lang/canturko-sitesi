'use strict';

window.SehirYuzuculer = (() => {
  const profiles = [
    { z: -13, drift: 6, depth: 10, spread: 3.9, rate: .18, phase: .4, skin: 0xd3a184, hair: 0x442a23, suit: 0x224575, onePiece: false },
    { z: 3, drift: 7, depth: 17, spread: 4.7, rate: .125, phase: 1.8, skin: 0xaa704e, hair: 0x29241f, suit: 0xd46048, onePiece: true, cap: 0xe7bd6e },
    { z: 33, drift: 10, depth: 20, spread: 5.6, rate: .11, phase: 3.4, skin: 0x7d543d, hair: 0x28201b, suit: 0x341f36, onePiece: false, cap: 0x357a74 },
    { z: 15, drift: 5, depth: 5.1, spread: 1.5, rate: .15, phase: 4.9, skin: 0xc39977, hair: 0x51342a, suit: 0x267d78, onePiece: true },
  ];

  function create(THREE, scene, shore) {
    const group = new THREE.Group();
    group.name = 'Kumsalda yüzenler';
    scene.add(group);

    const waterLevel = Number.isFinite(shore.waterLevel) ? shore.waterLevel : -.211;
    const sphere = new THREE.SphereGeometry(1, 16, 12);
    const crown = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * .56);
    const limb = new THREE.CylinderGeometry(.76, 1, 1, 10, 1);
    const ripple = new THREE.RingGeometry(.89, 1, 28);
    const material = (color, roughness = .69) => new THREE.MeshStandardMaterial({ color, roughness });
    const lens = material(0x273b40, .24);
    const up = new THREE.Vector3(0, 1, 0);
    const direction = new THREE.Vector3();

    function part(parent, geometry, paint, x, y, z, width, height, length) {
      const mesh = new THREE.Mesh(geometry, paint);
      mesh.position.set(x, y, z);
      mesh.scale.set(width, height, length);
      parent.add(mesh);
      return mesh;
    }

    function stretch(mesh, from, to, girth) {
      direction.subVectors(to, from);
      const length = direction.length();
      mesh.position.copy(from).lerp(to, .5);
      mesh.scale.set(girth, length, girth);
      if (length > .0001) mesh.quaternion.setFromUnitVectors(up, direction.multiplyScalar(1 / length));
    }

    function makeSwimmer(profile) {
      const body = new THREE.Group();
      group.add(body);
      const skin = material(profile.skin, .54);
      const hair = material(profile.cap ?? profile.hair, profile.cap ? .42 : .77);
      const suit = material(profile.suit, .56);

      part(body, sphere, profile.onePiece ? suit : skin, 0, -.04, .29, .205, .132, .36);
      part(body, sphere, profile.onePiece ? suit : skin, 0, -.045, .49, .24, .119, .18);
      part(body, sphere, suit, 0, -.055, -.005, .181, .112, .24);
      part(body, sphere, skin, 0, .049, .647, .089, .087, .129);

      const head = new THREE.Group();
      head.position.set(0, .205, .81);
      body.add(head);
      part(head, sphere, skin, 0, -.013, .007, .109, .145, .118);
      part(head, crown, hair, 0, .005, -.022, .114, .144, .121);
      part(head, sphere, skin, 0, -.027, .118, .035, .032, .036);
      for (const side of [-1, 1]) {
        part(head, sphere, skin, side * .106, -.016, 0, .029, .042, .023);
        part(head, sphere, lens, side * .04, .015, .112, .028, .021, .015);
      }

      const arms = [], legs = [];
      for (const side of [-1, 1]) {
        const shoulder = new THREE.Vector3(side * .211, .022, .493);
        part(body, sphere, skin, shoulder.x, shoulder.y, shoulder.z, .077, .074, .096);
        arms.push({
          side,
          shoulder,
          elbow: new THREE.Vector3(),
          wrist: new THREE.Vector3(),
          upper: part(body, limb, skin, 0, 0, 0, 1, 1, 1),
          fore: part(body, limb, skin, 0, 0, 0, 1, 1, 1),
          joint: part(body, sphere, skin, 0, 0, 0, .047, .047, .047),
          hand: part(body, sphere, skin, 0, 0, 0, .042, .033, .088),
        });
        legs.push({
          side,
          hip: new THREE.Vector3(side * .093, -.058, -.108),
          shortsEnd: new THREE.Vector3(),
          knee: new THREE.Vector3(),
          ankle: new THREE.Vector3(),
          thigh: part(body, limb, profile.onePiece ? skin : suit, 0, 0, 0, 1, 1, 1),
          thighEnd: part(body, limb, skin, 0, 0, 0, 1, 1, 1),
          calf: part(body, limb, skin, 0, 0, 0, 1, 1, 1),
          foot: part(body, sphere, skin, 0, 0, 0, .055, .036, .106),
        });
      }

      const wakes = Array.from({ length: 3 }, () => {
        const paint = new THREE.MeshBasicMaterial({
          color: 0xdffbf1, transparent: true, opacity: .18, side: THREE.DoubleSide, depthWrite: false,
        });
        const ring = new THREE.Mesh(ripple, paint);
        ring.rotation.order = 'YXZ';
        ring.rotation.x = -Math.PI / 2;
        ring.renderOrder = 6;
        group.add(ring);
        return ring;
      });

      return { profile, body, head, arms, legs, wakes };
    }

    const swimmers = profiles.map(makeSwimmer);

    function locate(profile, time) {
      const turn = time * profile.rate + profile.phase;
      const z = profile.z + Math.sin(turn) * profile.drift;
      const x = shore.limitAt(z) + profile.depth + Math.cos(turn) * profile.spread;
      return { x, z };
    }

    function stroke(swimmer, time) {
      const { profile, body, head, arms, legs, wakes } = swimmer;
      const here = locate(profile, time);
      const ahead = locate(profile, time + .035);
      const yaw = Math.atan2(ahead.x - here.x, ahead.z - here.z);
      const cycle = time * 4.8 + profile.phase;
      body.position.set(here.x, waterLevel - .111 + .045 * Math.sin(time * 2.8 + profile.phase), here.z);
      body.rotation.set(.022 * Math.cos(cycle), yaw, .084 * Math.sin(cycle), 'YXZ');
      head.rotation.z = .29 * Math.max(0, Math.sin(cycle * .5));

      for (const arm of arms) {
        const phase = cycle + (arm.side === 1 ? Math.PI : 0);
        const recovery = Math.max(0, Math.sin(phase));
        const foreAngle = phase + .24 + 1.06 * recovery;
        arm.elbow.copy(arm.shoulder);
        arm.elbow.x += arm.side * (.07 + .055 * recovery);
        arm.elbow.y += .285 * Math.sin(phase);
        arm.elbow.z += .275 * Math.cos(phase);
        arm.wrist.copy(arm.elbow);
        arm.wrist.x += arm.side * (.022 - .065 * recovery);
        arm.wrist.y += .218 * Math.sin(foreAngle);
        arm.wrist.z += .218 * Math.cos(foreAngle);
        stretch(arm.upper, arm.shoulder, arm.elbow, .060);
        stretch(arm.fore, arm.elbow, arm.wrist, .044);
        arm.joint.position.copy(arm.elbow);
        arm.hand.position.copy(arm.wrist);
        arm.hand.rotation.x = -foreAngle;
      }

      for (const leg of legs) {
        const phase = cycle * 2.2 + leg.side * Math.PI * .5;
        const kick = Math.sin(phase);
        leg.knee.set(leg.side * .10, -.073 + kick * .103, -.488);
        leg.ankle.set(leg.side * .107, -.067 + Math.sin(phase - .63) * .139, -.798);
        leg.shortsEnd.copy(leg.hip).lerp(leg.knee, .44);
        stretch(leg.thigh, leg.hip, leg.shortsEnd, .087);
        stretch(leg.thighEnd, leg.shortsEnd, leg.knee, .074);
        stretch(leg.calf, leg.knee, leg.ankle, .056);
        leg.foot.position.copy(leg.ankle);
        leg.foot.position.z -= .067;
        leg.foot.rotation.x = -.38 * kick;
      }

      wakes.forEach((ring, index) => {
        const fade = (time * .88 + index / wakes.length + profile.phase) % 1;
        const trail = .29 + fade * 1.44;
        ring.position.set(here.x - Math.sin(yaw) * trail, waterLevel + .065, here.z - Math.cos(yaw) * trail);
        ring.rotation.y = yaw;
        ring.scale.set(.25 + fade * .56, .26 + fade * .27, 1);
        ring.material.opacity = .17 * (1 - fade);
      });
    }

    swimmers.forEach(swimmer => stroke(swimmer, 0));
    return {
      update(timeSeconds, playerPosition) {
        const nearBeach = !playerPosition || (Math.abs(playerPosition.z - 14) < 166 &&
          Math.abs(playerPosition.x - shore.limitAt(playerPosition.z)) < 175);
        group.visible = nearBeach;
        if (!nearBeach) return;
        for (const swimmer of swimmers) stroke(swimmer, timeSeconds);
      },
    };
  }

  return { create };
})();
