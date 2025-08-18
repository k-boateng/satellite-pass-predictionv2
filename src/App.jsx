import { useEffect } from 'react';
import * as THREE from 'three';




function App() {
  useEffect(()=>{
    const scene = new THREE.Scene();

    
  })

  return (
    <>
      <div>
        <canvas id="threejscanvas"/>
      </div>
    </>
  )
}

export default App
