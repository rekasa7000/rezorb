"use client";
/*
 * react-hooks/immutability is disabled for this file on purpose: react-three-fiber's model is to
 * mutate GPU uniforms and Object3D transforms every frame inside `useFrame`. Doing that through
 * React state would re-render 60×/s and is exactly what R3F exists to avoid.
 */
/* eslint-disable react-hooks/immutability */
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The landing-page hero (DESIGN §16): a magazine-cover planet in orbit.
 * Everything is procedural (shaders and primitives), so there are no image or model downloads.
 * This module is loaded on demand and only when WebGL, motion and a capable device allow it.
 */

const planetVert = /* glsl */ `
  varying vec3 vN; varying vec3 vP;
  void main() {
    vN = normalize(normalMatrix * normal);
    vP = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const planetFrag = /* glsl */ `
  varying vec3 vN; varying vec3 vP; uniform float uTime;
  float hash(vec3 p){ p = fract(p * 0.3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.02; a *= .5; } return s; }
  void main() {
    vec3 n = normalize(vN);
    vec3 p = normalize(vP);
    float swirl = fbm(p * 2.2 + uTime * .03) * 3.2;
    float bands = sin(p.y * 7.0 + swirl);
    float cloud = fbm(vec3(p.x * 2.0 + uTime * .02, p.y * 5.0, p.z * 2.0));
    vec3 pink = vec3(1.0, .24, .72), violet = vec3(.55, .36, 1.0), cyan = vec3(.18, .96, 1.0);
    vec3 col = mix(violet, pink, smoothstep(-.6, .8, bands + cloud * .8 - .2));
    col = mix(col, cyan, smoothstep(.75, 1.0, cloud) * .35);
    vec3 L = normalize(vec3(-.6, .55, .8));
    float wrap = smoothstep(-.25, 1., dot(n, L));
    float fres = pow(1. - clamp(n.z, 0., 1.), 2.5);
    vec3 lit = col * (.12 + wrap * 1.05) + pink * fres * .9 * (.4 + wrap);
    lit += vec3(1., .92, 1.) * pow(clamp(dot(reflect(-L, n), vec3(0., 0., 1.)), 0., 1.), 40.) * .9; // the "flash"
    gl_FragColor = vec4(lit, 1.);
  }`;

const ringVert = /* glsl */ `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const ringFrag = /* glsl */ `
  varying vec3 vP; uniform float uInner; uniform float uOuter;
  void main() {
    float r = length(vP.xy);
    float t = clamp((r - uInner) / (uOuter - uInner), 0., 1.);
    float stripes = .55 + .45 * sin(t * 70. + sin(t * 9.) * 2.);
    float gaps = smoothstep(.0, .06, t) * (1. - smoothstep(.94, 1., t)) * (1. - smoothstep(.52, .54, t) * (1. - smoothstep(.56, .58, t)) * .85);
    vec3 a = vec3(1., .24, .72), b = vec3(.96, .93, 1.), c = vec3(.55, .36, 1.);
    vec3 col = mix(mix(a, b, smoothstep(0., .5, t)), c, smoothstep(.5, 1., t)) * (.55 + stripes * .6);
    gl_FragColor = vec4(col, gaps * (.22 + stripes * .38));
  }`;

const cardVert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const cardFrag = /* glsl */ `
  varying vec2 vUv; uniform vec3 uAccent;
  float rbox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
  void main() {
    vec2 p = (vUv - .5) * vec2(1.6, 1.0);
    float d = rbox(p, vec2(.78, .48), .1);
    float fill = 1. - smoothstep(-.01, .01, d);
    float edge = 1. - smoothstep(0., .035, abs(d));
    float lines = 0.;
    for (int i = 0; i < 3; i++) {
      float y = .18 - float(i) * .17; float w = i == 2 ? .34 : .55;
      lines += (1. - smoothstep(0., .012, abs(p.y - y) - .035)) * (1. - smoothstep(0., .02, abs(p.x + .66 - w * .5) - w * .5));
    }
    vec3 col = mix(vec3(1., .99, .96), uAccent, edge);
    float alpha = fill * (.34 + lines * .5) + edge * .95;
    gl_FragColor = vec4(mix(col, uAccent, lines * .6), alpha);
  }`;

const starVert = /* glsl */ `
  attribute float aRand; uniform float uTime; varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vA = .35 + .65 * (.5 + .5 * sin(uTime * (.4 + aRand) + aRand * 40.));
    gl_PointSize = (14.0 + aRand * 22.0) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const starFrag = /* glsl */ `varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(1., .96, 1., smoothstep(.5, .0, d) * vA); }`;

/** A tiny studio (pink / cyan / white softboxes on black) baked into an env map for the chrome. */
function useChromeEnv() {
  const gl = useThree((s) => s.gl);
  const env = useMemo(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07040f);
    const box = (hex: number, pos: [number, number, number], scale: [number, number]) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(5), side: THREE.DoubleSide }),
      );
      m.position.set(...pos);
      m.scale.set(scale[0], scale[1], 1);
      m.lookAt(0, 0, 0);
      scene.add(m);
    };
    box(0xff3db8, [-6, 3, 2], [7, 2]);
    box(0x2df5ff, [6, -2, 3], [6, 1.6]);
    box(0xffffff, [0, 6, -2], [9, 1.2]);
    box(0x8b5cff, [0, -5, 4], [9, 2]);
    const pm = new THREE.PMREMGenerator(gl);
    const rt = pm.fromScene(scene, 0.04);
    pm.dispose();
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        (o as THREE.Mesh).geometry.dispose();
        ((o as THREE.Mesh).material as THREE.Material).dispose();
      }
    });
    return rt;
  }, [gl]);
  useEffect(() => () => env.dispose(), [env]);
  return env.texture;
}

function Planet() {
  const ref = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((s, dt) => {
    uniforms.uTime.value = s.clock.elapsedTime;
    if (ref.current) ref.current.rotation.y += dt * 0.06;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1.35, 96, 96]} />
      <shaderMaterial vertexShader={planetVert} fragmentShader={planetFrag} uniforms={uniforms} />
    </mesh>
  );
}

function Ring() {
  const uniforms = useMemo(() => ({ uInner: { value: 1.7 }, uOuter: { value: 2.6 } }), []);
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.7, 2.6, 160, 1]} />
      <shaderMaterial vertexShader={ringVert} fragmentShader={ringFrag} uniforms={uniforms} transparent depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function ChromeRings() {
  const env = useChromeEnv();
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (a.current) a.current.rotation.z += dt * 0.12;
    if (b.current) b.current.rotation.z -= dt * 0.08;
  });
  return (
    <>
      <mesh ref={a} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.95, 0.04, 24, 220]} />
        <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.12} envMap={env} envMapIntensity={1.6} />
      </mesh>
      <mesh ref={b} rotation={[Math.PI / 2 - 0.55, 0.35, 0.5]} scale={1.1}>
        <torusGeometry args={[2.95, 0.016, 16, 220]} />
        <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.2} envMap={env} envMapIntensity={1.2} />
      </mesh>
    </>
  );
}

const CARDS = [
  { radius: 3.9, speed: 0.16, phase: 0.2, tilt: 0.25, accent: [1, 0.24, 0.72] },
  { radius: 4.5, speed: -0.11, phase: 2.3, tilt: -0.35, accent: [0.18, 0.96, 1] },
  { radius: 3.5, speed: 0.2, phase: 4.2, tilt: 0.6, accent: [1, 0.71, 0.15] },
] as const;

function OrbitingCards() {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const cam = useThree((s) => s.camera);
  const uniforms = useMemo(() => CARDS.map((c) => ({ uAccent: { value: new THREE.Vector3(...c.accent) } })), []);
  useFrame((s) => {
    CARDS.forEach((c, i) => {
      const m = refs.current[i];
      if (!m) return;
      const t = s.clock.elapsedTime * c.speed + c.phase;
      m.position.set(Math.cos(t) * c.radius, Math.sin(t * 0.9) * c.radius * c.tilt, Math.sin(t) * c.radius * 0.55);
      m.quaternion.copy(cam.quaternion); // billboard: always face the viewer
    });
  });
  return (
    <>
      {CARDS.map((c, i) => (
        <mesh key={i} ref={(el) => void (refs.current[i] = el)} scale={0.8}>
          <planeGeometry args={[1.6, 1]} />
          <shaderMaterial vertexShader={cardVert} fragmentShader={cardFrag} uniforms={uniforms[i]!} transparent depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

/** Small seeded PRNG (mulberry32): the same sky every render, and pure for React. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Stars({ count = 1100 }: { count?: number }) {
  const { pos, rand } = useMemo(() => {
    const rnd = seeded(20261120);
    const pos = new Float32Array(count * 3);
    const rand = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 7 + rnd() * 11;
      const th = rnd() * Math.PI * 2;
      const ph = Math.acos(2 * rnd() - 1);
      pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.8, r * Math.sin(ph) * Math.sin(th) - 4], i * 3);
      rand[i] = rnd();
    }
    return { pos, rand };
  }, [count]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((s) => void (uniforms.uTime.value = s.clock.elapsedTime));
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
        <bufferAttribute attach="attributes-aRand" args={[rand, 1]} />
      </bufferGeometry>
      <shaderMaterial vertexShader={starVert} fragmentShader={starFrag} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/** Pointer parallax, scroll drift, and a frame-rate watchdog. */
function Rig({ onSlow, children }: { onSlow: () => void; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const slow = useRef({ frames: 0, total: 0, fired: false });
  useFrame((s, dt) => {
    if (!g.current) return;
    const y = typeof window === "undefined" ? 0 : Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1.4);
    const k = Math.min(dt * 2.5, 1);
    g.current.rotation.y += (s.pointer.x * 0.28 - g.current.rotation.y) * k;
    g.current.rotation.x += (-s.pointer.y * 0.16 - g.current.rotation.x) * k;
    // Sit on the right of the frame (the headline owns the left); scale to the frame height.
    const targetX = s.viewport.width * 0.29;
    g.current.position.x += (targetX - g.current.position.x) * Math.min(dt * 4, 1);
    g.current.position.y += (-0.7 + y * 1.4 - g.current.position.y) * Math.min(dt * 4, 1); // sits below the headline's "into"
    g.current.scale.setScalar(Math.min(0.98, Math.max(0.62, s.viewport.height / 6.4)) * (1 - Math.min(y, 1) * 0.18));
    // Watchdog: ~2 s of frames averaging worse than 30 fps → ask the parent to fall back.
    const w = slow.current;
    if (w.fired || dt > 0.25) return; // ignore tab-switch hitches
    w.frames++;
    w.total += dt;
    if (w.frames >= 90) {
      if (w.total / w.frames > 1 / 30) {
        w.fired = true;
        onSlow();
      }
      w.frames = 0;
      w.total = 0;
    }
  });
  return <group ref={g}>{children}</group>;
}

export default function HeroScene({ onSlow, active }: { onSlow: () => void; active: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0.4, 8.5], fov: 38 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <Stars />
      <Rig onSlow={onSlow}>
        <group rotation={[0.46, 0, -0.2]}>
          <Planet />
          <Ring />
          <ChromeRings />
          <OrbitingCards />
        </group>
      </Rig>
    </Canvas>
  );
}
