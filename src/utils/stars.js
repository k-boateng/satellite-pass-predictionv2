import * as THREE from "three";

export function createStars(scene, { starCount, minRadius, maxRadius, texturePaths }) {
  const loader = new THREE.TextureLoader();
  const textures = texturePaths.map((p) => loader.load(p));
  const buckets = textures.map(() => []);

  for (let i = 0; i < starCount; i++) {
    const u = Math.random(), v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const t = Math.random();
    const r = Math.cbrt(minRadius ** 3 + t * (maxRadius ** 3 - minRadius ** 3));
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    const idx = (Math.random() * textures.length) | 0;
    buckets[idx].push(x, y, z);
  }

  const starObjs = [];
  buckets.forEach((positions, i) => {
    if (!positions.length) return;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      map: textures[i],
      color: 0xffffff,
      size: 1.0,
      sizeAttenuation: true,
      transparent: true,
      alphaTest: 0.3,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const stars = new THREE.Points(geom, mat);
    scene.add(stars);
    starObjs.push({ geom, mat, stars, tex: textures[i] });
  });

  return starObjs; // keep this array to dispose later
}

export function disposeStars(scene, starObjs) {
  starObjs.forEach(({ stars, geom, mat, tex }) => {
    scene.remove(stars);
    geom.dispose();
    mat.dispose();
    tex?.dispose?.();
  });
}

