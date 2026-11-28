export async function playHatchSpace(stage, rarity, duration, signal, onReveal) {
  let engine
  let timer
  try {
    engine = await Promise.race([
      import(new URL('/assets/three-hatch-r187.js', location.href).href),
      new Promise(resolve => { timer = setTimeout(resolve, 2200) })
    ])
  } catch { return false }
  finally { clearTimeout(timer) }
  if (!engine || signal.aborted || !stage.isConnected) return false
  const canvas = document.createElement('canvas')
  canvas.className = 'hatch-space-canvas'
  const { WebGLRenderer, Scene, OrthographicCamera, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } = engine
  let renderer
  try {
    renderer = new WebGLRenderer({ canvas, alpha: false, antialias: false, powerPreference: 'low-power' })
  } catch { return false }
  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, .1, 10)
  camera.position.z = 1
  const geometry = new PlaneGeometry(2, 2)
  const uniforms = { resolution: {value:new Vector2()}, progress:{value:0},
    tier:{value: rarity === 'legendary' ? 3 : rarity === 'epic' ? 2 : 1} }
  const material = new ShaderMaterial({ uniforms, depthTest: false, depthWrite: false,
    vertexShader: `
      void main(){gl_Position=vec4(position.xy,0.,1.);}
    `,
    fragmentShader: `
      uniform vec2 resolution;
      uniform float progress,tier;
      float noise(vec2 a){return fract(sin(dot(a,vec2(127.1,311.7)))*43758.5453);}
      mat2 turn(float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}
      float line(vec2 p,vec2 a,vec2 b){
        vec2 d=b-a;return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.,1.));
      }
      float stars(vec2 p,float size,float density){
        vec2 cell=floor(p*size);
        vec2 center=vec2(noise(cell),noise(cell+33.))*0.72+0.14;
        float dist=length(fract(p*size)-center);
        float phase=noise(cell+11.);
        return step(1.-density,phase)*(1.-smoothstep(.015,.083,dist))*(.52+.48*sin(phase*31.+progress*21.));
      }
      float cut(float x){ return sin(x*32.)*.025+sin(x*64.+.5)*.009; }
      float egg(vec2 p){
        float taper=mix(1.10,.78,smoothstep(-.58,.66,p.y));
        return length(vec2(p.x/(.48*taper),p.y/.66));
      }
      float cracks(vec2 p,float t){
        float d=5.;
        if(t>.14) {
          d=min(d,line(p,vec2(-.46,.32),vec2(-.23,.25)));
          d=min(d,line(p,vec2(-.23,.25),vec2(-.12,.40)));
          d=min(d,line(p,vec2(-.23,.25),vec2(-.29,.10)));
        }
        if(t>.24){
          d=min(d,line(p,vec2(.46,-.31),vec2(.21,-.21)));
          d=min(d,line(p,vec2(.21,-.21),vec2(.26,-.04)));
          d=min(d,line(p,vec2(.21,-.21),vec2(.05,-.32)));
        }
        if(t>.33){
          d=min(d,line(p,vec2(.21,.58),vec2(.11,.38)));
          d=min(d,line(p,vec2(.11,.38),vec2(.27,.22)));
          d=min(d,line(p,vec2(-.35,-.49),vec2(-.16,-.40)));
          d=min(d,line(p,vec2(-.16,-.40),vec2(-.09,-.52)));
        }
        if(t>.39){
          d=min(d,line(p,vec2(-.08,-.59),vec2(-.05,-.31)));
          d=min(d,line(p,vec2(-.05,-.31),vec2(.08,-.23)));
          d=min(d,line(p,vec2(.48,.14),vec2(.31,.08)));
        }
        if(t>.44)d=min(d,abs(p.y-cut(p.x)));
        return d;
      }
      vec3 shell(vec2 p,vec3 tint){
        float r=egg(p);
        float light=clamp(.68+.3*p.y-.45*p.x+.23*sqrt(max(0.,1.-r*r)),0.,1.);
        vec3 ivory=mix(vec3(.21,.17,.31),vec3(.99,.98,.90),light);
        float spots=0.;
        spots+=1.-smoothstep(.88,1.04,length((p-vec2(-.24,.22))/vec2(.085,.12)));
        spots+=1.-smoothstep(.88,1.04,length((p-vec2(.23,-.12))/vec2(.11,.13)));
        spots+=1.-smoothstep(.88,1.04,length((p-vec2(-.17,-.37))/vec2(.11,.091)));
        vec3 result=mix(ivory,mix(vec3(.22,.45,.30),tint,.32)*(.42+.58*light),clamp(spots,0.,1.));
        float crack=cracks(p,progress);
        result=mix(result,tint,exp(-crack*33.)*.60);
        result=mix(result,vec3(1.,.98,.85),(1.-smoothstep(.002,.010,crack))*(.75+.25*sin(progress*125.)));
        return result+pow(max(0.,1.-abs(.96-r)*18.),3.)*tint*.22;
      }
      void main(){
        vec2 p=(2.*gl_FragCoord.xy-resolution)/resolution.y;
        vec3 tint=tier>2.5?vec3(1.,.68,.26):tier>1.5?vec3(.82,.35,1.):vec3(.31,.77,1.);
        float split=smoothstep(.52,.72,progress);
        float flash=smoothstep(.76,.81,progress)*(1.-smoothstep(.82,.94,progress));
        float emerge=smoothstep(.78,.89,progress);
        vec2 dust=turn(-.37)*p;
        float dustBand=(dust.y+.14*sin(dust.x*2.8))/.39;
        float band=exp(-dustBand*dustBand);
        float halo=exp(-dot(p,p)*2.6);
        float s=stars(p+vec2(progress*.08,0.),22.,.47)+stars(p+vec2(-progress*.03,.2),49.,.34)*.67;
        vec3 color=vec3(.017,.019,.068)+tint*(band*(.09+.018*tier)+halo*(.045+.025*tier))+vec3(.12,.23,.61)*band*.26+s*vec3(.76,.84,1.);
        float ring=length(vec2(p.x,p.y*1.35));
        if(tier>2.5){
          float circles=exp(-abs(ring-1.15+progress*.10)*59.)+exp(-abs(ring-.90-progress*.17)*78.)*.55;
          color+=tint*circles*(.04+.25*split);
          float ray=pow(abs(sin(atan(p.y,p.x)*9.+progress*2.3)),11.);
          color+=tint*ray*halo*(.07+.26*split);
        }
        float shake=sin(progress*43.)*(.08+.13*smoothstep(.10,.47,progress))*(1.-split);
        vec2 q=turn(shake)*(p-vec2(sin(progress*43.)*.043,0.));
        float fissure=abs(q.y-cut(q.x));
        color+=tint*exp(-fissure*22.)*exp(-abs(q.x)*3.)*.27*smoothstep(.41,.56,progress);
        float hatchMask=1.-emerge;
        if(split>.01){
          float opening=(1.-smoothstep(1.,1.05,egg(q)))*hatchMask;
          color=mix(color,vec3(.045,.023,.12)+tint*exp(-abs(q.y)*9.)*.13,opening*.94);
          float anger=smoothstep(.63,.715,progress);
          vec2 eye=vec2(abs(q.x)-.164,q.y-.004);
          float oval=length(eye/vec2(.101,mix(.088,.069,anger)));
          float lid=1.-smoothstep(mix(.10,-.005,anger),mix(.12,.015,anger),eye.y-eye.x*.74);
          float mask=(1.-smoothstep(.91,1.,oval))*lid*opening*split;
          color+=tint*(1.-smoothstep(.93,1.35,oval))*.25*opening*split;
          color=mix(color,mix(tint,vec3(1.),.69),mask);
          float pupil=(1.-smoothstep(.55,1.,length((eye+vec2(.018,0.))/vec2(.031,.060))))*mask;
          color=mix(color,vec3(.12,.04,.24),pupil);
        }
        vec2 up=turn(split*.18)*(q-vec2(-split*.14,split*.37));
        vec2 dn=turn(-split*.18)*(q-vec2(split*.11,-split*.30));
        float a=(1.-smoothstep(.99,1.005,egg(up)))*step(cut(up.x),up.y)*hatchMask;
        float b=(1.-smoothstep(.99,1.005,egg(dn)))*step(dn.y,cut(dn.x))*hatchMask;
        if(a>0.)color=mix(color,shell(up,tint),a);
        if(b>0.)color=mix(color,shell(dn,tint),b);
        float burst=smoothstep(.56,.80,progress);
        if(burst>0.) for(int i=0;i<40;i++){
          float f=float(i);
          if(f>=tier*13.)break;
          float angle=f*2.39996;
          float radius=burst*(.32+fract(f*.71)*(.80+tier*.22));
          vec2 at=vec2(cos(angle),sin(angle)) * radius;
          vec2 d=turn(angle+progress*10.)*(p-at);
          vec2 size=vec2(.016+fract(f*.17)*.012,.004+fract(f*.31)*.008);
          float mote=(1.-smoothstep(.74,1.,max(abs(d.x)/size.x,abs(d.y)/size.y)));
          vec3 shard=tier>1.5&&tier<2.5?(.5+.5*cos(vec3(0.,2.,4.)+f))* .75+.25:tint;
          color+=shard*mote*(1.-smoothstep(.90,1.,progress))*.94;
        }
        color=mix(color,vec3(1.,.985,.92),flash*(.76+.20*halo));
        gl_FragColor=vec4(color,1.);
      }
    ` })
  scene.add(new Mesh(geometry, material))
  stage.prepend(canvas)
  stage.classList.add('hatch-space-active')
  let frame, completed = false, revealed = false
  let lastWidth = 0, lastHeight = 0
  const start = performance.now()
  return new Promise(resolve => {
    function finish(success) {
      if (completed) return
      completed = true
      cancelAnimationFrame(frame)
      signal.removeEventListener('abort', abort)
      canvas.removeEventListener('webglcontextlost', lost)
      if (success && !signal.aborted) {
        const still = document.createElement('canvas')
        still.className = canvas.className
        still.width = canvas.width
        still.height = canvas.height
        still.getContext('2d')?.drawImage(canvas, 0, 0)
        canvas.replaceWith(still)
      }
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      if (!success || signal.aborted) {
        canvas.remove()
        stage.classList.remove('hatch-space-active')
      }
      resolve(success && !signal.aborted)
    }
    const abort = () => finish(false)
    const lost = () => finish(false)
    function draw(now) {
      if (signal.aborted || !stage.isConnected) return finish(false)
      const width = Math.max(1, stage.clientWidth), height = Math.max(1, stage.clientHeight)
      const scale = Math.min(1, 600 / width, 340 / height)
      const w = Math.floor(width * scale), h = Math.floor(height * scale)
      if (w !== lastWidth || h !== lastHeight) {
        renderer.setSize(w, h, false)
        uniforms.resolution.value.set(w, h)
        lastWidth = w
        lastHeight = h
      }
      const position = Math.min(1, (now - start) / duration)
      uniforms.progress.value = position
      try { renderer.render(scene, camera) } catch { finish(false); return }
      if (position >= .86 && !revealed) { revealed = true; onReveal() }
      if (position === 1) finish(true)
      else frame = requestAnimationFrame(draw)
    }
    signal.addEventListener('abort', abort, {once:true})
    canvas.addEventListener('webglcontextlost', lost, {once:true})
    frame = requestAnimationFrame(draw)
  })
}
