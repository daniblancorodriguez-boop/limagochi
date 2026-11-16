/* Solo para la copia de prueba: entrega a Lima robot y lleva a la mascota al cuarto. */
(() => {
  const go = () => {
    if (!window.LIMA || !LIMA.api || !LIMA.robodog) return setTimeout(go, 200);
    const s = LIMA.api.S();
    ['bed', 'lamp', 'picture', 'plush', 'sofa', 'tv', 'rug', 'plant', 'robodog'].forEach(i => { if (!s.owned.includes(i)) s.owned.push(i); });
    let first = true; try { first = !localStorage.getItem('prueba.init'); localStorage.setItem('prueba.init', '1'); } catch { /* */ }
    if (first) { s.stage = 'adult'; s.energy = 90; s.happy = 60; s.hunger = 80; s.lp = 200; s.meta.first.on = false; s.room.where = 'bedroom'; }
    LIMA.api.save(); LIMA.api.closePanel(); LIMA.api.render();
    LIMA.api.setMsg('🧪 PRUEBA: toca a Lima robot para jugar', 8000);
  };
  go();
})();
