/**
 * 场景五：丹器馆藏（文档 3.6）
 * 深处宝库，多件法宝悬浮自转；拖拽可 360° 环绕查看，点击展开详情，分类筛选高亮。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createInkMaterial } from '../shaders/inkToon';
import { getGlowTexture, getWallTexture } from '../utils/textures';
import { useDongfuStore } from '../store/useDongfuStore';

/** 法宝造型池（低多边形） */
const SHAPES = ['icosahedron', 'octahedron', 'torus', 'dodecahedron', 'box', 'cone'];

function ArtifactShape({ shape }) {
  switch (shape) {
    case 'octahedron':
      return <octahedronGeometry args={[0.44, 0]} />;
    case 'torus':
      return <torusGeometry args={[0.34, 0.13, 6, 12]} />;
    case 'dodecahedron':
      return <dodecahedronGeometry args={[0.42, 0]} />;
    case 'box':
      return <boxGeometry args={[0.56, 0.56, 0.56]} />;
    case 'cone':
      return <coneGeometry args={[0.36, 0.72, 6]} />;
    case 'icosahedron':
    default:
      return <icosahedronGeometry args={[0.46, 0]} />;
  }
}

export default function ProjectScene({ inkDensity, dayNight }) {
  const projects = useDongfuStore((s) => s.data.projects);
  const selectedId = useDongfuStore((s) => s.selectedProjectId);
  const setSelected = useDongfuStore((s) => s.setSelectedProject);
  const activeCategory = useDongfuStore((s) => s.activeCategory);
  const liteMode = useDongfuStore((s) => s.liteMode);

  const glow = useMemo(() => getGlowTexture(), []);
  const [hoveredId, setHoveredId] = useState(null);

  const baseMaterial = useMemo(
    () =>
      createInkMaterial({
        color: '#CFE0D6',
        edgeColor: '#16504A',
        rimColor: '#C9A961',
        rimStrength: 0.85,
        ink: inkDensity,
        opacity: 1,
        breathe: 0.012,
        transparent: false,
      }),
    [inkDensity],
  );

  const selectedMaterial = useMemo(
    () =>
      createInkMaterial({
        color: '#C9A961',
        edgeColor: '#8A6F32',
        rimColor: '#F2DCA4',
        rimStrength: 1.5,
        ink: 0.3,
        opacity: 1,
        breathe: 0.02,
        transparent: false,
      }),
    [],
  );

  const dimMaterial = useMemo(
    () =>
      createInkMaterial({
        color: '#DCE6DC',
        edgeColor: '#4E7370',
        rimColor: '#5C7B74',
        rimStrength: 0.2,
        ink: 0.85,
        opacity: 1,
        breathe: 0,
        transparent: false,
      }),
    [],
  );

  useEffect(
    () => () => {
      baseMaterial.dispose();
      selectedMaterial.dispose();
      dimMaterial.dispose();
    },
    [baseMaterial, selectedMaterial, dimMaterial],
  );

  /** 宝库壁画：程序化青绿山水壁面，固定不随拖拽旋转（原先的纯色 box 太单调） */
  const wallMaterial = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      map: getWallTexture('danqi'),
      toneMapped: false,
      fog: false,
      depthWrite: true,
    });
    return m;
  }, []);

  useEffect(() => () => wallMaterial.dispose(), [wallMaterial]);

  const backMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#A9CDBE', toneMapped: false, fog: false }),
    [],
  );
  useEffect(() => () => backMaterial.dispose(), [backMaterial]);

  /** 阵列布局：两排三列 */
  const layout = useMemo(() => {
    const cols = 3;
    return projects.map((project, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      return {
        project,
        shape: SHAPES[i % SHAPES.length],
        position: [(col - 1) * 2.3, 3.35 - row * 1.85, -11.2 - row * 0.75 - (col % 2) * 0.35],
        seed: i * 1.31,
      };
    });
  }, [projects]);

  /* ---------------- 拖拽环绕 ---------------- */
  const spinRef = useRef(null);
  const yaw = useRef(0);
  const targetYaw = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;
      targetYaw.current += dx * 0.006;
      // 限制在 ±0.85 弧度，避免转到法宝背后失去可读性
      targetYaw.current = Math.max(-0.85, Math.min(0.85, targetYaw.current));
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const light = dayNight === 'day' ? 1.16 : 0.74;

    [baseMaterial, selectedMaterial, dimMaterial].forEach((mat) => {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uLight.value += (light - mat.uniforms.uLight.value) * Math.min(1, delta * 1.6);
    });

    if (spinRef.current) {
      yaw.current += (targetYaw.current - yaw.current) * Math.min(1, delta * 5);
      spinRef.current.rotation.y = yaw.current;
    }
  });

  return (
    <group>
      {/* 宝库壁画：壁面固定，只有法宝阵列随拖拽环绕 */}
      <mesh position={[0, 4.6, -19.5]} material={wallMaterial}>
        <planeGeometry args={[30, 14]} />
      </mesh>
      {/* 壁面背衬：拖到侧视角度时壁面会变薄，用它兜住不露空 */}
      <mesh position={[0, 4.6, -19.9]} material={backMaterial}>
        <boxGeometry args={[30, 14, 0.5]} />
      </mesh>
      {/* 两侧壁柱，收窄视野、增加洞府纵深 */}
      <mesh position={[-11.5, 4.6, -14]} rotation={[0, Math.PI / 2, 0]} material={wallMaterial}>
        <planeGeometry args={[16, 12]} />
      </mesh>
      <mesh position={[11.5, 4.6, -14]} rotation={[0, -Math.PI / 2, 0]} material={wallMaterial}>
        <planeGeometry args={[16, 12]} />
      </mesh>

      <group
        ref={spinRef}
        onPointerDown={(e) => {
          dragging.current = true;
          lastX.current = e.clientX ?? 0;
          document.body.style.cursor = 'grabbing';
        }}
      >
      {layout.map(({ project, shape, position, seed }) => {
        const selected = selectedId === project.id;
        const hovered = hoveredId === project.id;
        const dimmed = activeCategory !== '全部' && project.category !== activeCategory;
        const material = dimmed ? dimMaterial : selected ? selectedMaterial : baseMaterial;

        return (
          <group key={project.id} position={position}>
            <SpinningGroup seed={seed} paused={liteMode}>
              <mesh
                material={material}
                scale={hovered || selected ? 1.28 : 1}
                onPointerDown={(e) => {
                  // 阻止冒泡，避免点选法宝时触发阵列拖拽
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(selected ? null : project.id);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoveredId(project.id);
                  document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                  setHoveredId(null);
                  document.body.style.cursor = '';
                }}
              >
                <ArtifactShape shape={shape} />
              </mesh>
            </SpinningGroup>

            {/* 法宝光晕。亮景下改用普通混合，颜色整体深一档 */}
            <mesh>
              <planeGeometry args={[selected || hovered ? 2.4 : 1.6, selected || hovered ? 2.4 : 1.6]} />
              <meshBasicMaterial
                map={glow}
                color={dimmed ? '#5C7B74' : selected ? '#B08430' : '#8A6F32'}
                transparent
                opacity={dimmed ? 0.1 : selected ? 0.55 : hovered ? 0.36 : 0.14}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
      </group>
    </group>
  );
}

/** 让法宝缓慢自转的包装组 */
function SpinningGroup({ children, seed = 0, paused = false }) {
  const ref = useRef(null);
  useFrame((state, delta) => {
    if (!ref.current || paused) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y += delta * 0.42;
    ref.current.rotation.x = Math.sin(t * 0.5 + seed) * 0.22;
    ref.current.position.y = Math.sin(t * 0.9 + seed) * 0.09;
  });
  return <group ref={ref}>{children}</group>;
}
