/**
 * One shader for every body in the traffic layer — project worlds, moons,
 * the gas giant out past the rim. Everything is procedural: the realism has
 * to come from the terminator, the atmosphere and the scale, not from an
 * 8k albedo map we would have to ship.
 *
 * Lit from the galactic core at the origin, which is also what lights the
 * dust, so a world's day side always faces the brightest thing on screen.
 */
export const worldVert = /* glsl */ `
  precision highp float;

  varying vec3 vN;
  varying vec3 vWP;

  void main() {
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWP = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const worldFrag = /* glsl */ `
  precision highp float;

  uniform vec3 uLightPos;
  uniform vec3 uLightColor;
  uniform vec3 uBase;
  uniform vec3 uBase2;
  uniform vec3 uAccent;
  uniform vec3 uAtmoColor;
  uniform float uSeed;
  uniform float uTime;
  uniform float uFeature;   // continent / band frequency
  uniform float uCity;      // night-side settlement density
  uniform float uCloud;     // cloud cover
  uniform float uSpec;      // specular water
  uniform float uAtmo;      // rim thickness
  uniform float uBands;     // 1 = banded gas giant, 0 = rocky continents
  uniform float uAmbient;
  /**
   * 0 on the homepage (never set, so WebGL defaults it to 0 and the output is
   * unchanged). 1 on /explore, where a world fills half the screen and the
   * far-view settlement dusting would read as noise: settlements then keep
   * to coasts and to a few populated regions.
   */
  uniform float uCloseUp;

  varying vec3 vN;
  varying vec3 vWP;

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
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 4; i++) {
      s += a * vnoise(p);
      p = p * 2.07 + 13.7;
      a *= 0.5;
    }
    return s;
  }

  void main() {
    vec3 N = normalize(vN);
    vec3 L = normalize(uLightPos - vWP);
    vec3 V = normalize(cameraPosition - vWP);
    float ndl = dot(N, L);

    // soft terminator — a hard edge is the tell of a cheap planet
    float day = smoothstep(-0.14, 0.32, ndl);

    vec3 sp = N * uFeature + uSeed;
    float land = fbm(sp);
    if (uBands > 0.5) {
      // latitude banding with a little turbulence
      float turb = fbm(sp * 0.6) * 0.35;
      land = 0.5 + 0.5 * sin(N.y * 9.0 + turb * 6.0 + uSeed);
    }

    vec3 albedo = mix(uBase, uBase2, smoothstep(0.42, 0.58, land));
    // fine surface break-up so the lit limb is not a flat ball
    albedo *= 0.82 + 0.34 * fbm(sp * 6.0 + 4.0);

    // drifting cloud deck
    if (uCloud > 0.001) {
      float cl = fbm(vec3(sp.x * 1.4, sp.y * 2.6, sp.z * 1.4) + uTime * 0.004);
      albedo = mix(albedo, vec3(0.66, 0.64, 0.7), uCloud * smoothstep(0.5, 0.8, cl));
    }

    vec3 col = albedo * uLightColor * day * 1.4;

    // specular glint off water, only on the sea side of the terminator
    if (uSpec > 0.001) {
      vec3 H = normalize(L + V);
      float sea = 1.0 - smoothstep(0.34, 0.5, land);
      col += uLightColor * pow(max(0.0, dot(N, H)), 110.0) * uSpec * sea * day * 1.1;
    }

    // settlements on the night side: a fine dusting that hugs the coast,
    // two noise octaves multiplied so it never blooms into cloud
    if (uCity > 0.001) {
      float night = smoothstep(0.12, -0.2, ndl);
      float grain = fbm(sp * 12.0 + 21.0);
      float fine = fbm(sp * 29.0 + 5.0);
      float coast =
        smoothstep(0.36, 0.46, land) * (1.0 - smoothstep(0.52, 0.66, land));
      float city = smoothstep(0.58, 0.8, grain) * smoothstep(0.45, 0.78, fine);
      float region = mix(1.0, smoothstep(0.47, 0.62, fbm(sp * 1.35 + 7.0)), uCloseUp);
      city *= mix(0.22 + 0.78 * coast, 0.03 + 0.97 * coast, uCloseUp) * region;
      col += uAccent * city * night * uCity * 1.45;
    }

    // atmosphere: thin limb that brightens toward the lit edge
    float rim = pow(1.0 - max(0.0, dot(N, V)), 3.0);
    col += uAtmoColor * rim * uAtmo * (0.28 + 0.72 * day);

    col += albedo * uAmbient;

    gl_FragColor = vec4(col, 1.0);

    #include <colorspace_fragment>
  }
`;

/** Planetary rings: flat annulus, banded, dimmed where the planet shadows it. */
export const ringVert = /* glsl */ `
  precision highp float;
  varying vec3 vWP;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWP = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const ringFrag = /* glsl */ `
  precision highp float;

  uniform vec3 uColor;
  uniform vec3 uCenter;
  uniform float uInner;
  uniform float uOuter;
  uniform float uSeed;
  uniform float uOpacity;

  varying vec3 vWP;
  varying vec2 vUv;

  float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    return fract((p + p) * p);
  }

  void main() {
    float r = length(vWP - uCenter);
    float t = clamp((r - uInner) / max(0.0001, uOuter - uInner), 0.0, 1.0);

    // gaps and bands
    float bands = 0.55 + 0.45 * sin(t * 46.0 + uSeed * 9.0);
    bands *= 0.6 + 0.4 * sin(t * 13.0 + uSeed * 3.0);
    float gap = smoothstep(0.42, 0.46, abs(t - 0.52));

    float edge = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.86, 1.0, t));
    float a = bands * gap * edge * uOpacity;
    if (a < 0.003) discard;

    gl_FragColor = vec4(uColor, a);

    #include <colorspace_fragment>
  }
`;
