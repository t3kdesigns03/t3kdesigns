/**
 * One vertex program drives every particle layer in the scene (disk, bulge,
 * dust, satellite clusters, distant stars). Layers differ only by uniforms.
 */
export const pointsVert = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uRotSpeed;
  uniform float uShear;
  uniform float uTwinkle;
  uniform float uFade;

  attribute vec3 aColor;
  attribute float aSize;
  attribute float aBright;
  attribute float aSeed;

  varying vec3 vColor;
  varying float vBright;

  void main() {
    vec3 p = position;

    // differential rotation: the inner disk turns faster than the rim,
    // kept gentle so the arms do not wind into a spring over a long visit
    float r = length(p.xz);
    float ang = uTime * uRotSpeed * (1.0 - uShear * clamp(r / 6.2, 0.0, 1.0));
    float c = cos(ang);
    float s = sin(ang);
    p.xz = mat2(c, -s, s, c) * p.xz;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float twinkle = 1.0 + uTwinkle * sin(uTime * (0.6 + aSeed * 1.7) + aSeed * 31.4);
    gl_PointSize = uSize * aSize * uPixelRatio * (1.0 / max(0.0001, -mv.z));
    gl_PointSize = clamp(gl_PointSize, 0.55, 42.0);

    vColor = aColor;
    vBright = aBright * twinkle * uFade;
  }
`;

/** Additive star: hot pinpoint core plus an exponential halo. */
export const starFrag = /* glsl */ `
  precision highp float;

  varying vec3 vColor;
  varying float vBright;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float core = pow(max(0.0, 1.0 - d * 2.55), 7.0);
    float halo = exp(-d * 8.5) * 0.34;
    float a = (core + halo) * vBright;
    if (a < 0.002) discard;

    vec3 col = vColor * (0.6 + core * 1.9);
    gl_FragColor = vec4(col, a);

    #include <colorspace_fragment>
  }
`;

/**
 * Dust. Drawn after the stars with *subtractive* blending: the fragment
 * output is an absorption coefficient, not a colour, so the layer can only
 * ever remove light that is already there. Over empty void it is invisible;
 * across the arms it opens real lanes. Blue is absorbed hardest, which is
 * why dust reddens what is behind it.
 */
export const dustFrag = /* glsl */ `
  precision highp float;

  varying vec3 vColor;
  varying float vBright;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float a = smoothstep(0.5, 0.02, d) * vBright;
    if (a < 0.002) discard;

    // consumed as (1 - src) by the blend equation
    gl_FragColor = vec4(vColor * a, a);
  }
`;
