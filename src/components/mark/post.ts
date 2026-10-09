import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { createAsciiShader } from './finishes';

// After tone mapping, glow outside the mark has colour but almost no alpha. The canvas is premultiplied,
// so lift alpha to the brightest channel: the glow then composites over the page instead of vanishing.
const AlphaFromLight = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      gl_FragColor = vec4(c.rgb, max(c.a, max(c.r, max(c.g, c.b))));
    }
  `,
};

/**
 * HDR pipeline for the finishes that need it (fire's bloom, the ASCII pass): scene → ascii → bloom →
 * tone map → alpha fix. Loaded on demand; chrome renders straight to the canvas without it.
 */
export function createPost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  const pixelRatio = renderer.getPixelRatio();
  // MSAA on the scene target only at 1x; at 2x the pixel density does the antialiasing.
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: pixelRatio < 1.5 ? 4 : 0 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const ascii = new ShaderPass(createAsciiShader());
  ascii.enabled = false;
  composer.addPass(ascii);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0, 0, 1);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.addPass(new ShaderPass(AlphaFromLight));

  return {
    composer,
    bloom,
    ascii,
    setSize(w: number, h: number, ratio: number) {
      composer.setPixelRatio(ratio);
      composer.setSize(w, h);
    },
    dispose() {
      (ascii.uniforms.tGlyphs.value as THREE.Texture).dispose();
      ascii.dispose();
      bloom.dispose();
      composer.dispose();
    },
  };
}

export type Post = ReturnType<typeof createPost>;
