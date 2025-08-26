import * as THREE from "three";

export function latLonAltToVec3(latDeg, lonDeg, altKm, earthRadius = 5, earthRadiusKm = 6371) {
  
    const r = earthRadius * (1 + altKm / earthRadiusKm);
    const lat = THREE.MathUtils.degToRad(latDeg);
    const lon = -THREE.MathUtils.degToRad(lonDeg);   // east-positive
    const cosLat = Math.cos(lat), sinLat = Math.sin(lat);
    const cosLon = Math.cos(lon), sinLon = Math.sin(lon);
    const x = r * cosLat * cosLon;
    const y = r * sinLat;
    const z = r * cosLat * sinLon;

    return new THREE.Vector3(x, y, z);
}