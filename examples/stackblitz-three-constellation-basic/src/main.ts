import * as THREE from 'three';
import {
  createKThreeScene,
  type KThreeObject,
  type KThreeSceneContext,
} from '@keneth80/k-chart-three';
import '@keneth80/k-chart-three/style.css';
import './style.css';

interface AriesStar {
  id: string;
  name: string;
  designation: string;
  magnitude: number;
  position: [number, number, number];
  size: number;
  color: string;
}

interface AriesLink {
  source: AriesStar['id'];
  target: AriesStar['id'];
}

const ariesStars: AriesStar[] = [
  {
    id: 'mesarthim',
    name: 'Mesarthim',
    designation: 'Gamma Ari',
    magnitude: 3.88,
    position: [-2.65, 0.68, -0.15],
    size: 0.72,
    color: '#d6e8ff',
  },
  {
    id: 'sheratan',
    name: 'Sheratan',
    designation: 'Beta Ari',
    magnitude: 2.64,
    position: [-1.62, 0.42, 0.18],
    size: 0.92,
    color: '#dcecff',
  },
  {
    id: 'hamal',
    name: 'Hamal',
    designation: 'Alpha Ari',
    magnitude: 2.0,
    position: [0.02, 0.05, 0.3],
    size: 1.24,
    color: '#ffd7a1',
  },
  {
    id: 'botein',
    name: 'Botein',
    designation: 'Delta Ari',
    magnitude: 4.35,
    position: [1.72, -0.52, -0.04],
    size: 0.68,
    color: '#ffe4b8',
  },
  {
    id: '41-ari',
    name: '41 Arietis',
    designation: 'Bharani',
    magnitude: 3.61,
    position: [2.72, -1.08, -0.34],
    size: 0.8,
    color: '#cbe4ff',
  },
];

const ariesLinks: AriesLink[] = [
  { source: 'mesarthim', target: 'sheratan' },
  { source: 'sheratan', target: 'hamal' },
  { source: 'hamal', target: 'botein' },
  { source: 'botein', target: '41-ari' },
];

const status = document.querySelector<HTMLParagraphElement>('#star-status');
const sceneHost = document.querySelector<HTMLElement>('#scene');

if (!status || !sceneHost) {
  throw new Error('Aries example host elements are missing.');
}

const createGlowTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');

  if (context) {
    const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.14, 'rgba(221,239,255,.94)');
    gradient.addColorStop(0.45, 'rgba(100,190,255,.36)');
    gradient.addColorStop(1, 'rgba(100,190,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const disposeGroup = (group: THREE.Group): void => {
  group.traverse((object) => {
    const renderable = object as THREE.Mesh;
    renderable.geometry?.dispose();
    const materials = Array.isArray(renderable.material)
      ? renderable.material
      : [renderable.material];
    materials.filter(Boolean).forEach((material) => material.dispose());
  });
};

const setPointer = (
  event: PointerEvent | MouseEvent,
  context: KThreeSceneContext<AriesStar>,
): void => {
  const bounds = context.canvas.getBoundingClientRect();
  context.pointer.set(
    ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1,
    -((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 + 1,
  );
};

const createAriesObject = (links: readonly AriesLink[]): KThreeObject<AriesStar> => {
  let context: KThreeSceneContext<AriesStar> | undefined;
  let root: THREE.Group | undefined;
  let glowTexture: THREE.CanvasTexture | undefined;
  let stars: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[] = [];
  let glows: THREE.Sprite[] = [];
  let data: readonly AriesStar[] = [];
  let hoveredIndex = -1;
  let selectedIndex = -1;

  const clear = (): void => {
    if (root) {
      context?.scene.remove(root);
      disposeGroup(root);
    }
    glowTexture?.dispose();
    root = undefined;
    glowTexture = undefined;
    stars = [];
    glows = [];
  };

  const updateStatus = (): void => {
    const star = data[hoveredIndex] ?? data[selectedIndex];
    status.textContent = star
      ? `${star.name} / ${star.designation} / magnitude ${star.magnitude.toFixed(2)}`
      : 'Drag to orbit. Scroll to zoom. Select a star.';
  };

  const updateAppearance = (): void => {
    stars.forEach((mesh, index) => {
      const active = index === selectedIndex;
      const hovered = index === hoveredIndex;
      const scale = active ? 1.42 : hovered ? 1.22 : 1;
      mesh.scale.setScalar(scale);
      mesh.material.color.set(active ? '#ffffff' : hovered ? '#f4fbff' : data[index].color);
    });
  };

  const hitTest = (
    event: PointerEvent | MouseEvent,
    sceneContext: KThreeSceneContext<AriesStar>,
  ): number => {
    setPointer(event, sceneContext);
    sceneContext.raycaster.setFromCamera(sceneContext.pointer, sceneContext.camera);
    const hit = sceneContext.raycaster.intersectObjects(stars, false)[0];
    return hit ? Number(hit.object.userData.starIndex) : -1;
  };

  const rebuild = (): void => {
    if (!context) {
      return;
    }

    clear();
    root = new THREE.Group();
    root.rotation.set(-0.06, -0.18, -0.04);
    glowTexture = createGlowTexture();

    const positions = new Map<string, THREE.Vector3>();
    data.forEach((star, index) => {
      const position = new THREE.Vector3(...star.position);
      positions.set(star.id, position);

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.115 * star.size, 22, 16),
        new THREE.MeshBasicMaterial({ color: star.color, toneMapped: false }),
      );
      mesh.position.copy(position);
      mesh.userData.starIndex = index;
      stars.push(mesh);
      root?.add(mesh);

      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture,
          color: star.color,
          transparent: true,
          opacity: 0.88,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        }),
      );
      glow.position.copy(position);
      glow.userData.baseScale = 0.9 * star.size;
      glow.scale.setScalar(glow.userData.baseScale);
      glows.push(glow);
      root?.add(glow);
    });

    const lineVertices: number[] = [];
    links.forEach((link) => {
      const source = positions.get(link.source);
      const target = positions.get(link.target);
      if (source && target) {
        lineVertices.push(source.x, source.y, source.z, target.x, target.y, target.z);
      }
    });
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
    root.add(
      new THREE.LineSegments(
        lineGeometry,
        new THREE.LineBasicMaterial({
          color: '#6ec8ff',
          transparent: true,
          opacity: 0.54,
        }),
      ),
    );

    let seed = 1729;
    const random = (): number => {
      seed = (seed * 48271) % 2147483647;
      return seed / 2147483647;
    };
    const backgroundVertices: number[] = [];
    for (let index = 0; index < 520; index += 1) {
      const radius = 7 + random() * 11;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      backgroundVertices.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
      );
    }
    const backgroundGeometry = new THREE.BufferGeometry();
    backgroundGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(backgroundVertices, 3),
    );
    root.add(
      new THREE.Points(
        backgroundGeometry,
        new THREE.PointsMaterial({
          color: '#d5e9ff',
          size: 0.032,
          transparent: true,
          opacity: 0.7,
          sizeAttenuation: true,
        }),
      ),
    );

    context.scene.add(root);
    updateAppearance();
  };

  return {
    attach(sceneContext) {
      context = sceneContext;
      context.scene.fog = new THREE.FogExp2('#060b14', 0.035);
    },
    setData(nextData) {
      data = nextData;
      selectedIndex = Math.min(selectedIndex, data.length - 1);
      hoveredIndex = -1;
      rebuild();
      updateStatus();
    },
    beforeRender() {
      const time = performance.now() * 0.0015;
      glows.forEach((glow, index) => {
        const emphasis = index === selectedIndex ? 1.32 : index === hoveredIndex ? 1.16 : 1;
        const pulse = 1 + Math.sin(time + index * 1.7) * 0.045;
        glow.scale.setScalar(Number(glow.userData.baseScale) * emphasis * pulse);
      });
    },
    pointerMove(event, sceneContext) {
      const nextIndex = hitTest(event, sceneContext);
      if (nextIndex === hoveredIndex) {
        return;
      }
      hoveredIndex = nextIndex;
      sceneContext.canvas.style.cursor = hoveredIndex >= 0 ? 'pointer' : 'grab';
      updateAppearance();
      updateStatus();
    },
    click(event, sceneContext) {
      const nextIndex = hitTest(event, sceneContext);
      if (nextIndex < 0) {
        return;
      }
      selectedIndex = nextIndex;
      updateAppearance();
      updateStatus();
    },
    destroy() {
      clear();
      if (context) {
        context.scene.fog = null;
      }
      context = undefined;
    },
  };
};

const controller = createKThreeScene<AriesStar>({
  container: sceneHost,
  backgroundColor: '#060b14',
  alpha: false,
  lights: 'none',
  camera: {
    fov: 43,
    near: 0.1,
    far: 100,
    position: [0, 0.35, 8.4],
    lookAt: [0, -0.08, 0],
  },
  controls: {
    orbit: true,
    autoRotate: true,
    autoRotateSpeed: 0.24,
    enablePan: false,
    minDistance: 5.2,
    maxDistance: 13,
  },
});

controller.add(createAriesObject(ariesLinks));
controller.setData(ariesStars);

const resizeObserver = new ResizeObserver(([entry]) => {
  if (!entry) {
    return;
  }
  const { width, height } = entry.contentRect;
  controller.resize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
});
resizeObserver.observe(sceneHost);

let destroyed = false;
const destroy = (): void => {
  if (destroyed) {
    return;
  }
  destroyed = true;
  resizeObserver.disconnect();
  controller.destroy();
};

window.addEventListener('pagehide', destroy, { once: true });
import.meta.hot?.dispose(destroy);
