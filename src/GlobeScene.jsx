import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { drawThreeGeo } from "./threeGeoJSON.js";
import { latLonAltToVec3 } from "./latlonToVector.js"


export default function GlobeScene() {
    
    const containerRef = useRef(null);

    useEffect(() => {

        const container = containerRef.current;
        const w = container.clientWidth;
        const h = container.clientHeight;


        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xfaf7f0);

        const camera = new THREE.PerspectiveCamera(75, w / h, 1, 100);
        camera.position.z = 10;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(w, h);
        container.appendChild(renderer.domElement);


        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.minDistance = 6;
        controls.maxDistance = 20;

        const geometry = new THREE.SphereGeometry(5);
        const lineMat = new THREE.LineBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.2,
        });
        const edges = new THREE.EdgesGeometry(geometry, 5);
        const line = new THREE.LineSegments(edges, lineMat);
        scene.add(line);

    
        let countriesGroup = null;
        fetch("/geojson/countries_states.geojson")
        .then((r) => r.json())
        .then((data) => {
            countriesGroup = drawThreeGeo({
            json: data,
            radius: 5,
            materialOptions: { color: 0x000000 },
            });
            scene.add(countriesGroup);
        })
        .catch((e) => console.error("GeoJSON load error:", e));

        // Satellite Swarm
        const MAX_SATS = 200;
        const DOT_RADIUS = 0.12;

        const satGeom = new THREE.SphereGeometry(DOT_RADIUS, 10, 10);
        const satMat  = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const swarm   = new THREE.InstancedMesh(satGeom, satMat, MAX_SATS);
        swarm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        swarm.renderOrder = 5;
        scene.add(swarm);

        // math helpers for swarm
        const _m = new THREE.Matrix4();
        const _q = new THREE.Quaternion();
        const _s = new THREE.Vector3(1, 1, 1);

        // state
        let swarmStop = false;
        let noradIds = [];
        const targets    = Array.from({ length: MAX_SATS }, () => null);
        const currents   = Array.from({ length: MAX_SATS }, () => new THREE.Vector3());
        const initialized = Array.from({ length: MAX_SATS }, () => false);

        
        swarm.count = 0;

        async function fetchIds() {
            try {
                const r = await fetch("http://127.0.0.1:8000/api/debug/sat-ids?limit=800");
                if (r.ok) {
                const ids = await r.json();
                // random sample up to MAX_SATS
                const pick = [];
                const used = new Set();
                while (pick.length < Math.min(ids.length, MAX_SATS)) {
                    const k = (Math.random() * ids.length) | 0;
                    if (!used.has(k)) { used.add(k); pick.push(ids[k]); }
                }
                return pick;
                }
            } catch {}
            return [25544]; // fallback
            }
        
        async function pollSwarm() {
            if (!noradIds.length) noradIds = await fetchIds();
            const N = Math.min(noradIds.length, MAX_SATS);

            const CHUNK = 25, GAP_MS = 250;

            const fetchOne = async (i, id) => {
                try {
                const r = await fetch(`http://127.0.0.1:8000/api/satellites/${id}/state`);
                if (!r.ok) return;
                const s = await r.json();
                const p = latLonAltToVec3(s.lat, s.lon, s.alt_km, 5);  // NOTE: lon is negated inside this
                targets[i] = p;

                if (!initialized[i]) {
                    // snap current to target and write matrix now
                    currents[i].copy(p);
                    _m.compose(currents[i], _q, _s);
                    swarm.setMatrixAt(i, _m);
                    initialized[i] = true;

                    //bump swarm.count so this instance starts rendering only now
                    const visible = initialized.filter(Boolean).length;
                    swarm.count = visible;
                    swarm.instanceMatrix.needsUpdate = true;
                }
                } catch {}
            };

        for (let i = 0; i < N; i += CHUNK) {
            await Promise.all(noradIds.slice(i, i + CHUNK).map((id, k) => fetchOne(i + k, id)));
            if (i + CHUNK < N) await new Promise(res => setTimeout(res, GAP_MS));
        }

        if (!swarmStop) setTimeout(pollSwarm, 5000);
        }

    pollSwarm();
    
    

        //Starry background
        const starObjs = [];
        (function starBackground() {
        const starCount = 4000;
        const minRadius = controls.maxDistance + 0.5;
        const maxRadius = camera.far * 0.95;

        const texturePaths = [
            "/trans_star.png",
            "/trans_star2.png",
            "/trans_star3.png",
            "/trans_star4.png",
        ];
        const loader = new THREE.TextureLoader();
        const textures = texturePaths.map((p) => loader.load(p));

        const buckets = textures.map(() => []);

        for (let i = 0; i < starCount; i++) {
            const u = Math.random(),
            v = Math.random();
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
        })();

        //animation
        let rafId = 0;
        const animate = () => {
            rafId = requestAnimationFrame(animate);
           

            controls.update();
            renderer.render(scene, camera);

            };
        animate();

        //resize handling
        const onResize = () => {
            const w2 = container.clientWidth;
            const h2 = container.clientHeight;
            camera.aspect = w2 / h2;
            camera.updateProjectionMatrix();
            renderer.setSize(w2, h2);
            };
        const ro = new ResizeObserver(onResize);
        ro.observe(container);

        
        //Cleanup
        return () => {
        cancelAnimationFrame(rafId);
        ro.disconnect();
        controls.dispose();

        
        if (countriesGroup) scene.remove(countriesGroup);
        scene.remove(line);
        starObjs.forEach(({ stars }) => scene.remove(stars));


        edges.dispose();
        geometry.dispose();
        lineMat.dispose();

        starObjs.forEach(({ geom, mat, tex }) => {
            geom.dispose();
            mat.dispose();
            tex?.dispose?.();
        });

        renderer.dispose();
        container.removeChild(renderer.domElement);
        };
    }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh", overflow: "hidden" }}
    />
  );
}


