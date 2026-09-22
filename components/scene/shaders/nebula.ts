export const nebulaVert = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Domain-warped value-noise fBm. Warping is what makes gas look like gas:
 * an unwarped fBm reads as a Photoshop cloud filter.
 */
export const nebulaFrag = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3 uTint;
  uniform vec3 uTint2;
  uniform float uIntensity;
  uniform float uSeed;
  uniform float uScale;

  varying vec2 vUv;

  float hash31(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);

    float n000 = hash31(i);
    float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash31(i + vec3(1.0, 1.0, 1.0));

    return mix(
      mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
      mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
      f.z
    );
  }

  float fbm(vec3 p) {
    float amp = 0.5;
    float sum = 0.0;
    for (int i = 0; i < 5; i++) {
      sum += amp * vnoise(p);
      p = p * 2.03 + 17.1;
      amp *= 0.5;
    }
    return sum;
  }

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float mask = 1.0 - smoothstep(0.18, 1.0, length(p));
    if (mask <= 0.002) discard;

    vec3 q = vec3(p * uScale, uSeed + uTime * 0.010);
    float w = fbm(q * 0.85);
    vec3 q2 = q + vec3(w * 1.5, w * 1.15, w * 0.3);

    float body = pow(clamp(fbm(q2), 0.0, 1.0), 2.5);
    float filament = pow(clamp(fbm(q2 * 2.9), 0.0, 1.0), 4.2) * 0.55;

    float a = (body + filament) * mask * uIntensity;
    if (a < 0.0015) discard;

    vec3 col = mix(uTint, uTint2, clamp(filament * 2.4, 0.0, 1.0));
    gl_FragColor = vec4(col, a);

    #include <colorspace_fragment>
  }
`;
