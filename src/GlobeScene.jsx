import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { drawThreeGeo } from "./threeGeoJSON.js";
import { SatelliteDot } from "./satelliteDot.js";
import ClockHUD from "./hud.jsx";
import SummaryCard from "./SummaryCard.jsx";

// NEW utils
import { BASE, fetchIds, fetchGeoJSON, fetchSummary } from "./utils/api.js";
import { sampleUnique } from "./utils/random.js";
import { eventToNDC, findSatDot } from "./utils/picking.js";
import { createStars, disposeStars } from "./utils/stars.js";

export default function GlobeScene() {
  const containerRef = useRef(null);

  // UI state
  const [utc, setUtc] = useState(() => new Date());
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const summaryAbortRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // tick UTC clock
    const clock = setInterval(() => setUtc(new Date()), 1000);

    // scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfaf7f0);

    const camera = new THREE.PerspectiveCamera(75, w / h, 1, 100);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 6;
    controls.maxDistance = 60;

    // globe wireframe
    const geometry = new THREE.SphereGeometry(5);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const edges = new THREE.EdgesGeometry(geometry, 5);
    const line = new THREE.LineSegments(edges, lineMat);
    line.renderOrder = 9;
    scene.add(line);

    // countries
    let countriesGroup = null;
    fetchGeoJSON("/geojson/countries_states.geojson")
      .then((data) => {
        countriesGroup = drawThreeGeo({
          json: data,
          radius: 5,
          materialOptions: { color: 0x000000, opacity: 0.3 },
        });
        countriesGroup.traverse((o) => {
          if (o.material) {
            o.material.depthWrite = false;
            o.renderOrder = 10;
          }
        });
        scene.add(countriesGroup);
      })
      .catch((e) => console.error("GeoJSON load error:", e));

    // satellites
    const sats = [];
    const startTimers = [];
    const COUNT = 800;
    const DOT_RADIUS = 0.05;
    const pickables = [];

    (async () => {
      const allIds = await fetchIds(1000);
      const ids = sampleUnique(allIds, COUNT);
      ids.forEach((id, i) => {
        const dot = new SatelliteDot({
          scene,
          noradId: id,
          earthRadius: 5,
          dotRadius: DOT_RADIUS,
          pollMs: 2500 + (i % 20) * 120, // ~2.5–4.9s (jitter)
          lerpSpeed: 6,
          baseUrl: BASE,
        });
        sats.push(dot);
        pickables.push(dot.mesh);
        const t = setTimeout(() => dot.start(), (i % 30) * 100); // stagger up to 3s
        startTimers.push(t);
      });
    })();

    // picking
    renderer.domElement.style.cursor = "auto";
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let hovered = null;
    let selected = null;

    async function loadSummary(noradId) {
      try {
        summaryAbortRef.current?.abort?.();
        const ac = new AbortController();
        summaryAbortRef.current = ac;
        setSummaryOpen(true);
        setSummaryLoading(true);
        setSummaryError(null);
        setSummaryData(null);
        const data = await fetchSummary(noradId, { signal: ac.signal });
        setSummaryData(data);
      } catch (e) {
        if (e.name !== "AbortError") setSummaryError(e);
      } finally {
        setSummaryLoading(false);
      }
    }

    async function onClick(e) {
      const ndc = eventToNDC(renderer.domElement, e);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(pickables, true);
      if (!hits.length) return;

      const dot = findSatDot(hits[0].object);
      if (!dot) return;

      // deselect previous
      if (selected && selected !== dot) {
        selected.setSelected(false);
        selected.setHover(false);
        await selected.hideOrbit();
      }

      // toggle if clicking same one
      if (selected === dot) {
        await dot.hideOrbit();
        dot.setSelected(false);
        dot.setHover(false);
        selected = null;
        setSummaryOpen(false);
        summaryAbortRef.current?.abort?.();
      } else {
        dot.setSelected(true);
        dot.setHover(true);
        await dot.showOrbit();
        selected = dot;
        loadSummary(dot.noradId);
      }
    }
    renderer.domElement.addEventListener("click", onClick);

    function onPointerMove(e) {
      const ndc = eventToNDC(renderer.domElement, e);
      mouse.x = ndc.x;
      mouse.y = ndc.y;

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(pickables, true);
      renderer.domElement.style.cursor = hits.length ? "pointer" : "auto";

      const dot = hits.length ? findSatDot(hits[0].object) : null;
      if (dot !== hovered) {
        if (hovered && hovered !== selected) hovered.setHover(false);
        if (dot && dot !== selected) dot.setHover(true);
        hovered = dot;
      }
    }
    renderer.domElement.addEventListener("pointermove", onPointerMove);

    // stars
    const starObjs = createStars(scene, {
      starCount: 4000,
      minRadius: controls.maxDistance + 0.5,
      maxRadius: camera.far * 0.95,
      texturePaths: ["/trans_star.png", "/trans_star2.png", "/trans_star3.png", "/trans_star4.png"],
    });

    // loop
    let rafId = 0;
    let last = performance.now();
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;

      for (const d of sats) d.update(dt);

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // resize
    const onResize = () => {
      const w2 = container.clientWidth;
      const h2 = container.clientHeight;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    // cleanup
    return () => {
      clearInterval(clock);
      cancelAnimationFrame(rafId);
      ro.disconnect();
      controls.dispose();
      summaryAbortRef.current?.abort?.();

      if (countriesGroup) scene.remove(countriesGroup);
      scene.remove(line);
      disposeStars(scene, starObjs);

      startTimers.forEach(clearTimeout);
      sats.forEach((d) => d.dispose());

      edges.dispose();
      geometry.dispose();
      lineMat.dispose();

      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", onClick);

      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      <ClockHUD utc={utc} />
      {summaryOpen && (
        <SummaryCard
          data={summaryData}
          loading={summaryLoading}
          error={summaryError}
          onClose={() => {
            setSummaryOpen(false);
            summaryAbortRef.current?.abort?.();
          }}
        />
      )}
    </div>
  );
}
