import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { drawThreeGeo } from "./threeGeoJSON.js";

export default function GlobeScene() {
 
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

        const geometry = new THREE.SphereGeometry(5, 64, 64);
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

        


