/**
 * /explore's own shaders. Nothing here is imported by the homepage, which
 * keeps its worlds on components/scene/shaders/world.ts.
 *
 * Everything is procedural: no maps, nothing to download. Surface features
 * are read in object space so they turn with the world; lighting is in
 * world space so the terminator stays put.
 */

const NOISE = /* glsl */ `
  float hash31(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash31(i), hash31(i + vec3(1, 0, 0)), f.x),
          mix(hash31(i + vec3(0, 1, 0)), hash31(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash31(i + vec3(0, 0, 1)), hash31(i + vec3(1, 0, 1)), f.x),
          mix(hash31(i + vec3(0, 1, 1)), hash31(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }

  float fbm(vec3 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 5; i++) {
      s += a * vnoise(p);
      p = p * 2.03 + 17.1;
      a *= 0.5;
    }
    return s / 0.97;
  }

  float fbm3(vec3 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 3; i++) {
      s += a * vnoise(p);
      p = p * 2.11 + 7.3;
      a *= 0.5;
    }
    return s / 0.875;
  }
`;

export const planetVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vObj;
  varying vec3 vWP;

  void main() {
    vObj = normalize(position);
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWP = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const planetFrag = /* glsl */ `
  uniform vec3 uLightDir;
  uniform vec3 uLightColor;
  uniform vec3 uFillDir;
  uniform vec3 uFillColor;
  uniform vec3 uA;
  uniform vec3 uB;
  uniform vec3 uC;
  uniform vec3 uAtmo;
  uniform float uAtmoStrength;
  uniform vec3 uLights;
  uniform float uLightAmt;
  uniform float uKind;
  uniform float uSeed;
  uniform float uTime;
  uniform float uCloud;
  uniform float uSpec;
  uniform vec3 uMarker;
  uniform float uMarkerSize;
  uniform vec3 uAccent;

  varying vec3 vN;
  varying vec3 vObj;
  varying vec3 vWP;

  ${NOISE}

  /**
   * Sparse point lights: at most one per grid cell, crisp, anti-aliased.
   * Below a pixel the dot keeps its energy instead of shimmering, so a
   * distant world glows faintly rather than sparkling.
   */
  float dots(vec3 p, float freq, float keep, float size, float px) {
    vec3 q = p * freq;
    vec3 id = floor(q);
    vec3 f = fract(q);
    float h = hash31(id + uSeed * 3.1);
    vec3 c = 0.25 + 0.5 * vec3(hash31(id + 1.7), hash31(id + 5.3), hash31(id + 9.1));
    float d = length(f - c);
    float foot = px * freq;
    size *= 1.8;
    float r = max(size, foot);
    float energy = (size * size) / (r * r);
    float on = step(h, keep) * (0.55 + 0.45 * hash31(id + 3.3));
    return on * (1.0 - smoothstep(r * 0.35, r, d)) * energy;
  }

  /** single-cell craters: dark bowl, bright rim */
  vec2 craters(vec3 p, float freq, float keep) {
    vec3 q = p * freq;
    vec3 id = floor(q);
    vec3 f = fract(q);
    float h = hash31(id + uSeed * 1.9);
    vec3 c = 0.35 + 0.3 * vec3(hash31(id + 2.1), hash31(id + 4.7), hash31(id + 8.3));
    float rad = 0.12 + 0.14 * hash31(id + 6.1);
    float d = length(f - c) / rad;
    float on = step(h, keep);
    float bowl = on * (1.0 - smoothstep(0.55, 1.0, d));
    float rim = on * exp(-pow((d - 1.0) / 0.18, 2.0));
    return vec2(bowl, rim);
  }

  /**
   * Holler!'s venues: one per lit cell, gold or ember (a few mint sparks),
   * each a crisp core in a small halo that never reaches the cell edge.
   * The ember ones — the long lines — breathe on the app's 2.4 s beat.
   */
  vec3 venues(vec3 p, float freq, float keep, float size, float px) {
    vec3 q = p * freq;
    vec3 id = floor(q);
    vec3 f = fract(q);
    float h = hash31(id + uSeed * 4.3);
    if (h > keep) return vec3(0.0);
    vec3 c = 0.3 + 0.4 * vec3(hash31(id + 2.9), hash31(id + 6.1), hash31(id + 8.7));
    float d = length(f - c);
    float foot = px * freq;
    float r = max(size, foot);
    float energy = (size * size) / (r * r);
    float pick = hash31(id + 7.7);
    vec3 col = pick < 0.34 ? vec3(1.0, 0.18, 0.42) : pick < 0.42 ? vec3(0.18, 0.95, 0.77) : vec3(1.0, 0.77, 0.24);
    float beat = pick < 0.34 ? 0.72 + 0.28 * sin(uTime * 2.618 + h * 40.0) : 1.0;
    float core = (1.0 - smoothstep(r * 0.3, r, d)) * energy;
    float hd = 1.0 - smoothstep(0.0, 0.3, d);
    float halo = hd * hd * 0.3 * (0.4 + 0.6 * energy);
    return col * (core + halo) * beat * (0.6 + 0.4 * hash31(id + 3.3));
  }

  void main() {
    vec3 N = normalize(vN);
    bool inside = false;
    if (!gl_FrontFacing) { N = -N; inside = true; }
    vec3 L = uLightDir;
    vec3 V = normalize(cameraPosition - vWP);
    vec3 p = normalize(vObj);
    float ndl = dot(N, L);
    float day = smoothstep(-0.06, 0.34, ndl);
    float night = 1.0 - smoothstep(-0.16, 0.1, ndl);
    float fill = max(dot(N, uFillDir), 0.0);
    // world-space size of one pixel on the unit sphere, for the light dots
    float px = length(fwidth(p));

    vec3 albedo = uA;
    vec3 glow = vec3(0.0);     // emitted light, added after shading
    float spec = 0.0;          // specular weight (water)
    float gloss = 60.0;
    float cloud = 0.0;
    int kind = int(uKind + 0.5);

    if (kind == 0) {
      // STUDIO — dark glassy basalt threaded with faint lilac seams: a hub,
      // not a garden. The seams carry the few lights it has.
      float m = fbm(p * 2.4 + uSeed);
      albedo = mix(uA, uB, smoothstep(0.3, 0.75, m));
      albedo = mix(albedo, uC, smoothstep(0.66, 0.85, fbm3(p * 6.0 + 2.0)) * 0.35);
      float rr = 1.0 - abs(fbm3(p * 2.2 + 5.0) * 2.0 - 1.0);
      float seamW = 0.008 + px * 1.2;
      float seam = smoothstep(1.0 - seamW * 2.0, 1.0 - seamW * 0.5, rr);
      glow += uAtmo * seam * (0.02 + 0.16 * night);
      glow += uLights * dots(p, 120.0, 0.8, 0.14, px) * seam * 1.3 * night;
      glow += uLights * dots(p, 55.0, 0.035, 0.1, px) * 0.5 * night;
      spec = 0.35;
      gloss = 140.0;
    } else if (kind == 1) {
      // SPYDER — deep ocean, a few coasts, thin cloud, coastal light string
      float h = fbm(p * 1.7 + uSeed) * 0.75 + fbm(p * 5.0 + uSeed * 2.0) * 0.25;
      float land = smoothstep(0.565, 0.58, h);
      float shallow = smoothstep(0.48, 0.565, h) * (1.0 - land);
      vec3 sea = mix(uA, vec3(0.05, 0.25, 0.36), shallow * 0.8);
      vec3 ground = mix(uB, uC, smoothstep(0.55, 0.8, fbm(p * 9.0 + 2.0)));
      albedo = mix(sea, ground, land);
      spec = (1.0 - land) * uSpec;
      gloss = 90.0;
      float coast = 1.0 - smoothstep(0.0, 0.012 + px * 2.0, abs(h - 0.583));
      float string = dots(p, 150.0, 0.85, 0.16, px) * coast;
      float inland = dots(p, 70.0, 0.08, 0.12, px) * land;
      glow += uLights * (string * 1.5 + inland * 0.8) * night;
      cloud = smoothstep(0.52, 0.8, fbm(vec3(p.x * 2.0, p.y * 4.2, p.z * 2.0) + vec3(uTime * 0.006, 0.0, 0.0) + 5.0)) * uCloud;
    } else if (kind == 2) {
      // GLOWDAILY — amber dunes under a thick warm sky, tea-gold towns
      vec3 q = p * 2.1 + uSeed;
      float w = fbm(q + vec3(fbm3(q * 1.6), fbm3(q * 1.6 + 4.0), 0.0) * 1.4);
      float dune = 0.5 + 0.5 * sin(p.y * 11.0 + w * 7.0);
      albedo = mix(uA, uB, smoothstep(0.3, 0.65, w));
      albedo = mix(albedo, uC, smoothstep(0.55, 0.85, w) * 0.75);
      albedo *= 0.82 + 0.28 * dune;
      float region = smoothstep(0.52, 0.66, fbm3(p * 3.2 + 11.0));
      float towns = dots(p, 90.0, 0.55 * region, 0.14, px) + dots(p, 40.0, 0.05, 0.1, px) * 0.6;
      glow += uLights * towns * 1.35 * night;
      cloud = smoothstep(0.6, 0.85, fbm3(vec3(p.x * 3.0, p.y * 6.0, p.z * 3.0) + 9.0 + uTime * 0.004)) * uCloud;
    } else if (kind == 3 || kind == 5) {
      // SSL (rock) / CTC (graphite moon) — cratered, airless
      float base = fbm(p * 3.0 + uSeed);
      albedo = mix(uA, uB, smoothstep(0.35, 0.7, base));
      albedo *= 0.8 + 0.35 * fbm(p * 14.0 + 1.0);
      vec2 c1 = craters(p, 5.0, 0.55);
      vec2 c2 = craters(p, 12.0, 0.45);
      albedo *= 1.0 - 0.35 * (c1.x + c2.x * 0.7);
      albedo += uB * 0.45 * (c1.y + c2.y * 0.6);
      if (kind == 5) {
        // teal mineral veins
        float r = 1.0 - abs(fbm3(p * 4.2 + 7.0) * 2.0 - 1.0);
        float vein = smoothstep(0.955, 0.99, r);
        albedo = mix(albedo, uC * 0.5, vein * 0.8);
        // a faint teal cast in crater floors
        albedo = mix(albedo, uC * 0.25, (c1.x + c2.x) * 0.3);
      } else {
        albedo = mix(albedo, uC * 0.6, smoothstep(0.62, 0.78, fbm3(p * 2.0 + 4.0)) * 0.5);
      }
      // the landmark, fixed to the ground: stadium or outpost
      if (uMarkerSize > 0.0) {
        vec3 M = uMarker;
        float d = length(N - M);
        if (kind == 3) {
          // an oval of floodlit field, and the town round it
          vec3 t1 = normalize(cross(M, vec3(0.0, 1.0, 0.0)));
          vec3 t2 = cross(M, t1);
          vec3 o = N - M;
          float e = length(vec2(dot(o, t1) / 1.5, dot(o, t2)));
          float field = 1.0 - smoothstep(0.022, 0.03 + px, e);
          glow += uLights * field * 2.4;
          glow += uAccent * exp(-d * d / 0.006) * 0.35;
          glow += uLights * dots(N, 60.0, 0.5, 0.14, px) * smoothstep(0.2, 0.06, d) * 0.9 * night;
        } else {
          glow += uLights * dots(N, 150.0, 0.8, 0.2, px) * smoothstep(0.07, 0.03, d) * 1.4;
          glow += uAccent * exp(-d * d / 0.004) * 0.18;
        }
      }
    } else if (kind == 4) {
      // SOB — open water, small islands, turquoise shallows, marina specks
      float h = fbm(p * 2.3 + uSeed) * 0.7 + fbm(p * 7.0 + uSeed) * 0.3;
      float land = smoothstep(0.625, 0.64, h);
      float shallow = smoothstep(0.5, 0.625, h) * (1.0 - land);
      vec3 sea = mix(uA, uB, pow(shallow, 0.9));
      sea = mix(sea, vec3(0.35, 0.85, 0.8), smoothstep(0.6, 0.625, h) * (1.0 - land) * 0.6);
      albedo = mix(sea, uC * (0.7 + 0.3 * fbm(p * 20.0)), land);
      spec = (1.0 - land) * uSpec;
      gloss = 140.0;
      float coast = 1.0 - smoothstep(0.0, 0.01 + px * 2.0, abs(h - 0.632));
      float marina = dots(p, 170.0, 0.6, 0.16, px) * coast;
      float boats = dots(p, 110.0, 0.03, 0.1, px) * shallow;
      glow += uLights * (marina * 1.4 + boats * 0.8) * night;
      cloud = smoothstep(0.62, 0.85, fbm(vec3(p.x * 2.5, p.y * 5.0, p.z * 2.5) + uTime * 0.005 + 2.0)) * uCloud;
    } else if (kind == 6) {
      // HOLOTRACKER — a station under construction: the lower hull plated,
      // the upper hull bare frame, a reactor glimpsed through the gaps
      float lat = asin(clamp(p.y, -1.0, 1.0));
      float lon = atan(p.z, p.x);
      vec2 g = vec2(lon / 6.2831853 * 40.0, lat / 3.1415927 * 20.0);
      vec2 cell = floor(g);
      vec2 f = fract(g);
      vec2 fw = fwidth(g) + 1e-4;
      vec2 edge = min(f, 1.0 - f) / fw;
      float strut = 1.0 - smoothstep(0.5, 1.5, min(edge.x, edge.y) - 0.035 / max(fw.x, fw.y));
      float jitter = (hash31(vec3(cell, 2.0)) - 0.5) * 0.35;
      float h = p.y + jitter;
      float built = (1.0 - step(0.25, h)) * step(hash31(vec3(cell, uSeed)), 0.95);
      float framed = 1.0 - step(0.78, h);
      if (strut < 0.5 && built < 0.5) discard;
      if (strut > 0.5 && framed < 0.5) discard;
      float panel = hash31(vec3(cell, 7.0));
      albedo = mix(uB, uC, panel * 0.7);
      // panel seams and a lighter stripe every few rows
      albedo *= 0.8 + 0.2 * step(0.5, fract(f.x * 2.0));
      albedo = mix(albedo, uA, strut);
      spec = (1.0 - strut) * 0.5;
      gloss = 50.0;
      // work lights at a few joints near the open edge
      vec2 joint = abs(f - 0.5) * 2.0;
      float jd = length((1.0 - joint) / (fw * 3.0));
      float jl = step(0.9, hash31(vec3(cell, 3.0))) * (1.0 - smoothstep(0.6, 1.4, jd)) * smoothstep(0.0, 0.6, h);
      glow += uLights * jl * 1.4;
      if (inside) {
        albedo *= 0.3;
        glow += uAccent * 0.05;
      }
    } else if (kind == 7) {
      // PORCHLIGHT — a dark, warm, almost unlit world; one porch light
      float h = fbm(p * 2.6 + uSeed);
      albedo = mix(uA, uB, smoothstep(0.35, 0.7, h));
      albedo = mix(albedo, uC, smoothstep(0.66, 0.82, fbm3(p * 5.0 + 2.0)) * 0.6);
      albedo *= 0.5;
      float d = length(N - uMarker);
      if (uMarkerSize > 0.0) {
        glow += uLights * (1.0 - smoothstep(0.01, 0.018 + px, d)) * 3.0;
        glow += uLights * exp(-d * d / 0.006) * 0.4;
      }
      cloud = smoothstep(0.64, 0.86, fbm3(p * 4.0 + uTime * 0.003)) * uCloud;
    } else if (kind == 8) {
      // gas giant — latitude bands, a storm or two
      float t = p.y * 7.0 + fbm(p * vec3(1.6, 9.0, 1.6) + uSeed) * 1.8;
      float bands = 0.5 + 0.5 * sin(t * 2.2);
      albedo = mix(uA, uB, bands);
      albedo = mix(albedo, uC, smoothstep(0.55, 0.9, 0.5 + 0.5 * sin(t * 5.3 + 1.0)) * 0.55);
      float storm = 1.0 - smoothstep(0.05, 0.11, length(p - normalize(vec3(0.6, -0.25, 0.75))));
      albedo = mix(albedo, uC * 1.1, storm * 0.6);
    } else if (kind == 9) {
      // ice — pale plains cut by dark fractures
      float base = fbm(p * 3.0 + uSeed);
      albedo = mix(uB, uC, smoothstep(0.35, 0.75, base));
      float r = 1.0 - abs(fbm(p * 4.5 + 3.0) * 2.0 - 1.0);
      albedo = mix(albedo, uA, pow(r, 12.0) * 0.9);
      spec = 0.25;
      gloss = 50.0;
    } else if (kind == 10) {
      // SMALL TOWN SIPS — patchwork farmland, tea-gold farmsteads, one outpost
      float lat = asin(clamp(p.y, -1.0, 1.0));
      float lon = atan(p.z, p.x);
      vec2 g = vec2(lon * 15.0, lat * 20.0) + vec2(fbm3(p * 3.0), fbm3(p * 3.0 + 9.0)) * 2.2;
      vec2 cell = floor(g);
      vec2 f = fract(g);
      float pick = hash31(vec3(cell, uSeed));
      vec3 field = pick < 0.4 ? uB : pick < 0.75 ? uC : mix(uA, uB, 0.6);
      field = mix(field, uB, 0.55) * (0.88 + 0.16 * hash31(vec3(cell, 4.0)));
      float hedge = 1.0 - smoothstep(0.03, 0.08, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
      albedo = mix(field, uA, hedge * 0.3);
      albedo *= 0.8 + 0.3 * fbm3(p * 8.0);
      glow += uLights * dots(p, 55.0, 0.09, 0.12, px) * night;
      if (uMarkerSize > 0.0) {
        float d = length(N - uMarker);
        glow += uLights * dots(N, 160.0, 0.75, 0.2, px) * smoothstep(0.06, 0.02, d) * 1.6;
        glow += uLights * exp(-d * d / 0.003) * 0.22;
      }
      cloud = smoothstep(0.62, 0.85, fbm3(vec3(p.x * 2.5, p.y * 5.0, p.z * 2.5) + uTime * 0.004)) * uCloud;
    } else if (kind == 11) {
      // GEORGE & NICK'S — charcoal and brick, embers in the cracks, a lit square
      float h = fbm(p * 2.6 + uSeed);
      albedo = mix(uA, uB, smoothstep(0.35, 0.7, h));
      albedo = mix(albedo, uC, smoothstep(0.62, 0.8, fbm3(p * 6.0 + 3.0)) * 0.5);
      float r = 1.0 - abs(fbm3(p * 3.3 + 2.0) * 2.0 - 1.0);
      float crack = smoothstep(0.94, 0.985, r);
      float flick = 0.75 + 0.25 * sin(uTime * 0.8 + fbm3(p * 9.0) * 6.0);
      glow += vec3(1.0, 0.36, 0.12) * crack * (0.12 + 0.55 * night) * flick;
      if (uMarkerSize > 0.0) {
        vec3 M = uMarker;
        vec3 t1 = normalize(cross(M, vec3(0.0, 1.0, 0.0)));
        vec3 t2 = cross(M, t1);
        vec3 o = N - M;
        vec2 q = vec2(dot(o, t1), dot(o, t2));
        // lamps round the four sides of the square
        float side = 0.07;
        float edge = abs(max(abs(q.x), abs(q.y)) - side);
        float lampRow = 1.0 - smoothstep(0.004, 0.008 + px, edge);
        float along = fract((q.x + q.y + 0.2) * 70.0);
        float lamps = lampRow * (1.0 - smoothstep(0.18, 0.4, abs(along - 0.5) * 2.0 - 0.3));
        glow += uLights * lamps * 2.0;
        glow += uLights * (1.0 - smoothstep(0.0, side, max(abs(q.x), abs(q.y)))) * 0.25;
        glow += uAccent * exp(-dot(q, q) / 0.02) * 0.2;
      }
    } else if (kind == 12) {
      // KIM'S — ice-white and pale teal: clean, soft bands, almost nothing else
      float t = p.y * 3.0 + fbm3(p * 1.5 + uSeed) * 0.8;
      float bands = 0.5 + 0.5 * sin(t * 3.0);
      albedo = mix(uB, uC, bands);
      albedo = mix(albedo, uA, smoothstep(0.62, 0.8, fbm3(p * 2.2 + 4.0)) * 0.35);
      spec = uSpec;
      gloss = 70.0;
      glow += uLights * dots(p, 48.0, 0.035, 0.12, px) * night;
    } else if (kind == 13) {
      // APPANOOSE — fairways striped by the mower, sand, ponds, one clubhouse
      float rough = fbm(p * 3.2 + uSeed);
      float fair = smoothstep(0.48, 0.52, rough) * (1.0 - smoothstep(0.62, 0.66, rough));
      vec3 dir = normalize(cross(p, vec3(0.3, 1.0, 0.1)));
      float stripe = step(0.5, fract(dot(p, dir) * 60.0));
      vec3 grass = mix(uA, uB, 0.35 + 0.3 * fbm3(p * 10.0));
      vec3 fairway = uB * (1.1 + 0.18 * stripe);
      albedo = mix(grass, fairway, fair);
      float sand = smoothstep(0.86, 0.9, vnoise(p * 30.0 + 3.0)) * fair;
      albedo = mix(albedo, uC, sand);
      float pond = smoothstep(0.8, 0.84, vnoise(p * 14.0 + 11.0)) * (1.0 - fair);
      albedo = mix(albedo, vec3(0.05, 0.14, 0.2), pond);
      spec = pond * 0.9;
      gloss = 120.0;
      if (uMarkerSize > 0.0) {
        float d = length(N - uMarker);
        glow += uLights * (1.0 - smoothstep(0.008, 0.016 + px, d)) * 3.2;
        glow += uLights * exp(-d * d / 0.004) * 0.3;
      }
      cloud = smoothstep(0.64, 0.86, fbm3(vec3(p.x * 2.2, p.y * 4.4, p.z * 2.2) + uTime * 0.004 + 6.0)) * uCloud;
    } else if (kind == 14) {
      // BARBER STUCCO — limestone moon, quarry terraces, stucco dust
      float warp = fbm3(p * 2.0 + uSeed);
      float strata = 0.5 + 0.5 * sin(p.y * 38.0 + warp * 6.0);
      albedo = mix(uB, uC, smoothstep(0.35, 0.8, fbm(p * 3.5 + 2.0)));
      albedo *= 0.86 + 0.18 * strata;
      // stepped quarry pits: craters whose walls are banded
      vec2 c1 = craters(p, 4.0, 0.6);
      float steps = step(0.5, fract(c1.x * 4.0));
      albedo = mix(albedo, uA * (0.9 + 0.3 * steps), c1.x * 0.75);
      albedo += uC * 0.25 * c1.y;
      vec2 c2 = craters(p, 11.0, 0.35);
      albedo *= 1.0 - 0.2 * c2.x;
      glow += uLights * dots(p, 70.0, 0.05 * c1.x, 0.12, px) * night * 0.8;
    } else if (kind == 15) {
      // DEBT ANGEL — pale silver-blue, quiet, one guiding light
      float t = p.y * 2.2 + fbm3(p * 1.3 + uSeed) * 0.6;
      albedo = mix(uA, uB, 0.5 + 0.5 * sin(t * 2.4));
      albedo = mix(albedo, uC, smoothstep(0.55, 0.85, fbm3(p * 2.4 + 8.0)) * 0.45);
      spec = uSpec;
      gloss = 50.0;
      if (uMarkerSize > 0.0) {
        float d = length(N - uMarker);
        glow += uLights * (1.0 - smoothstep(0.008, 0.015 + px, d)) * 3.6;
        glow += vec3(0.75, 0.84, 1.0) * exp(-d * d / 0.012) * 0.35;
      }
      cloud = smoothstep(0.66, 0.9, fbm3(vec3(p.x * 2.0, p.y * 5.0, p.z * 2.0) + uTime * 0.003 + 1.0)) * uCloud;
    } else if (kind == 17) {
      // HOLLER! — lifted off the app's map: violet asphalt, mint rivers,
      // gold and ember venues burning like live lines, and the pin
      float h = fbm(p * 2.2 + uSeed);
      albedo = mix(uA, uB, smoothstep(0.34, 0.72, h));
      albedo = mix(albedo, uC, smoothstep(0.66, 0.84, fbm3(p * 5.0 + 3.0)) * 0.4);
      // two hairline mint rivers, like the map's: a contour of a slow noise,
      // held to about a pixel and a half by its own screen-space gradient
      float rn = fbm3(p * 1.4 + 8.0);
      float rg = fwidth(rn);
      float river = 1.0 - smoothstep(0.0012, 0.0012 + rg * 1.4, abs(rn - 0.5));
      river *= 0.0024 / (0.0024 + rg);
      vec3 mint = vec3(0.18, 0.95, 0.77);
      albedo = mix(albedo, mint * 0.3, river * 0.5);
      glow += mint * river * (0.06 + 0.4 * night);
      // venues cluster into a few districts, with strays between
      float district = smoothstep(0.5, 0.66, fbm3(p * 2.4 + 13.0));
      vec3 lit = venues(p, 15.0, 0.75 * district, 0.16, px) * 2.2
               + venues(p * 1.37 + 5.0, 42.0, 0.55 * district, 0.14, px) * 1.2
               + venues(p + 9.0, 24.0, 0.08, 0.12, px);
      // live, not just nightlife: the lines still read in daylight
      glow += lit * (0.28 + 0.72 * night);
      spec = uSpec;
      gloss = 70.0;
      if (uMarkerSize > 0.0) {
        // The Fair: a white-hot pin in a magenta ring, a gold halo, and the
        // shout — mint and violet rings rolling out across the ground
        float d = length(N - uMarker);
        glow += vec3(1.0, 0.96, 1.0) * (1.0 - smoothstep(0.006, 0.011 + px, d)) * 3.2;
        glow += uAccent * (1.0 - smoothstep(0.015, 0.024 + px, d)) * smoothstep(0.006, 0.013, d) * 2.4;
        glow += vec3(1.0, 0.77, 0.24) * exp(-d * d / 0.0035) * 0.35;
        float w = d * 9.0 - uTime * 0.22;
        float e = abs(fract(w) - 0.5) * 2.0;
        // e peaks at 1 on each ring; the line is the top sliver of it,
        // widened by the pixel footprint so it never aliases
        float fw = fwidth(d * 9.0) * 2.0;
        float ringLine = smoothstep(0.86 - fw, 0.985, e);
        float fade = smoothstep(0.5, 0.06, d) * smoothstep(0.02, 0.05, d);
        vec3 wave = mod(floor(w), 2.0) < 1.0 ? vec3(0.37, 0.9, 0.96) : vec3(0.6, 0.52, 1.0);
        glow += wave * ringLine * fade * (0.3 + 0.7 * night) * 0.9 * (0.14 / (0.14 + fw));
      }
    } else {
      // DON JULIO — terracotta mesas, and a night market strung with lights
      float h = fbm(p * 2.8 + uSeed);
      float mesa = floor(h * 7.0) / 7.0;
      albedo = mix(uA, uB, smoothstep(0.3, 0.7, mesa));
      albedo = mix(albedo, uC, smoothstep(0.62, 0.78, h) * 0.6);
      float wash = 1.0 - smoothstep(0.0, 0.02, abs(fbm3(p * 3.0 + 5.0) - 0.5));
      albedo = mix(albedo, uA * 0.7, wash * 0.6);
      // strings of lamps along a few winding lanes
      float lane = 1.0 - smoothstep(0.0, 0.006 + px * 1.5, abs(fbm3(p * 4.0 + 13.0) - 0.5));
      float market = smoothstep(0.45, 0.65, fbm3(p * 2.0 + 21.0));
      float bulbs = dots(p, 200.0, 0.9, 0.2, px) * lane * market;
      float hue = vnoise(p * 30.0);
      vec3 lamp = hue < 0.33 ? vec3(1.0, 0.72, 0.38) : hue < 0.66 ? vec3(1.0, 0.5, 0.62) : vec3(0.55, 0.95, 0.85);
      glow += lamp * bulbs * 1.8 * night;
      glow += uLights * dots(p, 60.0, 0.05, 0.1, px) * night * 0.7;
    }

    // clouds sit over everything and hide the ground lights under them
    albedo = mix(albedo, mix(vec3(0.78, 0.78, 0.82), uAtmo, kind == 2 ? 0.55 : 0.08), cloud);
    glow *= 1.0 - cloud * 0.85;

    vec3 col = albedo * (uLightColor * day * 1.45 + uFillColor * fill * 0.16 + 0.01);

    if (spec > 0.0) {
      vec3 H = normalize(L + V);
      float nh = max(dot(N, H), 0.0);
      float broad = (kind == 1 || kind == 4) ? pow(nh, gloss * 0.12) * 0.08 : 0.0;
      col += uLightColor * (pow(nh, gloss) * 1.4 + broad) * spec * day * (1.0 - cloud);
    }

    col += glow * uLightAmt;

    // atmosphere seen through the disk: a thin limb, brighter on the day side
    if (uAtmoStrength > 0.0) {
      float nv = max(dot(N, V), 0.0);
      float rim = pow(1.0 - nv, 3.2);
      float lit = smoothstep(-0.3, 0.45, ndl);
      col += uAtmo * rim * uAtmoStrength * (0.1 + 0.9 * lit);
      // a warm band along the terminator
      float dusk = smoothstep(-0.18, 0.02, ndl) * (1.0 - smoothstep(0.02, 0.22, ndl));
      col += uAtmo * dusk * 0.07 * uAtmoStrength;
    }

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * Atmosphere shell: a slightly larger back-faced sphere, additive. Each
 * pixel measures how close its view ray passes to the surface, so the haze
 * is densest right on the limb and thins out into space.
 */
export const atmoVert = /* glsl */ `
  varying vec3 vWP;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWP = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const atmoFrag = /* glsl */ `
  uniform vec3 uCenter;
  uniform float uRadius;
  uniform float uHeight;
  uniform vec3 uColor;
  uniform float uStrength;
  uniform vec3 uLightDir;
  varying vec3 vWP;

  void main() {
    vec3 rd = normalize(vWP - cameraPosition);
    vec3 oc = cameraPosition - uCenter;
    float t = -dot(oc, rd);
    vec3 cp = oc + rd * t;
    float h = length(cp);
    float alt = max(h - uRadius, 0.0);
    float dens = exp(-alt / uHeight);
    float lit = smoothstep(-0.4, 0.5, dot(cp / max(h, 1e-4), uLightDir));
    vec3 col = uColor * dens * uStrength * (0.08 + 0.92 * lit);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/** Rings: fine banding, lit face-on, the planet's shadow falling across. */
export const ringVert = /* glsl */ `
  varying vec3 vWP;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWP = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const ringFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uCenter;
  uniform float uRadius;
  uniform float uInner;
  uniform float uOuter;
  uniform float uSeed;
  uniform float uOpacity;
  uniform float uRinglet;
  uniform vec3 uColor2;
  uniform float uRipple;
  uniform vec3 uNormal;
  uniform vec3 uLightDir;
  varying vec3 vWP;

  float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    return fract((p + p) * p);
  }

  void main() {
    float r = length(vWP - uCenter);
    float span = uOuter - uInner;
    float t = (r - uInner) / span;
    float a = 0.0;
    if (t >= 0.0 && t <= 1.0) {
      // fine banding fades out before it can alias into moire
      float ft = fwidth(t);
      float fineAmp = 0.45 * (1.0 - smoothstep(0.004, 0.02, ft));
      float midAmp = 0.35 * (1.0 - smoothstep(0.02, 0.08, ft));
      float fine = 1.0 - fineAmp + fineAmp * sin(t * 90.0 + uSeed * 9.0);
      float mid = 1.0 - midAmp + midAmp * sin(t * 23.0 + uSeed * 3.0);
      float gap = smoothstep(0.015, 0.035, abs(t - 0.64));
      float edge = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.82, 1.0, t)) * (0.55 + 0.45 * t);
      a = fine * mid * gap * edge;
    }
    if (uRipple > 0.5 && t >= 0.0 && t <= 1.0) {
      // a ripple, not a sheet: four thin lines thinning outward, like the
      // rings round the logo's pin
      float ft = fwidth(t);
      a = 0.0;
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float at = 0.06 + fi * 0.29;
        float w = 0.012 + fi * 0.002;
        a += (1.0 - smoothstep(w, w + ft * 1.5, abs(t - at))) * (1.0 - fi * 0.18) * (w / (w + ft));
      }
    }
    if (uRinglet > 0.5) {
      float rt = (r - (uOuter + span * 0.28)) / (span * 0.05);
      a = max(a, (1.0 - smoothstep(0.6, 1.0, abs(rt))) * 0.8);
    }
    a *= uOpacity;
    if (a < 0.004) discard;

    // planet shadow: does the path to the light pass through the world?
    vec3 o = vWP - uCenter;
    float b = dot(o, uLightDir);
    float c = dot(o, o) - uRadius * uRadius;
    float shadow = (b < 0.0 && b * b - c > 0.0) ? 0.85 : 0.0;
    float lit = 0.3 + 0.7 * abs(dot(uNormal, uLightDir));
    vec3 col = mix(uColor, uColor2, clamp(t, 0.0, 1.0)) * lit * (1.0 - shadow);
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

/**
 * Orbit lanes: a hairline circle per world round the hub. Faint by default,
 * brighter close to its own world and in that world's accent when it is
 * where you are parked or heading. It breaks round the world itself, and
 * fades out near the camera so a lane running under a parked shot never
 * slices across the frame.
 */
export const laneVert = /* glsl */ `
  varying vec3 vWP;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWP = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const laneFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform vec3 uWorld;
  uniform float uGap;
  uniform float uBase;
  uniform float uHi;
  uniform vec3 uPlaneN;
  varying vec3 vWP;
  void main() {
    float dc = distance(cameraPosition, vWP);
    // far lanes seen edge-on pile into one bright band on the horizon;
    // thin them as the view grazes the plane
    float graze = smoothstep(0.02, 0.13, abs(dot((vWP - cameraPosition) / dc, uPlaneN)));
    float near = smoothstep(3.0, 18.0, dc);
    float far = 1.0 - 0.55 * smoothstep(120.0, 360.0, dc);
    float dw = distance(vWP, uWorld);
    float gap = smoothstep(uGap * 1.05, uGap * 1.7, dw);
    float halo = 1.0 + 1.4 * exp(-pow(dw / (uGap * 5.0), 2.0));
    float a = uBase * near * far * gap * halo * (0.1 + 0.9 * graze) * (1.0 + uHi * 1.6);
    vec3 col = mix(uColor, uAccent, 0.3 + 0.55 * uHi) * a;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * Hull: faceted, key + fill, and a cool rim so the silhouette reads against
 * a dark world or the void. The rim is what stops it being a brown crumb.
 */
export const hullVert = /* glsl */ `
  attribute vec3 aSmooth;
  varying vec3 vN;
  varying vec3 vS;
  varying vec3 vWP;
  void main() {
    vN = normalize(mat3(modelMatrix) * normal);
    vS = normalize(mat3(modelMatrix) * aSmooth);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWP = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const hullFrag = /* glsl */ `
  uniform vec3 uLightDir;
  uniform vec3 uFillDir;
  uniform vec3 uBase;
  uniform vec3 uRim;
  varying vec3 vN;
  varying vec3 vS;
  varying vec3 vWP;

  void main() {
    // facets for the body, a smoothed normal for the sheen and the rim:
    // flat panels, but edges that catch the light like a real hull
    vec3 N = normalize(vN);
    vec3 S = normalize(vS);
    vec3 V = normalize(cameraPosition - vWP);
    float key = max(dot(N, uLightDir), 0.0);
    float fill = max(dot(N, uFillDir), 0.0);
    vec3 col = uBase * (0.4 + key * 0.9 + fill * 0.6);
    vec3 H = normalize(uLightDir + V);
    col += vec3(0.85, 0.87, 1.0) * pow(max(dot(S, H), 0.0), 60.0) * 0.35;
    float rim = pow(1.0 - abs(dot(S, V)), 4.0);
    col += uRim * rim * 0.9;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/** Ion spike: a short additive cone, hottest at the nozzle. */
export const spikeVert = /* glsl */ `
  varying float vS;
  varying vec3 vN;
  varying vec3 vWP;
  void main() {
    vS = position.y + 0.5;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWP = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const spikeFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  varying float vS;
  varying vec3 vN;
  varying vec3 vWP;
  void main() {
    vec3 V = normalize(cameraPosition - vWP);
    float core = pow(abs(dot(normalize(vN), V)), 1.5);
    float along = pow(1.0 - vS, 2.2);
    vec3 col = uColor * along * (0.35 + core) * uPower;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Sky band: faint stars and glow puffs strung along the orbital plane. */
export const bandVert = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uPx;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPx;
    gl_Position = projectionMatrix * mv;
  }
`;

export const bandFrag = /* glsl */ `
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    float a = exp(-d * d * 4.0);
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor * a, 1.0);
  }
`;

/**
 * The distant spiral as a single quad: log-spiral arms, a warm bulge, dust
 * lanes and a grain of stars. At this distance a picture of a galaxy is
 * indistinguishable from a particle one and costs one draw.
 */
export const spiralVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv * 2.0 - 1.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const spiralFrag = /* glsl */ `
  uniform float uBright;
  varying vec2 vUv;
  ${NOISE}

  void main() {
    vec2 p = vUv;
    float r = length(p);
    if (r > 1.0) discard;
    float th = atan(p.y, p.x);
    float lr = log(max(r, 0.02));
    vec3 q = vec3(p * 3.0, 1.7);
    float n = fbm3(q * 1.6);
    // two trailing arms
    float arm = 0.5 + 0.5 * cos(2.0 * (th - lr * 2.6) + n * 2.2);
    arm = pow(arm, 2.2);
    float disk = exp(-r * 4.2);
    float bulge = exp(-r * r * 90.0) * 1.6 + exp(-r * 16.0) * 0.5;
    // dust on the inner edge of each arm
    float lane = 0.5 + 0.5 * cos(2.0 * (th - lr * 2.6) + 0.9 + n * 2.2);
    float dust = smoothstep(0.75, 1.0, lane) * smoothstep(0.08, 0.3, r) * 0.7;
    float knots = smoothstep(0.78, 0.95, vnoise(vec3(p * 22.0, 3.0))) * arm * smoothstep(0.15, 0.5, r);
    float grain = smoothstep(0.93, 1.0, hash31(vec3(floor(p * 260.0), 1.0))) * disk * 2.0;

    vec3 armCol = vec3(0.62, 0.68, 1.0);
    vec3 coreCol = vec3(1.0, 0.86, 0.66);
    vec3 col = armCol * disk * (0.25 + 1.3 * arm) * (1.0 - dust);
    col += coreCol * bulge;
    col += vec3(1.0, 0.55, 0.75) * knots * disk * 1.6;
    col += vec3(0.9, 0.92, 1.0) * grain;
    col *= smoothstep(1.0, 0.7, r) * uBright;
    gl_FragColor = vec4(col, 1.0);
  }
`;
