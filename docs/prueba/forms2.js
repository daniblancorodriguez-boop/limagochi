/* ==========================================================================
   LIMAGOCHI · Formas nuevas: 7 adultos por talento + Lima Maestra (secreta) y 4 adolescentes por carácter.
   Los dibujos se construyen al cargar: el cuerpo de Lima Flor (adultos) o Lima Joven (adolescentes) con complementos encima.
   ========================================================================== */
(() => {
'use strict';
const L = window.LIMA;
Object.assign(L.PAL, { b: '#3b82d6', B: '#1f4f99', s: '#9aa5b1', t: '#e8c86a', T: '#b58a2e' });
const DEF = {"artista": {"name": "Lima Artista", "kind": "adult", "ops": [[6, 4, ["...KKKK.....", ".KKrrrrrKK..", "KrrrrRrrrrK.", ".KKKKKKKKK.."]], [10, 3, ["Kr"]], [19, 11, ["..K.", ".Kr.", "Kn..", "n..."]], [19, 15, ["n...", ".n.."]], [3, 17, ["Kc", "Ky"]]]}, "sabia": {"name": "Lima Sabia", "kind": "adult", "ops": [[5, 6, ["...KKKKKK...", "KKKKKKKKKKKK", "..KKGGGGKK.."]], [6, 5, ["KKKKKKKKKK"]], [17, 6, ["Ky", "yy", "y."]], [19, 13, ["KKKK", "KrwK", "KrwK", "KKKK"]]]}, "bardo": {"name": "Lima Bardo", "kind": "adult", "ops": [[8, 3, [".....rr.", ".....rK.", "...KKKKK.", "..KnnnnnK", "KKKKKKKKKK"]], [6, 6, ["KKKKKKKKKKKK"]], [19, 12, ["..KK", "..K.", "KK.."]], [20, 16, ["KK", "KK"]]]}, "chef": {"name": "Lima Chef", "kind": "adult", "ops": [[6, 1, ["..KKKK.KKK...", "..KwwKKwwwK..", ".KwwwwwwwwwK.", ".KwwwwwwwwwK.", "..KwwwwwwwK..", "..KKKKKKKKK.."]], [3, 9, ["KKKKKKKKKKKK"]], [19, 14, ["K.", "Ks", "K."]]]}, "atleta": {"name": "Lima Atleta", "kind": "adult", "ops": [[6, 9, ["rrrrrrrrrrrr"]], [17, 9, ["KK"]], [19, 10, ["rr", "r."]], [19, 15, ["KGGGGK", "K....K"]], [3, 10, ["c", "c"]]]}, "jardinera": {"name": "Lima Jardinera", "kind": "adult", "ops": [[4, 6, ["...KKKKKK...", "..KttttttK.."]], [2, 8, ["KKKKKKKKKKKKKKKK"]], [3, 7, ["KTTTTTTTTTTTTTTK"]], [10, 6, ["Kyy"]], [19, 12, ["pyp", "KKK"]]]}, "pescadora": {"name": "Lima Pescadora", "kind": "adult", "ops": [[6, 5, ["..KKKKKKKK..", ".KbbbbbbbbK.", "KbbbbBBbbbbK"]], [4, 8, ["KKKKKKKKKKKKKK"]], [3, 9, ["BBBBBBBBBBBBBBB"]], [19, 10, ["...K", "..K.", ".K.."]], [20, 15, ["o.", "oK"]]]}, "maestra": {"name": "Lima Maestra", "kind": "adult", "ops": [[6, 3, ["K.K..K..K.K.", "KyKKyKKyKyK.", "KyyyyyyyyyK.", "KyqyyryyqyK.", "KKKKKKKKKKK."]], [1, 5, ["y", "yy", "y"]], [20, 6, [".y.", "yyy", ".y."]]]}, "teen_estudiosa": {"name": "Lima Estudiosa", "kind": "teen", "ops": [[6, 13, ["KKKK", "K..K", "KKKK"]], [14, 13, ["KKKK", "K..K", "KKKK"]], [10, 14, ["KKKK"]], [18, 18, ["KKKK", "KrwK", "KrwK", "KKKK"]]]}, "teen_juguetona": {"name": "Lima Juguetona", "kind": "teen", "ops": [[7, 10, ["rrrrrrrrrr"]], [16, 11, ["rr"]], [0, 17, [".KKK.", "KwKwK", "KKwKK", "KwKwK", ".KKK."]]]}, "teen_mimosa": {"name": "Lima Mimosa", "kind": "teen", "ops": [[5, 7, ["qq.qq", "qqKqq", "qq.qq"]], [19, 3, [".q.q.", "qqqqq", ".qqq.", "..q.."]], [19, 10, ["qqqqq", ".qqq.", "..q.."]]]}, "teen_dormilona": {"name": "Lima Dormilona", "kind": "teen", "ops": [[6, 9, ["cccccccc.", "ccccccccc", "wcccccccc", "wwccccKKK"]], [7, 14, ["KK"]], [7, 15, ["K."]], [15, 14, ["KK"]], [19, 3, ["KKK", "..K", ".K.", "KKK"]], [21, 1, ["KK", ".K"]]]}};
const BASE = { adult: 'flor', teen: 'teen_good' };
const FACES = ['idle', 'happy', 'sad', 'sleep', 'eat'];
Object.keys(DEF).forEach(id => {
  const d = DEF[id], base = L.SPR[BASE[d.kind]];
  L.SPR[id] = {};
  FACES.forEach(f => {
    const g = base[f].map(r => r.split(''));
    if (d.kind === 'adult') for (let j = 0; j < 8; j++) for (let i = 0; i < 24; i++) g[j][i] = '.';       // quita la flor
    d.ops.forEach(([x, y, lines]) => lines.forEach((l, j) => [...l].forEach((c, i) => { if (c !== '.' && g[y + j] && x + i < 24) g[y + j][x + i] = c; })));
    L.SPR[id][f] = g.map(r => r.join(''));
  });
  L.META[id] = { name: d.name, grp: d.kind === 'adult' ? 'talent' : 'teen' };
});

/** Talento de cada forma adulta y el nivel mínimo para conseguirla. */
const TALENTS = { painting: 'artista', writing: 'sabia', music: 'bardo', cooking: 'chef', sport: 'atleta', gardening: 'jardinera', fishing: 'pescadora' };
const NEED = 40, MASTER = 50;
function levels(s) {
  const t = s.talent || {}, e = t.extra || {}, o = {};
  Object.keys(TALENTS).forEach(k => { o[k] = (t[k] && t[k].lv) || (e[k] && e[k].lv) || 0; });
  return o;
}
/** Forma adulta por talento (o null si no destaca en ninguno). */
function talentForm(s) {
  const lv = levels(s), ks = Object.keys(lv);
  if (ks.filter(k => lv[k] >= MASTER).length >= 3) return 'maestra';
  const best = ks.sort((a, b) => lv[b] - lv[a])[0];
  return lv[best] >= NEED ? TALENTS[best] : null;
}
/** Adolescente por carácter: cada rasgo puntúa (valor / umbral); gana el más alto si llega a 1. */
const TEEN_NEED = { teen_estudiosa: 15, teen_juguetona: 12, teen_mimosa: 8, teen_dormilona: 2000 };
function teenScores(s) {
  const t = s.track || { play: 0, hug: 0, sleep: 0 }, lessons = (s.study && s.study.n) || 0;
  return { teen_estudiosa: lessons / TEEN_NEED.teen_estudiosa, teen_juguetona: t.play / TEEN_NEED.teen_juguetona, teen_mimosa: t.hug / TEEN_NEED.teen_mimosa, teen_dormilona: t.sleep / TEEN_NEED.teen_dormilona };
}
function teenForm(s) {
  if (s.mistakes > 2) return 'teen_naughty';
  const sc = teenScores(s), best = Object.keys(sc).sort((a, b) => sc[b] - sc[a])[0];
  return sc[best] >= 1 ? best : 'teen_good';
}
const HINT = {
  artista: 'Adulto con pintura de nivel 40 o más.', sabia: 'Adulto con escritura de nivel 40 o más.', bardo: 'Adulto con música de nivel 40 o más.',
  chef: 'Adulto con cocina de nivel 40 o más.', atleta: 'Adulto con deporte de nivel 40 o más.', jardinera: 'Adulto con jardinería de nivel 40 o más.',
  pescadora: 'Adulto con pesca de nivel 40 o más.', maestra: 'Secreta: 3 talentos de nivel 50 o más al hacerse adulto.',
  teen_estudiosa: 'Adolescente (día 3) con ≤2 errores que ha recibido 15 lecciones de voz o más.', teen_juguetona: 'Adolescente (día 3) con ≤2 errores que ha jugado muchísimo.',
  teen_mimosa: 'Adolescente (día 3) con ≤2 errores que ha recibido muchos mimos (peluche y sofá).', teen_dormilona: 'Adolescente (día 3) con ≤2 errores que ha dormido y descansado mucho.'
};
L.forms = { ids: Object.keys(DEF), HINT, talentForm, teenForm, teenScores, TEEN_NEED };
})();
