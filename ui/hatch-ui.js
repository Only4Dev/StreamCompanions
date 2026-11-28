export function hatchDialog(en) {
  return '<dialog class="egg-dialog" data-hatch aria-labelledby="egg-title" data-opening="' + (en ? 'The egg is hatching…' : '¡El huevo está eclosionando!') +
    '" data-reveal="' + (en ? 'Your egg hatched!' : '¡Tu huevo eclosionó!') + '"><h2 id="egg-title"></h2>' +
    '<p class="egg-rarity" data-hatch-rarity hidden></p><div class="egg-stage" aria-hidden="true"><div class="egg-aura"></div><div class="egg-rays"></div>' +
    '<div class="egg-waves"><i></i><i></i></div><div class="egg-particles"></div><div class="egg-shell"><i></i><i></i><b></b></div><img width="112" height="112" alt=""></div>' +
    '<p data-hatch-result aria-live="polite"></p><ol class="egg-summary" data-hatch-summary hidden></ol><form method="dialog"><button>' + (en ? 'Close' : 'Cerrar') + '</button></form></dialog>'
}

export async function revealHatches(dialog, hatches, language) {
  if (!dialog || dialog.open) return;
  const batch = Array.isArray(hatches) ? hatches : [hatches];
  const en = (language ?? document.documentElement.lang) === 'en';
  const title = dialog.querySelector('h2');
  const result = dialog.querySelector('[data-hatch-result]');
  const summary = dialog.querySelector('[data-hatch-summary]');
  let stage = dialog.querySelector('.egg-stage');
  const template = stage.cloneNode(true);
  const tiers = {
    common: { duration: 1450, particles: 7, names: ['Común', 'Common'] },
    rare: { duration: 1950, particles: 17, names: ['Raro', 'Rare'] },
    epic: { duration: 2320, particles: 25, names: ['Épico', 'Epic'] },
    legendary: { duration: 2900, particles: 38, names: ['Legendario', 'Legendary'] }
  };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const badge = dialog.querySelector('[data-hatch-rarity]');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  const wait = ms => new Promise(resolve => {
    if (controller.signal.aborted) return resolve();
    const done = () => {
      clearTimeout(timer);
      controller.signal.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    controller.signal.addEventListener('abort', done, { once: true });
  });
  dialog.addEventListener('close', cancel, { once: true });
  const spriteUrl = id => 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + id + '.png';
  function celebrate(rarity) {
    if (reducedMotion || controller.signal.aborted) return;
    const confetti = document.createElement('div');
    confetti.className = 'hatch-celebration';
    confetti.setAttribute('popover', 'manual');
    confetti.setAttribute('aria-hidden', 'true');
    const colors = ['#fff1ba', '#7adfff', '#e5a3ff', '#ff8faa', '#8af4bc'];
    const counts = { common: 16, rare: 28, epic: 54, legendary: 76 };
    for (let index = 0; index < counts[rarity]; index++) {
      const flake = document.createElement('i');
      flake.style.left = ((index * 61.8034) % 100) + '%';
      flake.style.backgroundColor = colors[index % colors.length];
      flake.style.setProperty('--size', (4 + index % 6) + 'px');
      flake.style.setProperty('--drift', ((index * 43) % 190 - 95) + 'px');
      flake.style.setProperty('--delay', (index * 19 % 520) + 'ms');
      flake.style.setProperty('--fall', (1170 + index * 83 % 730) + 'ms');
      confetti.append(flake);
    }
    dialog.append(confetti);
    try { confetti.showPopover?.(); } catch { confetti.remove(); return; }
    const cleanup = () => confetti.remove();
    controller.signal.addEventListener('abort', cleanup, { once: true });
    setTimeout(() => {
      controller.signal.removeEventListener('abort', cleanup);
      cleanup();
    }, 2500);
  }
  dialog.showModal();
  try {
    for (const [position, hatch] of batch.entries()) {
      const rarity = hatch.rarity === 'uncommon' ? 'rare' : Object.hasOwn(tiers, hatch.rarity) ? hatch.rarity : 'common';
      const tier = tiers[rarity];
      const suffix = batch.length > 1 ? ' · ' + (position + 1) + '/' + batch.length : '';
      const name = hatch.name + (hatch.levelUp ? (en ? ' · +1 level' : ' · +1 nivel') : hatch.xp > 0 ? ' · +' + hatch.xp + ' XP' : '');
      dialog.classList.remove('hatched');
      dialog.dataset.rarity = rarity;
      dialog.style.setProperty('--hatch-time', tier.duration + 'ms');
      title.textContent = dialog.dataset.opening + suffix;
      badge.hidden = true;
      result.textContent = '';
      const nextStage = template.cloneNode(true);
      nextStage.querySelector('img').src = spriteUrl(hatch.id);
      const particles = nextStage.querySelector('.egg-particles');
      if (!reducedMotion) for (let index = 0; index < tier.particles; index++) {
        const mote = document.createElement('i');
        const angle = index * Math.PI * (3 - Math.sqrt(5));
        const distance = 42 + index % 7 * 11 + (rarity === 'legendary' ? 27 : 0);
        mote.style.setProperty('--x', Math.round(Math.cos(angle) * distance) + 'px');
        mote.style.setProperty('--y', Math.round(Math.sin(angle) * distance * .78) + 'px');
        mote.style.setProperty('--delay', index % 6 * 35 + 'ms');
        mote.style.setProperty('--size', (3 + index % 4) + 'px');
        particles.append(mote);
      }
      stage.replaceWith(nextStage);
      stage = nextStage;
      let played = false;
      if (!reducedMotion) {
        try {
          const { playHatchSpace } = await import(new URL('/assets/hatch-space.js', location.href).href);
          const duration = rarity === 'legendary' ? 3900 : rarity === 'epic' ? 3200 : rarity === 'rare' ? 2600 : 2300;
          played = await playHatchSpace(stage, rarity, duration, controller.signal, () => {
            dialog.classList.add('hatched');
            celebrate(rarity);
          });
        } catch { /* the CSS animation remains available */ }
      }
      if (!played) await wait(reducedMotion ? 0 : tier.duration);
      if (!dialog.open) return;
      dialog.classList.add('hatched');
      if (!played) celebrate(rarity);
      title.textContent = dialog.dataset.reveal + suffix;
      badge.textContent = tier.names[Number(en)];
      badge.hidden = false;
      result.textContent = name;
      const item = document.createElement('li');
      item.dataset.rarity = rarity;
      const image = new Image(36, 36);
      image.src = spriteUrl(hatch.id);
      image.alt = '';
      const label = document.createElement('strong');
      label.textContent = name;
      const tierLabel = document.createElement('small');
      tierLabel.textContent = badge.textContent;
      item.append(image, label, tierLabel);
      summary.append(item);
      await wait(1000);
      if (!dialog.open) return;
    }
    delete dialog.dataset.rarity;
    title.textContent = en ? 'Hatch summary' : 'Resumen de eclosión';
    stage.remove();
    badge.hidden = true;
    result.hidden = true;
    summary.hidden = false;
  } finally {
    dialog.removeEventListener('close', cancel);
  }
}
