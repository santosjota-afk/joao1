/* ===== DATA: títulos, golpes, tipos de lutador, fases, textos ===== */
(function(root){
const KF = root.KF = root.KF || {};

KF.TITLE = ['KUNG FU', 'DA ILHA'];            // troque aqui para renomear o jogo
KF.SUBTITLE = 'FIGUEIRENSE × AVAÍ — A GRANDE BRIGA';

/* Clubes (só cores e padrões de camisa; sem escudos). pat: stripes | solid | hoops | hoops3 | halves | tricolor | sash */
const CL = [];
const club = (id, name, pat, a, b, c, short, sock, band, rivals) => CL.push({id, name, pat, a, b, c, short, sock, band, glow: b === '#111' ? a : b, rivals});
club('fig', 'Figueirense', 'stripes', '#141414', '#f5f5f5', '#f5f5f5', '#141414', '#141414', '#f5f5f5', ['ava']);
club('ava', 'Avaí', 'stripes', '#1c56d8', '#ffffff', '#ffffff', '#1c56d8', '#ffffff', '#1c56d8', ['fig']);
club('fla', 'Flamengo', 'hoops', '#c8102e', '#141414', '#141414', '#141414', '#141414', '#c8102e', ['flu', 'vas', 'bot']);
club('flu', 'Fluminense', 'tricolor', '#7a1f3d', '#0c7a3d', '#ffffff', '#ffffff', '#ffffff', '#7a1f3d', ['fla', 'vas', 'bot']);
club('vas', 'Vasco', 'sash', '#141414', '#ffffff', '#ffffff', '#141414', '#141414', '#ffffff', ['fla', 'flu', 'bot']);
club('bot', 'Botafogo', 'stripes', '#141414', '#f5f5f5', '#f5f5f5', '#141414', '#141414', '#f5f5f5', ['fla', 'flu', 'vas']);
club('cor', 'Corinthians', 'solid', '#f5f5f5', '#141414', '#141414', '#141414', '#f5f5f5', '#141414', ['pal', 'spa', 'san']);
club('pal', 'Palmeiras', 'solid', '#0b6b3a', '#ffffff', '#ffffff', '#ffffff', '#0b6b3a', '#ffffff', ['cor', 'spa', 'san']);
club('spa', 'São Paulo', 'hoops3', '#f5f5f5', '#e30613', '#141414', '#f5f5f5', '#f5f5f5', '#e30613', ['cor', 'pal', 'san']);
club('san', 'Santos', 'solid', '#f5f5f5', '#141414', '#141414', '#f5f5f5', '#f5f5f5', '#141414', ['cor', 'pal', 'spa']);
club('gre', 'Grêmio', 'tricolor', '#0d80bf', '#141414', '#ffffff', '#141414', '#141414', '#0d80bf', ['int']);
club('int', 'Internacional', 'solid', '#d71920', '#ffffff', '#ffffff', '#ffffff', '#d71920', '#ffffff', ['gre']);
club('cam', 'Atlético-MG', 'stripes', '#141414', '#f5f5f5', '#f5f5f5', '#141414', '#141414', '#f5f5f5', ['cru']);
club('cru', 'Cruzeiro', 'solid', '#1f4fa3', '#ffffff', '#ffffff', '#1f4fa3', '#ffffff', '#ffffff', ['cam']);
club('bah', 'Bahia', 'tricolor', '#1b4fb5', '#d71920', '#ffffff', '#ffffff', '#1b4fb5', '#d71920', ['vit']);
club('vit', 'Vitória', 'halves', '#d71920', '#141414', '#141414', '#141414', '#141414', '#d71920', ['bah']);
club('for', 'Fortaleza', 'tricolor', '#1b4fb5', '#d71920', '#ffffff', '#1b4fb5', '#ffffff', '#d71920', ['cea']);
club('cea', 'Ceará', 'stripes', '#141414', '#f5f5f5', '#f5f5f5', '#141414', '#141414', '#f5f5f5', ['for']);
club('cfc', 'Coritiba', 'stripes', '#0b6b3a', '#ffffff', '#ffffff', '#ffffff', '#0b6b3a', '#0b6b3a', ['cap']);
club('cap', 'Athletico-PR', 'stripes', '#c8102e', '#141414', '#141414', '#141414', '#c8102e', '#c8102e', ['cfc']);
club('spt', 'Sport', 'hoops', '#c8102e', '#141414', '#141414', '#141414', '#141414', '#c8102e', ['nau', 'scz']);
club('nau', 'Náutico', 'stripes', '#d71920', '#ffffff', '#ffffff', '#ffffff', '#d71920', '#d71920', ['spt', 'scz']);
club('scz', 'Santa Cruz', 'tricolor', '#d71920', '#141414', '#ffffff', '#ffffff', '#141414', '#d71920', ['spt', 'nau']);
KF.CLUB_LIST = CL;
KF.CLUBS = {};
CL.forEach(c => KF.CLUBS[c.id] = c);
KF.CLUBS.ref = {id: 'ref', name: 'Arbitragem', pat: 'ninja', a: '#26262e', b: '#f2c200', c: '#f2c200', short: '#1a1a20', sock: '#26262e', band: '#f2c200', glow: '#ffe14d', rivals: []};
KF.rivalOf = c => { const r = (KF.CLUBS[c] || {}).rivals || []; return r.length ? r[0] : 'fig'; };

KF.SKINS = ['#f6d2a8', '#e8b384', '#c98d5e', '#8d5a3b', '#5e3a26'];
KF.HAIRS = ['#16110f', '#3b2412', '#7a4a1e', '#d9a441', '#8a2b1e', '#555a60'];
KF.STYLES = ['short', 'spiky', 'long', 'topknot', 'bald'];

/* Escolas de luta (uma por cultura). Multiplicadores: pu=socos, ki=chutes, ju=voadora, sp=golpe especial. */
KF.SCHOOLS = [
  {id: 'kf', name: 'Kung Fu',   land: 'China',     mark: '功夫',   sp: 'DRAGÃO',   spMark: '龍', col: '#ff6a3a', trim: '#e8b923', hp: 100, spd: 98,  pu: 1,    ki: 1,    ju: 1,    spm: 1,    kg: 1,
   desc: 'A arte dos mestres do templo. Equilibrado, combos fluidos e o giro do Dragão.', stat: [3, 3, 3]},
  {id: 'ka', name: 'Karatê',    land: 'Japão',     mark: '空手',   sp: 'KIAI',     spMark: '気', col: '#f2f2f2', trim: '#141414', hp: 92,  spd: 106, pu: 1.3,  ki: .95,  ju: 1,    spm: 1,    kg: 1.15,
   desc: 'Golpes secos e precisos. Socos rápidos e fortes, e o KI enche mais depressa.', stat: [4, 5, 2]},
  {id: 'mt', name: 'Muay Thai', land: 'Tailândia', mark: 'มวยไทย', sp: 'ELEFANTE', spMark: '象', col: '#f2c200', trim: '#d11a2a', hp: 114, spd: 90,  pu: .95,  ki: 1.35, ju: 1,    spm: 1.1,  kg: 1,
   desc: 'A arte das oito armas. Joelhadas e chutes devastadores, aguenta muita pancada.', stat: [5, 2, 5]},
  {id: 'tk', name: 'Taekwondo', land: 'Coreia',    mark: '태권도', sp: 'TIGRE',    spMark: '虎', col: '#4aa8ff', trim: '#1c56d8', hp: 94,  spd: 104, pu: .85,  ki: 1.12, ju: 1.45, spm: 1,    kg: 1,
   desc: 'Chutes acrobáticos. Voadoras muito fortes e mais velocidade, mas socos fracos.', stat: [3, 5, 2]}
];
KF.SCHOOL_IDS = KF.SCHOOLS.map(s => s.id);
/* hinos: arquivo hinos/<id>.mp3 (se faltar, toca o tema gerado) */
KF.ANTHEMS = {scz: 1, nau: 1, spt: 1, cap: 1, cfc: 1, cea: 1, for: 1, vit: 1, bah: 1, cru: 1, cam: 1, int: 1, gre: 1, san: 1, spa: 1, pal: 1, cor: 1, vas: 1, bot: 1, flu: 1, ava: 1, fig: 1, fla: 1};

/* Golpes. dmg é absoluto; é multiplicado por K.dm do lutador. */
KF.ATK = {
  p1:   {pose: 'punch', su: .05, ac: .07, rc: .11, dmg: 7,  rng: 27, dy: 16, kb: 55,  stun: .26, lunge: 45,  next: 'p2', sfx: 'punch'},
  p2:   {pose: 'punch', su: .05, ac: .07, rc: .12, dmg: 8,  rng: 28, dy: 16, kb: 60,  stun: .28, lunge: 55,  next: 'p3', sfx: 'punch'},
  p3:   {pose: 'heavy', su: .08, ac: .09, rc: .24, dmg: 12, rng: 33, dy: 16, kb: 170, down: true, lunge: 100, sfx: 'kick'},
  kick: {pose: 'kick',  su: .12, ac: .10, rc: .22, dmg: 13, rng: 37, dy: 16, kb: 150, down: true, lunge: 70,  sfx: 'kick'},
  jkick:{pose: 'jkick', su: 0,   ac: .60, rc: .04, dmg: 11, rng: 30, dy: 18, kb: 140, down: true, air: true, sfx: 'kick'},
  spin: {pose: 'spin',  su: .06, ac: .46, rc: .20, dmg: 15, rng: 52, dy: 24, kb: 200, down: true, around: true, multi: .15, inv: true, sfx: 'special'},
  /* inimigos */
  e0:   {pose: 'punch', su: .15, ac: .07, rc: .24, dmg: 5,  rng: 25, dy: 12, kb: 50,  stun: .22, sfx: 'punch'},
  e1:   {pose: 'punch', su: .32, ac: .08, rc: .36, dmg: 7,  rng: 27, dy: 12, kb: 70,  stun: .30, sfx: 'punch'},
  e2:   {pose: 'swing', su: .34, ac: .10, rc: .42, dmg: 9,  rng: 37, dy: 14, kb: 110, stun: .35, sfx: 'kick'},
  e3:   {pose: 'slam',  su: .58, ac: .10, rc: .55, dmg: 14, rng: 40, dy: 16, kb: 190, down: true, sfx: 'kick'},
  throw:{pose: 'throw', su: .42, ac: .05, rc: .40, proj: 'ball'},
  /* chefe: Mestre Juiz */
  bdash:   {pose: 'dash',    su: .70, ac: .50, rc: .55, dmg: 16, rng: 32, dy: 16, kb: 230, down: true, dashV: 340, multi: .1, sfx: 'whoosh'},
  bcard:   {pose: 'throw',   su: .45, ac: .05, rc: .35, proj: 'yel'},
  bred:    {pose: 'throw',   su: .55, ac: .05, rc: .45, proj: 'red'},
  bwhistle:{pose: 'whistle', su: .85, ac: .12, rc: .65, dmg: 14, rng: 90, dy: 60, kb: 250, down: true, around: true, shock: true, sfx: 'whistle'},
  bmelee:  {pose: 'slam',    su: .40, ac: .10, rc: .40, dmg: 12, rng: 44, dy: 16, kb: 170, down: true, sfx: 'kick'}
};

/* Tipos de lutador */
KF.KINDS = {
  player: {name: 'Você',               hp: 100, spd: 98, dm: 1},
  ally:   {name: 'Aliado',             hp: 58,  spd: 80, dm: .8},
  grunt:  {name: 'Torcedor Ninja',     hp: 32,  spd: 54, dm: 1, atk: 'e1',    reach: 27, cd: [.7, 1.5],  hover: 100, score: 100},
  fast:   {name: 'Ponta Ninja',        hp: 22,  spd: 90, dm: 1, atk: 'e0',    reach: 25, cd: [.5, 1.0],  hover: 90,  score: 120, burst: 2},
  tank:   {name: 'Zagueiro Sumô',      hp: 88,  spd: 34, dm: 1, atk: 'e3',    reach: 40, cd: [1.2, 2.2], hover: 110, score: 300, scale: 1.22, wide: 1.4, armor: true, hair: 'topknot'},
  kicker: {name: 'Meia Chutador',      hp: 26,  spd: 58, dm: 1, atk: 'throw', ranged: true, cd: [1.5, 2.6], score: 150},
  flag:   {name: 'Bandeirinha Ninja',  hp: 38,  spd: 68, dm: 1, atk: 'e2',    reach: 37, cd: [.9, 1.6],  hover: 100, score: 150, club: 'ref'},
  boss:   {name: 'Mestre Juiz',        hp: 480, spd: 58, dm: 1, boss: true,   armor: true, scale: 1.3, wide: 1.2, club: 'ref', score: 3000, hair: 'bald'}
};

/* Fases. e: [tipo, lado(L/R/B), atraso]. at<0 => fim da fase. */
KF.STAGES = [
  {id: 1, name: 'Templo da Ilha', theme: 'temple', music: 'battle1', len: 1750, allies: 2, tokens: 2, cap: 4,
   intro: 'Os torcedores rivais invadiram o templo da Ilha e a bandeira virou arma de kung fu! Mostre quem manda no pedaço — seus colegas de time vêm junto.',
   tip: 'Toque SOCO três vezes seguidas para fazer um combo. O CHUTE derruba.',
   waves: [
     {at: 0,   e: [['grunt', 'R', 0], ['grunt', 'L', .8]]},
     {at: 430, e: [['grunt', 'R', 0], ['grunt', 'L', .4], ['fast', 'R', 1.5]]},
     {at: 900, e: [['grunt', 'R', 0], ['fast', 'L', .5], ['grunt', 'B', 1.2], ['fast', 'R', 2.2]]},
     {at: -1,  e: [['tank', 'R', 0], ['grunt', 'L', .8], ['fast', 'R', 1.8], ['grunt', 'L', 3]]}
   ]},
  {id: 2, name: 'Ponte das Lanternas', theme: 'bridge', music: 'battle2', len: 2050, allies: 2, tokens: 3, cap: 5,
   intro: 'A confusão atravessou a ponte iluminada! Tem gente chutando bola de longe — pule ou DEVOLVA a bola com um golpe.',
   tip: 'Acerte a bola com um golpe para devolvê-la! Pastéis de camarão recuperam a vida.',
   waves: [
     {at: 0,   e: [['grunt', 'R', 0], ['kicker', 'L', .6], ['grunt', 'L', 1.5]]},
     {at: 380, e: [['fast', 'R', 0], ['kicker', 'R', .5], ['grunt', 'L', 1], ['fast', 'L', 2]]},
     {at: 820, e: [['tank', 'R', 0], ['kicker', 'L', 1], ['grunt', 'L', 2], ['fast', 'R', 3]]},
     {at: 1260,e: [['grunt', 'L', 0], ['kicker', 'R', .4], ['fast', 'L', 1.2], ['grunt', 'R', 1.6], ['kicker', 'L', 2.6]]},
     {at: -1,  e: [['tank', 'R', 0], ['tank', 'L', 1.5], ['fast', 'R', 2.5], ['kicker', 'L', 3]]}
   ]},
  {id: 3, name: 'Ringue de Bangkok', theme: 'wat', music: 'battle3', len: 2150, allies: 2, tokens: 3, cap: 5,
   intro: 'A confusão voou até Bangkok! Num ringue de Muay Thai, sob os templos dourados, a torcida rival veio com joelhadas e bolas de longe. Aqui ninguém foge de briga!',
   tip: 'Os zagueiros sumô agora vêm em dupla. Use o KI para limpar a tela com o golpe especial.',
   waves: [
     {at: 0,   e: [['fast', 'R', 0], ['grunt', 'L', .5], ['kicker', 'R', 1.2], ['fast', 'L', 2]]},
     {at: 380, e: [['grunt', 'R', 0], ['grunt', 'L', .4], ['kicker', 'L', 1.4], ['fast', 'R', 2.2]]},
     {at: 820, e: [['tank', 'R', 0], ['fast', 'L', .8], ['kicker', 'R', 1.6], ['grunt', 'L', 2.6]]},
     {at: 1300,e: [['fast', 'L', 0], ['fast', 'R', .4], ['grunt', 'L', 1.2], ['kicker', 'R', 1.8], ['kicker', 'L', 2.8]]},
     {at: -1,  e: [['tank', 'R', 0], ['tank', 'L', 1.2], ['fast', 'R', 2.4], ['grunt', 'L', 3.2]]}
   ]},
  {id: 4, name: 'Dojo-Estádio', theme: 'dojo', music: 'boss', len: 1050, allies: 3, tokens: 3, cap: 5, truce: true,
   intro: 'QUEM APITOU AQUELE PÊNALTI?! Era o MESTRE JUIZ, um ninja de apito e cartão! Pela primeira vez, as duas torcidas lutam lado a lado.',
   tip: 'Cuidado com o cartão vermelho e com o apito: o chefe derruba todo mundo por perto.',
   waves: [
     {at: 0,   e: [['flag', 'R', 0], ['flag', 'L', .6], ['fast', 'R', 1.4], ['flag', 'L', 2.2]]},
     {at: 260, e: [['flag', 'R', 0], ['tank', 'L', .5], ['flag', 'L', 1.8], ['fast', 'R', 2.6]]},
     {at: -1,  e: [['boss', 'R', .2]], boss: true}
   ]}
];

KF.TEXT = {
  intro: 'Florianópolis. Depois de um pênalti muito mal marcado, o Clássico da Ilha virou um torneio de kung fu. Figueirense e Avaí trocaram as bandeiras por golpes de mestre — e só um lutador pode encerrar a briga generalizada.',
  endWin: 'PAZ NA ILHA! As duas torcidas abraçaram o Mestre Juiz (que pediu desculpas e foi pro VAR) e foram juntas comer pastel de camarão. A rivalidade continua... mas só no campo!',
  endLose: 'Você caiu, mas a torcida nunca desiste. Vamos de novo?'
};
})(typeof window !== 'undefined' ? window : globalThis);
