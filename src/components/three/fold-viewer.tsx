"use client";

import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Matrix4, Mesh, Vector3, type PerspectiveCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { foldMatrices, type ProgressFn } from "@/lib/geometry/fold";
import { foldedBounds, type ResolvedNet } from "@/lib/geometry/resolve";
import type { MaterialSettings } from "@/lib/materials";
import { cn } from "@/lib/utils";
import type { DecalRender } from "@/lib/decals";
import { createMaterials, decalGeometry, disposeMaterials, panelGeometry, useDecalTextures } from "./cardboard";

export type CameraView = "iso" | "front" | "top" | "side";

export interface ProgressSource {
  get: () => number | ProgressFn;
  subscribe: (cb: () => void) => () => void;
}

interface Props {
  net: ResolvedNet;
  material: MaterialSettings;
  /** Nilai tetap 0..1, fungsi per panel, atau sumber transien (tanpa render ulang React). */
  progress?: number | ProgressFn;
  source?: ProgressSource;
  /** Animasi lipat-bongkar berulang (untuk hero & kartu galeri). */
  loop?: boolean;
  /** Mulai animasi berulang dari keadaan terlipat penuh (hasil jadi dulu, baru membuka jadi pola). */
  startFolded?: boolean;
  /** Matikan zoom roda mouse (kartu galeri: roda tetap menggulir halaman). */
  zoom?: boolean;
  /** Animasi berbasis waktu (detik) — dipakai panduan rakit per langkah. */
  timeline?: (t: number) => number | ProgressFn;
  autoRotate?: boolean;
  controls?: boolean;
  selectedId?: string | null;
  hoverId?: string | null;
  issueIds?: string[];
  onSelect?: (id: string | null) => void;
  onHover?: (id: string | null) => void;
  view?: { name: CameraView; n: number };
  className?: string;
  /** Label aksesibel untuk kanvas. */
  label: string;
  /** Logo/gambar yang ditempel di sisi luar panel. */
  decals?: DecalRender[];
  background?: boolean;
}

const S = 0.01; // 1 unit = 100 mm

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function FoldViewer(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const reduced = usePrefersReducedMotion();

  // hentikan render saat di luar layar
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const animated = (props.loop || props.autoRotate || !!props.timeline) && !reduced;
  return (
    <div ref={ref} className={cn("relative size-full", props.className)} role="img" aria-label={props.label}>
      <Canvas
        dpr={[1, 2]}
        frameloop={!visible ? "never" : animated ? "always" : "demand"}
        camera={{ position: [3, 2.4, 3.6], fov: 35, near: 0.01, far: 200 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <Scene {...props} loop={props.loop && !reduced} autoRotate={props.autoRotate && !reduced} reduced={reduced} />
      </Canvas>
    </div>
  );
}

function Scene({ net, material, progress = 1, source, loop, startFolded, zoom = true, timeline, reduced, autoRotate, controls = true, selectedId, hoverId, issueIds, onSelect, onHover, view, decals }: Props & { reduced?: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const group = useRef<Group>(null);
  const meshes = useRef(new Map<string, Mesh>());
  const mats = useRef(new Map<string, Matrix4>());
  // detik 2,6 = awal fase "tahan terlipat" pada siklus lipat-bongkar di bawah
  const loopT = useRef(startFolded ? 2.6 : 0);

  const materials = useMemo(() => createMaterials(material), [material]);
  useEffect(() => () => disposeMaterials(materials), [materials]);

  const geoms = useMemo(() => net.panels.map((p) => ({ id: p.id, kind: p.kind, geo: panelGeometry(p, net.thickness, material.flute) })), [net, material.flute]);
  useEffect(() => () => geoms.forEach((g) => g.geo.dispose()), [geoms]);

  const decalTex = useDecalTextures(decals);
  const decalGeoms = useMemo(
    () => (decals ?? []).map((d) => ({ d, geo: net.byId.get(d.panelId) ? decalGeometry(net.byId.get(d.panelId)!, d, net.thickness) : null })),
    [decals, net],
  );
  useEffect(() => () => decalGeoms.forEach((g) => g.geo?.dispose()), [decalGeoms]);
  useEffect(() => {
    invalidate();
  }, [decalTex, invalidate]);
  const decalMeshes = useRef(new Map<number, Mesh>());

  // ukuran untuk framing kamera: ambil terbesar antara datar & terlipat
  const frame = useMemo(() => {
    const b1 = foldedBounds(net, foldMatrices(net, 1));
    const size1 = b1.max.clone().sub(b1.min);
    const w = net.bbox.maxX - net.bbox.minX;
    const d = net.bbox.maxY - net.bbox.minY;
    return { folded: size1, radius: 0.5 * Math.max(size1.length(), Math.hypot(w, d) * 0.55) * S };
  }, [net]);

  const size = useThree((s) => s.size);
  const lastView = useRef<string>("");
  useEffect(() => {
    const r = frame.radius;
    const name = view?.name ?? "iso";
    // bingkai ulang hanya saat sudut pandang diminta, model berganti, atau kanvas berubah ukuran
    const key = `${view?.n ?? 0}|${Math.round(r * 1000)}|${Math.round(size.width / 40)}x${Math.round(size.height / 40)}`;
    if (key === lastView.current) return;
    lastView.current = key;
    const fovV = (((camera as PerspectiveCamera).fov ?? 35) * Math.PI) / 180;
    const aspect = size.width / Math.max(1, size.height);
    const fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect);
    const dist = (r / Math.sin(Math.min(fovV, fovH) / 2)) * 1.08;
    const ty = frame.folded.y * S * 0.45;
    const dir = name === "front" ? new Vector3(0, 0.12, 1) : name === "top" ? new Vector3(0, 1, 0.0001) : name === "side" ? new Vector3(1, 0.12, 0) : new Vector3(0.75, 0.62, 1);
    camera.position.copy(dir.normalize().multiplyScalar(dist)).add(new Vector3(0, ty, 0));
    camera.lookAt(0, ty, 0);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, ty, 0);
      controlsRef.current.update();
    }
    invalidate();
  }, [frame, view, camera, invalidate, size]);

  useEffect(() => {
    loopT.current = 0;
    invalidate();
  }, [timeline, invalidate]);

  useEffect(() => {
    if (!source) return;
    return source.subscribe(() => invalidate());
  }, [source, invalidate]);

  useEffect(() => {
    invalidate();
  }, [progress, selectedId, hoverId, issueIds, net, invalidate]);

  const v = useMemo(() => new Vector3(), []);
  useFrame((_, dt) => {
    let prog: number | ProgressFn = source ? source.get() : progress;
    if (timeline) {
      loopT.current += dt;
      prog = timeline(reduced ? Infinity : loopT.current);
    } else if (loop) {
      loopT.current += dt;
      // lipat 0→1, tahan, bongkar 1→0, tahan
      const T = 7;
      const t = loopT.current % T;
      const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
      prog = t < 2.6 ? ease(t / 2.6) : t < 4.6 ? 1 : t < 6.4 ? 1 - ease((t - 4.6) / 1.8) : 0;
      prog = 0.04 + prog * 0.96;
    }
    foldMatrices(net, prog, mats.current);
    const b = foldedBounds(net, mats.current);
    if (group.current) {
      // sumbu x dicerminkan (lihat scale grup) agar sisi luar tampak sama dengan pola 2D yang dicetak
      v.set((b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
      group.current.position.copy(v).multiplyScalar(S);
    }
    for (const [id, mesh] of meshes.current) {
      const m = mats.current.get(id);
      if (m) mesh.matrix.copy(m);
    }
    for (const [i, mesh] of decalMeshes.current) {
      const m = decalGeoms[i] && mats.current.get(decalGeoms[i].d.panelId);
      if (m) mesh.matrix.copy(m);
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>, id: string) => {
    if (!onSelect || e.delta > 4) return;
    e.stopPropagation();
    onSelect(id);
  };

  return (
    <>
      <hemisphereLight args={["#fff8ee", "#7a6a58", 0.9]} />
      <directionalLight position={[3, 6, 4]} intensity={1.6} />
      <directionalLight position={[-4, 3, -2]} intensity={0.35} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 5, -2]} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={1} position={[-5, 2, 1]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[5, 2, 1]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} />
      </Environment>
      <group ref={group} scale={[-S, S, S]} onPointerMissed={() => onSelect?.(null)}>
        {geoms.map(({ id, geo }) => {
          const mat = id === selectedId ? materials.faceSelected : issueIds?.includes(id) ? materials.faceIssue : id === hoverId ? materials.faceHover : materials.face;
          return (
            <mesh
              key={id}
              ref={(m) => {
                if (m) {
                  m.matrixAutoUpdate = false;
                  meshes.current.set(id, m);
                } else meshes.current.delete(id);
              }}
              geometry={geo}
              material={[mat, materials.edge]}
              onClick={onSelect ? (e) => handleClick(e, id) : undefined}
              onPointerOver={
                onHover
                  ? (e) => {
                      e.stopPropagation();
                      onHover(id);
                      document.body.style.cursor = "pointer";
                    }
                  : undefined
              }
              onPointerOut={
                onHover
                  ? () => {
                      onHover(null);
                      document.body.style.cursor = "";
                    }
                  : undefined
              }
            />
          );
        })}
        {decalGeoms.map(({ d, geo }, i) => {
          const tex = decalTex.get(d.asset.id);
          if (!geo || !tex) return null;
          return (
            <mesh
              key={`d${i}`}
              ref={(m) => {
                if (m) {
                  m.matrixAutoUpdate = false;
                  decalMeshes.current.set(i, m);
                } else decalMeshes.current.delete(i);
              }}
              geometry={geo}
              renderOrder={2}
              onClick={onSelect ? (e) => handleClick(e, d.panelId) : undefined}
            >
              <meshStandardMaterial map={tex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-4} roughness={0.8} />
            </mesh>
          );
        })}
      </group>
      <ContactShadows position={[0, -0.001, 0]} opacity={0.45} scale={frame.radius * 6 + 2} blur={2.2} far={Math.max(1, frame.folded.y * S * 1.5)} resolution={512} color="#3b2a1a" />
      {controls && <OrbitControls ref={controlsRef} makeDefault enableDamping={false} enableZoom={zoom} autoRotate={autoRotate} autoRotateSpeed={0.8} maxPolarAngle={Math.PI * 0.495} onChange={() => invalidate()} />}
    </>
  );
}
