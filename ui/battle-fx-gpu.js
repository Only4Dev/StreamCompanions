import {
  BufferAttribute, BufferGeometry, DoubleSide, DynamicDrawUsage, Easing, Mesh,
  OrthographicCamera, Scene, ShaderMaterial, TextureLoader, Vector2, WebGLRenderer
} from './battle-render-r187.js'

const atlas = '/battle-vfx-atlas.webp'
const verticesPerQuad = 6
const corners = [[-1, -1], [1, -1], [-1, 1], [-1, 1], [1, -1], [1, 1]]
const maxParticles = 360

export function createParticleSurface(anchor) {
  const canvas = document.createElement('canvas')
  canvas.className = 'battle-particle-surface'
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, { position: 'fixed', margin: '0', padding: '0', border: '0', pointerEvents: 'none', zIndex: '1' })
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' })
  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, .1, 10)
  const geometry = new BufferGeometry()
  const attributes = {
    position: new BufferAttribute(new Float32Array(maxParticles * verticesPerQuad * 3), 3),
    uv: new BufferAttribute(new Float32Array(maxParticles * verticesPerQuad * 2), 2),
    tint: new BufferAttribute(new Float32Array(maxParticles * verticesPerQuad * 4), 4),
    tile: new BufferAttribute(new Float32Array(maxParticles * verticesPerQuad), 1)
  }
  for (const [name, attribute] of Object.entries(attributes)) geometry.setAttribute(name, attribute.setUsage(DynamicDrawUsage))
  const uniforms = {
    viewport: { value: new Vector2() }, textureAtlas: { value: null }, atlasReady: { value: false }
  }
  const material = new ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, depthTest: false, side: DoubleSide,
    vertexShader: `
      uniform vec2 viewport;
      attribute vec4 tint;
      attribute float tile;
      varying vec4 vTint;
      varying vec2 vUv;
      varying float vTile;
      void main(){
        vTint=tint;vUv=uv;vTile=tile;
        gl_Position=vec4(position.x/viewport.x*2.-1.,1.-position.y/viewport.y*2.,0.,1.);
      }
    `,
    fragmentShader: `
      uniform sampler2D textureAtlas;
      uniform bool atlasReady;
      varying vec4 vTint;
      varying vec2 vUv;
      varying float vTile;
      void main(){
        vec2 p=vUv*2.-1.;
        float r=length(p);
        float glow=exp(-r*r*5.5)*(1.-smoothstep(.70,1.,r));
        float sharp=pow(max(0.,1.-abs(p.x)*abs(p.y)*18.-r*.55),6.);
        float core=vTile==2.?glow:sharp;
        if(atlasReady){
          vec2 cell=vec2(mod(vTile,2.),1.-floor(vTile/2.));
          vec4 art=texture2D(textureAtlas,(cell+vUv)*.5);
          core=max(core*.30,art.a*max(art.r,max(art.g,art.b)));
        }
        vec3 color=mix(vTint.rgb,vec3(1.,.99,.95),min(.9,core*.83));
        gl_FragColor=vec4(color, min(1.,(core*.94+glow*.30)*vTint.a));
      }
    `
  })
  const mesh = new Mesh(geometry, material)
  mesh.frustumCulled = false
  scene.add(mesh)
  const texture = new TextureLoader().load(atlas, loaded => {
    uniforms.textureAtlas.value = loaded
    uniforms.atlasReady.value = true
  }, undefined, () => {})
  let width = 0, height = 0, lost = false
  let placement = ''
  const contain = getComputedStyle(anchor).objectFit === 'contain'
  canvas.hidden = true
  anchor.after(canvas)
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true })
  canvas.addEventListener('webglcontextrestored', () => { lost = false })

  return {
    ease: Easing.Cubic.Out,
    hide() { canvas.hidden = true },
    draw(particles, frameWidth, frameHeight) {
      if (lost) { canvas.hidden = true; return false }
      const count = Math.min(maxParticles, particles.length)
      if (!count) return true
      const rect = anchor.getBoundingClientRect()
      let placedWidth = rect.width, placedHeight = rect.height, left = rect.left, top = rect.top
      if (contain) {
        const scale = Math.min(rect.width / frameWidth, rect.height / frameHeight)
        placedWidth = frameWidth * scale
        placedHeight = frameHeight * scale
        left += (rect.width - placedWidth) / 2
        top += (rect.height - placedHeight) / 2
      }
      const nextPlacement = [left, top, placedWidth, placedHeight].join(':')
      if (placement !== nextPlacement) {
        Object.assign(canvas.style, { left: left + 'px', top: top + 'px', width: placedWidth + 'px', height: placedHeight + 'px' })
        placement = nextPlacement
      }
      canvas.hidden = false
      if (frameWidth !== width || frameHeight !== height) {
        const scale = Math.min(1, 1280 / frameWidth, 740 / frameHeight)
        renderer.setSize(Math.round(frameWidth * scale), Math.round(frameHeight * scale), false)
        uniforms.viewport.value.set(frameWidth, frameHeight)
        width = frameWidth
        height = frameHeight
      }
      let cursor = 0
      for (let i = 0; i < count; i++) {
        const { x, y, radius, rotation, rgb, opacity, cell } = particles[i]
        const c = Math.cos(rotation), s = Math.sin(rotation)
        for (const [u, v] of corners) {
          attributes.position.setXYZ(cursor, x + (u * c - v * s) * radius, y + (u * s + v * c) * radius, 0)
          attributes.uv.setXY(cursor, (u + 1) * .5, (1 - v) * .5)
          attributes.tint.setXYZW(cursor, ...rgb, opacity)
          attributes.tile.setX(cursor, cell)
          cursor++
        }
      }
      for (const attribute of Object.values(attributes)) {
        attribute.clearUpdateRanges()
        attribute.addUpdateRange(0, cursor * attribute.itemSize)
        attribute.needsUpdate = true
      }
      geometry.setDrawRange(0, cursor)
      renderer.render(scene, camera)
      return true
    },
    dispose() {
      texture.dispose()
      material.dispose()
      geometry.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    }
  }
}
