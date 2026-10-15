/**
 * 玉简（导航与传讯通用）
 * 悬停时玉简展开并泛起暗金光晕，点击触发回调。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getGlowTexture, getRuneTexture } from '../utils/textures';
import { useDongfuStore } from '../store/useDongfuStore';

/**
 * 不参与射线拾取。
 *
 * three 对 LineSegments 的拾取带 1 个世界单位的阈值（raycaster.params.Line.threshold），
 * 玉简的描边会让命中区向外膨胀近一个单位——前厅相邻玉简中心相距约 1.8 个单位，
 * 于是点「修行履历」会命中「丹器馆藏」。背光面片（1.44 × 1.9）同样会盖住邻座。
 * 故二者只作视觉，命中区交给玉简本体。
 */
const NO_PICK = () => null;

export default function RuneSlip({
  label = '玉简',
  position = [0, 1.6, 0],
  rotation = [0, 0, 0],
  width = 0.62,
  height = 1.16,
  floatSeed = 0,
  highlight = false,
  disabled = false,
  glowColor = '#C9A961',
  onClick,
  onHoverChange,
}) {
  // disabled 只表达「尚未开放」：置灰、不响应悬停展开；
  // 点击仍回调父级，由父级给出「尚在参悟」之类的说明，而不是毫无反馈。
  const liteMode = useDongfuStore((s) => s.liteMode);
  const groupRef = useRef(null);
  const glowRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  const texture = useMemo(() => getRuneTexture(label, highlight || hovered), [label, highlight, hovered]);
  const glow = useMemo(() => getGlowTexture(), []);

  const materials = useMemo(() => {
    const face = new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false });
    const edge = new THREE.MeshBasicMaterial({ color: '#CFE0D6' });
    // BoxGeometry 材质顺序：+X, -X, +Y, -Y, +Z, -Z
    return [edge, edge, edge, edge, face, face.clone()];
  }, [texture]);

  const edges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, 0.055)),
    [width, height],
  );

  useEffect(
    () => () => {
      materials.forEach((m) => m.dispose());
      edges.dispose();
    },
    [materials, edges],
  );

  // 悬停状态回传（用于 HUD 提示）
  useEffect(() => {
    onHoverChange?.(hovered);
  }, [hovered, onHoverChange]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const node = groupRef.current;
    if (!node) return;

    const floatAmp = liteMode ? 0 : 0.055;
    const floatY = Math.sin(t * 1.05 + floatSeed) * floatAmp;
    const tilt = liteMode ? 0 : Math.sin(t * 0.8 + floatSeed) * 0.05;

    const targetScale = hovered && !disabled ? 1.16 : 1;
    const k = Math.min(1, delta * 8);
    const s = node.scale.x + (targetScale - node.scale.x) * k;

    node.scale.set(s, s, s);
    node.position.y = position[1] + floatY + (hovered ? 0.06 : 0);
    node.rotation.z = rotation[2] + tilt;

    if (glowRef.current) {
      const targetOpacity = hovered && !disabled ? 0.85 : highlight ? 0.4 : 0.12;
      const mat = glowRef.current.material;
      mat.opacity += (targetOpacity - mat.opacity) * Math.min(1, delta * 6);
      glowRef.current.scale.setScalar(hovered ? 1.35 : 1.1);
    }
  });

  const handleOver = (e) => {
    if (disabled) return;
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handleOut = () => {
    setHovered(false);
    document.body.style.cursor = '';
  };

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
    >
      {/* 背光。青绿水彩下改用普通混合：AdditiveBlending 的金光压在亮背景上只会糊成一片白 */}
      <mesh ref={glowRef} position={[0, 0, -0.05]} raycast={NO_PICK}>
        <planeGeometry args={[width * 2.4, height * 1.7]} />
        <meshBasicMaterial
          map={glow}
          color={glowColor}
          transparent
          opacity={highlight ? 0.36 : 0.1}
          depthWrite={false}
        />
      </mesh>

      {/* 玉简主体（唯一参与拾取的部分） */}
      <mesh material={materials}>
        <boxGeometry args={[width, height, 0.055]} />
      </mesh>

      {/* 暗金描边 */}
      <lineSegments geometry={edges} position={[0, 0, 0.002]} raycast={NO_PICK}>
        <lineBasicMaterial
          color={disabled ? '#5A616A' : hovered ? '#E4CB8B' : '#C9A961'}
          transparent
          opacity={disabled ? 0.5 : hovered ? 1 : 0.72}
        />
      </lineSegments>
    </group>
  );
}
