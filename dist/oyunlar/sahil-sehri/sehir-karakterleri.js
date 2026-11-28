'use strict';

window.SehirKarakterleri = (() => {
  const profiles = [
    { name: 'Deniz', skin: 0xa66f4f, hair: 0x292520, eye: 0x53402e, jacket: 0x327666, shirt: 0xddd9c6, pants: 0x263641, shoes: 0x393b37, height: 1.04, build: .99, style: 'field' },
    { name: 'Mert', skin: 0xd0a187, hair: 0x594030, eye: 0x54706d, jacket: 0x54758e, shirt: 0xc5d3d8, pants: 0x343949, shoes: 0xb4ada3, height: .98, build: 1.05, style: 'denim', beard: true },
    { name: 'Baran', skin: 0xb28463, hair: 0x302c2f, eye: 0x47382d, jacket: 0x937049, shirt: 0x4c5149, pants: 0x3b3a33, shoes: 0x332e28, height: 1.10, build: .93, style: 'bomber', glasses: true },
  ];

  function create(T, look = {}) {
    const profile = { ...profiles[0], ...look };
    const model = new T.Group();
    model.name = profile.name;
    const material = (color, metalness = 0) => new T.MeshStandardMaterial({ color, roughness: .78, metalness });
    const skin = material(profile.skin);
    const hair = material(profile.hair);
    const jacket = material(profile.jacket);
    const shirt = material(profile.shirt);
    const pants = material(profile.pants);
    const black = material(0x232b2d);
    const shoe = material(profile.uniform ? 0x232b2d : profile.shoes);
    const sole = material(profile.style === 'denim' ? 0xcfc5b3 : 0x77736c);
    const iris = material(profile.eye);
    const eyeWhite = material(0xe4dbcb);
    const skinWarm = material(new T.Color(profile.skin).multiplyScalar(.72));
    const seam = material(new T.Color(profile.jacket).multiplyScalar(.69));
    const trim = material(new T.Color(profile.jacket).lerp(new T.Color(0xe9ddc7), .22));
    const metal = material(0xa69983, .32);
    const sphere = new T.SphereGeometry(1, 14, 10);
    const unitBox = new T.BoxGeometry(1, 1, 1);
    function shape(group, geometry, surface, x, y, z, sx, sy, sz) {
      const mesh = new T.Mesh(geometry, surface);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      group.add(mesh);
      return mesh;
    }
    function oval(group, mat, x, y, z, sx, sy, sz) {
      return shape(group, sphere, mat, x, y, z, sx, sy, sz);
    }
    function capsule(group, mat, x, y, z, radius, length, depth) {
      return shape(group, new T.CapsuleGeometry(radius, length, 4, 8), mat, x, y, z, 1, 1, depth);
    }
    const torsoPivot = new T.Group();
    torsoPivot.position.y = .986;
    const body = new T.Group();
    body.position.y = -.986;
    torsoPivot.add(body);
    model.add(torsoPivot);

    const torso = new T.LatheGeometry([
      new T.Vector2(.14, -.216), new T.Vector2(.159, -.197), new T.Vector2(.175, -.084),
      new T.Vector2(.199, .088), new T.Vector2(.216, .167), new T.Vector2(.196, .214),
      new T.Vector2(.11, .235), new T.Vector2(.043, .228),
    ], 16);
    shape(body, torso, jacket, 0, 1.30, 0, profile.build, 1, .56);
    oval(body, jacket, 0, 1.51, .009, .233 * profile.build, .056, .119);
    const hips = capsule(model, pants, 0, 1.005, .002, .148, .075, .67);
    const neckline = new T.Shape();
    neckline.moveTo(-.065, .101);
    neckline.quadraticCurveTo(0, .067, .065, .101);
    neckline.lineTo(.039, -.098);
    neckline.lineTo(-.039, -.098);
    neckline.closePath();
    const collarOpening = shape(body, new T.ShapeGeometry(neckline), shirt, 0, 1.415, -.123, profile.style === 'denim' ? 1.03 : .85, 1, 1);
    collarOpening.rotation.y = Math.PI;
    shape(body, unitBox, seam, 0, 1.226, -.103, .013, .211, .017);
    capsule(body, skin, 0, 1.59, -.008, .055, .067, .94);
    const headPivot = new T.Group();
    headPivot.position.y = 1.617;
    const head = new T.Group();
    head.position.y = -headPivot.position.y;
    headPivot.add(head);
    body.add(headPivot);
    const motorEye = new T.Object3D();
    model.add(motorEye);
    model.userData.motorEye = motorEye;
    oval(head, skin, 0, 1.735, -.008, .099, .128, .095);
    oval(head, skin, 0, 1.681, -.044, profile.style === 'denim' ? .074 : .068, .052, .071);
    shape(head, new T.SphereGeometry(1, 15, 10, 0, Math.PI * 2, 0, Math.PI * .50), hair, 0, 1.752, .009, .105, .106, .099);
    oval(head, hair, 0, 1.767, .065, .096, .079, .048);
    if (profile.style === 'field' && !profile.uniform) {
      for (const [x, z, height] of [[-.064, -.037, 1.844], [-.026, -.052, 1.863], [.024, -.053, 1.868], [.061, -.026, 1.849], [-.029, .012, 1.874], [.025, .018, 1.865]]) {
        oval(head, hair, x, height, z, .04, .037, .042);
      }
    }
    if (profile.style === 'denim') {
      const sweep = oval(head, hair, .013, 1.849, -.041, .089, .028, .067);
      sweep.rotation.z = .26;
      oval(head, hair, -.048, 1.821, -.069, .051, .029, .039);
    }
    if (profile.style === 'bomber') oval(head, hair, 0, 1.838, .012, .091, .021, .084);
    oval(head, skin, 0, 1.729, -.102, .021, .033, .033);
    oval(head, skin, 0, 1.708, -.114, .022, .013, .022);
    const mouth = material(profile.beard ? 0x4c3427 : 0x71483f);
    if (profile.beard) {
      oval(head, hair, 0, 1.657, -.072, .064, .028, .044);
      oval(head, hair, 0, 1.695, -.103, .038, .011, .016);
      for (const side of [-1, 1]) oval(head, hair, side * .071, 1.683, -.057, .027, .037, .032);
    }
    oval(head, mouth, 0, 1.682, -.116, .032, .006, .005);
    for (const side of [-1, 1]) {
      oval(head, skin, side * .099, 1.736, .003, .019, .037, .024);
      oval(head, skinWarm, side * .103, 1.739, -.015, .009, .021, .009);
      oval(head, eyeWhite, side * .036, 1.763, -.094, .02, .008, .008);
      oval(head, iris, side * .036, 1.763, -.102, .008, .008, .004);
      oval(head, hair, side * .037, 1.779, -.089, .024, .0055, .006);
      if (profile.glasses) {
        const x = side * .04;
        for (const edge of [-1, 1]) {
          shape(head, unitBox, black, x, 1.764 + edge * .015, -.109, .067, .006, .009);
          shape(head, unitBox, black, x + edge * .03, 1.764, -.108, .006, .027, .008);
        }
        shape(head, unitBox, black, side * .076, 1.766, -.067, .008, .009, .067);
      }
    }
    if (profile.glasses) shape(head, unitBox, black, 0, 1.768, -.116, .023, .009, .008);
    if (profile.uniform) {
      const badge = material(0xc6af63, .3);
      shape(body, unitBox, badge, -.101, 1.437, -.114, .041, .05, .012);
      oval(head, jacket, 0, 1.843, .003, .109, .055, .103);
      oval(head, black, 0, 1.838, -.069, .113, .013, .096);
      shape(head, unitBox, badge, 0, 1.871, -.082, .028, .025, .012);
    } else {
      for (const side of [-1, 1]) {
        const collar = shape(body, unitBox, trim, side * .055, 1.510, -.107, .045, .082, .018);
        collar.rotation.z = side * -.32;
        if (profile.style === 'field' || profile.style === 'denim') {
          const y = profile.style === 'field' ? 1.258 : 1.407;
          shape(body, unitBox, jacket, side * .109, y, -.1, .075, .067, .018);
          shape(body, unitBox, trim, side * .109, y + .035, -.111, .078, .009, .014);
        }
      }
      if (profile.style === 'field') {
        shape(body, unitBox, metal, -.106, 1.436, -.108, .046, .008, .008);
      } else if (profile.style === 'denim') {
        for (const y of [1.18, 1.225, 1.27, 1.315]) oval(body, metal, .008, y, -.11, .008, .008, .005);
      } else {
        oval(body, seam, 0, 1.106, 0, .154, .026, .088);
        shape(body, unitBox, metal, 0, 1.339, -.122, .014, .025, .009);
      }
    }

    const armLength = .255;
    const forearmLength = .249;
    const thighLength = .418;
    const shinLength = .45;
    const limbs = [];
    for (const side of [-1, 1]) {
      const arm = new T.Group();
      arm.position.set(side * .218 * profile.build, 1.49, 0);
      arm.rotation.z = side * .099;
      const upperSleeve = capsule(arm, jacket, 0, -.127, 0, .061 * profile.build, .188, 1.07);
      const forearm = new T.Group();
      forearm.position.y = -armLength;
      oval(forearm, jacket, 0, -.006, 0, .048, .063, .048);
      capsule(forearm, jacket, 0, -.104, 0, .047, .154, 1.05);
      oval(forearm, seam, 0, -.203, 0, .049, .022, .048);
      oval(forearm, skin, 0, -forearmLength, 0, .041, .062, .034);
      oval(forearm, skin, side * -.032, -.242, -.014, .017, .036, .015);
      if (!profile.uniform && side < 0 && profile.style === 'field') {
        shape(forearm, unitBox, black, 0, -.222, -.031, .067, .019, .012);
        shape(forearm, unitBox, metal, 0, -.222, -.04, .025, .026, .009);
      }
      arm.add(forearm);
      body.add(arm);
      const leg = new T.Group();
      leg.position.set(side * .107, .986, 0);
      capsule(leg, pants, 0, -.208, 0, .086 * profile.build, .304, .97);
      if (!profile.uniform && profile.style === 'bomber') {
        const pocket = material(new T.Color(profile.pants).lerp(new T.Color(0xd4bd98), .12));
        shape(leg, unitBox, pocket, side * .075, -.197, -.001, .029, .126, .116);
      }
      const shin = new T.Group();
      shin.position.y = -thighLength;
      oval(shin, pants, 0, -.018, .004, .068, .072, .064);
      capsule(shin, pants, 0, -.211, .007, .066, .311, 1.05);
      const foot = new T.Group();
      foot.position.y = -shinLength;
      oval(foot, shoe, 0, -.039, -.066, .08, .074, .148);
      oval(foot, sole, 0, -.09, -.072, .079, .023, .146);
      if (!profile.uniform && profile.style === 'denim') {
        for (const z of [-.09, -.118, -.145]) shape(foot, unitBox, sole, 0, .017, z, .086, .012, .012);
      }
      shin.add(foot);
      leg.add(shin);
      model.add(leg);
      limbs.push({ side, arm, forearm, upperSleeve, leg, shin, foot, armPole: new T.Vector3(side * .65, -1, .08), kneePole: new T.Vector3(side * .18, .06, -1) });
    }
    model.scale.setScalar(profile.height);

    let motorCockpit = false;
    function setMotorCockpit(enabled) {
      if (motorCockpit === enabled) return;
      motorCockpit = enabled;
      headPivot.visible = !enabled;
      hips.visible = !enabled;
      for (const part of body.children) {
        if (part.isMesh) part.visible = !enabled;
      }
      for (const { leg, upperSleeve } of limbs) {
        leg.visible = !enabled;
        upperSleeve.visible = !enabled;
      }
    }

    function resetRide() {
      model.position.y = 0;
      model.position.z = 0;
      model.rotation.x = 0;
      model.rotation.z = 0;
      torsoPivot.rotation.set(0, 0, 0);
      headPivot.rotation.set(0, 0, 0);
      setMotorCockpit(false);
      for (const { forearm, shin, foot } of limbs) {
        forearm.rotation.set(0, 0, 0);
        shin.rotation.set(0, 0, 0);
        foot.rotation.set(0, 0, 0);
      }
    }

    model.userData.pose = (stride = 0, wave = false) => {
      resetRide();
      for (const { side, arm, leg } of limbs) {
        leg.rotation.set(stride * side, 0, 0);
        arm.rotation.set(-stride * side * .63, 0, wave && side === 1 ? 2.1 : side * .099);
      }
    };
    model.userData.swim = (phase, power, immersion) => {
      resetRide();
      model.position.z = .91 * profile.height * immersion;
      model.rotation.x = -1.36 * immersion;
      model.rotation.z = Math.sin(phase) * .14 * power * immersion;
      for (const { side, arm, leg } of limbs) {
        const stroke = phase + (side > 0 ? Math.PI : 0);
        const angle = Math.sin(stroke) * 1.64 + Math.sin(stroke * 2) * .48;
        const armPitch = T.MathUtils.lerp(.15 + Math.sin(stroke) * .47, angle, power) * immersion;
        arm.rotation.set(armPitch, 0, side * (.1 + (.24 + Math.cos(stroke) * .13) * immersion));
        leg.rotation.set(Math.sin(stroke * 2.5) * (.12 + power * .19) * side * immersion, 0, 0);
      }
    };

    const towardFoot = new T.Vector3();
    const towardGrip = new T.Vector3();
    const down = new T.Vector3(0, -1, 0);
    const direction = new T.Vector3();
    const bend = new T.Vector3();
    const joint = new T.Vector3();
    const up = new T.Vector3(0, 1, 0);
    // Match the steering pivot and footwell measured from the jet ski saddle.
    const steeringPivot = new T.Vector3(0, .21, -.732);
    const footwellY = -.305;
    // Contact points on the sport motorcycle, in metres from its ground-level origin.
    const motorSeatY = 1;
    const motorSeatZ = .34;
    const motorGrip = new T.Vector3(.398, 1.264, -.357);
    const motorPeg = new T.Vector3(.225, .421, .155);
    const motorKneePole = new T.Vector3();
    const torsoInverse = new T.Quaternion();
    const rotation = new T.Quaternion();
    function reach(upper, lower, delta, pole, upperLength, lowerLength) {
      const distance = T.MathUtils.clamp(delta.length(), Math.abs(upperLength - lowerLength) + .005, upperLength + lowerLength - .002);
      direction.copy(delta).normalize();
      // Locate the elbow or knee on the triangle between the shoulder or hip and its target.
      const along = (upperLength * upperLength - lowerLength * lowerLength + distance * distance) / (2 * distance);
      bend.copy(pole).addScaledVector(direction, -direction.dot(pole)).normalize();
      joint.copy(direction).multiplyScalar(along).addScaledVector(bend, Math.sqrt(Math.max(0, upperLength * upperLength - along * along)));
      upper.quaternion.setFromUnitVectors(down, bend.copy(joint).normalize());
      bend.copy(direction).multiplyScalar(distance).sub(joint).normalize().applyQuaternion(rotation.copy(upper.quaternion).invert());
      lower.quaternion.setFromUnitVectors(down, bend);
    }

    model.userData.ride = (steer = 0) => {
      const turn = T.MathUtils.clamp(steer, -1, 1);
      const height = profile.height;
      const hipHeight = .116;
      model.position.y = hipHeight - torsoPivot.position.y * height;
      model.position.z = 0;
      model.rotation.x = 0;
      model.rotation.z = 0;
      torsoPivot.rotation.set(-.69 - .085 * Math.abs(turn), -.06 * turn, -.07 * turn);
      headPivot.rotation.set(.59, -.13 * turn, .05 * turn);
      setMotorCockpit(false);
      torsoInverse.copy(torsoPivot.quaternion).invert();
      const barTurn = -.26 * turn;
      for (const { side, arm, forearm, leg, shin, foot, armPole, kneePole } of limbs) {
        towardGrip.set(side * .3, -.013, .044).applyAxisAngle(up, barTurn).add(steeringPivot);
        towardGrip.y -= model.position.y;
        towardGrip.divideScalar(height).sub(torsoPivot.position).applyQuaternion(torsoInverse).add(torsoPivot.position).sub(arm.position);
        reach(arm, forearm, towardGrip, armPole, armLength, forearmLength);

        towardFoot.set(side * .395, footwellY + .114 * height - model.position.y, .028).divideScalar(height).sub(leg.position);
        reach(leg, shin, towardFoot, kneePole, thighLength, shinLength);
        foot.quaternion.copy(leg.quaternion).multiply(shin.quaternion).invert()
          .multiply(rotation.setFromAxisAngle(up, side * -.095));
      }
    };

    model.userData.rideMotor = (steer = 0, firstPerson = false) => {
      const turn = T.MathUtils.clamp(steer, -1, 1);
      const height = profile.height;
      model.position.y = motorSeatY + (.137 - torsoPivot.position.y) * height;
      model.position.z = motorSeatZ;
      model.rotation.x = 0;
      model.rotation.z = 0;
      torsoPivot.rotation.set(-.72 - .035 * Math.abs(turn), -.045 * turn, -.09 * turn);
      headPivot.rotation.set(.64, -.095 * turn, .06 * turn);
      // Pull the camera back to keep both grips in frame. Only the arms are visible from here.
      motorEye.position.set(0, (1.69 - model.position.y) / height, (.38 - motorSeatZ) / height);
      setMotorCockpit(firstPerson);
      torsoInverse.copy(torsoPivot.quaternion).invert();

      for (const { side, arm, forearm, leg, shin, foot, armPole } of limbs) {
        towardGrip.set(side * motorGrip.x, motorGrip.y, motorGrip.z);
        towardGrip.sub(model.position).divideScalar(height).sub(torsoPivot.position)
          .applyQuaternion(torsoInverse).add(torsoPivot.position).sub(arm.position);
        reach(arm, forearm, towardGrip, armPole, armLength, forearmLength);

        // The ankle sits above and slightly behind the peg, under the sole's arch.
        towardFoot.set(side * motorPeg.x, motorPeg.y + .112 * height, motorPeg.z + .072 * height);
        towardFoot.sub(model.position).divideScalar(height).sub(leg.position);
        motorKneePole.set(side * .72, .08, -1);
        reach(leg, shin, towardFoot, motorKneePole, thighLength, shinLength);
        foot.quaternion.copy(leg.quaternion).multiply(shin.quaternion).invert()
          .multiply(rotation.setFromAxisAngle(up, side * -.09));
      }
    };

    function batchDetails(group) {
      const byGeometry = new Map();
      for (const part of group.children) {
        if (!part.isMesh) continue;
        if (!byGeometry.has(part.geometry)) byGeometry.set(part.geometry, new Map());
        const byMaterial = byGeometry.get(part.geometry);
        if (!byMaterial.has(part.material)) byMaterial.set(part.material, []);
        byMaterial.get(part.material).push(part);
      }
      for (const [geometry, byMaterial] of byGeometry) {
        for (const [surface, parts] of byMaterial) {
          if (parts.length < 3) continue;
          const batch = new T.InstancedMesh(geometry, surface, parts.length);
          parts.forEach((part, index) => {
            part.updateMatrix();
            batch.setMatrixAt(index, part.matrix);
          });
          group.remove(...parts);
          group.add(batch);
        }
      }
    }

    batchDetails(body);
    batchDetails(head);
    for (const { forearm, foot } of limbs) {
      batchDetails(forearm);
      batchDetails(foot);
    }
    return model;
  }

  return { profiles, create };
})();
