import"./modulepreload-polyfill-B5Qt9EMX.js";const ee=0,te=1,oe=2,re=3,ie=4,ae=5,p=.8,U=9,k=.7,O=1.4,M=.24,D=.6,ne=`
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
const float IGNITE_AT_S = ${p.toFixed(2)};

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
`,se=`
precision mediump float;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float a = vAlpha * exp(-d * d * 3.5) * (1.0 - d);
  gl_FragColor = vec4(vColor * a, a);
}
`,V=window.matchMedia("(prefers-reduced-motion: reduce)");function N(o,i,e){const t=o.createShader(i);if(o.shaderSource(t,e),o.compileShader(t),!o.getShaderParameter(t,o.COMPILE_STATUS))throw new Error(o.getShaderInfoLog(t)||"shader compile failed");return t}function le(o,i,e,t){const s=1/Math.tan(o/2),l=1/(e-t);return new Float32Array([s/i,0,0,0,0,s,0,0,0,0,(t+e)*l,-1,0,0,2*t*e*l,0])}function ce(o,i){const e=(a,n)=>[a[0]-n[0],a[1]-n[1],a[2]-n[2]],t=a=>{const n=Math.hypot(a[0],a[1],a[2]);return a.map(S=>S/n)},s=(a,n)=>[a[1]*n[2]-a[2]*n[1],a[2]*n[0]-a[0]*n[2],a[0]*n[1]-a[1]*n[0]],l=(a,n)=>a[0]*n[0]+a[1]*n[1]+a[2]*n[2],c=t(e(o,i)),d=t(s([0,1,0],c)),h=s(c,d);return new Float32Array([d[0],h[0],c[0],0,d[1],h[1],c[1],0,d[2],h[2],c[2],0,-l(d,o),-l(h,o),-l(c,o),1])}function fe(o){const i=[[ee,o?1400:2200],[te,o?9e3:15e3],[oe,o?2600:4500],[re,o?300:600],[ie,10],[ae,o?2400:4e3]],e=i.reduce((l,[,c])=>l+c,0),t=new Float32Array(e*4);let s=0;for(const[l,c]of i)for(let d=0;d<c;d++,s+=4)t[s]=l,t[s+1]=Math.random(),t[s+2]=Math.random(),t[s+3]=Math.random();return{data:t,total:e}}function de(){const o=document.getElementById("hero"),i=document.getElementById("pulsar"),e=i.getContext("webgl",{antialias:!1,alpha:!0,premultipliedAlpha:!0,powerPreference:"high-performance"});if(!e){o.classList.add("no-webgl","settled");return}let t;try{if(t=e.createProgram(),e.attachShader(t,N(e,e.VERTEX_SHADER,ne)),e.attachShader(t,N(e,e.FRAGMENT_SHADER,se)),e.linkProgram(t),!e.getProgramParameter(t,e.LINK_STATUS))throw new Error(e.getProgramInfoLog(t)||"link failed")}catch(r){console.warn("Pulsar hero: falling back to CSS",r),o.classList.add("no-webgl","settled");return}e.useProgram(t);const s=Math.min(window.innerWidth,window.innerHeight)<600,{data:l,total:c}=fe(s),d=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,d),e.bufferData(e.ARRAY_BUFFER,l,e.STATIC_DRAW);const h=e.getAttribLocation(t,"aData");e.enableVertexAttribArray(h),e.vertexAttribPointer(h,4,e.FLOAT,!1,0,0);const a=e.getUniformLocation(t,"uTime"),n=e.getUniformLocation(t,"uPhase"),S=e.getUniformLocation(t,"uSpeed"),q=e.getUniformLocation(t,"uFlow"),B=e.getUniformLocation(t,"uFlowRate"),G=e.getUniformLocation(t,"uIgnite"),H=e.getUniformLocation(t,"uProj"),K=e.getUniformLocation(t,"uView"),W=e.getUniformLocation(t,"uPx");e.disable(e.DEPTH_TEST),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE);const j=()=>window.innerWidth<768?.36:.4;let g=1,m={x:0,y:0},I={x:0,y:0},b=0,v=!1,w=new Float32Array(16);function L(){const r=Math.min(window.devicePixelRatio||1,s?2:1.75),A=i.clientWidth,T=i.clientHeight;i.width=Math.round(A*r),i.height=Math.round(T*r),e.viewport(0,0,i.width,i.height),g=A/T;const u=g<1?.95:.7;w=le(u,g,.1,50),e.uniformMatrix4fv(H,!1,w),e.uniform1f(W,i.height/(2*Math.tan(u/2))*.0055*(g<1?1.25:1))}function Y(){const r=(.5-j())*2.6,A=4.4+b*1.2,T=[m.x*.6,.5-r+m.y*.4,A],u=ce(T,[0,-r,0]);e.uniformMatrix4fv(K,!1,u);const $=u[13],C=u[14],J=u[12],Q=w[0]*J/-C,Z=w[5]*$/-C;o.style.setProperty("--star-x",`${(Q*.5+.5)*100}%`),o.style.setProperty("--star-y",`${(.5-Z*.5)*100}%`)}const f={t:0,phase:0,flow:0},_=r=>r<p?U*(r/p):k+(U-k)*Math.exp(-(r-p)/O),z=r=>r<p?D:M+(D-M)*Math.exp(-(r-p)/O);function X(r){f.t+=r,f.phase+=_(f.t)*r,f.flow+=z(f.t)*r}function y(){m.x+=(I.x-m.x)*.05,m.y+=(I.y-m.y)*.05,Y(),e.uniform1f(a,f.t),e.uniform1f(n,f.phase),e.uniform1f(S,_(f.t)),e.uniform1f(q,f.flow),e.uniform1f(B,z(f.t)),e.uniform1f(G,f.t-p),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.drawArrays(e.POINTS,0,c)}if(L(),window.addEventListener("resize",()=>{L(),v||y()}),V.matches){Object.assign(f,{t:30,phase:4,flow:.5}),o.classList.add("settled"),y();return}window.addEventListener("pointermove",r=>{r.pointerType==="mouse"&&(I={x:r.clientX/window.innerWidth-.5,y:r.clientY/window.innerHeight-.5})},{passive:!0}),window.addEventListener("scroll",()=>{b=Math.min(1,window.scrollY/Math.max(1,o.clientHeight))},{passive:!0});let F=!0,P=0,x=0;const R=r=>{x&&X(Math.min(.05,(r-x)/1e3)),x=r,y(),P=requestAnimationFrame(R)},E=()=>{const r=F&&!document.hidden;r&&!v&&(v=!0,x=0,o.classList.add("igniting"),P=requestAnimationFrame(R)),!r&&v&&(v=!1,cancelAnimationFrame(P))};new IntersectionObserver(([r])=>{F=r.isIntersecting,E()}).observe(o),document.addEventListener("visibilitychange",E),E()}function he(){if(V.matches||!("IntersectionObserver"in window))return;document.body.classList.add("reveal-ready");const o=new IntersectionObserver(i=>{for(const e of i)e.isIntersecting&&(e.target.classList.add("in"),o.unobserve(e.target))},{rootMargin:"0px 0px -12% 0px"});document.querySelectorAll(".step").forEach(i=>o.observe(i))}function ue(){const o=document.querySelector(".topbar"),i=document.getElementById("hero"),e=()=>o.classList.toggle("solid",window.scrollY>i.clientHeight*.6);window.addEventListener("scroll",e,{passive:!0}),e()}de();he();ue();
