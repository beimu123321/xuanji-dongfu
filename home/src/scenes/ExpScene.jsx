/**
 * 场景四：修行履历（文档 3.5）
 * 右侧纵向蜿蜒的灵脉时间轴，节点由墨色光带连接；悬停扩散涟漪，点击展开详情。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createInkMaterial } from '../shaders/inkToon';
import { getGlowTexture, getWallTexture } from '../utils/textures';
import { useDongfuStore } from '../store/useDongfuStore';

const AXIS_X = 7.3;

/** 灵脉曲线控制点（自下而上蜿蜒） */
function buildCurve(count) {
  const points = [];
  const n = Math.max(count, 1);
  const bottom = 0.9;
  const top = 6.2;
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    points.push(
      new THREE.Vector3(
        AXIS_X,
        bottom + (top - bottom) * t,
        Math.sin(t * Math.PI * 2.1) * 0.62,
      ),
    );
  }
  if (points.length < 2) {
    points.push(new THREE.Vector3(AXIS_X, top, 0));
  }
  return new THREE.CatmullRomCurve3(points);
}

export default function ExpScene({ inkDensity, dayNight }) {
  const experiences = useDongfuStore((s) => s.data.experiences);
  const selectedId = useDongfuStore((s) => s.selectedExperienceId);
  const setSelected = useDongfuStore((s) => s.setSelectedExperience);
  const liteMode = useDongfuStore((s) => s.liteMode);

  const list = experiences.length > 0 ? experiences : [];

  const curve = useMemo(() => buildCurve(Math.max(list.length, 2)), [list.length]);
  const tubeGeometry = useMemo(() => new THREE.TubeGeometry(curve, 120, 0.035, 6, false), [curve]);
  const glow = useMemo(() => getGlowTexture(), []);

  const [hoveredId, setHoveredId] = useState(null);

  const bandMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#8FD2C6',
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    [],
  );

  const nodeMaterial = useMemo(
    () =>
      createInkMaterial({
        color: '#3E9E8A',
        edgeColor: '#16504A',
        rimColor: '#C9A961',
        rimStrength: 0.9,
        ink: inkDensity,
        opacity: 1,
        breathe: 0.01,
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
        rimStrength: 1.35,
        ink: 0.35,
        opacity: 1,
        breathe: 0.02,
        transparent: false,
      }),
    [],
  );

  useEffect(
    () => () => {
      tubeGeometry.dispose();
      bandMaterial.dispose();
      nodeMaterial.dispose();
      selectedMaterial.dispose();
    },
    [tubeGeometry, bandMaterial, nodeMaterial, selectedMaterial],
  );

  /**
   * 石壁与远岫：原先右侧只有一块纯色 box，整幅画面寡淡。
   * 换成程序化青绿山水壁面（右侧主壁 + 左侧远端一道雾中山影），
   * 履历面板那一侧因此也有了层次，不再是一片空。
   *
   * 壁面本身是一块有限大的平面，四缘必须渐隐：镜头在 (2.5,2.2,4.9) 处朝 +x 看，
   * 主壁左缘落在画面 ndc≈-0.44（约 440px 处），硬边会在远景天空上割出一道竖缝。
   * 渐隐后壁面直接融进背景，不再有分界线。
   * 因此也不再加背衬 box——它会在渐隐区重新露出自己的硬边。
   */
  const wallMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: getWallTexture('exp', { edgeFade: 0.16, edgeFadeV: 0.12 }),
        toneMapped: false,
        fog: false,
        transparent: true,
        depthWrite: true,
      }),
    [],
  );
  useEffect(() => () => wallMaterial.dispose(), [wallMaterial]);

  /** 节点位置 */
  const nodes = useMemo(
    () =>
      list.map((exp, i) => ({
        exp,
        t: list.length === 1 ? 0.5 : (i + 0.5) / list.length,
        position: curve.getPointAt(list.length === 1 ? 0.5 : (i + 0.5) / list.length).toArray(),
      })),
    [list, curve],
  );

  const motesRef = useRef(null);
  const moteProgress = useRef([0.05, 0.38, 0.72]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    [nodeMaterial, selectedMaterial].forEach((mat) => {
      mat.uniforms.uTime.value = t;
      const light = dayNight === 'day' ? 1.16 : 0.74;
      mat.uniforms.uLight.value += (light - mat.uniforms.uLight.value) * Math.min(1, delta * 1.6);
    });

    // 光带脉动
    bandMaterial.opacity = liteMode ? 0.22 : 0.28 + Math.sin(t * 1.4) * 0.08;

    // 灵脉流光
    if (motesRef.current && !liteMode) {
      const group = motesRef.current;
      moteProgress.current = moteProgress.current.map((p) => (p + delta * 0.075) % 1);
      group.children.forEach((child, i) => {
        const point = curve.getPointAt(moteProgress.current[i]);
        child.position.set(point.x, point.y, point.z);
        const pulse = 0.5 + Math.sin(t * 3 + i) * 0.18;
        child.scale.setScalar(pulse);
      });
    }
  });

  return (
    <group>
      {/* 灵脉光带 */}
      <mesh geometry={tubeGeometry} material={bandMaterial} />

      {/* 流光。亮景下换成普通混合的暖白点，加色混合只会糊掉 */}
      {!liteMode && (
        <group ref={motesRef}>
          {[0, 1, 2].map((i) => (
            <mesh key={i}>
              <planeGeometry args={[0.7, 0.7]} />
              <meshBasicMaterial
                map={glow}
                color="#FFFDF0"
                transparent
                opacity={0.7}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* 经历节点 */}
      {nodes.map(({ exp, position }) => {
        const active = selectedId === exp.id;
        const hovered = hoveredId === exp.id;
        return (
          <group key={exp.id} position={position}>
            <mesh
              material={active ? selectedMaterial : nodeMaterial}
              scale={hovered || active ? 1.32 : 1}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(active ? null : exp.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredId(exp.id);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHoveredId(null);
                document.body.style.cursor = '';
              }}
            >
              <octahedronGeometry args={[0.24, 0]} />
            </mesh>

            {/* 光晕。亮景下改用普通混合，颜色换成深一档才压得住浅背景 */}
            <mesh position={[0, 0, 0]}>
              <planeGeometry args={[active || hovered ? 2.1 : 1.3, active || hovered ? 2.1 : 1.3]} />
              <meshBasicMaterial
                map={glow}
                color={active ? '#B08430' : '#8A6F32'}
                transparent
                opacity={active ? 0.6 : hovered ? 0.4 : 0.16}
                depthWrite={false}
              />
            </mesh>

            {/* 连接壁面的短杆 */}
            <mesh position={[-0.55, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.018, 0.018, 1.1, 6]} />
              <meshBasicMaterial color="#8A6F32" transparent opacity={0.55} />
            </mesh>
          </group>
        );
      })}

      {/* 右侧主石壁（贴青绿山水壁面，四缘渐隐融进远景） */}
      <mesh position={[9.4, 4.6, 0]} rotation={[0, -Math.PI / 2, 0]} material={wallMaterial}>
        <planeGeometry args={[20, 11]} />
      </mesh>
    </group>
  );
}
