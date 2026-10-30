import * as THREE from 'three';

export function createSky(sunDir) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { sunDir: { value: sunDir } },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
        gl_Position.z = gl_Position.w;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 sunDir;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = max(d.y, 0.0);
        vec3 zenith  = vec3(0.50, 0.27, 0.14);
        vec3 mid     = vec3(0.80, 0.47, 0.24);
        vec3 horizon = vec3(0.93, 0.66, 0.42);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.18, h));
        col = mix(col, zenith, smoothstep(0.12, 0.7, h));
        float cosA = dot(d, normalize(sunDir));
        // halo azulado alrededor del sol (dispersión del polvo marciano)
        float halo = pow(max(cosA, 0.0), 24.0);
        col = mix(col, vec3(0.62, 0.72, 0.85), halo * 0.6);
        col += vec3(1.0, 0.75, 0.45) * pow(max(cosA, 0.0), 12.0) * 0.22;
        // disco solar
        float disk = smoothstep(0.99955, 0.99975, cosA);
        col += vec3(6.0, 5.6, 5.0) * disk;
        // bruma de polvo en el horizonte
        col = mix(col, vec3(0.86, 0.58, 0.36), (1.0 - smoothstep(0.0, 0.08, abs(d.y))) * 0.6);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1500, 64, 32), mat);
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  return mesh;
}
