(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,76714,e=>{"use strict";var t=e.i(43476),o=e.i(75056),a=e.i(71645),r=e.i(90072),i=e.i(18603),l=e.i(49833),n=e.i(22128),s=e.i(20773),c=e.i(94800),u=e.i(48546),d=e.i(72046),f=e.i(11356),p=e.i(35479);let m=`
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
`,h=`
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
`,v=`
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

  ${m}

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
`,g=`
  varying vec3 vWP;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWP = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`,x=`
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
`,b=`
  varying vec3 vWP;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWP = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`,w=`
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
`,y=`
  varying vec3 vWP;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWP = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`,M=`
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
`,k=`
  varying vec3 vN;
  varying vec3 vLN;
  varying vec3 vLP;
  varying vec3 vWP;
  varying vec3 vAxis;
  void main() {
    vLN = normal;
    vLP = position;
    vAxis = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWP = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`,S=`
  uniform vec3 uLightDir;
  uniform vec3 uFillDir;
  uniform vec3 uBase;
  uniform vec3 uTile;
  uniform vec3 uRim;
  uniform vec3 uBand;
  uniform vec3 uHeatCol;
  uniform float uMode;
  uniform float uHeat;
  uniform float uGloss;
  varying vec3 vN;
  varying vec3 vLN;
  varying vec3 vLP;
  varying vec3 vWP;
  varying vec3 vAxis;

  float hash(float n) { return fract(sin(n) * 43758.5453); }

  // Square heat tiles in staggered rows, cell size c. Returns the cell
  // (x, row) and, in zw, grout (0..1) and a per-tile shade; both fade out
  // once a tile is only a pixel or two across, so the grid never shimmers.
  vec4 tileGrid(vec2 p, float c) {
    vec2 g = p / c;
    float row = floor(g.y);
    g.x += 0.5 * mod(row, 2.0);
    vec2 cell = floor(g);
    vec2 f = fract(g);
    float e = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
    float fw = length(fwidth(g));
    float grout = (1.0 - smoothstep(0.0, fw + 0.07, e)) * (1.0 - smoothstep(0.3, 0.6, fw));
    float shade = (hash(cell.x * 7.13 + row * 31.7) - 0.5) * (1.0 - smoothstep(0.45, 0.9, fw));
    return vec4(cell.x - 0.5 * mod(row, 2.0), row, grout, shade);
  }

  void main() {
    float face = gl_FrontFacing ? 1.0 : -1.0;
    vec3 N = normalize(vN) * face;
    vec3 LN = normalize(vLN) * face;
    vec3 V = normalize(cameraPosition - vWP);

    vec3 albedo = uBase;
    float gloss = uGloss;
    float band = 0.0;

    if (uMode > 0.5 && uMode < 1.5) {
      float z = vLP.z;
      float r = length(vLP.xy);
      float ang = atan(vLP.y, vLP.x);
      vec2 dir = LN.xy / max(length(LN.xy), 1e-4);

      // brushed: faint streaks running along the barrel
      albedo *= 0.94 + 0.09 * hash(floor((ang + 3.1416) * 34.0));

      // ring seams on the barrel, antialiased so they do not crawl
      float q = z / 0.066;
      float d = abs(fract(q + 0.5) - 0.5);
      float seam = 1.0 - smoothstep(0.0, max(fwidth(q) * 1.2, 0.035), d);
      albedo *= 1.0 - 0.14 * seam * step(-0.49, z) * step(z, 0.3);

      // belly tiles. Angle is measured from the keel so the atan seam sits
      // on top, far from any tile. Each tile is in or out whole, so the
      // terminator is a ragged staircase. Smaller tiles at the flap roots
      // and under the nose, where the heat is.
      float keel = atan(vLP.x, -vLP.y);
      float elev = atan(dir.y, abs(dir.x));
      float dense = max(step(0.27, z), step(-0.52, z) * step(z, -0.18) * step(abs(elev + 0.7), 0.3));
      dense = max(dense, step(0.17, z) * step(z, 0.39) * step(abs(elev - 0.26), 0.25));
      float c = mix(0.034, 0.019, dense);
      vec4 tg = tileGrid(vec2(keel * 0.115, z), c);
      float cKeel = (tg.x + 0.5) * c / 0.115;
      float edge = -0.3 + 0.16 * (hash(tg.x * 3.7 + tg.y * 11.3) - 0.5);
      float tile = step(edge, cos(cKeel)) * step(-0.6, z) * step(z, 0.66);
      vec3 tileCol = uTile * (1.0 + 0.45 * tg.w);
      tileCol = mix(tileCol, uTile * 0.3, tg.z);
      albedo = mix(albedo, tileCol, tile);
      gloss = mix(gloss, 0.2, tile);

      // oil-canning: faint waves in the steel between the weld rings
      vec3 across = cross(normalize(vAxis), N);
      across /= max(length(across), 1e-3);
      float w1 = sin(keel * 11.0 + 1.7 * sin(z * 29.0));
      float w2 = sin(z * 95.2 + keel * 5.0);
      N = normalize(N + (across * w1 * 0.035 + normalize(vAxis) * w2 * 0.02) * (1.0 - tile) * step(-0.49, z) * step(z, 0.3));

      // visor band on the nose, over the top only
      float bw = max(fwidth(z), 0.0015);
      band = smoothstep(0.393 - bw, 0.393 + bw, z) * (1.0 - smoothstep(0.405 - bw, 0.405 + bw, z));
      band *= smoothstep(-0.45, -0.25, dir.y);

      // aft bulkhead and the inside of the skirt: an engine bay, dark
      float bay = step(z, -0.572) * step(r, 0.1235);
      albedo = mix(albedo, vec3(0.035, 0.035, 0.045), bay);
      gloss = mix(gloss, 0.3, bay);
    } else if (uMode > 1.5) {
      float tile = step(LN.y, -0.5);
      vec4 tg = tileGrid(vLP.xz, 0.019);
      vec3 tileCol = mix(uTile * (1.0 + 0.45 * tg.w), uTile * 0.3, tg.z);
      albedo = mix(albedo, tileCol, tile);
      gloss = mix(gloss, 0.22, tile);
    }

    float key = max(dot(N, uLightDir), 0.0);
    float fill = max(dot(N, uFillDir), 0.0);
    vec3 col = albedo * (0.07 + key * 0.95 + fill * 0.28);

    // brushed, not chrome: a broad soft lobe and a small tight one
    vec3 H = normalize(uLightDir + V);
    float nh = max(dot(N, H), 0.0);
    col += vec3(0.95, 0.95, 1.0) * (pow(nh, 18.0) * 0.22 + pow(nh, 180.0) * 0.5) * gloss;

    // a fake sky in the reflection: lilac-grey toward the key, near black away
    vec3 Rf = reflect(-V, N);
    float sky = 0.5 + 0.5 * dot(Rf, uLightDir);
    col += mix(vec3(0.015, 0.014, 0.024), vec3(0.26, 0.25, 0.34), sky * sky * sky) * 0.25 * gloss;

    float rim = pow(1.0 - abs(dot(N, V)), 3.5);
    col += uRim * rim * 0.6;

    // inside a bell while the drive is lit
    col += uHeatCol * uHeat * (1.0 - face) * 0.5;

    col = mix(col, uBand, band);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`,C=`
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
`,z=`
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
`,L=`
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
`,A=`
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    float a = exp(-d * d * 4.0);
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor * a, 1.0);
  }
`,j=`
  varying vec2 vUv;
  void main() {
    vUv = uv * 2.0 - 1.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,P=`
  uniform float uBright;
  varying vec2 vUv;
  ${m}

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
`;function R({count:e}){let o=(0,u.useThree)(e=>e.gl),i=(0,a.useMemo)(()=>{let t=Math.round(e/60),o=e+t,a=new Float32Array(3*o),i=new Float32Array(3*o),l=new Float32Array(o),n=p.LIGHT_DIR,s=new r.Vector3(1,0,0).addScaledVector(n,-n.x).normalize(),c=new r.Vector3().crossVectors(n,s),u=new r.Vector3,d=7,f=()=>(d=16807*d%0x7fffffff)/0x7fffffff,m=()=>(f()+f()+f()-1.5)/1.5,h=new r.Color("#ffe2c4"),v=new r.Color("#c9d6ff"),g=new r.Color("#6d4fae"),x=new r.Color("#8a5a3a"),b=new r.Color;for(let t=0;t<o;t++){let o=t>=e,r=f()*Math.PI*2,d=-.3+.12*Math.sin(2*r+1)+m()*(o?.07:.11);if(u.copy(s).multiplyScalar(Math.cos(r)).addScaledVector(c,Math.sin(r)).multiplyScalar(Math.cos(d)).addScaledVector(n,Math.sin(d)).normalize().multiplyScalar(700),a.set([u.x,u.y,u.z],3*t),o)b.copy(.6>f()?g:x).multiplyScalar(.05+.05*f()),l[t]=60+110*f();else{let e=.12+.75*Math.pow(f(),3);b.copy(v).lerp(h,f()).multiplyScalar(e),l[t]=1.2+2.4*Math.pow(f(),4)}i.set([b.r,b.g,b.b],3*t)}let w=new r.BufferGeometry;return w.setAttribute("position",new r.BufferAttribute(a,3)),w.setAttribute("aColor",new r.BufferAttribute(i,3)),w.setAttribute("aSize",new r.BufferAttribute(l,1)),w},[e]),l=(0,a.useMemo)(()=>({uPx:{value:o.getPixelRatio()}}),[o]);return(0,t.jsx)("points",{geometry:i,frustumCulled:!1,renderOrder:-2,children:(0,t.jsx)("shaderMaterial",{uniforms:l,vertexShader:L,fragmentShader:A,transparent:!0,depthWrite:!1,blending:r.AdditiveBlending})})}function B({frozen:e,stars:o,band:i,nebulae:l}){let n=(0,u.useThree)(e=>e.camera),s=(0,a.useRef)(null),m=(0,a.useMemo)(()=>p.GALAXY_DIR.clone().multiplyScalar(600).toArray(),[]),h=(0,a.useMemo)(()=>({uBright:{value:1.1}}),[]),v=(0,a.useMemo)(()=>{let e=p.GALAXY_DIR.clone().negate(),t=new r.Vector3(0,1,0).addScaledVector(e,-e.y).normalize(),o=r.MathUtils.degToRad(52),a=e.multiplyScalar(Math.cos(o)).addScaledVector(t,Math.sin(o)).normalize();return new r.Quaternion().setFromUnitVectors(new r.Vector3(0,0,1),a).multiply(new r.Quaternion().setFromAxisAngle(new r.Vector3(0,0,1),.7))},[]);return(0,c.useFrame)(()=>{s.current&&s.current.position.copy(n.position)}),(0,t.jsxs)("group",{ref:s,children:[(0,t.jsx)(R,{count:i}),(0,t.jsx)("group",{scale:6,children:(0,t.jsx)(f.default,{count:o,frozen:e,sizeScale:6})}),(0,t.jsxs)("mesh",{position:m,quaternion:v,renderOrder:-3,children:[(0,t.jsx)("planeGeometry",{args:[230,230]}),(0,t.jsx)("shaderMaterial",{uniforms:h,vertexShader:j,fragmentShader:P,transparent:!0,depthWrite:!1,blending:r.AdditiveBlending,side:r.DoubleSide})]}),l>0&&(0,t.jsx)("group",{scale:9,children:(0,t.jsx)(d.default,{count:l,frozen:e})})]})}var T=e.i(5396),N=e.i(77549);function V({coarse:e}){let t=(0,u.useThree)(e=>e.gl),o=(0,u.useThree)(e=>e.camera);return(0,a.useEffect)(()=>{let a=t.domElement,i=new Map,l=0,n=!1,s=new r.Vector3,c=new r.Vector3,u=new r.Vector3,d=new r.Vector3,f=()=>{let[e,t]=[...i.values()];return Math.hypot(e.x-t.x,e.y-t.y)},m=e=>{if("mouse"===e.pointerType&&0!==e.button)return;try{a.setPointerCapture(e.pointerId)}catch{}let t=a.getBoundingClientRect(),o=e.clientX-t.left,r=e.clientY-t.top;i.set(e.pointerId,{x0:o,y0:r,t0:e.timeStamp,x:o,y:r,t:e.timeStamp}),2===i.size&&(n=!0,l=f()),N.exploreStore.touch()},h=e=>{let t=i.get(e.pointerId);if(!t)return;let o=a.getBoundingClientRect();if(t.x=e.clientX-o.left,t.y=e.clientY-o.top,t.t=e.timeStamp,2===i.size){let e=f();l>0&&e>0&&(T.flight.camDist=r.MathUtils.clamp(T.flight.camDist*(l/e),T.CAM_MIN,T.CAM_MAX),T.runtime.kick()),l=e}},v=t=>{let l=i.get(t.pointerId);if(i.delete(t.pointerId),!l)return;if(n){0===i.size&&(n=!1);return}let f=l.x-l.x0,m=l.y-l.y0,h=Math.hypot(f,m);h<("touch"===t.pointerType?12:6)?((t,r)=>{let i=((t,r)=>{let i=a.getBoundingClientRect(),l=i.height/(2*Math.tan(o.fov*Math.PI/360)),n=null,s=1/0;for(let a of p.worlds){if(d.copy(a.center).project(o),d.z>1||d.z<-1)continue;let c=(.5*d.x+.5)*i.width,u=(-(.5*d.y)+.5)*i.height,f=o.position.distanceTo(a.center),p=Math.max(1.15*(a.radius*l/f)+6,e?30:20),m=Math.hypot(t-c,r-u);if(m<p){let e=m/p+.002*f;e<s&&(s=e,n=a)}}return n})(t,r);if(i)(0,T.flyTo)(i);else{let e=a.getBoundingClientRect();u.set(t/e.width*2-1,-(2*(r/e.height))+1,.5).unproject(o).sub(o.position).normalize(),(0,T.burn)(u,9)}T.runtime.kick()})(l.x,l.y):((e,t,i)=>{let l=((e,t)=>{let i=a.getBoundingClientRect();d.copy(T.flight.pos).project(o);let l=(.5*d.x+.5)*i.width,n=(-(.5*d.y)+.5)*i.height,s=Math.atan2(t,e),c=N.exploreStore.get().parked,u=null,f=r.MathUtils.degToRad(17);for(let e of p.worlds){if(e.id===c||(d.copy(e.center).project(o),d.z>1||d.z<-1))continue;let t=(.5*d.x+.5)*i.width-l,a=(-(.5*d.y)+.5)*i.height-n;if(8>Math.hypot(t,a))continue;let r=Math.abs(Math.atan2(a,t)-s);r>Math.PI&&(r=2*Math.PI-r),r<f&&(f=r,u=e)}return u})(e,t);if(l){(0,T.flyTo)(l),T.runtime.kick();return}let n=Math.hypot(e,t)||1;o.updateMatrixWorld(),s.setFromMatrixColumn(o.matrixWorld,0).normalize(),o.getWorldDirection(c),u.copy(s).multiplyScalar(e/n).addScaledVector(c,-t/n).normalize(),(0,T.burn)(u,r.MathUtils.clamp(5+10*i,5,16)),T.runtime.kick()})(f,m,h/Math.max(16,l.t-l.t0))},g=e=>{i.delete(e.pointerId),0===i.size&&(n=!1)},x=e=>{e.preventDefault(),T.flight.camDist=r.MathUtils.clamp(T.flight.camDist*Math.exp(.0012*e.deltaY),T.CAM_MIN,T.CAM_MAX),N.exploreStore.touch(),T.runtime.kick()};return a.addEventListener("pointerdown",m),a.addEventListener("pointermove",h),a.addEventListener("pointerup",v),a.addEventListener("pointercancel",g),a.addEventListener("wheel",x,{passive:!1}),()=>{a.removeEventListener("pointerdown",m),a.removeEventListener("pointermove",h),a.removeEventListener("pointerup",v),a.removeEventListener("pointercancel",g),a.removeEventListener("wheel",x)}},[t,o,e]),null}let q=new r.Color("#8fc8ff"),I=r.MathUtils.degToRad,D=[...[90,210,330].map(e=>({x:.036*Math.cos(I(e)),y:.036*Math.sin(I(e)),exit:.021,len:.055})),...[30,150,270].map(e=>({x:.078*Math.cos(I(e)),y:.078*Math.sin(I(e)),exit:.033,len:.088}))],G=-.575-.09,W=I(40),F=I(62),_=I(12),H=I(15),E={root0:-.5,root1:-.22,tip0:-.47,tip1:-.37,span:.115},O={root0:.19,root1:.37,tip0:.21,tip1:.29,span:.07},U=[{side:1,kind:"up"},{side:1,kind:"low"},{side:-1,kind:"up"},{side:-1,kind:"low"},{side:1,kind:"fore"},{side:-1,kind:"fore"}],K=e=>"fore"===e?-_:"low"===e?-F:F,X=new r.Vector3(.115*Math.cos(W)+E.span*Math.cos(F),.115*Math.sin(W)+E.span*Math.sin(F),(E.tip0+E.tip1)/2),Y=X.clone().setX(-X.x),$=I(130),Q=I(50),J=[.04,-.08],Z=[I(-62),I(-118)];function ee(e){let t=new r.Shape,o=e.tip1+(e.tip1-e.tip0)*.35;t.moveTo(0,e.root0),t.lineTo(0,e.root1),t.lineTo(.8*e.span,o),t.quadraticCurveTo(e.span,e.tip1,e.span,e.tip1-(e.tip1-e.tip0)*.3),t.lineTo(e.span,e.tip0),t.lineTo(0,e.root0);let a=new r.ExtrudeGeometry(t,{depth:.009,bevelEnabled:!1,curveSegments:4});return a.rotateX(Math.PI/2),a.translate(0,.0045,0),a}function et(e,t){let o=new r.CylinderGeometry(e,.45*e,t,18,1,!0);return o.rotateX(-Math.PI/2),o.translate(0,0,-t/2),o}function eo(e,t,o=1){return new r.ShaderMaterial({uniforms:{uLightDir:{value:p.LIGHT_DIR},uFillDir:{value:p.FILL_DIR},uBase:{value:new r.Color(t)},uTile:{value:new r.Color("#2a2b30")},uRim:{value:new r.Color("#a9b8ff")},uBand:{value:new r.Color("#c9bcff")},uHeatCol:{value:q},uMode:{value:e},uHeat:{value:0},uGloss:{value:o}},vertexShader:k,fragmentShader:S,side:r.DoubleSide})}function ea({pool:e,reduced:o}){let i=(0,a.useRef)(null),l=(0,a.useRef)([]),n=(0,a.useRef)([]),s=(0,a.useRef)(0),u=(0,a.useMemo)(()=>e.allocNamed("craft:nav",3),[e]),d=(0,a.useRef)(new r.Vector3),f=(0,a.useMemo)(()=>{let e=function(){let e=[],t=(t,o)=>e.push(new r.Vector2(t,o));t(0,-.575),t(.07,-.575),t(.112,-.575),t(.1195,-.622),t(.1245,-.622),t(.1245,-.603);for(let e=1;e<=6;e++){let o=e/6;t(.1245+o*o*(3-2*o)*(.115-.1245),-.603+(-.5+.603)*o)}t(.115,.3);let o=(.013225+.15999999999999998)/.23;for(let e=1;e<18;e++){let a=Math.max(.012,.39999999999999997*Math.pow(1-e/18,1.5));t(Math.sqrt(o*o-(.39999999999999997-a)*(.39999999999999997-a))+.115-o,.7-a)}t(.0045,.697),t(0,.7);let a=new r.LatheGeometry(e,48);return a.rotateX(Math.PI/2),a}(),t=ee(E),o=ee(O),a=new r.BoxGeometry(.024,.013,.79),i=new r.BoxGeometry(.02,.011,.17),l=new r.CylinderGeometry(.0065,.0065,.026,10),n=new r.SphereGeometry(1,16,10),s=et(.021,.055),c=et(.033,.088),u=new r.ConeGeometry(.055,1,14,1,!0),d=eo(1,"#737780"),f=eo(0,"#737780"),p=eo(0,"#2f3137",.25),m=eo(0,"#2a2b30"),h=eo(2,"#737780");return{stack:e,flapAft:t,flapFore:o,raceway:a,racewayNose:i,peg:l,blister:n,bellSmall:s,bellBig:c,cone:u,hullMat:d,plateSteel:f,rackMat:p,tileMat:m,plateTile:h,bellMat:eo(0,"#3c3e46"),plumeMat:new r.ShaderMaterial({uniforms:{uColor:{value:q},uPower:{value:0}},vertexShader:C,fragmentShader:z,transparent:!0,depthWrite:!1,blending:r.AdditiveBlending,side:r.DoubleSide})}},[]);(0,a.useEffect)(()=>()=>{for(let e of Object.values(f))e.dispose()},[f]);let p=e=>d.current.copy(e).multiplyScalar(.74).applyQuaternion(T.flight.quat).add(T.flight.pos);return(0,c.useFrame)((t,a)=>{let c=i.current;if(!c)return;c.position.copy(T.flight.pos),c.quaternion.copy(T.flight.quat);let m=.12*r.MathUtils.clamp(T.flight.bank,-.7,.7);U.forEach((e,t)=>{let o=l.current[t];o&&(o.rotation.z=K(e.kind)+("fore"===e.kind?-m:m))});let h=o||"orbit"===T.flight.mode?0:T.flight.thrust;s.current=r.MathUtils.damp(s.current,h,h>s.current?14:6,Math.min(a,.1));let v=s.current,g=v>.03,x=t.clock.elapsedTime,b=.9+.1*Math.sin(57*x)*Math.sin(23*x);D.forEach((e,t)=>{let o=n.current[t];if(!o||(o.visible=g,!g))return;let a=(e.exit>.03?.2+.6*v:.12+.35*v)*b,r=e.exit/.055*(.8+.3*v);o.scale.set(r,a,r),o.position.set(e.x,e.y,-.575-e.len-a/2)}),f.plumeMat.uniforms.uPower.value=.4+.9*v,f.bellMat.uniforms.uHeat.value=v;let w=o?.8:.55+.45*Math.pow(Math.max(0,Math.sin(2.6*x)),12),y=p(Y);e.set(u,y.x,y.y,y.z,1,.72,.45,.55,.9*w),y=p(X),e.set(u+1,y.x,y.y,y.z,.74,.88,1,.55,.9*w),g?(y=d.current.set(0,0,G).multiplyScalar(.74).applyQuaternion(T.flight.quat).add(T.flight.pos),e.set(u+2,y.x,y.y,y.z,q.r,q.g,q.b,.8+.8*v,.3+.6*v)):e.hide(u+2)}),(0,t.jsx)("group",{ref:i,children:(0,t.jsxs)("group",{scale:.74,children:[(0,t.jsx)("mesh",{geometry:f.stack,material:f.hullMat}),U.map((e,o)=>{let a;return(0,t.jsx)("group",{scale:[e.side,1,1],children:(0,t.jsx)("group",{ref:e=>{l.current[o]=e},position:"fore"===(a=e.kind)?[.115*Math.cos(H)-.003,.115*Math.sin(H),0]:[.115*Math.cos(W)-.002,("low"===a?-1:1)*.115*Math.sin(W),0],rotation:[0,0,K(e.kind)],children:(0,t.jsx)("mesh",{geometry:"fore"===e.kind?f.flapFore:f.flapAft,material:"up"===e.kind?f.plateSteel:f.plateTile})})},o)}),(0,t.jsxs)("group",{rotation:[0,0,$-Math.PI/2],children:[(0,t.jsx)("mesh",{geometry:f.raceway,material:f.rackMat,position:[0,.115+.005,-.095]}),(0,t.jsx)("mesh",{geometry:f.racewayNose,material:f.rackMat,position:[0,.114,.381],rotation:[.114,0,0]})]}),J.map(e=>(0,t.jsx)("group",{rotation:[0,0,Q-Math.PI/2],children:(0,t.jsx)("mesh",{geometry:f.peg,material:f.bellMat,position:[0,.125,e]})},e)),Z.map(e=>(0,t.jsx)("group",{rotation:[0,0,e-Math.PI/2],children:(0,t.jsx)("mesh",{geometry:f.blister,material:f.tileMat,position:[0,.098,.43],scale:[.017,.012,.05]})},e)),D.map((e,o)=>(0,t.jsx)("mesh",{geometry:e.exit>.03?f.bellBig:f.bellSmall,material:f.bellMat,position:[e.x,e.y,-.575]},o)),D.map((e,o)=>(0,t.jsx)("mesh",{ref:e=>{n.current[o]=e},geometry:f.cone,material:f.plumeMat,rotation:[-Math.PI/2,0,0],visible:!1},o))]})})}var er=e.i(76921),ei=e.i(12020);let el=new r.Color("#fff0de"),en=new r.Color("#6f7fd6"),es=2*Math.PI;function ec({b:e,segments:o,frozen:i}){let l=(0,a.useRef)(null),n=(0,a.useRef)(null),s=e.look,u=s.kind===ei.KIND.station,d=(0,a.useMemo)(()=>({uLightDir:{value:p.LIGHT_DIR},uLightColor:{value:el},uFillDir:{value:p.FILL_DIR},uFillColor:{value:en},uA:{value:new r.Color(s.a)},uB:{value:new r.Color(s.b)},uC:{value:new r.Color(s.c)},uAtmo:{value:new r.Color(s.atmo)},uAtmoStrength:{value:s.atmoStrength},uLights:{value:new r.Color(s.lights)},uLightAmt:{value:s.lightAmount},uKind:{value:s.kind},uSeed:{value:13.7*e.id.length%19},uTime:{value:0},uCloud:{value:s.cloud},uSpec:{value:s.spec},uMarker:{value:e.marker??new r.Vector3(0,-1,0)},uMarkerSize:{value:e.marker?s.marker.size:0},uAccent:{value:new r.Color(e.accent)}}),[e,s]),f=(0,a.useMemo)(()=>s.atmoStrength>0?{uCenter:{value:e.center},uRadius:{value:e.radius},uHeight:{value:e.radius*s.atmoHeight},uColor:{value:new r.Color(s.atmo)},uStrength:{value:.9*s.atmoStrength},uLightDir:{value:p.LIGHT_DIR}}:null,[e,s]);return(0,c.useFrame)((e,t)=>{!i&&(n.current&&(n.current.uniforms.uTime.value=e.clock.elapsedTime),l.current&&s.spin&&(l.current.rotation.y+=t*s.spin))}),(0,t.jsxs)("group",{position:e.center,quaternion:e.quat,children:[(0,t.jsxs)("group",{ref:l,children:[(0,t.jsxs)("mesh",{children:[(0,t.jsx)("sphereGeometry",{args:[e.radius,o[0],o[1]]}),(0,t.jsx)("shaderMaterial",{ref:n,uniforms:d,vertexShader:h,fragmentShader:v,side:u?r.DoubleSide:r.FrontSide})]}),u&&(0,t.jsx)(eu,{radius:e.radius,accent:e.accent})]}),f&&(0,t.jsxs)("mesh",{children:[(0,t.jsx)("sphereGeometry",{args:[e.radius*(1+7*s.atmoHeight),48,32]}),(0,t.jsx)("shaderMaterial",{uniforms:f,vertexShader:g,fragmentShader:x,side:r.BackSide,transparent:!0,depthWrite:!1,blending:r.AdditiveBlending})]})]})}function eu({radius:e,accent:o}){return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)("mesh",{children:[(0,t.jsx)("sphereGeometry",{args:[.3*e,24,16]}),(0,t.jsx)("meshBasicMaterial",{color:new r.Color(o).multiplyScalar(.7),toneMapped:!1})]}),(0,t.jsxs)("mesh",{rotation:[Math.PI/2,0,0],children:[(0,t.jsx)("torusGeometry",{args:[.62*e,.03*e,6,48]}),(0,t.jsx)("meshBasicMaterial",{color:"#2c2536"})]})]})}function ed({b:e}){let o=e.look.ring,i=(0,a.useMemo)(()=>({uColor:{value:new r.Color(o.color)},uCenter:{value:e.center},uRadius:{value:e.radius},uInner:{value:o.inner*e.radius},uOuter:{value:o.outer*e.radius},uSeed:{value:7.3*e.id.length%11},uOpacity:{value:o.opacity},uRinglet:{value:+!!o.ringlet},uColor2:{value:new r.Color(o.color2??o.color)},uRipple:{value:+!!o.ripple},uNormal:{value:e.pole},uLightDir:{value:p.LIGHT_DIR}}),[e,o]),l=o.ringlet?o.outer+(o.outer-o.inner)*.36:o.outer;return(0,t.jsx)("group",{position:e.center,quaternion:e.quat,children:(0,t.jsxs)("mesh",{rotation:[-Math.PI/2,0,0],children:[(0,t.jsx)("ringGeometry",{args:[o.inner*e.radius,l*e.radius,256,1]}),(0,t.jsx)("shaderMaterial",{uniforms:i,vertexShader:b,fragmentShader:w,transparent:!0,side:r.DoubleSide,depthWrite:!1})]})})}function ef({b:e,pool:o,frozen:i,index:l}){let n=e.look.kind===ei.KIND.station,s=n?.62:1,u=(0,a.useMemo)(()=>o.allocNamed(`dock:${e.id}`,24),[o,e.id]),d=(0,a.useMemo)(()=>e.marker?o.allocNamed(`marker:${e.id}`,1):-1,[o,e.id,e.marker]),f=(0,a.useMemo)(()=>(0,er.hexToRGB)(e.accent),[e.accent]),p=(0,a.useMemo)(()=>e.look.marker?(0,er.hexToRGB)(e.look.marker.glow):f,[e.look.marker,f]),m=(0,a.useRef)(new r.Vector3),h=(0,a.useMemo)(()=>e.marker?e.center.clone().addScaledVector(e.marker,1.012*e.radius):null,[e]),v=(0,a.useMemo)(()=>{let t=[];for(let o=0;o<=160;o++){let a=o/160*es*s;t.push(new r.Vector3(Math.cos(a)*e.dockR,0,Math.sin(a)*e.dockR))}return new r.BufferGeometry().setFromPoints(t)},[e.dockR,s]),g=(0,a.useMemo)(()=>{let t=[];for(let o=0;o<12;o++){let a=o/12*es*s,r=Math.cos(a),i=Math.sin(a);t.push(r*e.dockR*.965,0,i*e.dockR*.965,r*e.dockR*1.035,0,i*e.dockR*1.035)}let o=new r.BufferGeometry;return o.setAttribute("position",new r.Float32BufferAttribute(t,3)),o},[e.dockR,s]),x=(0,a.useRef)(null),b=(0,a.useRef)(0);return(0,c.useFrame)((t,a)=>{let r=i?1.7*l:t.clock.elapsedTime,c=(.11*r+.37*l)%1,v=+("orbit"===T.flight.mode&&T.flight.body===e);b.current+=(v-b.current)*(1-Math.exp(-(i?60:2.5)*Math.min(a,.1))),x.current&&(x.current.opacity=.55*b.current);for(let t=0;t<24;t++){let a=t/24;if(a>s){o.hide(u+t);continue}let i=Math.abs(a-c),l=.16+.84*Math.pow(Math.max(0,1-7*(i=Math.min(i,1-i))),3),d=n&&(0===t||a+.041666666666666664>s)?.5+.5*Math.sin(4*r+t):1;m.current.set(Math.cos(a*es),0,Math.sin(a*es)).multiplyScalar(e.dockR).applyQuaternion(e.quat).add(e.center),o.set(u+t,m.current.x,m.current.y,m.current.z,f[0],f[1],f[2],1.1,l*(.7+.35*b.current)*d)}if(d>=0&&h&&e.look.marker){let t=i?.85:.8+.2*Math.sin(.9*r+l);o.set(d,h.x,h.y,h.z,p[0],p[1],p[2],1.6*e.look.marker.size,.8*t)}}),(0,t.jsxs)("group",{position:e.center,quaternion:e.quat,children:[!n&&(0,t.jsx)("lineLoop",{geometry:v,children:(0,t.jsx)("lineBasicMaterial",{color:e.accent,transparent:!0,opacity:.13,depthWrite:!1,blending:r.AdditiveBlending})}),(0,t.jsx)("lineSegments",{geometry:g,children:(0,t.jsx)("lineBasicMaterial",{ref:x,color:e.accent,transparent:!0,opacity:0,depthWrite:!1,blending:r.AdditiveBlending})}),n&&(0,t.jsxs)("mesh",{rotation:[Math.PI/2,0,0],children:[(0,t.jsx)("torusGeometry",{args:[e.dockR,.022*e.radius,6,96,es*s]}),(0,t.jsx)("meshStandardMaterial",{color:"#3a3545",metalness:.6,roughness:.45})]})]})}let ep=new r.Color("#cbb6ff");function em({b:e,frozen:o}){let i=(0,a.useRef)(null),l=(0,a.useMemo)(()=>{let t=[];for(let o=0;o<512;o++)t.push((0,p.around)(p.LIGHT_DIR,o/512*es).multiplyScalar(e.lane));return new r.BufferGeometry().setFromPoints(t)},[e.lane]),n=(0,a.useMemo)(()=>({uColor:{value:ep},uAccent:{value:new r.Color(e.accent)},uWorld:{value:e.center},uGap:{value:e.orbitR},uBase:{value:"inner"===e.ring?.13:.1},uHi:{value:0},uPlaneN:{value:p.LIGHT_DIR}}),[e]);return(0,c.useFrame)((t,a)=>{if(!i.current)return;let r=+("orbit"===T.flight.mode&&T.flight.body===e||T.flight.target===e),l=i.current.uniforms.uHi;l.value+=(r-l.value)*(1-Math.exp(-(o?60:2.2)*Math.min(a,.1)))}),(0,t.jsx)("lineLoop",{geometry:l,children:(0,t.jsx)("shaderMaterial",{ref:i,uniforms:n,vertexShader:y,fragmentShader:M,transparent:!0,depthWrite:!1,blending:r.AdditiveBlending})})}function eh({pool:e,frozen:o,segments:a}){return(0,t.jsxs)(t.Fragment,{children:[p.allBodies.map(e=>(0,t.jsx)(ec,{b:e,segments:a,frozen:o},e.id)),p.allBodies.filter(e=>e.look.ring).map(e=>(0,t.jsx)(ed,{b:e},`ring:${e.id}`)),p.lanes.map(e=>(0,t.jsx)(em,{b:e,frozen:o},`lane:${e.id}`)),p.worlds.map((a,r)=>(0,t.jsx)(ef,{b:a,pool:e,frozen:o,index:r},`dock:${a.id}`))]})}let ev=r.MathUtils.degToRad(16),eg=new r.Vector3,ex=new r.Vector3;function eb({reduced:e,coarse:t}){let o=(0,u.useThree)(e=>e.camera),i=(0,u.useThree)(e=>e.invalidate),l=(0,a.useRef)(new r.Vector3),n=(0,a.useRef)(new r.Vector3),s=(0,a.useRef)(new r.Vector3),d=(0,a.useRef)(new r.Vector3),f=(0,a.useRef)(new r.Vector3),m=(0,a.useRef)(new r.Vector3),h=(0,a.useRef)(new r.Vector3(0,1,0)),v=(0,a.useRef)(new r.Vector3),g=(0,a.useRef)(new r.Vector3(0,1,0)),x=(0,a.useRef)(!1);return(0,a.useLayoutEffect)(()=>{(0,T.setCoarse)(t),T.flight.reduced=e,(0,T.spawn)(),T.flight.camDist=(0,T.defaultCam)(),x.current=!1},[]),(0,a.useEffect)(()=>{T.flight.reduced=e},[e]),(0,a.useEffect)(()=>(T.runtime.kick=()=>i(),()=>{T.runtime.kick=()=>{}}),[i]),(0,c.useFrame)((t,a)=>{let i=Math.min(a,1/15),c=(0,T.step)(i),u=T.flight,b=u.camDist;if("orbit"===u.mode&&u.body){var w,y,M,k,S;let e,a,i,l,n,c,p,m,h,v,x;w=u.body,y=t.size,M=s.current,k=d.current,S=f.current,e=T.flight,a=w.pole,S.copy(e.pos).sub(w.center),S.addScaledVector(a,-S.dot(a)),1e-6>S.lengthSq()&&S.copy(e.fwd).cross(a),S.normalize(),i=y.width/Math.max(1,y.height),n=Math.atan(Math.tan(l=r.MathUtils.degToRad(o.fov/2))*i),c=Math.min(2*l*(y.height<760?.28:1/3),1.24*n),p=b/(0,T.defaultCam)(),h=Math.atan2((m=Math.max(w.radius/Math.sin(c/2)*p,1.3*w.orbitR))*Math.sin(ev),m*Math.cos(ev)-w.orbitR),v=r.MathUtils.clamp(h-.5*l,ev-.1*l,ev+.38*l),eg.copy(S).multiplyScalar(Math.cos(ev)).addScaledVector(a,Math.sin(ev)),M.copy(w.center).addScaledVector(eg,m),M.addScaledVector(e.fwd,.06*m),x=eg.copy(w.center).sub(M).normalize(),ex.copy(x).cross(a).normalize(),x.applyAxisAngle(ex,-(v-ev)),k.copy(M).addScaledVector(x,m),g.current.copy(u.up)}else if(("travel"===u.mode||"ease"===u.mode)&&u.target){let e=f.current.copy(u.target.center).sub(u.pos),t=e.length();e.divideScalar(Math.max(t,1e-4));let o=.95*b;s.current.copy(u.pos).addScaledVector(e,-o).addScaledVector(u.up,.42*o),d.current.copy(u.pos).addScaledVector(e,Math.min(.5*t,2.5*o)),g.current.copy(u.up)}else s.current.copy(u.pos).addScaledVector(u.fwd,-b).addScaledVector(u.up,.3*b),d.current.copy(u.pos).addScaledVector(u.fwd,.4*b),g.current.copy(u.up);for(let e of(x.current?(l.current.sub(v.current).add(u.pos),n.current.sub(v.current).add(u.pos),l.current.lerp(s.current,1-Math.exp(-2.6*i)),n.current.lerp(d.current,1-Math.exp(-3.5*i)),h.current.lerp(g.current,1-Math.exp(-3*i)).normalize()):(l.current.copy(s.current),n.current.copy(d.current),h.current.copy(g.current),v.current.copy(u.pos),x.current=!0),v.current.copy(u.pos),p.allBodies)){m.current.copy(l.current).sub(e.center);let t=m.current.length(),o=e.radius*(e.project?1.35:1.15);t<o&&l.current.copy(e.center).addScaledVector(m.current.divideScalar(Math.max(t,1e-4)),o)}if(o.position.copy(l.current),o.up.copy(h.current),o.lookAt(n.current),e){let e=l.current.distanceToSquared(s.current)>1e-4;(c||e)&&t.invalidate()}}),null}let ew={2:{stars:9e3,band:7e3,nebulae:4,segments:[72,54]},1:{stars:6500,band:5e3,nebulae:3,segments:[56,42]},0:{stars:4200,band:3200,nebulae:2,segments:[44,32]}};e.s(["default",0,function({reduced:e,coarse:c}){let[u]=(0,a.useState)(l.detectTier),[d,f]=(0,a.useState)(!0),[m,h]=(0,a.useState)(!1),v=c||0===u,g=ew[u],[x,b]=(0,a.useState)(v?1:1.5),w=(0,a.useMemo)(()=>new n.PointPool(256),[]);(0,a.useEffect)(()=>{let e=()=>f(!document.hidden);return document.addEventListener("visibilitychange",e),()=>document.removeEventListener("visibilitychange",e)},[]);let y=d?e?"demand":"always":"never";return(0,t.jsxs)(o.Canvas,{"aria-hidden":!0,tabIndex:-1,frameloop:y,dpr:[1,x],gl:{antialias:!v,alpha:!1,stencil:!1,depth:!0,powerPreference:"high-performance"},camera:{fov:v?66:58,near:.05,far:1600,position:[0,3,14]},onCreated:({gl:e})=>{e.setClearColor(new r.Color("#05030a"),1),h(!0)},style:{position:"absolute",inset:0,touchAction:"none",opacity:+!!m,transition:"opacity 900ms ease"},children:[(0,t.jsx)("directionalLight",{position:p.LIGHT_POS,intensity:6,color:"#fff0de"}),(0,t.jsx)("ambientLight",{color:"#5a4f8a",intensity:.5}),(0,t.jsx)(B,{frozen:e,stars:g.stars,band:g.band,nebulae:g.nebulae}),(0,t.jsx)(eh,{pool:w,frozen:e,segments:g.segments}),(0,t.jsx)(eb,{reduced:e,coarse:c}),(0,t.jsx)(ea,{pool:w,reduced:e}),(0,t.jsx)(V,{coarse:c}),(0,t.jsx)(s.default,{pool:w,glow:v?1.4:1.25}),!e&&!v&&(0,t.jsx)(i.default,{onDrop:()=>b(1)})]})}],76714)},46511,function(e){e.n(e.i(76714))}]);