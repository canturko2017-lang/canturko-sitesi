'use strict';

window.SehirKarakterleri = (() => {
  const profiles = [
    { name: 'Deniz', skin: 0xa66f4f, hair: 0x292520, jacket: 0x327666, shirt: 0xddd9c6, pants: 0x263641, height: 1.04 },
    { name: 'Mert', skin: 0xd0a187, hair: 0x594030, jacket: 0x54758e, shirt: 0xc5d3d8, pants: 0x343949, height: .98, beard: true },
    { name: 'Baran', skin: 0xb28463, hair: 0x302c2f, jacket: 0x937049, shirt: 0x4c5149, pants: 0x3b3a33, height: 1.10, glasses: true },
  ];

  function create(T, look = {}) {
    const profile = { ...profiles[0], ...look };
    const model = new T.Group();
    const material = (color, metalness = 0) => new T.MeshStandardMaterial({ color, roughness: .78, metalness });
    const skin = material(profile.skin);
    const hair = material(profile.hair);
    const jacket = material(profile.jacket);
    const shirt = material(profile.shirt);
    const pants = material(profile.pants);
    const black = material(0x232b2d);
    const sole = material(0x8e8982);
    const dark = material(0x272522);
    const eyeWhite = material(0xe4dbcb);
    const sphere = new T.SphereGeometry(1, 13, 9);
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
    const torso = new T.CylinderGeometry(.21, .145, .43, 12, 2);
    shape(model, torso, jacket, 0, 1.30, 0, 1, 1, .54);
    oval(model, jacket, 0, 1.51, .009, .233, .056, .119);
    capsule(model, pants, 0, 1.005, .002, .148, .075, .67);
    shape(model, unitBox, shirt, 0, 1.41, -.112, .104, .18, .025);
    shape(model, unitBox, black, 0, 1.236, -.106, .017, .22, .018);
    capsule(model, skin, 0, 1.59, -.008, .055, .067, .94);
    oval(model, skin, 0, 1.735, -.008, .099, .128, .095);
    oval(model, skin, 0, 1.681, -.042, .071, .049, .07);
    shape(model, new T.SphereGeometry(1, 15, 10, 0, Math.PI * 2, 0, Math.PI * .51), hair, 0, 1.754, .001, .105, .116, .103);
    oval(model, hair, 0, 1.767, .065, .096, .079, .048);
    oval(model, skin, 0, 1.729, -.102, .022, .034, .035);
    const mouth = material(profile.beard ? 0x4c3427 : 0x71483f);
    oval(model, mouth, 0, 1.682, -.108, .035, .008, .005);
    if (profile.beard) oval(model, hair, 0, 1.663, -.076, .056, .019, .031);
    for (const side of [-1, 1]) {
      oval(model, skin, side * .099, 1.736, .003, .019, .037, .024);
      oval(model, eyeWhite, side * .036, 1.763, -.094, .022, .009, .008);
      oval(model, dark, side * .036, 1.763, -.102, .008, .008, .004);
      oval(model, hair, side * .038, 1.782, -.088, .027, .006, .006);
      if (profile.glasses) {
        shape(model, unitBox, black, side * .04, 1.764, -.105, .067, .026, .007);
        shape(model, unitBox, black, side * .076, 1.766, -.067, .008, .009, .067);
      }
    }
    if (profile.glasses) shape(model, unitBox, black, 0, 1.768, -.116, .023, .009, .008);
    if (profile.uniform) {
      const badge = material(0xc6af63, .3);
      shape(model, unitBox, badge, -.101, 1.437, -.114, .041, .05, .012);
      oval(model, jacket, 0, 1.843, .003, .109, .055, .103);
      oval(model, black, 0, 1.838, -.069, .113, .013, .096);
      shape(model, unitBox, badge, 0, 1.871, -.082, .028, .025, .012);
    }
    const limbs = [];
    for (const side of [-1, 1]) {
      const arm = new T.Group();
      arm.position.set(side * .218, 1.49, 0);
      arm.rotation.z = side * .099;
      capsule(arm, jacket, side * .032, -.137, 0, .058, .247, 1.04);
      capsule(arm, jacket, side * .053, -.365, -.024, .047, .198, 1.05);
      oval(arm, skin, side * .058, -.503, -.035, .047, .068, .035);
      model.add(arm);
      const leg = new T.Group();
      leg.position.set(side * .107, .986, 0);
      capsule(leg, pants, 0, -.213, 0, .091, .315, .97);
      capsule(leg, pants, 0, -.631, .007, .067, .327, 1.05);
      oval(leg, black, 0, -.906, -.066, .08, .074, .148);
      oval(leg, sole, 0, -.96, -.072, .079, .023, .146);
      model.add(leg);
      limbs.push({ side, arm, leg });
    }
    model.scale.setScalar(profile.height);
    model.userData.pose = (stride = 0, wave = false) => {
      for (const { side, arm, leg } of limbs) {
        leg.rotation.x = stride * side;
        arm.rotation.x = -stride * side * .63;
        arm.rotation.z = wave && side === 1 ? 2.1 : side * .099;
      }
    };
    return model;
  }

  return { profiles, create };
})();
