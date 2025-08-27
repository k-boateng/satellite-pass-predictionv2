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

    this._pulseOn = false;
    this._pulseT = 0;          // time accumulator for pulse
    this._glowBaseOpacity = 0.4;
    this._glowBaseScale = 0.7;   // starting scale for glow

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
      const s = await r.json();
      this.target = latLonAltToVec3(s.lat, s.lon, s.alt_km, this.earthRadius);
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

  // pulse the glow if selected
  if (this._pulseOn) {
    this._pulseT += dt;
    const freq = 1;                           // ~1 pulse per second
    const s = 0.75 + 0.35 * (1 + Math.sin(2 * Math.PI * freq * this._pulseT)); // 0.75..1.45
    const op = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(2 * Math.PI * freq * this._pulseT)); // 0.25..0.60
    this.glow.scale.setScalar(this._glowBaseScale * s);
    this.glow.material.opacity = op;
  }
  }

  setHover(flag) {
    this._hovered = flag;
    this.glow.visible = flag;
    if (!this._selected) {
      this.mesh.material.color.set(flag ? 0xffa500 : this._baseColor); // orange on hover
    }
  }

  setSelected(flag) {
    this._selected = flag;
    this.mesh.material.color.set(flag ? 0x00ff00 : (this._hovered ? 0xffa500 : this._baseColor));
  }

  async showOrbit() {
    await hideOrbit(); //Clears everything first
    try {
    //Fetches groundtrack from the api
      const r = await fetch(`${this.baseUrl}/api/satellites/${this.noradId}/groundtrack?step_s=60`);
      if (!r.ok) return;
      const data = await r.json();
      const pts = data.points;

    // build segments, splitting at the date-line seam
      const group = new THREE.Group();
      const seg = [];
      let prevLon = null;
      const radius = this.earthRadius * 1.003;

      const makeLine = (arr) => {
        if (arr.length < 2) return;
        const verts = [];
        for (const [lat, lon] of arr) {
          const v = latLonAltToVec3(lat, lon, 0, radius);
          verts.push(v.x, v.y, v.z);
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
        const mat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9 });
        const line = new THREE.Line(geom, mat);
        line.renderOrder = 4;
        group.add(line);
      };

      for (const [lat, lon] of pts) {
        if (prevLon !== null && Math.abs(lon - prevLon) > 180) {
          makeLine(seg.splice(0, seg.length)); // flush segment
        }
        seg.push([lat, lon]);
        prevLon = lon;
      }
      makeLine(seg);

      this.scene.add(group);
      this.orbitGroup = group;
    } catch {}
  }

    async hideOrbit() {

    if (!this.orbitGroup) return;
    this.scene.remove(this.orbitGroup);
    // dispose children
    this.orbitGroup.traverse((obj) => {
      if (obj.isLine) {
        obj.geometry?.dispose?.();
        obj.material?.dispose?.();
      }
    });
    
    this.orbitGroup = null;
  }



  dispose() {
    this._stopped = true;
    if (this._timer) clearTimeout(this._timer);
    this.hideOrbit();
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.glow.geometry.dispose();
    this.glow.material.dispose();
  }
}