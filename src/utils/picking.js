import * as THREE from "three";

export function eventToNDC(dom, e) {
  const rect = dom.getBoundingClientRect();
  return new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
}

export function findSatDot(object) {
  let o = object;
  while (o && !o.userData?.satRef) o = o.parent;
  return o?.userData?.satRef ?? null; // returns SatelliteDot or null
}


