/**
 * GLSL for the home work dome (see hexDomeEngine.ts).
 *
 * Every card and caption is a flat plane positioned entirely in the vertex
 * shader: its lattice center is wrapped into one period of the infinite
 * field, then the flat "arc space" plane is wrapped around the inside of a
 * sphere around the camera.
 */

export const domeVertex = /* glsl */ `
  uniform vec2 uCenter;
  uniform vec2 uAnchor;   // the card this mesh belongs to (captions follow their card)
  uniform vec2 uSize;
  uniform vec2 uOffset;
  uniform vec2 uVel;
  uniform vec2 uPeriod;
  uniform float uR;
  uniform float uIntro;
  uniform float uStretch;
  uniform float uFocus;
  uniform float uHover;
  uniform float uSelected;

  varying vec2 vUv;
  varying float vFade;
  varying float vView;
  varying float vCard;
  varying float vIntro;

  vec2 wrapC(vec2 c) { return c - uPeriod * floor((c + uPeriod * 0.5) / uPeriod); }

  void main() {
    vUv = uv;
    // wrap on the parent card so a caption never detaches from its card
    vec2 anchor = wrapC(uAnchor + uOffset);
    vec2 c = anchor + (uCenter - uAnchor);

    // intro: cards fly in from deep space, staggered outward from the focal point
    float t = clamp(uIntro * 1.9 - length(anchor) / 14.0, 0.0, 1.0);
    t = 1.0 - pow(1.0 - t, 4.0);
    vIntro = t;

    float sel = uSelected * uFocus;
    float scale = 1.0 + uHover * 0.035 + sel * 0.12;
    vec2 p = c + position.xy * scale + (c - anchor) * (scale - 1.0);

    float th = p.x / uR;
    float ph = p.y / uR;

    // drag tension: card edges bow outward and the whole field breathes
    float lx = position.x / (uSize.x * 0.5);
    float r = uR;
    r += uStretch * (0.5 + 0.35 * lx * lx);
    r += length(uVel) * 1.6 * (1.0 - lx * lx * 0.4);
    r -= uHover * 0.18;
    r -= sel * 0.6;
    r += uFocus * (1.0 - uSelected) * 2.4;
    r = mix(uR * 3.2, r, t);
    th += (1.0 - t) * 0.9 * sign(anchor.x + 0.001);

    vec3 pos = vec3(r * cos(ph) * sin(th), r * sin(ph), -r * cos(ph) * cos(th));

    vFade = 1.0 - smoothstep(0.62, 0.92, abs(anchor.y) / (uPeriod.y * 0.5));
    vView = -normalize(pos).z;
    // how squarely this card faces the viewer (per card, not per pixel)
    vCard = cos(anchor.x / uR) * cos(anchor.y / uR);

    gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
  }
`;

export const cardFragment = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uSize;
  uniform vec2 uVel;
  uniform float uHover;
  uniform float uSelected;
  uniform float uFocus;
  uniform float uTime;
  uniform float uStretch;
  uniform float uTexAspect;

  varying vec2 vUv;
  varying float vFade;
  varying float vView;
  varying float vCard;
  varying float vIntro;

  float sdRound(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    // cover-fit the media
    float planeAspect = uSize.x / uSize.y;
    vec2 uv = vUv - 0.5;
    if (uTexAspect > planeAspect) uv.x *= planeAspect / uTexAspect;
    else uv.y *= uTexAspect / planeAspect;
    // inner zoom: settles in on hover, pushes out while dragging
    uv *= 1.0 - uHover * 0.07 + uStretch * 0.05 - uSelected * uFocus * 0.04;
    uv += 0.5;

    // chromatic split along the drag direction
    float speed = length(uVel);
    vec2 dir = speed > 0.0001 ? uVel / speed : vec2(1.0, 0.0);
    float shift = clamp(speed * 0.06, 0.0, 0.03) + (1.0 - vIntro) * 0.04;
    dir.y = -dir.y;
    vec3 col;
    col.r = texture2D(uTex, uv + dir * shift).r;
    col.g = texture2D(uTex, uv).g;
    col.b = texture2D(uTex, uv - dir * shift).b;

    // glitch slices while flying fast
    float slice = step(0.985 - speed * 0.06, hash(vec2(floor(vUv.y * 26.0), floor(uTime * 18.0))));
    col = mix(col, texture2D(uTex, uv + vec2(0.04 * slice * sign(uVel.x + 0.0001), 0.0)).rgb, slice * min(speed * 6.0, 1.0));

    // light falloff: the card you face is lit, the dome falls into shadow
    float lit = smoothstep(0.86, 0.995, vCard);
    float bright = mix(0.1, 1.0, lit * lit) * mix(0.7, 1.0, smoothstep(0.75, 1.0, vView));
    bright = max(bright, uHover * 0.95);
    bright = mix(bright, uSelected > 0.5 ? 1.0 : bright * 0.25, uFocus);
    col *= bright;

    // sheen sweeping across on hover
    float sheen = smoothstep(0.0, 0.25, 0.25 - abs(vUv.x + vUv.y * 0.35 - (uHover * 1.6 - 0.2)));
    col += sheen * 0.08 * uHover;

    // film grain
    col += (hash(vUv * 900.0 + uTime) - 0.5) * 0.05;

    // rounded corners + hairline border
    vec2 px = (vUv - 0.5) * uSize;
    float dist = sdRound(px, uSize * 0.5, 0.045);
    float aa = fwidth(dist);
    float mask = 1.0 - smoothstep(-aa, aa, dist);
    float border = 1.0 - smoothstep(0.0, aa * 1.5, abs(dist + 0.004));
    col = mix(col, vec3(1.0), border * (0.08 + uHover * 0.5) * lit);

    gl_FragColor = vec4(col, mask * vFade * smoothstep(0.0, 0.35, vIntro));
  }
`;

export const labelFragment = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uHover;
  uniform float uFocus;
  varying vec2 vUv;
  varying float vFade;
  varying float vCard;
  varying float vIntro;
  void main() {
    vec4 t = texture2D(uTex, vUv);
    float lit = mix(0.16, 1.0, smoothstep(0.86, 0.995, vCard));
    lit = max(lit, uHover);
    float a = t.a * lit * vFade * smoothstep(0.6, 1.0, vIntro);
    a *= 1.0 - uFocus; // the detail panel takes over
    gl_FragColor = vec4(t.rgb, a);
  }
`;

/** Faint honeycomb sky that turns slower than the cards (parallax). */
export const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
  }
`;

export const skyFragment = /* glsl */ `
  uniform vec2 uOffset;
  uniform float uR;
  uniform float uTime;
  uniform float uIntro;
  uniform float uStretch;
  varying vec3 vDir;
  const float PI = 3.14159265;
  float hexDist(vec2 p) { p = abs(p); return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x); }
  vec4 hexCoords(vec2 uv) {
    vec2 r = vec2(1.0, 1.7320508);
    vec2 h = r * 0.5;
    vec2 a = mod(uv, r) - h;
    vec2 b = mod(uv - h, r) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    return vec4(gv, uv - gv);
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    float th = atan(vDir.x, -vDir.z);
    float ph = asin(clamp(vDir.y, -1.0, 1.0));
    // 40 cells around the full turn, so the seam behind the camera tiles cleanly
    vec2 uv = vec2(th, ph) * (40.0 / (2.0 * PI));
    uv += uOffset / uR * (40.0 / (2.0 * PI)) * 0.35;
    vec4 h = hexCoords(uv);
    float e = 0.5 - hexDist(h.xy);
    float line = 1.0 - smoothstep(0.0, fwidth(e) * 1.4, e);
    float cell = hash(h.zw);
    float twinkle = step(0.93, cell) * (0.5 + 0.5 * sin(uTime * 1.5 + cell * 40.0));
    float horizon = 1.0 - smoothstep(0.0, 1.1, abs(ph));
    float front = smoothstep(-0.2, 1.0, -vDir.z);
    float a = line * (0.05 + uStretch * 0.06) * horizon * (0.4 + 0.6 * front);
    a += twinkle * 0.035 * horizon * (1.0 - smoothstep(0.0, 0.48, hexDist(h.xy)));
    gl_FragColor = vec4(vec3(a * uIntro), 1.0);
  }
`;

export const dustVertex = /* glsl */ `
  attribute float seed;
  uniform float uTime;
  uniform float uDpr;
  varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.0 + seed * 2.2) * uDpr * (14.0 / -mv.z);
    vA = (0.25 + 0.75 * seed) * (0.5 + 0.5 * sin(uTime * (0.6 + seed) + seed * 30.0));
  }
`;

export const dustFragment = /* glsl */ `
  uniform float uIntro;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(vec3(1.0), smoothstep(0.5, 0.0, d) * vA * 0.5 * uIntro);
  }
`;
