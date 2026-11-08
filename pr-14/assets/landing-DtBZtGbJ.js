import"./modulepreload-polyfill-B5Qt9EMX.js";const V=0,q=1,B=2,H=3,K=4,Y=`
precision highp float;
attribute vec4 aData; // x: kind, yzw: random seeds in [0, 1)
uniform float uTime;
uniform mat4 uProj;
uniform mat4 uView;
uniform float uPx;    // point size scale: device pixels per unit at distance 1
varying vec3 vColor;
varying float vAlpha;

const float PI = 3.14159265;
const float TAU = 6.2831853;
const float SPIN = 1.7;        // radians per second
const float TILT = 0.62;       // magnetic axis angle off the spin axis
const float CORE_R = 0.2;

vec3 S = normalize(vec3(0.12, 1.0, 0.18));

vec3 magAxis(float t, vec3 U, vec3 V) {
  return cos(TILT) * S + sin(TILT) * (cos(t * SPIN) * U + sin(t * SPIN) * V);
}

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
  float flash = pow(abs(dot(magAxis(uTime, U, V), normalize(vec3(0.0, 0.1, 1.0)))), 6.0);

  if (kind < 0.5) {
    // Core: a dense shell of hot particles spinning with the star.
    float th = r1 * TAU;
    float z = r2 * 2.0 - 1.0;
    vec3 dir = vec3(sqrt(1.0 - z * z) * cos(th), z, sqrt(1.0 - z * z) * sin(th));
    float rr = CORE_R * pow(r3, 0.35);
    pos = rotateAround(dir * rr, S, uTime * SPIN);
    vColor = mix(vec3(1.0, 0.97, 1.0), vec3(0.8, 0.5, 1.0), r3 * r3);
    vAlpha = 0.6 + 0.4 * flash;
    size = 2.6 + flash * 1.5;
  } else if (kind < 1.5) {
    // Jets: fired from the poles of the magnetic axis as it was when the particle left.
    float side = r1 < 0.5 ? -1.0 : 1.0;
    float life = fract(r2 * 7.31 + uTime * 0.42);
    float born = uTime - life * 1.5;
    vec3 m = side * magAxis(born, U, V);
    vec3 p1 = normalize(cross(m, S));
    vec3 p2 = cross(m, p1);
    float d = CORE_R * 0.9 + life * 3.2;
    float spread = (0.02 + life * life * 0.6) * sqrt(r3);
    float a = r3 * 97.0 + life * 5.0;
    pos = m * d + (cos(a) * p1 + sin(a) * p2) * spread;
    vec3 hot = vec3(1.0, 0.92, 1.0);
    vec3 violet = vec3(0.62, 0.36, 1.0);
    vec3 magenta = vec3(0.92, 0.3, 0.95);
    vec3 red = vec3(1.0, 0.16, 0.22);
    vColor = life < 0.08 ? mix(hot, violet, life / 0.08)
      : life < 0.22 ? mix(violet, magenta, (life - 0.08) / 0.14)
      : mix(magenta, red, smoothstep(0.22, 0.45, life));
    vAlpha = smoothstep(0.0, 0.02, life) * pow(1.0 - life, 1.25);
    size = 1.5 + (1.0 - life) * 2.8;
  } else if (kind < 2.5) {
    // Disk: a thin swirl in the equatorial plane; inner particles orbit faster.
    float rad = 0.32 + pow(r1, 1.7) * 1.5;
    float ang = r2 * TAU + uTime * 0.55 / pow(rad, 1.5);
    float h = (r3 - 0.5) * 0.05 * rad;
    pos = (cos(ang) * U + sin(ang) * V) * rad + S * h;
    float t = clamp((rad - 0.32) / 1.5, 0.0, 1.0);
    vColor = mix(vec3(0.8, 0.5, 1.0), vec3(1.0, 0.2, 0.35), smoothstep(0.0, 0.6, t));
    vAlpha = (1.0 - t) * 0.5 + 0.06;
    size = 1.1 + (1.0 - t) * 0.8;
  } else if (kind > 3.5) {
    // Glow: a few huge, faint particles stacked on the core for bloom.
    pos = vec3(0.0);
    // The smallest ones are a white-hot nucleus; the biggest a faint violet haze.
    vColor = mix(vec3(1.0, 0.94, 1.0), vec3(0.6, 0.3, 1.0), sqrt(r1));
    vAlpha = mix(0.85, 0.06, sqrt(r1)) * (0.75 + 0.6 * flash);
    size = 7.0 + r1 * 60.0;
  } else {
    // Background stars, drifting very slowly.
    float th = r1 * TAU + uTime * 0.01;
    float z = r2 * 2.0 - 1.0;
    vec3 dir = vec3(sqrt(1.0 - z * z) * cos(th), z, sqrt(1.0 - z * z) * sin(th));
    pos = dir * (7.0 + r3 * 5.0);
    vColor = mix(vec3(0.7, 0.75, 1.0), vec3(1.0, 0.75, 0.9), r3);
    float tw = 0.6 + 0.4 * sin(uTime * (0.6 + r3 * 2.0) + r1 * 40.0);
    vAlpha = (0.25 + 0.5 * r3 * r3) * tw;
    size = 1.6 + r3 * 2.4;
  }

  vec4 viewPos = uView * vec4(pos, 1.0);
  gl_Position = uProj * viewPos;
  gl_PointSize = max(1.0, size * uPx / -viewPos.z);
}
`,W=`
precision mediump float;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float a = vAlpha * exp(-d * d * 3.5) * (1.0 - d);
  gl_FragColor = vec4(vColor * a, a);
}
`,_=window.matchMedia("(prefers-reduced-motion: reduce)");function R(o,r,e){const t=o.createShader(r);if(o.shaderSource(t,e),o.compileShader(t),!o.getShaderParameter(t,o.COMPILE_STATUS))throw new Error(o.getShaderInfoLog(t)||"shader compile failed");return t}function j(o,r,e,t){const s=1/Math.tan(o/2),c=1/(e-t);return new Float32Array([s/r,0,0,0,0,s,0,0,0,0,(t+e)*c,-1,0,0,2*t*e*c,0])}function G(o,r){const e=(i,a)=>[i[0]-a[0],i[1]-a[1],i[2]-a[2]],t=i=>{const a=Math.hypot(i[0],i[1],i[2]);return i.map(x=>x/a)},s=(i,a)=>[i[1]*a[2]-i[2]*a[1],i[2]*a[0]-i[0]*a[2],i[0]*a[1]-i[1]*a[0]],c=(i,a)=>i[0]*a[0]+i[1]*a[1]+i[2]*a[2],l=t(e(o,r)),d=t(s([0,1,0],l)),f=s(l,d);return new Float32Array([d[0],f[0],l[0],0,d[1],f[1],l[1],0,d[2],f[2],l[2],0,-c(d,o),-c(f,o),-c(l,o),1])}function X(o){const r=[[V,o?1400:2200],[q,o?9e3:15e3],[B,o?2600:4500],[H,o?500:900],[K,10]],e=r.reduce((c,[,l])=>c+l,0),t=new Float32Array(e*4);let s=0;for(const[c,l]of r)for(let d=0;d<l;d++,s+=4)t[s]=c,t[s+1]=Math.random(),t[s+2]=Math.random(),t[s+3]=Math.random();return{data:t,total:e}}function J(){const o=document.getElementById("hero"),r=document.getElementById("pulsar"),e=r.getContext("webgl",{antialias:!1,alpha:!0,premultipliedAlpha:!0,powerPreference:"high-performance"});if(!e){o.classList.add("no-webgl");return}let t;try{if(t=e.createProgram(),e.attachShader(t,R(e,e.VERTEX_SHADER,Y)),e.attachShader(t,R(e,e.FRAGMENT_SHADER,W)),e.linkProgram(t),!e.getProgramParameter(t,e.LINK_STATUS))throw new Error(e.getProgramInfoLog(t)||"link failed")}catch(n){console.warn("Pulsar hero: falling back to CSS",n),o.classList.add("no-webgl");return}e.useProgram(t);const s=Math.min(window.innerWidth,window.innerHeight)<600,{data:c,total:l}=X(s),d=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,d),e.bufferData(e.ARRAY_BUFFER,c,e.STATIC_DRAW);const f=e.getAttribLocation(t,"aData");e.enableVertexAttribArray(f),e.vertexAttribPointer(f,4,e.FLOAT,!1,0,0);const i=e.getUniformLocation(t,"uTime"),a=e.getUniformLocation(t,"uProj"),x=e.getUniformLocation(t,"uView"),C=e.getUniformLocation(t,"uPx");e.disable(e.DEPTH_TEST),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE);const D=()=>window.innerWidth<768?.36:.4;let v=1,m={x:0,y:0},A={x:0,y:0},z=0,u=!1,p=new Float32Array(16);function E(){const n=Math.min(window.devicePixelRatio||1,s?2:1.75),w=r.clientWidth,g=r.clientHeight;r.width=Math.round(w*n),r.height=Math.round(g*n),e.viewport(0,0,r.width,r.height),v=w/g;const h=v<1?.95:.7;p=j(h,v,.1,50),e.uniformMatrix4fv(a,!1,p),e.uniform1f(C,r.height/(2*Math.tan(h/2))*.0055*(v<1?1.25:1))}function U(){const n=(.5-D())*2.6,w=4.4+z*1.2,g=[m.x*.6,.5-n+m.y*.4,w],h=G(g,[0,-n,0]);e.uniformMatrix4fv(x,!1,h);const M=h[13],L=h[14],k=h[12],N=p[0]*k/-L,O=p[5]*M/-L;o.style.setProperty("--star-x",`${(N*.5+.5)*100}%`),o.style.setProperty("--star-y",`${(.5-O*.5)*100}%`)}function T(n){m.x+=(A.x-m.x)*.05,m.y+=(A.y-m.y)*.05,U(),e.uniform1f(i,n),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.drawArrays(e.POINTS,0,l)}E(),window.addEventListener("resize",()=>{E(),u||T(y)});const y=2.35;if(_.matches){T(y);return}window.addEventListener("pointermove",n=>{n.pointerType==="mouse"&&(A={x:n.clientX/window.innerWidth-.5,y:n.clientY/window.innerHeight-.5})},{passive:!0}),window.addEventListener("scroll",()=>{z=Math.min(1,window.scrollY/Math.max(1,o.clientHeight))},{passive:!0});let I=!0,P=0;const F=performance.now(),b=n=>{T((n-F)/1e3+y),P=requestAnimationFrame(b)},S=()=>{const n=I&&!document.hidden;n&&!u&&(u=!0,P=requestAnimationFrame(b)),!n&&u&&(u=!1,cancelAnimationFrame(P))};new IntersectionObserver(([n])=>{I=n.isIntersecting,S()}).observe(o),document.addEventListener("visibilitychange",S),S()}function $(){if(_.matches||!("IntersectionObserver"in window))return;document.body.classList.add("reveal-ready");const o=new IntersectionObserver(r=>{for(const e of r)e.isIntersecting&&(e.target.classList.add("in"),o.unobserve(e.target))},{rootMargin:"0px 0px -12% 0px"});document.querySelectorAll(".step").forEach(r=>o.observe(r))}function Q(){const o=document.querySelector(".topbar"),r=document.getElementById("hero"),e=()=>o.classList.toggle("solid",window.scrollY>r.clientHeight*.6);window.addEventListener("scroll",e,{passive:!0}),e()}J();$();Q();
