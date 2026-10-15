/**
 * 国风水彩远景。
 *
 * 任务很直接：原先的 3D 山体背景模型观感不好，改用参考水彩图（landscape.jpg）做远景。
 *
 * 实现上四个讲究：
 * 1. 图是 894×892 的近方形，直接铺到 16:9 的画面上会被横向拉散。这里在横向上平铺 3 枚
 *    （repeat.x = 3），每枚按原比例占据 83 个世界单位——与 fov 52°、景深 85 处的可视高度吻合，
 *    于是整幅画原样入镜，云与山形都不变形。
 * 2. 用 scene.background 铺一道"天头入雾"的竖向渐变（色值同样采自该图），
 *    远景平面没盖住的地带（如镜头俯仰、地面圆盘之外）由它接住，不会露出空白。
 *    昼夜切换时渐变整体换成暮色一档，与前厅灯光的明暗同步。
 * 3. 平面每帧**贴到相机身上**：先把相机看向的方向取出来，再把平面挪到相机正后方
 *    DEPTH 处、并转成与相机同向。早先只跟相机的 z 平移（position.set(x, y+10, z-DEPTH)），
 *    一旦镜头转向（道籍卷轴朝 -x、丹器馆藏朝 -z 深处），平面就甩到画面外，
 *    于是右侧露出一道"缺了半张画"的硬边——那正是用户看到的背景残缺。
 *    贴到相机机身上后，六个场景任意机位、任意俯仰都被它严严实实包住。
 * 4. material.fog = false，否则雾会把它洗成一片灰，水彩的笔触就没了。
 */
import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { PALETTE } from '../theme/palette';

const IMAGE_URL = `${import.meta.env.BASE_URL}textures/landscape.jpg`;

/** 远景平面离镜头的深度 */
const DEPTH = 85;
/** 单枚贴图的边长（世界单位）：与可视高度吻合，保证原比例入镜 */
const TILE = 83;
/** 横向平铺枚数：3 枚 = 249 宽，覆盖到 21:9 也不露边 */
const TILES_X = 3;
/** 平面高度略高于可视高度，给镜头俯仰留余量 */
const HEIGHT = 104;

let cachedTexture = null;

function getBackdropTexture() {
  if (cachedTexture) return cachedTexture;
  const loader = new THREE.TextureLoader();
  const texture = loader.load(IMAGE_URL);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(TILES_X, 1);
  texture.anisotropy = 4;
  // 加载失败时退回天空色，不至于出现黑洞
  texture.onError = () => {
    /* 保留 material.color 兜底 */
  };
  cachedTexture = texture;
  return texture;
}

/**
 * 天头入雾的竖向渐变。
 * day：上为天青、下为淡绿（与参考图上下缘一致）。
 * night：整体压成暮青，山水画入夜。
 */
function makeSkyGradient(night) {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  if (night) {
    gradient.addColorStop(0.0, '#5E8E96');
    gradient.addColorStop(0.45, '#7FAFA2');
    gradient.addColorStop(0.72, '#4E7E70');
    gradient.addColorStop(1.0, '#2E5A50');
  } else {
    gradient.addColorStop(0.0, PALETTE.sky);
    gradient.addColorStop(0.45, PALETTE.fog);
    gradient.addColorStop(0.72, PALETTE.stoneDeep);
    gradient.addColorStop(1.0, PALETTE.stone);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function WatercolorBackdrop({ night = false }) {
  const meshRef = useRef(null);
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);

  const texture = useMemo(getBackdropTexture, []);
  const sky = useMemo(() => makeSkyGradient(night), [night]);
  const tint = useMemo(() => (night ? new THREE.Color('#8FB4B8') : new THREE.Color(PALETTE.sky)), [night]);

  // 相机自身的三个轴向（复用对象，避免每帧分配）
  const forward = useMemo(() => new THREE.Vector3(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const scaleOne = useMemo(() => new THREE.Vector3(1, 1, 1), []);

  useEffect(() => {
    const previous = scene.background;
    scene.background = sky;
    return () => {
      scene.background = previous;
    };
  }, [scene, sky]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    // 相机看向哪，平面就贴到它正后方 DEPTH 处，且与相机同向——
    // 于是平面永远正对镜头、永远铺满视口，镜头转到任何方向都不露边
    camera.getWorldDirection(forward);
    mesh.position.copy(camera.position).addScaledVector(forward, -DEPTH);
    quat.setFromRotationMatrix(m.lookAt(camera.position, mesh.position, camera.up));
    mesh.quaternion.copy(quat);
    mesh.scale.copy(scaleOne);
  });

  return (
    <mesh ref={meshRef} renderOrder={-10}>
      <planeGeometry args={[TILE * TILES_X, HEIGHT]} />
      <meshBasicMaterial
        map={texture}
        color={tint}
        transparent
        depthWrite={false}
        toneMapped={false}
        fog={false}
      />
    </mesh>
  );
}
