import * as THREE from "three";
import { latLonAltToVec3 } from "./latlonToVector";

export class SatelliteDot {
  constructor({
    scene,
    noradId,
    color = 0xff0000,
    dotRadius = 0.06,
    earthRadius = 5,
    baseUrl = "http://127.0.0.1:8000",
    pollMs = 3000,
    lerpSpeed = 6, // higher = snappier
  }) {
    this.scene = scene;
    this.noradId = noradId;
    this.earthRadius = earthRadius;
    this.baseUrl = baseUrl;
    this.pollMs = pollMs;
    this.lerpSpeed = lerpSpeed;

    //basic dot
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(dotRadius, 16, 16),
      new THREE.MeshBasicMaterial({ color })
    );
    this.mesh.renderOrder = 5;
    this.mesh.userData.satRef = this;
    this.scene.add(this.mesh);

    // halo glow - visible on mouse hover
    const glowGeom = new THREE.SphereGeometry(dotRadius * 2.0, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffa500,         // orange
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.glow = new THREE.Mesh(glowGeom, glowMat);
    this.glow.visible = false;
    this.glow.userData.satRef = this;
    this.mesh.add(this.glow);

    this.current = new THREE.Vector3(0, 0, earthRadius * 1.02);
    this.target = this.current.clone();

    this._stopped = false;
    this._timer = null;
    this._poll = this._poll.bind(this);

    this._hovered = false;
    this._selected = false;
    this._baseColor = color;
    this.orbitGroup = null;
  
}

  async _poll() {
  try {
    const r = await fetch(`${this.baseUrl}/api/satellites/${this.noradId}/state`);
    if (r.ok) {
      const s = await r.json(); // <-- define s here
      this.target = latLonAltToVec3(s.lat, s.lon, s.alt_km, this.earthRadius);
      // on very first valid fetch, snap current to target so it’s visible off origin
      if (this.current.length() === 0) this.current.copy(this.target);
    } else {
      console.warn("[state !ok]", this.noradId, r.status);
    }
  } catch (e) {
    console.warn("[state error]", this.noradId, e);
  } finally {
    if (!this._stopped) this._timer = setTimeout(this._poll, this.pollMs);
  }
}

  start() { this._poll(); }

  // call every frame; dt in seconds
  update(dt) {
    const k = 1 - Math.exp(-this.lerpSpeed * dt);
    this.current.lerp(this.target, k);
    this.mesh.position.copy(this.current);
  }

  dispose() {
    this._stopped = true;
    if (this._timer) clearTimeout(this._timer);
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}