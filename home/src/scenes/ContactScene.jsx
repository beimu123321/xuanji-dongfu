/**
 * 场景六：传讯玉符（文档 3.7）
 * 洞府最深处，巨型玉符悬空而立，前方四枚小玉符对应不同联系方式。
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import RuneSlip from '../three/RuneSlip';
import { getGlowTexture, getRuneTexture, getWallTexture } from '../utils/textures';
import api from '../api/client';
import { copyText, isLink, toHref } from '../utils/clipboard';
import { useDongfuStore } from '../store/useDongfuStore';
import { useViewportTier } from '../hooks/useViewportTier';

/** 巨型玉符的悬浮基准高度 */
const STELE_Y = 3.5;

export default function ContactScene() {
  const contacts = useDongfuStore((s) => s.data.contacts);
  const showToast = useDongfuStore((s) => s.showToast);
  const liteMode = useDongfuStore((s) => s.liteMode);
  const setHoverContact = useDongfuStore((s) => s.setHoverContact);
  // 窄屏下四枚玉符排不下（会越出画幅），交由底部信息卡承担入口
  const { narrow } = useViewportTier();

  const glow = useMemo(() => getGlowTexture(), []);
  const steleTexture = useMemo(() => getRuneTexture('传讯玉符', true), []);
  const steleRef = useRef(null);

  /**
   * 最深处石壁：原先是一块纯色 box（#DCE9DF），整面墙没有任何内容，
   * 镜头正对时就是一片平色，与其他场景格格不入。
   * 换成与丹器馆藏同一套青绿山水壁面，洞府最深处才有纵深。
   *
   * 尺寸按机位反推：相机 [0,2.95,-14.4] → 注视 [0,2.8,-20.6]、fov 52°，
   * 景深 9.6 处可视宽 16.4、可视高 9.4，故 26×14 足够让四缘全部落在画外；
   * 边缘渐隐只是给超宽比例兜底。
   * 景深只有 9.6（丹器馆藏是 13.3），贴图会被放大成几个大色块，
   * 故 ridgeScale 提到 2 让山峦加密。
   */
  const wallMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: getWallTexture('danqi', { edgeFade: 0.08, edgeFadeV: 0.1, ridgeScale: 2 }),
        toneMapped: false,
        fog: false,
        transparent: true,
        depthWrite: true,
      }),
    [],
  );
  useEffect(() => () => wallMaterial.dispose(), [wallMaterial]);

  // 离开此景时收起悬停账号（悬停回调只在指针进出时触发，卸载时不会）
  useEffect(() => () => setHoverContact(null), [setHoverContact]);

  useFrame((state, delta) => {
    if (!steleRef.current) return;
    const t = state.clock.elapsedTime;
    steleRef.current.rotation.y = Math.sin(t * 0.32) * 0.16;
    if (!liteMode) steleRef.current.position.y = STELE_Y + Math.sin(t * 0.7) * 0.1;
    if (liteMode) steleRef.current.rotation.y += delta * 0;
  });

  const handleActivate = useCallback(
    async (contact) => {
      // 记一次传讯（失败不阻断交互）
      api.contactClick(contact.id).catch(() => {});

      if (isLink(contact.value)) {
        window.open(toHref(contact.value), '_blank', 'noopener,noreferrer');
        showToast('传讯已至');
        return;
      }

      const copied = await copyText(contact.value);
      showToast(copied ? `传讯已至 · ${contact.value}` : `传讯玉简：${contact.value}`);
    },
    [showToast],
  );

  const items = contacts.slice(0, 4);

  return (
    <group>
      {/* 巨型玉符（抬高并收窄，使题字完整露出于下方信息卡之上） */}
      <group ref={steleRef} position={[0, STELE_Y, -20.6]}>
        <mesh>
          <boxGeometry args={[2.0, 4.0, 0.16]} />
          <meshBasicMaterial map={steleTexture} transparent toneMapped={false} />
        </mesh>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(2.0, 4.0, 0.16)]} />
          <lineBasicMaterial color="#C9A961" transparent opacity={0.8} />
        </lineSegments>
        <mesh position={[0, 0, -0.14]}>
          <planeGeometry args={[7.0, 8.4]} />
          <meshBasicMaterial
            map={glow}
            color="#E8C883"
            transparent
            opacity={0.24}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* 四枚小玉符：悬于巨符之前，位置抬到 2.55 以避开底部信息卡 */}
      {!narrow &&
        items.map((contact, i) => {
          const x = (i - (items.length - 1) / 2) * 1.62;
          return (
            <RuneSlip
              key={contact.id}
              label={contact.label}
              position={[x, 2.55, -18.4]}
              rotation={[0, 0, 0]}
              width={0.52}
              height={1.0}
              floatSeed={i * 1.4}
              glowColor="#D8C48C"
              onClick={() => handleActivate(contact)}
              onHoverChange={(hovered) => setHoverContact(hovered ? contact : null)}
            />
          );
        })}

      {/* 最深处石壁（青绿山水壁面，四缘渐隐融进远景） */}
      <mesh position={[0, 4, -24]} material={wallMaterial}>
        <planeGeometry args={[26, 14]} />
      </mesh>
    </group>
  );
}
