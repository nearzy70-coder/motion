// Nœuds de la frise sur le fil vertical : indicateur de progression pendant la démonstration.
import { el, op, show } from '../lib/dom.js';
import { E, prog, lerp, clamp } from '../lib/ease.js';
import { T, SPINE_X, NODE_Y } from '../timeline.js';

const STEP_T = [T.step1, T.step2, T.step3, T.step4, T.step5, T.value];
let nodes;

export function build(ctx) {
  nodes = NODE_Y.map((y) => {
    const g = el('div', { cls: 'abs', style: { left: SPINE_X + 'px', top: y + 'px' } }, ctx.layers.hud);
    const halo = el('div', { cls: 'abs', style: { width: '64px', height: '64px', left: '-32px', top: '-32px', borderRadius: '50%', background: 'var(--ink)' } }, g);
    const pulse = el('div', { cls: 'abs', style: { width: '40px', height: '40px', left: '-20px', top: '-20px', borderRadius: '50%', border: '2px solid var(--mint)', transformOrigin: '50% 50%' } }, g);
    const ring = el('div', { cls: 'abs', style: { width: '40px', height: '40px', left: '-20px', top: '-20px', borderRadius: '50%', border: '3px solid var(--mint)', transformOrigin: '50% 50%' } }, g);
    const core = el('div', { cls: 'abs', style: { width: '16px', height: '16px', left: '-8px', top: '-8px', borderRadius: '50%', background: 'var(--mint)', transformOrigin: '50% 50%' } }, g);
    return { g, halo, pulse, ring, core };
  });
}

// Niveau d'activation d'une étape : 0 (à venir) → 1 (active) → 0,5 (faite)
function stepState(i, t) {
  const a = E.move(prog(t, STEP_T[i] - 0.1, STEP_T[i] + 0.25));
  const d = E.move(prog(t, STEP_T[i + 1] - 0.1, STEP_T[i + 1] + 0.25));
  return { active: a * (1 - d), reached: a };
}

export function update(t) {
  const on = t >= T.list && t < T.end + 0.4;
  nodes.forEach((n, i) => {
    show(n.g, on);
    if (!on) return;
    const appear = E.soft(prog(t, T.list + 0.05 + i * 0.08, T.list + 0.4 + i * 0.08));
    const leave = 1 - E.exit(prog(t, T.end - 0.1 + i * 0.03, T.end + 0.25 + i * 0.03));
    let ring, core, coreCol, pulse = 0;

    if (t < T.step1) {
      ring = 1; core = 1; coreCol = 1;
    } else if (t < T.value) {
      const { active, reached } = stepState(i, t);
      ring = lerp(0.0, 1, active);
      core = lerp(0.62, 1, reached);
      coreCol = reached;
      if (active > 0.5) {
        const ph = ((t - STEP_T[i]) % 1.0) / 1.0;
        pulse = active * (1 - ph);
        n.pulse.style.transform = `scale(${(1 + ph * 0.9).toFixed(3)})`;
      }
    } else {
      // Valeur : chaque nœud se rallume avec l'argument correspondant
      const k = E.soft(prog(t, T.value + 0.5 + i * 0.35, T.value + 0.85 + i * 0.35));
      ring = k; core = 1; coreCol = 1;
    }
    const s = appear * leave;
    n.ring.style.transform = `scale(${(ring * s).toFixed(4)})`;
    n.core.style.transform = `scale(${(core * s).toFixed(4)})`;
    n.core.style.background = coreCol >= 1 ? 'var(--mint)' : `color-mix(in srgb, var(--mint) ${Math.round(coreCol * 100)}%, rgba(255,255,255,0.4))`;
    n.halo.style.transform = `scale(${(s * clamp(ring + 0.4)).toFixed(4)})`;
    op(n.pulse, pulse * 0.6);
  });
}
