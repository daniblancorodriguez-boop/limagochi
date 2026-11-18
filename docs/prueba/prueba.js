/* Solo copia de prueba: desbloquea las carcasas y da monedas. */
(() => {
  const go = () => {
    if (!window.LIMA || !LIMA.api || !LIMA.skins) return setTimeout(go, 200);
    const s = LIMA.api.S();
    LIMA.skins.list.forEach(k => { if (!s.owned.includes('skin_' + k.id)) s.owned.push('skin_' + k.id); });
    let first = true; try { first = !localStorage.getItem('pprueba.init'); localStorage.setItem('pprueba.init', '1'); } catch { /* */ }
    if (first) { s.stage = 'adult'; s.energy = 90; s.happy = 70; s.hunger = 80; s.lp = 500; s.meta.first.on = false; ['bed', 'lamp', 'picture', 'sofa', 'tv', 'rug', 'plant'].forEach(i => { if (!s.owned.includes(i)) s.owned.push(i); }); }
    LIMA.api.save(); LIMA.api.closePanel(); LIMA.api.render();
    LIMA.api.setMsg('🧪 PRUEBA: carcasas en ⚙️ Ajustes → Cambio de carcasa', 7000);
  };
  go();
})();
