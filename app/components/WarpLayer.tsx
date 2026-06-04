'use client'

// WarpLayer — drops a <canvas> with the same CSS class as the original <img>.
// WebGL fragment shader applies simplex-noise displacement on the GPU.
// GSAP targets the canvas by class name exactly as it targeted the img.

import { useEffect, useRef } from 'react'

// ─── Vertex shader — full-screen quad ─────────────────────────────────────────
const VERT = `
  attribute vec2 a_pos;
  varying   vec2 v_uv;
  void main() {
    // flip Y so texture origin matches CSS top-left
    v_uv        = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`

// ─── Fragment shader — simplex noise displacement ─────────────────────────────
// Ashima Arts simplex noise (MIT) inlined + displacement pass
const FRAG = `
  precision mediump float;
  uniform sampler2D u_tex;
  uniform float     u_time;
  uniform float     u_str;   /* displacement strength in UV space */
  varying vec2      v_uv;

  /* ── Simplex 3D noise (Ashima Arts / Stefan Gustavson) ── */
  vec3 mod289v3(vec3 x){return x-floor(x*(1./289.))*289.;}
  vec4 mod289v4(vec4 x){return x-floor(x*(1./289.))*289.;}
  vec4 permute(vec4 x){return mod289v4(((x*34.)+1.)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1./6.,1./3.);
    const vec4 D=vec4(0.,.5,1.,2.);
    vec3 i =floor(v+dot(v,C.yyy));
    vec3 x0=v-i+dot(i,C.xxx);
    vec3 g =step(x0.yzx,x0.xyz);
    vec3 l =1.-g;
    vec3 i1=min(g.xyz,l.zxy);
    vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;
    vec3 x2=x0-i2+C.yyy;
    vec3 x3=x0-D.yyy;
    i=mod289v3(i);
    vec4 p=permute(permute(permute(
      i.z+vec4(0.,i1.z,i2.z,1.))
     +i.y+vec4(0.,i1.y,i2.y,1.))
     +i.x+vec4(0.,i1.x,i2.x,1.));
    float n_=.142857142857;
    vec3  ns=n_*D.wyz-D.xzx;
    vec4  j=p-49.*floor(p*ns.z*ns.z);
    vec4  x_=floor(j*ns.z);
    vec4  y_=floor(j-7.*x_);
    vec4  x=x_*ns.x+ns.yyyy;
    vec4  y=y_*ns.x+ns.yyyy;
    vec4  h=1.-abs(x)-abs(y);
    vec4  b0=vec4(x.xy,y.xy);
    vec4  b1=vec4(x.zw,y.zw);
    vec4  s0=floor(b0)*2.+1.;
    vec4  s1=floor(b1)*2.+1.;
    vec4  sh=-step(h,vec4(0.));
    vec4  a0=b0.xzyw+s0.xzyw*sh.xxyy;
    vec4  a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3  p0=vec3(a0.xy,h.x);
    vec3  p1=vec3(a0.zw,h.y);
    vec3  p2=vec3(a1.xy,h.z);
    vec3  p3=vec3(a1.zw,h.w);
    vec4  norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4  m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
    m=m*m;
    return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
  /* ── end noise ── */

  void main(){
    vec2  uv = v_uv;
    float t  = u_time * 0.35;                      /* animation speed */

    /* two independent noise fields for X and Y */
    float nx = snoise(vec3(uv * 2.8,       t));
    float ny = snoise(vec3(uv * 2.8 + 5.3, t + 1.7));

    uv += vec2(nx, ny) * u_str;
    gl_FragColor = texture2D(u_tex, clamp(uv, 0.001, 0.999));
  }
`

// ─── GL helpers ──────────────────────────────────────────────────────────────
function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.error('WarpLayer shader error:', gl.getShaderInfoLog(s))
  return s
}

function buildProgram(gl: WebGLRenderingContext) {
  const prog = gl.createProgram()!
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER,   VERT))
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  return prog
}

// ─── Component ────────────────────────────────────────────────────────────────
interface WarpLayerProps {
  src:       string
  className: string
  strength?: number   // UV displacement magnitude; tree ≈ 0.012, mid ≈ 0.007
  alt?:      string
}

export default function WarpLayer({ src, className, strength = 0.008, alt = '' }: WarpLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!

    // ── WebGL context ─────────────────────────────────────────────────────────
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    })
    if (!gl) {
      // Fallback: show image via CSS background if WebGL unavailable
      canvas.style.backgroundImage = `url(${src})`
      canvas.style.backgroundSize  = '100% 100%'
      return
    }

    const prog = buildProgram(gl)
    gl.useProgram(prog)

    // ── Full-screen quad ──────────────────────────────────────────────────────
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, 1,1]),
      gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uTex  = gl.getUniformLocation(prog, 'u_tex')
    const uTime = gl.getUniformLocation(prog, 'u_time')
    const uStr  = gl.getUniformLocation(prog, 'u_str')
    gl.uniform1i(uTex, 0)
    gl.uniform1f(uStr, strength)

    // ── Load texture ──────────────────────────────────────────────────────────
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    // placeholder 1×1 transparent while image loads
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0]))

    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      // size canvas to image natural resolution for pixel-accurate sampling
      canvas.width  = image.naturalWidth  || canvas.offsetWidth
      canvas.height = image.naturalHeight || canvas.offsetHeight
      gl.viewport(0, 0, canvas.width, canvas.height)

      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      // NEAREST = keep pixel art crisp
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    }
    image.src = src

    // ── rAF render loop ───────────────────────────────────────────────────────
    let raf = 0
    const start = performance.now()
    const tick = () => {
      raf = requestAnimationFrame(tick)
      gl.uniform1f(uTime, (performance.now() - start) / 1000)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    raf = requestAnimationFrame(tick)

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(raf)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [src, strength])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      // start at image natural size; onload resizes to actual
      width={1}
      height={1}
      aria-label={alt}
    />
  )
}
