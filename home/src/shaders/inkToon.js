/**
 * 水墨 Toon 材质（文档 3.1.3 / 3.9）
 * 特性：三段式色阶 + 低频噪声形成的墨色浓淡 + 菲涅尔边缘墨色羽化 + 暗金描边。
 * 自发光式着色（不依赖场景灯光），保证低配设备下画面稳定、开销极低。
 */
import * as THREE from 'three';

export const inkToonVertex = /* glsl */ `
  uniform float uTime;
  uniform float uInk;
  uniform float uBreathe;

  varying vec3 vNormal;
  varying vec3 vView;
  varying float vInkVar;

  #include <fog_pars_vertex>

  float hash13(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  void main() {
    vec3 pos = position;

    // 待机呼吸：沿法线方向的极轻微起伏
    pos += normal * sin(uTime * 1.5 + position.y * 3.2) * uBreathe;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mvPosition.xyz);

    // 墨色浓淡：由两个频率的体噪声叠加而成
    float n = hash13(floor(pos * 2.4)) * 0.55 + hash13(floor(pos * 6.1)) * 0.45;
    vInkVar = mix(1.0, n, clamp(uInk, 0.0, 1.0));

    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`;

export const inkToonFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uEdgeColor;
  uniform vec3 uRimColor;
  uniform float uOpacity;
  uniform float uRimStrength;
  uniform float uInk;
  uniform float uLight;   // 1 = 白昼，0.72 = 夜晚

  varying vec3 vNormal;
  varying vec3 vView;
  varying float vInkVar;

  #include <fog_pars_fragment>

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vView);
    vec3 L = normalize(vec3(0.35, 0.92, 0.55));

    float diff = clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0);

    // 三段色阶（Toon）
    float band = diff < 0.45 ? 0.60 : (diff < 0.72 ? 0.82 : 1.0);
    vec3 base = uColor * band;

    // 墨色浓淡变化
    base = mix(base, base * 0.5, clamp((1.0 - vInkVar) * uInk, 0.0, 0.85));

    // 菲涅尔边缘羽化 → 墨色收边
    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.6);
    base = mix(base, uEdgeColor, fres * 0.88);

    // 暗金描边
    base += uRimColor * fres * uRimStrength;

    float alpha = clamp(uOpacity + fres * 0.22, 0.0, 1.0);

    gl_FragColor = vec4(base * uLight, alpha);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/**
 * 创建水墨 Toon 材质
 * @param {object} options
 * @param {string|number} [options.color]      主体色
 * @param {string|number} [options.edgeColor]  边缘墨色
 * @param {string|number} [options.rimColor]   描边色（暗金）
 * @param {number} [options.opacity]           基础不透明度
 * @param {number} [options.ink]               水墨浓度 0-1
 * @param {number} [options.rimStrength]       描边强度
 * @param {number} [options.breathe]           呼吸幅度
 * @param {boolean} [options.transparent]
 * @param {number} [options.side]
 */
export function createInkMaterial(options = {}) {
  const {
    // 默认色对齐国风水彩调色板（theme/palette.js）：主体浅青，边缘深青收边，
    // 描边赭金。原先的墨玄暗底是「夜」色调，青绿水彩下会让物件变成暗块。
    color = '#9FC7BC',
    edgeColor = '#16504A',
    rimColor = '#C9A961',
    opacity = 1,
    ink = 0.6,
    rimStrength = 0.55,
    breathe = 0.01,
    transparent = true,
    side = THREE.FrontSide,
    depthWrite,
  } = options;

  return new THREE.ShaderMaterial({
    vertexShader: inkToonVertex,
    fragmentShader: inkToonFragment,
    transparent,
    side,
    fog: true,
    depthWrite: depthWrite === undefined ? !transparent : depthWrite,
    uniforms: {
      // 声明 fog: true 后，three 的 refreshFogUniforms 会直接写入这些 uniform，
      // 自定义材质必须自行合并 UniformsLib.fog，否则渲染时报错。
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTime: { value: 0 },
      uInk: { value: ink },
      uBreathe: { value: breathe },
      uColor: { value: new THREE.Color(color) },
      uEdgeColor: { value: new THREE.Color(edgeColor) },
      uRimColor: { value: new THREE.Color(rimColor) },
      uOpacity: { value: opacity },
      uRimStrength: { value: rimStrength },
      uLight: { value: 1 },
    },
  });
}

export default createInkMaterial;
