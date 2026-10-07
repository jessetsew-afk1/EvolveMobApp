// One fullscreen fragment shader: brand-coloured aurora plus a grid of "city lights"
// that ripple around the pointer and pulse outward on click. A single draw call per
// frame, no textures, no geometry.

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uScroll;
uniform vec3 uPulse;
uniform float uCell;

float hash(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uRes;
  vec2 p = (frag - .5 * uRes) / uRes.y;
  float t = uTime * .15;
  float s = uScroll;

  vec3 blue = vec3(.180, .243, .612);
  vec3 purple = vec3(.545, .247, .722);
  vec3 pink = vec3(.820, .176, .588);
  vec3 cA = mix(blue, purple, smoothstep(0., .6, s));
  vec3 cB = mix(purple, pink, smoothstep(.1, .9, s));

  vec2 q = p;
  q.y += s * 1.2;
  q += .38 * vec2(sin(q.y * 1.7 + t * 1.3), cos(q.x * 1.3 - t));
  q += .21 * vec2(sin(q.y * 3.1 - t * 1.7), cos(q.x * 2.7 + t * 1.1));
  float a = .5 + .5 * sin(q.x * 1.6 + q.y * 1.2 + t);
  float b = .5 + .5 * sin(q.y * 2.1 - q.x * 1.1 - t * 1.4 + 2.);

  vec3 col = vec3(.027, .024, .09);
  col += cA * pow(a, 3.) * .5;
  col += cB * pow(b, 4.) * .42;

  vec2 m = (uMouse * uRes - .5 * uRes) / uRes.y;
  float md = length(p - m);
  col += cB * exp(-md * md * 9.) * .2;

  vec2 g = frag / uCell;
  vec2 id = floor(g);
  vec2 f = fract(g) - .5;
  float h = hash(id);
  vec2 cc = ((id + .5) * uCell - .5 * uRes) / uRes.y;
  float cd = length(cc - m);
  float ripple = exp(-cd * 4.) * (.55 + .45 * sin(cd * 30. - uTime * 3.5));
  float tw = step(.94, h) * (.5 + .5 * sin(uTime * (1. + h * 2.) + h * 40.));
  float pd = length(cc - (uPulse.xy * uRes - .5 * uRes) / uRes.y);
  float age = uTime - uPulse.z;
  float ring = (1. - smoothstep(0., .09, abs(pd - age * .75))) * exp(-age * 1.3) * step(0., age);
  float e = .05 + ripple * .8 + tw * .7 + ring * 1.4;
  float dotm = 1. - smoothstep(.05, .10 + e * .08, length(f));
  col += dotm * e * mix(cB, vec3(1.), .45);

  col *= 1. - .9 * dot(uv - .5, uv - .5);
  col += (hash(frag + fract(uTime)) - .5) * .018;
  gl_FragColor = vec4(col, 1.);
}`;

export function initBackground(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) {
    canvas.remove();
    return;
  }

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  };

  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) {
    console.warn('Background shader unavailable:', err);
    canvas.remove();
    return;
  }
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = {};
  for (const name of ['uRes', 'uTime', 'uMouse', 'uScroll', 'uPulse', 'uCell']) {
    u[name] = gl.getUniformLocation(prog, name);
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let scale = 1;
  const target = { x: 0.5, y: 0.6 };
  const mouse = { x: 0.5, y: 0.6 };
  let scroll = 0;
  let scrollTarget = 0;
  let pulse = [0.5, 0.5, -100];
  let time = 0;
  let last = performance.now();
  let raf = 0;
  let paused = false;

  const resize = () => {
    // Cap the pixel ratio: the shader is soft, so extra pixels buy nothing.
    scale = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.round(window.innerWidth * scale);
    const h = Math.round(window.innerHeight * scale);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    if (reduced) draw();
  };

  const readScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollTarget = max > 0 ? window.scrollY / max : 0;
    if (reduced) {
      scroll = scrollTarget;
      draw();
    }
  };

  function draw() {
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uTime, time);
    gl.uniform2f(u.uMouse, mouse.x, mouse.y);
    gl.uniform1f(u.uScroll, scroll);
    gl.uniform3f(u.uPulse, pulse[0], pulse[1], pulse[2]);
    gl.uniform1f(u.uCell, 30 * scale);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;
    const k = 1 - Math.exp(-dt * 6);
    mouse.x += (target.x - mouse.x) * k;
    mouse.y += (target.y - mouse.y) * k;
    scroll += (scrollTarget - scroll) * k;
    draw();
    raf = requestAnimationFrame(frame);
  }

  const start = () => {
    if (raf || reduced || paused || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  window.addEventListener('resize', resize);
  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener(
    'pointermove',
    (e) => {
      target.x = e.clientX / window.innerWidth;
      target.y = 1 - e.clientY / window.innerHeight;
    },
    { passive: true }
  );
  window.addEventListener(
    'pointerdown',
    (e) => {
      pulse = [e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight, time];
      if (e.pointerType !== 'mouse') {
        target.x = pulse[0];
        target.y = pulse[1];
      }
    },
    { passive: true }
  );
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  resize();
  readScroll();
  draw();
  start();

  // Lets the page park the shader while something opaque covers it.
  return {
    setPaused(value) {
      if (paused === value) return;
      paused = value;
      if (paused) stop();
      else start();
    },
  };
}
