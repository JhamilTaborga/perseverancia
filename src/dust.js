import * as THREE from 'three';

function softSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,220,180,1)');
  grd.addColorStop(1, 'rgba(255,220,180,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createDust(center) {
  const N = 2500, R = 70;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = center.x + (Math.random() * 2 - 1) * R;
    pos[i * 3 + 1] = Math.random() * 14;
    pos[i * 3 + 2] = center.z + (Math.random() * 2 - 1) * R;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.35, map: softSprite(), transparent: true, opacity: 0.35,
    depthWrite: false, color: 0xe8b080,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  // center se puede mover (sigue a la cámara); las partículas se reciclan alrededor
  points.userData.center = center;
  points.userData.update = (dt, t) => {
    const p = geo.attributes.position;
    for (let i = 0; i < N; i++) {
      let x = p.getX(i) + dt * 3.2;
      let z = p.getZ(i) + dt * 1.6;
      let y = p.getY(i) + Math.sin(t * 0.7 + i) * dt * 0.3;
      if (x > center.x + R) x -= 2 * R; else if (x < center.x - R) x += 2 * R;
      if (z > center.z + R) z -= 2 * R; else if (z < center.z - R) z += 2 * R;
      if (y > center.y + 14) y -= 14; else if (y < center.y - 2) y += 14;
      p.setXYZ(i, x, y, z);
    }
    p.needsUpdate = true;
  };
  return points;
}
