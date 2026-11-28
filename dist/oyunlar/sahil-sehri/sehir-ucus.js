'use strict';

window.SehirUcus = (() => {
  function create(T, sites, models, obstacles) {
    const { lerp, clamp } = T.MathUtils;
    const limits = { west: -467, east: 649, north: -465, south: 455, ceiling: 143 };
    const headingTo = (from, x, z) => Math.atan2(from.x - x, from.z - z);
    const angleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
    const soft = value => value * value * (3 - 2 * value);
    const vehicles = ['airplane', 'helicopter'].map((type) => {
      const model = models[type];
      const start = sites[type];
      model.group.position.set(start.x, start.y, start.z);
      model.group.rotation.set(0, start.yaw, 0, 'YXZ');
      return {
        type, start, model, group: model.group, label: type === 'airplane' ? 'Uçak' : 'Helikopter',
        speed: 0, vertical: 0, power: 0, airborne: false, approach: null, edgeTurn: null,
        boardingRange: type === 'airplane' ? 6.6 : 6.3,
      };
    });

    function floorAt(x, z, margin) {
      let floor = 0;
      for (const { x: cx, z: cz, halfWidth, halfDepth, height = 24 } of obstacles) {
        if (Math.abs(x - cx) < halfWidth + margin && Math.abs(z - cz) < halfDepth + margin) {
          floor = Math.max(floor, height + 4);
        }
      }
      return floor;
    }

    function startLanding(vehicle) {
      if (!vehicle.airborne || vehicle.approach) return false;
      const { group, start } = vehicle;
      const runway = sites.runway;
      const glideY = Math.max(group.position.y, 46);
      const step = (x, y, z, pace, options = {}) => ({ x, y, z, pace, ...options });
      const descend = vehicle.type === 'airplane'
        ? [
            step(runway.x, glideY, runway.zMax + 72, 52, { minimum: 2.2 }),
            step(runway.x, 31, runway.zMax - 3, 43),
            step(runway.x, runway.y, runway.zMin + 73, 37),
            step(runway.x, runway.y, runway.zMin + 40, 17, { ground: true, endPace: 0 }),
            step(runway.x, runway.y, runway.zMin + 40, 0, { duration: 1.55, yaw: Math.PI, ground: true }),
            step(start.x, start.y, start.z, 24, { yaw: Math.PI, ground: true, endPace: 0 }),
            step(start.x, start.y, start.z, 0, { duration: 1.3, yaw: start.yaw, ground: true }),
          ]
        : [
            step(start.x, glideY, start.z, 30, { minimum: 1.5 }),
            step(start.x, 13, start.z, 0, { duration: Math.max(2.1, (glideY - 13) / 19), yaw: start.yaw }),
            step(start.x, start.y, start.z, 0, { duration: 2.4, yaw: start.yaw }),
          ];
      vehicle.approach = { steps: descend, travel: null };
      vehicle.edgeTurn = null;
      return true;
    }

    function land(vehicle, dt) {
      const { approach, group, start } = vehicle;
      if (!approach.travel) {
        const step = approach.steps.shift();
        if (!step) {
          group.position.set(start.x, start.y, start.z);
          group.rotation.set(0, start.yaw, 0, 'YXZ');
          vehicle.airborne = false;
          vehicle.approach = null;
          vehicle.speed = vehicle.vertical = vehicle.power = 0;
          return;
        }
        const from = group.position.clone();
        const distance = Math.hypot(step.x - from.x, step.z - from.z);
        approach.travel = {
          step, from, spent: 0, startYaw: group.rotation.y,
          yaw: step.yaw ?? (distance < .1 ? group.rotation.y : headingTo(from, step.x, step.z)),
          duration: step.duration ?? Math.max(step.minimum ?? .6, distance / step.pace),
        };
      }
      const route = approach.travel;
      const { step, from } = route;
      route.spent += dt;
      const progress = Math.min(1, route.spent / route.duration);
      const eased = soft(progress);
      const motion = step.ground ? progress * (2 - progress) : progress;
      group.position.set(lerp(from.x, step.x, motion), lerp(from.y, step.y, eased), lerp(from.z, step.z, motion));
      group.rotation.y = route.startYaw + angleDelta(route.startYaw, route.yaw) * soft(Math.min(1, progress * 2.7));
      const pitch = step.ground ? 0 : clamp((step.y - from.y) / Math.max(12, route.duration * 35), -.13, .15);
      group.rotation.x = lerp(group.rotation.x, pitch, Math.min(1, dt * 4));
      group.rotation.z = lerp(group.rotation.z, 0, Math.min(1, dt * 4));
      const speed = step.endPace === undefined ? step.pace : lerp(step.pace * 1.5, step.endPace, progress);
      vehicle.speed = lerp(vehicle.speed, speed, Math.min(1, dt * 4));
      vehicle.power = step.ground ? .24 : .63;
      if (progress >= 1) approach.travel = null;
    }

    function keepInAirspace(vehicle, dt, steer, maxTurn) {
      const { position, rotation } = vehicle.group;
      const dx = -Math.sin(rotation.y);
      const dz = -Math.cos(rotation.y);
      const nearX = position.x + dx * 50;
      const nearZ = position.z + dz * 50;
      if (!vehicle.edgeTurn && (nearX < limits.west || nearX > limits.east || nearZ < limits.north || nearZ > limits.south)) {
        vehicle.edgeTurn = headingTo(position, 130, -35);
      }
      if (vehicle.edgeTurn !== null) {
        const gap = angleDelta(rotation.y, vehicle.edgeTurn);
        rotation.y += clamp(gap, -maxTurn * dt, maxTurn * dt);
        if (Math.abs(gap) < .08) vehicle.edgeTurn = null;
        return clamp(-gap * 1.8, -1, 1);
      }
      rotation.y -= steer * maxTurn * dt;
      return steer;
    }

    function update(vehicle, dt, forward, steer) {
      const { group, start } = vehicle;
      if (vehicle.approach) { land(vehicle, dt); return; }
      const plane = vehicle.type === 'airplane';
      const smooth = 1 - Math.exp(-dt * 2.3);
      if (!vehicle.airborne) {
        vehicle.power = lerp(vehicle.power, forward > 0 ? 1 : 0, smooth);
        if (!plane) {
          if (forward > 0 && vehicle.power > .36) vehicle.airborne = true;
          return;
        }
        const target = forward > 0 ? 43 : 0;
        vehicle.speed = lerp(vehicle.speed, target, 1 - Math.exp(-dt * (forward > 0 ? .67 : 2.6)));
        group.position.z = Math.max(sites.runway.zMin + 7, group.position.z - vehicle.speed * dt);
        if (vehicle.speed >= 25 && forward > 0) {
          vehicle.airborne = true;
          vehicle.vertical = 6;
        }
        return;
      }

      const actualSteer = keepInAirspace(vehicle, dt, steer, plane ? .83 : 1.2);
      const heading = group.rotation.y;
      const raise = forward > 0;
      const lower = forward < 0;
      const p = group.position;
      const forwardSpeed = plane ? (raise ? 49 : lower ? 33 : 41) : (raise && p.y > start.y + 5 ? 25 : 0);
      vehicle.speed = lerp(vehicle.speed, forwardSpeed, smooth);
      const dx = -Math.sin(heading);
      const dz = -Math.cos(heading);
      const x = clamp(p.x + dx * vehicle.speed * dt, limits.west, limits.east);
      const z = clamp(p.z + dz * vehicle.speed * dt, limits.north, limits.south);
      const clearance = Math.max(floorAt(x, z, plane ? 6.5 : 4.2), floorAt(x + dx * 12, z + dz * 12, 4));
      const sinkFloor = Math.max(8, clearance);
      let climb = raise ? (plane ? 11 : 9) : lower && p.y > sinkFloor ? (plane ? -9 : -7) : 0;
      if (p.y < clearance) climb = Math.max(climb, Math.min(18, (clearance - p.y) * 2.7));
      vehicle.vertical = lerp(vehicle.vertical, climb, smooth);
      const floor = Math.min(p.y, sinkFloor);
      p.set(x, clamp(p.y + vehicle.vertical * dt, floor, limits.ceiling), z);
      const tilt = plane ? clamp(vehicle.vertical * .016, -.21, .23) : -.18 * vehicle.speed / 25;
      group.rotation.x = lerp(group.rotation.x, tilt, smooth);
      group.rotation.z = lerp(group.rotation.z, -actualSteer * (plane ? .53 : .2), smooth);
      vehicle.power = lerp(vehicle.power, raise ? 1 : plane ? .72 : .62, smooth);
    }

    function boardingDistance(vehicle, point) {
      const { position } = vehicle.group;
      if (!canExit(vehicle)) return Infinity;
      return Math.hypot(point.x - position.x, point.z - position.z);
    }

    function canExit(vehicle) {
      return !vehicle.airborne && !vehicle.approach && vehicle.speed < 1.7;
    }

    return { vehicles, startLanding, canExit, boardingDistance, update };
  }

  return { create };
})();
