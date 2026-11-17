/* Solo para la copia de prueba: desbloquea carcasas y añade una barra para forzar día/noche. */
(() => {
  const go = () => {
    if (!window.LIMA || !LIMA.api || !LIMA.skins || !LIMA.fondos) return setTimeout(go, 200);
    const s = LIMA.api.S();
    LIMA.skins.list.forEach(k => { if (!s.owned.includes('skin_' + k.id)) s.owned.push('skin_' + k.id); });
    let first = true; try { first = !localStorage.getItem('prueba.init'); localStorage.setItem('prueba.init', '1'); } catch { /* */ }
    if (first) { s.stage = 'adult'; s.energy = 90; s.happy = 70; s.hunger = 80; s.lp = 500; s.meta.first.on = false; ['bed','lamp','picture','sofa','tv','rug','plant'].forEach(i => { if (!s.owned.includes(i)) s.owned.push(i); }); }
    LIMA.api.save(); LIMA.api.closePanel(); LIMA.api.render();
    const bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;top:6px;left:6px;z-index:99;display:flex;gap:4px;font:12px system-ui';
    [['auto', '🔄 Auto'], ['day', '☀️ Día'], ['night', '🌙 Noche']].forEach(([m, t]) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'padding:6px 9px;border-radius:8px;border:0;background:#fffc;color:#222'; b.onclick = () => LIMA.fondos.force(m); bar.append(b); });
    document.body.append(bar);
    LIMA.api.setMsg('🧪 PRUEBA: carcasas en ⚙️ Ajustes, salas con la flecha; día/noche arriba', 8000);
  };
  go();
})();
