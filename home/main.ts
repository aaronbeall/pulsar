// Hero for the marketing homepage: a spinning pulsar drawn as GPU particles in plain WebGL
// (no three.js, to keep the page small and fast on phones). Every particle's position is a
// function of time computed in the vertex shader, so the CPU does no per-frame work beyond
// one draw call.
//
// The star spins around a spin axis; its magnetic axis is tilted off it and sweeps around
// like a lighthouse. The two jets fire along the magnetic axis, and each particle keeps the
// direction it was fired in, so the beams curl into spirals as the star turns.
//
// On load it plays a short reveal: matter falls in, the core ignites with a flash and
// shockwave rings, and the star starts spinning fast and settles to a slow, casual turn.
//
// With prefers-reduced-motion, one still frame is drawn and nothing animates. Without
// WebGL, the page falls back to a CSS drawing (see .no-webgl in home.css).

const KIND_CORE = 0;
const KIND_JET = 1;
const KIND_DISK = 2;
const KIND_STAR = 3;
const KIND_GLOW = 4;
const KIND_SHOCK = 5;

// Reveal timing and spin speeds (seconds, radians per second).
const IGNITE_AT = 0.8;
const SPIN_FAST = 9;
const SPIN_REST = 0.7;
const SPIN_SETTLE = 1.4; // time constant of the spin slowing down after ignition
const FLOW_REST = 0.24; // jet particles' lifecycles per second
const FLOW_FAST = 0.6;

const VERT = /* glsl */ `
precision highp float;
attribute vec4 aData; // x: kind, yzw: random seeds in [0, 1)
uniform float uTime;    // seconds of animation so far
uniform float uPhase;   // the star's spin angle (integrated, since the speed changes)
uniform float uSpeed;   // current spin speed
uniform float uFlow;    // jets' integrated flow
uniform float uFlowRate;
uniform float uIgnite;  // seconds since the core ignited (negative before)
uniform mat4 uProj;
uniform mat4 uView;
uniform float uPx;    // point size scale: device pixels per unit at distance 1
varying vec3 vColor;
varying float vAlpha;

const float PI = 3.14159265;
const float TAU = 6.2831853;
const float LAG = 1.6;         // seconds a jet particle has been flying at the end of its life
const float TILT = 0.62;       // magnetic axis angle off the spin axis
const float CORE_R = 0.2;
const float IGNITE_AT_S = ${IGNITE_AT.toFixed(2)};

vec3 S = normalize(vec3(0.12, 1.0, 0.18));

vec3 magAxis(float phase, vec3 U, vec3 V) {
  return cos(TILT) * S + sin(TILT) * (cos(phase) * U + sin(phase) * V);
}

// Offset shades of purple, so particles fall into streaks of slightly different color.
vec3 purpleShade(float h) {
  h = fract(h);
  if (h < 0.25) return vec3(0.42, 0.24, 1.0);  // electric indigo
  if (h < 0.5) return vec3(0.8, 0.6, 1.0);     // lavender
  if (h < 0.75) return vec3(0.98, 0.38, 0.88); // orchid
  return vec3(0.62, 0.14, 0.9);                // deep purple
}

float easeOut(float x) { x = clamp(x, 0.0, 1.0); return 1.0 - (1.0 - x) * (1.0 - x) * (1.0 - x); }

vec3 rotateAround(vec3 v, vec3 axis, float a) {
  float c = cos(a), s = sin(a);
  return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
}

void main() {
  vec3 U = normalize(cross(S, vec3(1.0, 0.0, 0.0)));
  vec3 V = cross(S, U);
  float kind = aData.x;
  float r1 = aData.y, r2 = aData.z, r3 = aData.w;
  vec3 pos;
  float size;
  // The pulse: the star flares when a beam swings toward the viewer.
  float flash = pow(abs(dot(magAxis(uPhase, U, V), normalize(vec3(0.0, 0.1, 1.0)))), 6.0);
  // The ignition: a bright burst that fades over a second or so.
  float burst = uIgnite > 0.0 ? exp(-uIgnite * 2.5) : 0.0;
  float lit = smoothstep(-0.4, 0.15, uIgnite);

  if (kind < 0.5) {
    // Core: a dense shell of hot particles spinning with the star.
    float th = r1 * TAU;
    float z = r2 * 2.0 - 1.0;
    vec3 dir = vec3(sqrt(1.0 - z * z) * cos(th), z, sqrt(1.0 - z * z) * sin(th));
    float rr = CORE_R * pow(r3, 0.35);
    // Before ignition the core's matter falls in from far out; the burst then puffs it up.
    float fall = easeOut(uTime / IGNITE_AT_S);
    rr = mix(1.6 + r3 * 1.4, rr, fall) * (1.0 + 0.5 * burst);
    pos = rotateAround(dir * rr, S, uPhase + r1 * (1.0 - fall) * 3.0);
    vColor = mix(vec3(1.0, 0.97, 1.0), purpleShade(r1 * 3.0), 0.15 + 0.5 * r3 * r3);
    vAlpha = (0.6 + 0.4 * flash + burst) * smoothstep(0.0, 0.5, uTime);
    size = 2.6 + flash * 1.5 + burst * 2.0;
  } else if (kind < 1.5) {
    // Jets: fired from the poles of the magnetic axis as it was when the particle left.
    float side = r1 < 0.5 ? -1.0 : 1.0;
    float life = fract(r2 * 7.31 + uFlow);
    // Where the magnetic axis pointed when this particle was fired.
    vec3 m = side * magAxis(uPhase - life * LAG * uSpeed, U, V);
    vec3 p1 = normalize(cross(m, S));
    vec3 p2 = cross(m, p1);
    float d = CORE_R * 0.9 + life * 3.2;
    float spread = (0.02 + life * life * 0.6) * sqrt(r3);
    float a = r3 * 97.0 + life * 5.0;
    pos = m * d + (cos(a) * p1 + sin(a) * p2) * spread;
    // Particles with close seeds travel together as a filament; give each a shade.
    vec3 streak = purpleShade(floor(r3 * 11.0) * 0.618);
    vec3 hot = vec3(1.0, 0.92, 1.0);
    vec3 violet = vec3(0.62, 0.36, 1.0);
    vec3 magenta = vec3(0.92, 0.3, 0.95);
    vec3 red = vec3(1.0, 0.16, 0.22);
    vColor = life < 0.08 ? mix(hot, violet, life / 0.08)
      : life < 0.22 ? mix(violet, magenta, (life - 0.08) / 0.14)
      : mix(magenta, red, smoothstep(0.22, 0.45, life));
    vColor = mix(vColor, streak, 0.55 * smoothstep(0.03, 0.12, life) * (1.0 - smoothstep(0.4, 0.7, life)));
    vAlpha = smoothstep(0.0, 0.02, life) * pow(1.0 - life, 1.25) * (0.75 + 0.5 * r2);
    // The beams shoot out from ignition: only particles fired since then are shown.
    vAlpha *= step(life, uIgnite * uFlowRate);
    size = 1.5 + (1.0 - life) * 2.8;
  } else if (kind < 2.5) {
    // Disk: a thin swirl in the equatorial plane; inner particles orbit faster.
    float rad = 0.32 + pow(r1, 1.7) * 1.5;
    float ang = r2 * TAU + uPhase * 0.3 / pow(rad, 1.5);
    float grow = easeOut(uIgnite / 1.8);
    rad *= mix(0.15, 1.0, grow);
    float h = (r3 - 0.5) * 0.05 * rad;
    pos = (cos(ang) * U + sin(ang) * V) * rad + S * h;
    float t = clamp((rad - 0.32) / 1.5, 0.0, 1.0);
    vColor = mix(vec3(0.8, 0.5, 1.0), vec3(1.0, 0.2, 0.35), smoothstep(0.0, 0.6, t));
    // Arms of slightly different purple, which shear into spiral streaks as the disk turns.
    vColor = mix(vColor, purpleShade(floor(r2 * 14.0) * 0.618), 0.45);
    vAlpha = ((1.0 - t) * 0.8 + 0.12) * smoothstep(0.0, 0.8, uIgnite) * (0.7 + 0.6 * r3);
    size = 1.4 + (1.0 - t) * 1.1;
  } else if (kind > 3.5 && kind < 4.5) {
    // Glow: a few huge, faint particles stacked on the core for bloom.
    pos = vec3(0.0);
    // The smallest ones are a white-hot nucleus; the biggest a faint violet haze.
    vColor = mix(vec3(1.0, 0.94, 1.0), vec3(0.6, 0.3, 1.0), sqrt(r1));
    float glow = mix(smoothstep(0.0, IGNITE_AT_S, uTime) * 0.5, 1.0, lit);
    vAlpha = mix(0.85, 0.06, sqrt(r1)) * (0.75 + 0.6 * flash + 2.0 * burst) * glow;
    size = (7.0 + r1 * 60.0) * (1.0 + burst * 0.8);
  } else if (kind > 4.5) {
    // Shockwaves: rings racing out from the ignition, one after another.
    float ring = floor(r1 * 3.0);
    float age = uIgnite - ring * 0.3;
    float rad = 0.22 + 3.4 * (1.0 - exp(-age * 1.5));
    rad *= 1.0 + (r3 - 0.5) * 0.08 * (1.0 + age);
    float ang = r2 * TAU;
    // The middle ring faces the viewer; the others lie in the star's equator.
    vec3 e1 = ring == 1.0 ? vec3(1.0, 0.0, 0.0) : U;
    vec3 e2 = ring == 1.0 ? vec3(0.0, 1.0, 0.0) : V;
    pos = (cos(ang) * e1 + sin(ang) * e2) * rad;
    float fade = clamp(1.0 - age / 2.4, 0.0, 1.0);
    vColor = mix(vec3(1.0, 0.95, 1.0), ring == 2.0 ? vec3(1.0, 0.25, 0.35) : purpleShade(r2 * 4.0), smoothstep(0.0, 0.6, age));
    vAlpha = age > 0.0 ? fade * fade * 0.9 : 0.0;
    size = 2.2 + fade * 1.5;
  } else {
    // Background stars, drifting very slowly.
    float th = r1 * TAU + uTime * 0.01;
    float z = r2 * 2.0 - 1.0;
    vec3 dir = vec3(sqrt(1.0 - z * z) * cos(th), z, sqrt(1.0 - z * z) * sin(th));
    pos = dir * (7.0 + r3 * 5.0);
    vColor = mix(vec3(0.7, 0.75, 1.0), vec3(1.0, 0.75, 0.9), r3);
    float tw = 0.6 + 0.4 * sin(uTime * (0.6 + r3 * 2.0) + r1 * 40.0);
    vAlpha = (0.25 + 0.5 * r3 * r3) * tw * smoothstep(0.0, 2.0, uTime);
    size = 1.6 + r3 * 2.4;
  }

  vec4 viewPos = uView * vec4(pos, 1.0);
  gl_Position = uProj * viewPos;
  gl_PointSize = max(1.0, size * uPx / -viewPos.z);
}
`;

const FRAG = /* glsl */ `
precision mediump float;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float a = vAlpha * exp(-d * d * 3.5) * (1.0 - d);
  gl_FragColor = vec4(vColor * a, a);
}
`;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || 'shader compile failed');
  }
  return shader;
}

function perspective(fovY: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  // prettier-ignore
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}

function lookAt(eye: number[], target: number[]) {
  const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const norm = (v: number[]) => { const l = Math.hypot(v[0], v[1], v[2]); return v.map((x) => x / l); };
  const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const z = norm(sub(eye, target));
  const x = norm(cross([0, 1, 0], z));
  const y = cross(z, x);
  // prettier-ignore
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1,
  ]);
}

function buildParticles(small: boolean) {
  const counts: [number, number][] = [
    [KIND_CORE, small ? 1400 : 2200],
    [KIND_JET, small ? 9000 : 15000],
    [KIND_DISK, small ? 2600 : 4500],
    [KIND_STAR, small ? 300 : 600],
    [KIND_GLOW, 10],
    [KIND_SHOCK, small ? 2400 : 4000],
  ];
  const total = counts.reduce((n, [, c]) => n + c, 0);
  const data = new Float32Array(total * 4);
  let i = 0;
  for (const [kind, count] of counts) {
    for (let k = 0; k < count; k++, i += 4) {
      data[i] = kind;
      data[i + 1] = Math.random();
      data[i + 2] = Math.random();
      data[i + 3] = Math.random();
    }
  }
  return { data, total };
}

function startHero() {
  const hero = document.getElementById('hero')!;
  const canvas = document.getElementById('pulsar') as HTMLCanvasElement;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!gl) {
    hero.classList.add('no-webgl', 'settled');
    return;
  }

  let program: WebGLProgram;
  try {
    program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'link failed');
  } catch (err) {
    console.warn('Pulsar hero: falling back to CSS', err);
    hero.classList.add('no-webgl', 'settled');
    return;
  }
  gl.useProgram(program);

  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  const { data, total } = buildParticles(small);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  const aData = gl.getAttribLocation(program, 'aData');
  gl.enableVertexAttribArray(aData);
  gl.vertexAttribPointer(aData, 4, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(program, 'uTime');
  const uPhase = gl.getUniformLocation(program, 'uPhase');
  const uSpeed = gl.getUniformLocation(program, 'uSpeed');
  const uFlow = gl.getUniformLocation(program, 'uFlow');
  const uFlowRate = gl.getUniformLocation(program, 'uFlowRate');
  const uIgnite = gl.getUniformLocation(program, 'uIgnite');
  const uProj = gl.getUniformLocation(program, 'uProj');
  const uView = gl.getUniformLocation(program, 'uView');
  const uPx = gl.getUniformLocation(program, 'uPx');

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // additive: overlapping particles glow

  // The star sits in the upper part of the hero on phones, leaving room for the copy below.
  const starY = () => (window.innerWidth < 768 ? 0.36 : 0.4);
  let aspect = 1;
  let pointer = { x: 0, y: 0 };
  let pointerTarget = { x: 0, y: 0 };
  let scrollFade = 0;
  let running = false;
  let proj = new Float32Array(16);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, small ? 2 : 1.75);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl!.viewport(0, 0, canvas.width, canvas.height);
    aspect = w / h;
    const fov = aspect < 1 ? 0.95 : 0.7;
    proj = perspective(fov, aspect, 0.1, 50);
    gl!.uniformMatrix4fv(uProj, false, proj);
    // Size a particle in device pixels: projected height of 1 unit at distance 1, scaled down.
    gl!.uniform1f(uPx, (canvas.height / (2 * Math.tan(fov / 2))) * 0.0055 * (aspect < 1 ? 1.25 : 1));
  }

  function setView() {
    // Shift the camera target so the star lands at starY of the hero, not dead center.
    const lift = (0.5 - starY()) * 2.6;
    const dolly = 4.4 + scrollFade * 1.2;
    const eye = [pointer.x * 0.6, 0.5 - lift + pointer.y * 0.4, dolly];
    const view = lookAt(eye, [0, -lift, 0]);
    gl!.uniformMatrix4fv(uView, false, view);
    // Keep the CSS bloom centered on wherever the star lands on screen.
    const y = view[13];
    const z = view[14];
    const x = view[12];
    const clipX = (proj[0] * x) / -z;
    const clipY = (proj[5] * y) / -z;
    hero.style.setProperty('--star-x', `${(clipX * 0.5 + 0.5) * 100}%`);
    hero.style.setProperty('--star-y', `${(0.5 - clipY * 0.5) * 100}%`);
  }

  // Animation state. Time only advances while the hero is animating, so the reveal plays
  // when it's first seen. The spin and the jets' flow are integrated, since their speeds
  // change during the reveal.
  const sim = { t: 0, phase: 0, flow: 0 };
  const spinAt = (t: number) => (t < IGNITE_AT ? SPIN_FAST * (t / IGNITE_AT) : SPIN_REST + (SPIN_FAST - SPIN_REST) * Math.exp(-(t - IGNITE_AT) / SPIN_SETTLE));
  const flowAt = (t: number) => (t < IGNITE_AT ? FLOW_FAST : FLOW_REST + (FLOW_FAST - FLOW_REST) * Math.exp(-(t - IGNITE_AT) / SPIN_SETTLE));
  function step(dt: number) {
    sim.t += dt;
    sim.phase += spinAt(sim.t) * dt;
    sim.flow += flowAt(sim.t) * dt;
  }

  function draw() {
    pointer.x += (pointerTarget.x - pointer.x) * 0.05;
    pointer.y += (pointerTarget.y - pointer.y) * 0.05;
    setView();
    gl!.uniform1f(uTime, sim.t);
    gl!.uniform1f(uPhase, sim.phase);
    gl!.uniform1f(uSpeed, spinAt(sim.t));
    gl!.uniform1f(uFlow, sim.flow);
    gl!.uniform1f(uFlowRate, flowAt(sim.t));
    gl!.uniform1f(uIgnite, sim.t - IGNITE_AT);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.drawArrays(gl!.POINTS, 0, total);
  }

  resize();
  window.addEventListener('resize', () => {
    resize();
    if (!running) draw();
  });

  if (reducedMotion.matches) {
    // A settled frame where both beams are clearly visible.
    Object.assign(sim, { t: 30, phase: 4.0, flow: 0.5 });
    hero.classList.add('settled');
    draw();
    return;
  }

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    pointerTarget = { x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 };
  }, { passive: true });

  window.addEventListener('scroll', () => {
    scrollFade = Math.min(1, window.scrollY / Math.max(1, hero.clientHeight));
  }, { passive: true });

  // Only animate while the hero is on screen and the tab is visible.
  let visible = true;
  let raf = 0;
  let last = 0;
  const loop = (now: number) => {
    // Cap the step so a dropped frame or a resumed tab doesn't jump the animation.
    if (last) step(Math.min(0.05, (now - last) / 1000));
    last = now;
    draw();
    raf = requestAnimationFrame(loop);
  };
  const update = () => {
    const should = visible && !document.hidden;
    if (should && !running) {
      running = true;
      last = 0;
      // The CSS sky and bloom start their own reveal in step with the first frame.
      hero.classList.add('igniting');
      raf = requestAnimationFrame(loop);
    }
    if (!should && running) { running = false; cancelAnimationFrame(raf); }
  };
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }).observe(hero);
  document.addEventListener('visibilitychange', update);
  update();
}

function startReveal() {
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
  document.body.classList.add('reveal-ready');
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('.step').forEach((el) => io.observe(el));
}

function startTopbar() {
  const bar = document.querySelector('.topbar')!;
  const hero = document.getElementById('hero')!;
  const update = () => bar.classList.toggle('solid', window.scrollY > hero.clientHeight * 0.6);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

startHero();
startReveal();
startTopbar();
