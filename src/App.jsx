import { useState, useEffect, useRef, useCallback } from "react";

const SB_URL  = "https://lehxnvfrulqizmldnlhk.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlaHhudmZydWxxaXptbGRubGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDEzOTIsImV4cCI6MjA4ODcxNzM5Mn0.ppyN6FHJ4ZMzAh-mL4pFRIQxNeq_RmJQOjI9qo6ww8c";

// Pure fetch Supabase layer - no CDN script required
let _token = sessionStorage.getItem("sb_token") || null;

function setToken(t) {
  _token = t;
  if (t) sessionStorage.setItem("sb_token", t);
  else sessionStorage.removeItem("sb_token");
}

function hdrs(tok, extra) {
  return { "Content-Type":"application/json", apikey: SB_ANON, Authorization:`Bearer ${tok||SB_ANON}`, ...extra };
}

const sb = {
  async signUp(email, password, username) {
    const r = await fetch(`${SB_URL}/auth/v1/signup`, {
      method:"POST", headers: hdrs(), body: JSON.stringify({ email, password, data: { username } }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.msg || d.error_description || d.message || `Sign-up error ${r.status}`);
    if (d.access_token) setToken(d.access_token);
    return d;
  },

  async signIn(email, password) {
    const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
      method:"POST", headers: hdrs(), body: JSON.stringify({ email, password }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error_description || d.msg || d.message || `Login error ${r.status}`);
    setToken(d.access_token);
    return d;
  },

  async signOut() {
    if (_token) await fetch(`${SB_URL}/auth/v1/logout`, { method:"POST", headers: hdrs(_token) }).catch(()=>{});
    setToken(null);
  },

  async select(table, qs = "", single = false) {
    const extra = single ? { Accept:"application/vnd.pgrst.object+json" } : {};
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${qs}`, { headers: hdrs(_token, extra) });
    if (r.status === 406 || (single && r.status === 404)) return null;
    if (!r.ok) { const e = await r.json().catch(()=>{}); throw new Error(e?.message || `select failed ${r.status}`); }
    return r.json();
  },

  async insert(table, data) {
    const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method:"POST", headers: hdrs(_token, { Prefer:"return=representation" }), body: JSON.stringify(data),
    });
    if (!r.ok) { const e = await r.json().catch(()=>{}); throw new Error(e?.message || e?.hint || `insert failed ${r.status}`); }
    return r.json();
  },

  async delete(table, qs) {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${qs}`, {
      method:"DELETE", headers: hdrs(_token),
    });
    if (!r.ok) { const e = await r.json().catch(()=>{}); throw new Error(e?.message || `delete failed ${r.status}`); }
    return true;
  },

  async rpc(fn, params) {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
      method:"POST", headers: hdrs(_token), body: JSON.stringify(params),
    });
    if (!r.ok) { const e = await r.json().catch(()=>{}); throw new Error(e?.message || `rpc failed ${r.status}`); }
    return r.status === 204 ? null : r.json();
  },

  async upsert(table, data) {
    const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method:"POST", headers: hdrs(_token, { Prefer:"resolution=merge-duplicates,return=representation" }), body: JSON.stringify(data),
    });
    if (!r.ok) { const e = await r.json().catch(()=>{}); throw new Error(e?.message || e?.hint || `upsert failed ${r.status}`); }
    return r.json();
  },
};

const SYMBOLS = [
  { id:"circle", label:"Circle", cx:50, cy:50, r:30 },
  { id:"cross",  label:"Cross",  path:"M35,5 L65,5 L65,35 L95,35 L95,65 L65,65 L65,95 L35,95 L35,65 L5,65 L5,35 L35,35 Z" },
  { id:"waves",  label:"Waves",  path:"M5,50 Q20,20 35,50 Q50,80 65,50 Q80,20 95,50" },
  { id:"square", label:"Square", path:"M15,15 L85,15 L85,85 L15,85 Z" },
  { id:"star",   label:"Star",   path:"M50,5 L61,35 L95,35 L68,57 L79,91 L50,70 L21,91 L32,57 L5,35 L39,35 Z" },
];

const XP_TABLE = [
  0,100,250,450,700,1000,1400,1900,2500,3200,
  4000,5000,6200,7600,9200,11000,13100,15500,18200,21200,
  1820,1930,2041,2152,2265,2379,2494,2609,2726,2843,
  2961,3080,3199,3320,3441,3563,3685,3809,3932,4057,
  4182,4308,4434,4561,4689,4817,4946,5075,5205,5335,
  5466,5598,5730,5862,5995,6129,6263,6397,6532,6667,
  6803,6940,7076,7214,7351,7489,7628,7767,7906,8046,
  8186,8326,8467,8609,8750,8892,9035,9178,9321,9465,
  9608,9753,9897,10043,10188,10334,10480,10626,10773,10920,
  11067,11215,11363,11511,11660,11809,11959,12108,12258,12408,
  12559,12710,12861,13012,13164,13316,13469,13621,13774,13927,
  14081,14235,14389,14543,14697,14852,15007,15163,15318,15474,
  15631,15787,15944,16101,16258,16415,16573,16731,16889,17048,
  17206,17365,17525,17684,17844,18004,18164,18324,18485,18646,
  18807,18968,19130,19291,19453,19616,19778,19941,20104,20267,
  20430,20594,20757,20921,21086,21250,21415,21579,21744,21910,
  22075,22241,22407,22573,22739,22906,23072,23239,23406,23574,
  23741,23909,24077,24245,24413,24581,24750,24919,25088,25257,
  25427,25596,25766,25936,26106,26277,26447,26618,26789,26960,
  27131,27302,27474,27646,27818,27990,28162,28335,28508,28680,
  28853,29027,29200,29374,29547,29721,29895,30070,30244,30419,
  30593,30768,30943,31118,31294,31469,31645,31821,31997,32173,
  32350,32526,32703,32880,33057,33234,33411,33589,33766,33944,
  34122,34300,34479,34657,34836,35014,35193,35372,35551,35731,
  35910,36090,36270,36449,36630,36810,36990,37171,37351,37532,
  37713,37894,38075,38257,38438,38620,38802,38984,39166,39348,
  39531,39713,39896,40079,40261,40445,40628,40811,40995,41178,
  41362,41546,41730,41914,42098,42283,42467,42652,42837,43022,
  43207,43392,43578,43763,43949,44135,44320,44506,44693,44879,
  45065,45252,45439,45625,45812,45999,46187,46374,46561,46749,
  46937,47124,47312,47500,47689,47877,48065,48254,48442,48631,
  48820,49009,49198,49388,49577,49767,49956,50146,50336,50526,
  50716,50906,51097,51287,51478,51668,51859,52050,52241,52433,
  52624,52815,53007,53198,53390,53582,53774,53966,54158,54351,
  54543,54736,54928,55121,55314,55507,55700,55894,56087,56280,
  56474,56668,56861,57055,57249,57443,57638,57832,58026,58221,
  58416,58610,58805,59000,59195,59391,59586,59781,59977,60172,
  60368,60564,60760,60956,61152,61349,61545,61741,61938,62135,
  62331,62528,62725,62922,63120,63317,63514,63712,63909,64107,
  64305,64503,64701,64899,65097,65295,65494,65692,65891,66090,
  66289,66487,66687,66886,67085,67284,67484,67683,67883,68082,
  68282,68482,68682,68882,69082,69283,69483,69684,69884,70085,
  70286,70486,70687,70888,71090,71291,71492,71694,71895,72097,
  72298,72500,72702,72904,73106,73308,73511,73713,73916,74118,
  74321,74524,74726,74929,75132,75335,75539,75742,75945,76149,
  76352,76556,76760,76964,77167,77371,77576,77780,77984,78188,
  78393,78597,78802,79007,79212,79417,79622,79827,80032,80237,
  80442,80648,80853,81059,81265,81470,81676,81882,82088,82294,
  82501,82707,82913,83120,83326,83533,83740,83946,84153,84360,
  84567,84774,84982,85189,85396,85604,85811,86019,86227,86435,
  86643,86851,87059,87267,87475,87683,87892,88100,88309,88517,
  88726,88935,89144,89353,89562,89771,89980,90190,90399,90608,
  90818,91028,91237,91447,91657,91867,92077,92287,92497,92707,
  92918,93128,93339,93549,93760,93971,94181,94392,94603,94814,
  95026,95237,95448,95659,95871,96082,96294,96506,96717,96929,
  97141,97353,97565,97777,97989,98202,98414,98627,98839,99052,
  99264,99477,99690,99903,100116,100329,100542,100755,100968,101182,
  101395,101609,101822,102036,102250,102464,102677,102891,103105,103319,
  103534,103748,103962,104177,104391,104606,104820,105035,105250,105465,
  105679,105894,106109,106325,106540,106755,106970,107186,107401,107617,
  107832,108048,108264,108480,108696,108912,109128,109344,109560,109776,
  109993,110209,110426,110642,110859,111075,111292,111509,111726,111943,
  112160,112377,112594,112812,113029,113246,113464,113681,113899,114117,
  114334,114552,114770,114988,115206,115424,115642,115861,116079,116297,
  116516,116734,116953,117171,117390,117609,117828,118047,118266,118485,
  118704,118923,119142,119361,119581,119800,120020,120239,120459,120679,
  120899,121118,121338,121558,121778,121998,122219,122439,122659,122880,
  123100,123320,123541,123762,123982,124203,124424,124645,124866,125087,
  125308,125529,125750,125972,126193,126415,126636,126858,127079,127301,
  127523,127744,127966,128188,128410,128632,128854,129077,129299,129521,
  129744,129966,130189,130411,130634,130856,131079,131302,131525,131748,
  131971,132194,132417,132640,132864,133087,133310,133534,133757,133981,
  134205,134428,134652,134876,135100,135324,135548,135772,135996,136220,
  136444,136669,136893,137118,137342,137567,137791,138016,138241,138466,
  138690,138915,139140,139365,139591,139816,140041,140266,140492,140717,
  140943,141168,141394,141619,141845,142071,142297,142523,142748,142975,
  143201,143427,143653,143879,144105,144332,144558,144785,145011,145238,
  145465,145691,145918,146145,146372,146599,146826,147053,147280,147507,
  147735,147962,148189,148417,148644,148872,149099,149327,149555,149782,
  150010,150238,150466,150694,150922,151150,151379,151607,151835,152063,
  152292,152520,152749,152977,153206,153435,153663,153892,154121,154350,
  154579,154808,155037,155266,155496,155725,155954,156183,156413,156642,
  156872,157102,157331,157561,157791,158020,158250,158480,158710,158940,
  159170,159401,159631,159861,160091,160322,160552,160783,161013,161244,
  161474,161705,161936,162167,162398,162629,162860,163091,163322,163553,
  163784,164015,164247,164478,164709,164941,165172,165404,165636,165867,
  166099,166331,166563,166794,167026,167258,167490,167723,167955,168187,
  168419,168652,168884,169116,169349,169581,169814,170047,170279,170512,
  170745,170978,171211,171444,171677,171910,172143,172376,172609,172843,
  173076,173309,173543,173776,174010,174243,174477,174711,174945,175178,
  175412,175646,175880,176114,176348,176582,176816,177051,177285,177519,
  177754,177988,178223,178457,178692,178926,179161,179396,179630,179865,
  180100,180335,180570,180805,181040,181275,181511,181746,181981,182216,
  182452,182687,182923,183158,183394,183630,183865,184101,184337,184573,
  184809,185045,185281,185517,185753,185989,186225,186461,186698,186934,
  187170,187407,187643,187880,188117,188353,188590,188827,189063,189300,
  189537,189774,190011,190248,190485,190722,190960,191197,191434,191671,
  191909,192146,192384,192621,192859,193097,193334,193572,193810,194048,
  194285,194523,194761,194999,195237,195476,195714,195952,196190,196428,
  196667,196905,197144,197382,197621,197859,198098,198337,198575,198814
];
const MAX_LEVEL = 999;

const BADGES = [
  { id:"novice",    level:1,   icon:"🌱", name:"Novice Psychic",     desc:"Begin your journey" },
  { id:"aware",     level:3,   icon:"👁",  name:"Third Eye Awakened", desc:"Level 3 reached" },
  { id:"adept",     level:5,   icon:"🔮", name:"Adept Reader",        desc:"Level 5 reached" },
  { id:"streak5",   streak:5,  icon:"🔥", name:"Hot Streak",          desc:"5 correct in a row" },
  { id:"streak10",  streak:10, icon:"⚡", name:"Lightning Mind",      desc:"10 correct in a row" },
  { id:"master",    level:10,  icon:"🌀", name:"Vortex Master",       desc:"Level 10 reached" },
  { id:"legend",    level:15,  icon:"✨", name:"Astral Legend",       desc:"Level 15 reached" },
  { id:"transcend", level:20,  icon:"🌌", name:"Transcended",         desc:"Max level!" },
  { id:"c100",      total:100, icon:"💯", name:"Centenary",           desc:"100 correct guesses" },
];

function getLevelFromXP(xp) {
  for (let i = MAX_LEVEL; i >= 1; i--) if (xp >= XP_TABLE[i-1]) return i;
  return 1;
}
function xpForLevel(lvl)     { return XP_TABLE[Math.min(lvl-1, MAX_LEVEL-1)]; }
function xpForNextLevel(lvl) { return lvl >= MAX_LEVEL ? XP_TABLE[MAX_LEVEL-1] : XP_TABLE[lvl]; }

function checkPasswordStrength(pw) {
  const checks = [
    { label:"8+ characters",     pass: pw.length >= 8 },
    { label:"Uppercase letter",  pass: /[A-Z]/.test(pw) },
    { label:"Lowercase letter",  pass: /[a-z]/.test(pw) },
    { label:"Number",            pass: /[0-9]/.test(pw) },
    { label:"Special character", pass: /[^A-Za-z0-9]/.test(pw) },
  ];
  const score = checks.filter(c=>c.pass).length;
  return { checks, score, strong: score === 5 };
}

function useAudio() {
  const ctx = useRef(null);
  const ac  = () => {
    if (!ctx.current) ctx.current = new (window.AudioContext||window.webkitAudioContext)();
    if (ctx.current.state === "suspended") ctx.current.resume();
    return ctx.current;
  };
  // Unlock on first user interaction so first-click SFX always plays
  useEffect(()=>{
    const unlock = () => { ac(); window.removeEventListener("pointerdown", unlock); };
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);
  const tone = useCallback((freq, type="sine", dur=0.3, vol=0.3, delay=0) => {
    try {
      const c=ac(), osc=c.createOscillator(), g=c.createGain();
      osc.connect(g); g.connect(c.destination); osc.type=type; osc.frequency.value=freq;
      const t=c.currentTime+delay;
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+0.02); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
      osc.start(t); osc.stop(t+dur+0.05);
    } catch(e) {}
  }, []);
  const playCorrect = useCallback(()=>{ tone(523,"sine",0.15,0.25); tone(659,"sine",0.15,0.25,0.12); tone(784,"sine",0.25,0.25,0.24); },[tone]);
  const playWrong   = useCallback(()=>{ tone(200,"sawtooth",0.3,0.2); tone(160,"sawtooth",0.3,0.15,0.15); },[tone]);
  const playLevelUp = useCallback(()=>{ [523,659,784,1047].forEach((f,i)=>tone(f,"sine",0.35,0.3,i*0.12)); setTimeout(()=>[523,659,784,1047,1319].forEach((f,i)=>tone(f,"triangle",0.4,0.25,i*0.1)),600); },[tone]);
  return { playCorrect, playWrong, playLevelUp };
}

function ParticleBurst({ trigger, correct }) {
  const [ps, setPs] = useState([]);
  const prev = useRef(-1);
  useEffect(()=>{
    if (trigger===prev.current) return; prev.current=trigger;
    const items = Array.from({length:correct?24:8},(_,i)=>({
      id:Date.now()+i, x:50+(Math.random()-.5)*20, y:50+(Math.random()-.5)*20,
      dx:(Math.random()-.5)*160, dy:(Math.random()-.5)*160-60,
      color:correct?`hsl(${Math.random()*60+200},100%,${60+Math.random()*30}%)`:`hsl(${Math.random()*30},80%,50%)`,
      size:4+Math.random()*8,
    }));
    setPs(items); setTimeout(()=>setPs([]),1200);
  },[trigger,correct]);
  return (
    <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
      {ps.map(p=><div key={p.id} style={{position:"absolute",left:`${p.x}%`,top:`${p.y}%`,width:p.size,height:p.size,borderRadius:"50%",background:p.color,animation:"burst 1.1s ease-out forwards","--dx":`${p.dx}px`,"--dy":`${p.dy}px`}}/>)}
    </div>
  );
}

function FloatingXP({ trigger, xpEventRef }) {
  const [on, setOn] = useState(false);
  const snapRef = useRef({ amount:0, streakUsed:0 });
  const prev = useRef(-1);
  useEffect(()=>{
    if (trigger === prev.current) return;
    prev.current = trigger;
    // Read directly from the ref at effect time — guaranteed to be the value set
    // synchronously in handleGuess before any state updates caused re-renders
    snapRef.current = { ...xpEventRef.current };
    setOn(true);
    setTimeout(()=>setOn(false), 1600);
  }, [trigger]);
  if (!on) return null;
  const { amount:a, streakUsed:s } = snapRef.current;
  const isBonus = s > 0;
  const color = isBonus ? "#ffd700" : "#a8edea";
  const shadow = isBonus ? "0 0 20px #ffd700,0 0 50px rgba(255,215,0,0.5)" : "0 0 20px #a8edea,0 0 40px #a8edea";
  return (
    <div style={{position:"absolute",top:"28%",left:"50%",transform:"translateX(-50%)",textAlign:"center",pointerEvents:"none",zIndex:100,animation:"floatUp 1.6s ease-out forwards",whiteSpace:"nowrap"}}>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.7rem",fontWeight:700,color,textShadow:shadow}}>
        +{a} XP{isBonus ? ` ×${s+1}` : ""}
      </div>
      {isBonus && (
        <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.72rem",color:"#ffaa44",letterSpacing:"0.1em",marginTop:"0.1rem",textShadow:"0 0 10px rgba(255,170,68,0.8)"}}>
          STREAK BONUS
        </div>
      )}
    </div>
  );
}


// ── CURSOR SPARKLE TRAIL ──────────────────────────────────────────────────────
function CursorSparkle() {
  const canvasRef = useRef(null);
  const particles = useRef([]);
  const mouse = useRef({x:-999,y:-999});
  const raf = useRef(null);

  useEffect(()=>{
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const resize = ()=>{ canvas.width=window.innerWidth; canvas.height=window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const onMove = e=>{
      const x = e.touches?.[0]?.clientX ?? e.clientX;
      const y = e.touches?.[0]?.clientY ?? e.clientY;
      mouse.current = {x,y};
      for (let i=0;i<3;i++) {
        particles.current.push({
          x: x+(Math.random()-0.5)*12,
          y: y+(Math.random()-0.5)*12,
          vx:(Math.random()-0.5)*1.5,
          vy:(Math.random()-0.5)*1.5 - 0.8,
          life:1, size:2+Math.random()*3,
          hue: 180+Math.random()*60,
        });
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, {passive:true});

    const draw = ()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      particles.current = particles.current.filter(p=>p.life>0);
      particles.current.forEach(p=>{
        ctx.save();
        ctx.globalAlpha = p.life * 0.8;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `hsl(${p.hue},100%,70%)`;
        ctx.fillStyle = `hsl(${p.hue},100%,75%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
        p.x += p.vx; p.y += p.vy;
        p.vy -= 0.04;
        p.life -= 0.035;
        p.size *= 0.97;
      });
      raf.current = requestAnimationFrame(draw);
    };
    draw();
    return ()=>{
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      cancelAnimationFrame(raf.current);
    };
  },[]);

  return <canvas ref={canvasRef} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999}}/>;
}

// ── AMBIENT FLOATING ORBS ─────────────────────────────────────────────────────
function AmbientOrbs() {
  const canvasRef = useRef(null);
  const raf = useRef(null);
  useEffect(()=>{
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const resize = ()=>{ canvas.width=window.innerWidth; canvas.height=window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const orbs = Array.from({length:18},()=>({
      x: Math.random()*window.innerWidth,
      y: window.innerHeight + Math.random()*window.innerHeight,
      r: 2+Math.random()*4,
      speed: 0.2+Math.random()*0.5,
      drift: (Math.random()-0.5)*0.3,
      hue: 180+Math.random()*80,
      pulse: Math.random()*Math.PI*2,
      opacity: 0.2+Math.random()*0.4,
    }));

    const draw = ()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      orbs.forEach(o=>{
        o.y -= o.speed;
        o.x += o.drift;
        o.pulse += 0.02;
        const glow = o.r * (1.5 + 0.5*Math.sin(o.pulse));
        if (o.y < -20) { o.y = canvas.height+20; o.x=Math.random()*canvas.width; }

        const g = ctx.createRadialGradient(o.x,o.y,0,o.x,o.y,glow*3);
        g.addColorStop(0,`hsla(${o.hue},100%,80%,${o.opacity})`);
        g.addColorStop(1,`hsla(${o.hue},100%,60%,0)`);
        ctx.beginPath();
        ctx.arc(o.x,o.y,glow*3,0,Math.PI*2);
        ctx.fillStyle = g;
        ctx.fill();
      });
      raf.current = requestAnimationFrame(draw);
    };
    draw();
    return ()=>{ window.removeEventListener("resize",resize); cancelAnimationFrame(raf.current); };
  },[]);
  return <canvas ref={canvasRef} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:1}}/>;
}

// ── ENERGY WISPS ──────────────────────────────────────────────────────────────
function EnergyWisps() {
  const canvasRef = useRef(null);
  const raf = useRef(null);
  useEffect(()=>{
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const resize = ()=>{ canvas.width=window.innerWidth; canvas.height=window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const wisps = Array.from({length:5},(_,i)=>({
      x: Math.random()*window.innerWidth,
      y: Math.random()*window.innerHeight,
      angle: Math.random()*Math.PI*2,
      speed: 0.15+Math.random()*0.25,
      len: 80+Math.random()*120,
      hue: 200+Math.random()*60,
      opacity: 0.04+Math.random()*0.08,
      turnSpeed: (Math.random()-0.5)*0.015,
      width: 8+Math.random()*16,
    }));

    const draw = ()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      wisps.forEach(w=>{
        w.angle += w.turnSpeed;
        w.x += Math.cos(w.angle)*w.speed;
        w.y += Math.sin(w.angle)*w.speed;
        if (w.x<-200) w.x=canvas.width+200;
        if (w.x>canvas.width+200) w.x=-200;
        if (w.y<-200) w.y=canvas.height+200;
        if (w.y>canvas.height+200) w.y=-200;

        const tx = w.x + Math.cos(w.angle)*w.len;
        const ty = w.y + Math.sin(w.angle)*w.len;
        const g = ctx.createLinearGradient(w.x,w.y,tx,ty);
        g.addColorStop(0,`hsla(${w.hue},100%,70%,0)`);
        g.addColorStop(0.5,`hsla(${w.hue},100%,70%,${w.opacity})`);
        g.addColorStop(1,`hsla(${w.hue},100%,70%,0)`);
        ctx.beginPath();
        ctx.moveTo(w.x,w.y);
        ctx.lineTo(tx,ty);
        ctx.strokeStyle = g;
        ctx.lineWidth = w.width;
        ctx.lineCap = "round";
        ctx.stroke();
      });
      raf.current = requestAnimationFrame(draw);
    };
    draw();
    return ()=>{ window.removeEventListener("resize",resize); cancelAnimationFrame(raf.current); };
  },[]);
  return <canvas ref={canvasRef} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:1}}/>;
}

// ── RUNE CIRCLE ───────────────────────────────────────────────────────────────
function RuneCircle() {
  const canvasRef = useRef(null);
  const raf = useRef(null);
  const angle = useRef(0);
  useEffect(()=>{
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = 260; canvas.height = 260;
    const cx=130, cy=130;

    const runes = ["ᚠ","ᚢ","ᚦ","ᚨ","ᚱ","ᚲ","ᚷ","ᚹ","ᚺ","ᚾ","ᛁ","ᛃ"];

    const draw = ()=>{
      ctx.clearRect(0,0,260,260);
      angle.current += 0.004;
      const a = angle.current;

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx,cy,115,0,Math.PI*2);
      ctx.strokeStyle="rgba(100,180,255,0.12)";
      ctx.lineWidth=1; ctx.stroke();

      // Inner ring
      ctx.beginPath();
      ctx.arc(cx,cy,88,0,Math.PI*2);
      ctx.strokeStyle="rgba(100,180,255,0.08)";
      ctx.lineWidth=1; ctx.stroke();

      // Rotating spoke lines
      for(let i=0;i<6;i++){
        const sa=a+i*Math.PI/3;
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(sa)*40, cy+Math.sin(sa)*40);
        ctx.lineTo(cx+Math.cos(sa)*115, cy+Math.sin(sa)*115);
        ctx.strokeStyle="rgba(100,200,255,0.07)";
        ctx.lineWidth=1; ctx.stroke();
      }

      // Counter-rotating rune text
      ctx.font="11px serif";
      ctx.fillStyle="rgba(150,210,255,0.35)";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      runes.forEach((r,i)=>{
        const ra = -a*0.7 + (i/runes.length)*Math.PI*2;
        const rx = cx+Math.cos(ra)*100;
        const ry = cy+Math.sin(ra)*100;
        ctx.save();
        ctx.translate(rx,ry);
        ctx.rotate(ra+Math.PI/2);
        ctx.fillText(r,0,0);
        ctx.restore();
      });

      // Pulsing center dot
      const pulse = 0.4+0.3*Math.sin(a*3);
      const g = ctx.createRadialGradient(cx,cy,0,cx,cy,30);
      g.addColorStop(0,`rgba(100,200,255,${pulse*0.25})`);
      g.addColorStop(1,"rgba(100,200,255,0)");
      ctx.beginPath(); ctx.arc(cx,cy,30,0,Math.PI*2);
      ctx.fillStyle=g; ctx.fill();

      raf.current = requestAnimationFrame(draw);
    };
    draw();
    return ()=>cancelAnimationFrame(raf.current);
  },[]);
  return <canvas ref={canvasRef} style={{position:"absolute",left:"50%",transform:"translateX(-50%)",bottom:-20,pointerEvents:"none",zIndex:0,opacity:0.7}}/>;
}

// ── NOVA SPELL EFFECT (canvas, card-centered, EQ-style) ──────────────────────
function NovaSpell({ fire }) {
  const canvasRef = useRef(null);
  const raf = useRef(null);
  const particles = useRef([]);
  const rings = useRef([]);
  const prev = useRef(0);

  useEffect(()=>{
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const resize = ()=>{ canvas.width=window.innerWidth; canvas.height=window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const animate = ()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);

      // Draw rings
      rings.current = rings.current.filter(r=>r.life>0);
      rings.current.forEach(r=>{
        ctx.save();
        ctx.globalAlpha = r.life * 0.9;
        ctx.strokeStyle = `hsl(${r.hue},100%,${70+r.life*20}%)`;
        ctx.shadowBlur = 20 * r.life;
        ctx.shadowColor = `hsl(${r.hue},100%,70%)`;
        ctx.lineWidth = 2 * r.life;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI*2);
        ctx.stroke();
        ctx.restore();
        r.radius += r.speed;
        r.life -= 0.018;
      });

      // Draw particles
      particles.current = particles.current.filter(p=>p.life>0);
      particles.current.forEach(p=>{
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.shadowBlur = 12;
        ctx.shadowColor = `hsl(${p.hue},100%,70%)`;
        ctx.fillStyle = `hsl(${p.hue},100%,${65+p.life*25}%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI*2);
        ctx.fill();
        // Star sparkle cross
        if (p.size > 3) {
          ctx.strokeStyle = `hsl(${p.hue},100%,90%)`;
          ctx.lineWidth = 0.5;
          ctx.globalAlpha = p.life * 0.6;
          ctx.beginPath();
          ctx.moveTo(p.x - p.size*2, p.y); ctx.lineTo(p.x + p.size*2, p.y);
          ctx.moveTo(p.x, p.y - p.size*2); ctx.lineTo(p.x, p.y + p.size*2);
          ctx.stroke();
        }
        ctx.restore();
        p.x += p.vx; p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.98;
        p.life -= p.decay;
        p.hue += 0.5;
      });

      raf.current = requestAnimationFrame(animate);
    };
    animate();

    return ()=>{ window.removeEventListener("resize",resize); cancelAnimationFrame(raf.current); };
  },[]);

  useEffect(()=>{
    if (!fire) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Origin is baked into the fire object
    const cx = fire.x ?? canvas.width/2;
    const cy = fire.y ?? canvas.height/2;

    // Spawn expanding rings at different speeds/hues
    const ringDefs = [
      {hue:180, speed:6},
      {hue:200, speed:4},
      {hue:160, speed:9},
      {hue:220, speed:3},
      {hue:140, speed:12},
    ];
    ringDefs.forEach((rd,i)=>{
      setTimeout(()=>{
        rings.current.push({ x:cx, y:cy, radius:10, speed:rd.speed, hue:rd.hue, life:1 });
      }, i*60);
    });

    // Burst 1: radial spray — 80 particles flying outward
    for (let i=0; i<80; i++) {
      const angle = (i/80)*Math.PI*2 + Math.random()*0.2;
      const speed = 2+Math.random()*8;
      const hue = 160+Math.random()*80;
      particles.current.push({
        x:cx, y:cy,
        vx:Math.cos(angle)*speed,
        vy:Math.sin(angle)*speed,
        size:1.5+Math.random()*4,
        life:1, decay:0.012+Math.random()*0.015,
        gravity:0.04, hue,
      });
    }

    // Burst 2: upward fountain arc — 60 particles
    for (let i=0; i<60; i++) {
      const angle = -Math.PI/2 + (Math.random()-0.5)*Math.PI*1.4;
      const speed = 3+Math.random()*10;
      const hue = 180+Math.random()*60;
      particles.current.push({
        x:cx, y:cy,
        vx:Math.cos(angle)*speed*0.7,
        vy:Math.sin(angle)*speed,
        size:2+Math.random()*5,
        life:1, decay:0.008+Math.random()*0.01,
        gravity:0.12, hue,
      });
    }

    // Burst 3: spinning star sparks — 40 large bright ones
    for (let i=0; i<40; i++) {
      const angle = Math.random()*Math.PI*2;
      const speed = 1+Math.random()*5;
      particles.current.push({
        x:cx+(Math.random()-0.5)*30,
        y:cy+(Math.random()-0.5)*30,
        vx:Math.cos(angle)*speed,
        vy:Math.sin(angle)*speed - 1,
        size:3+Math.random()*6,
        life:1, decay:0.006+Math.random()*0.008,
        gravity:0.02, hue:140+Math.random()*100,
      });
    }

    // Burst 4: delayed second wave at 200ms
    setTimeout(()=>{
      for (let i=0; i<50; i++) {
        const angle = Math.random()*Math.PI*2;
        const speed = 4+Math.random()*9;
        particles.current.push({
          x:cx, y:cy,
          vx:Math.cos(angle)*speed,
          vy:Math.sin(angle)*speed,
          size:1+Math.random()*3,
          life:0.9, decay:0.014+Math.random()*0.01,
          gravity:0.05, hue:160+Math.random()*80,
        });
      }
    }, 200);

  },[fire]);

  return <canvas ref={canvasRef} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:100}}/>;
}

// ── LEVEL UP PILLAR ───────────────────────────────────────────────────────────
function LevelUpPillar({ active }) {
  if (!active) return null;
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:49,display:"flex",justifyContent:"center"}}>
      <div style={{width:120,height:"100%",background:"linear-gradient(180deg,rgba(255,215,0,0) 0%,rgba(255,215,0,0.15) 40%,rgba(255,215,0,0.35) 60%,rgba(255,215,0,0.15) 80%,rgba(255,215,0,0) 100%)",animation:"pillarBeam 3s ease forwards",filter:"blur(8px)"}}/>
      <div style={{position:"absolute",width:4,height:"100%",background:"linear-gradient(180deg,transparent,rgba(255,215,0,0.6),rgba(255,255,255,0.9),rgba(255,215,0,0.6),transparent)",animation:"pillarBeam 3s ease forwards",filter:"blur(2px)"}}/>
    </div>
  );
}

// ── STREAK METER ─────────────────────────────────────────────────────────────
function StreakMeter({ streak }) {
  const MAX_PIPS = 10;
  const filled = Math.min(streak, MAX_PIPS);
  const overflow = Math.max(0, streak - MAX_PIPS);
  const intensity = Math.min(streak / MAX_PIPS, 1);
  const hue = 30 + intensity * 20; // orange to yellow-orange

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.3rem",margin:"0.4rem 0 0.6rem",minHeight:44}}>
      <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
        {Array.from({length:MAX_PIPS},(_,i)=>(
          <div key={i} style={{
            width:18, height:8, borderRadius:4,
            background: i < filled
              ? `linear-gradient(90deg,hsl(${hue},100%,50%),hsl(${hue+20},100%,65%))`
              : "rgba(255,255,255,0.08)",
            boxShadow: i < filled ? `0 0 ${4+intensity*8}px hsla(${hue},100%,60%,0.8)` : "none",
            transition:"all 0.3s",
          }}/>
        ))}
        {overflow > 0 && (
          <span style={{fontFamily:"'Cinzel',serif",fontSize:"0.7rem",color:"#ff9900",marginLeft:4}}>+{overflow}</span>
        )}
      </div>
      {streak > 1 && (
        <div style={{fontSize:"0.7rem",fontFamily:"'Cinzel',serif",color:`hsl(${hue},100%,65%)`,
          textShadow:`0 0 8px hsla(${hue},100%,60%,0.6)`,letterSpacing:"0.08em"}}>
          {streak >= 10 ? "🔥 INFERNO" : streak >= 5 ? "⚡ HOT STREAK" : "✦ STREAK"}{streak > 1 ? ` X${streak}` : ""} XP
        </div>
      )}
    </div>
  );
}

function SymbolSVG({ sym, flash, size=100 }) {
  const stroke = flash==="correct"?"#00ffcc":"#7eb8f7";
  const fill   = flash==="correct"?"rgba(0,255,204,0.2)":"rgba(126,184,247,0.15)";
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      {sym.id==="circle" ? <circle cx={sym.cx} cy={sym.cy} r={sym.r} fill={fill} stroke={stroke} strokeWidth="3"/>
      : sym.id==="waves" ? <path d={sym.path} fill="none" stroke={stroke} strokeWidth="8" strokeLinecap="round"/>
      : <path d={sym.path} fill={fill} stroke={stroke} strokeWidth="3"/>}
    </svg>
  );
}

function ZenerCard({ symbol, faceDown, flash }) {
  return (
    <div style={{width:160,height:220,borderRadius:18,
      background:faceDown?"linear-gradient(135deg,#0d1b3e,#1a2a5e,#0d1b3e)":"linear-gradient(135deg,#0a0f1e,#111a35)",
      border:`2px solid ${flash==="correct"?"#00ffcc":flash==="wrong"?"#ff4455":"#2a3f7a"}`,
      boxShadow:flash==="correct"?"0 0 40px #00ffcc,0 0 80px rgba(0,255,204,0.4)":flash==="wrong"?"0 0 30px #ff4455":"0 8px 32px rgba(0,0,0,0.6)",
      display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.3s",position:"relative",overflow:"hidden",flexShrink:0,animation:faceDown&&!flash?"cardAura 3s ease-in-out infinite":undefined}}>
      {faceDown
        ? <div style={{width:120,height:180,borderRadius:10,background:"repeating-linear-gradient(45deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 2px,transparent 2px,transparent 10px)",border:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:"2.5rem",opacity:0.3}}>🌀</span></div>
        : <SymbolSVG sym={symbol} flash={flash}/>}
    </div>
  );
}

function LeaderboardRows({ rows, currentUsername, mode }) {
  const myIdx = rows.findIndex(r=>r.username===currentUsername);
  const myRank = myIdx + 1;
  const isXP = mode === "xp";
  return (
    <>
      {rows.map((r,i)=>(
        <div key={r.username} style={{display:"flex",alignItems:"center",gap:"1rem",padding:"0.8rem 1rem",marginBottom:"0.5rem",borderRadius:12,
          background:r.username===currentUsername?"linear-gradient(90deg,rgba(168,237,234,0.12),rgba(168,237,234,0.05))":i<3?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.02)",
          border:r.username===currentUsername?"1px solid rgba(168,237,234,0.3)":"1px solid transparent"}}>
          <div style={{width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
            background:i===0?"linear-gradient(135deg,#ffd700,#ffaa00)":i===1?"linear-gradient(135deg,#c0c0c0,#909090)":i===2?"linear-gradient(135deg,#cd7f32,#8b4513)":"rgba(255,255,255,0.1)",
            fontSize:"0.85rem",fontWeight:700,color:i<3?"#000":"#6a8ab0",fontFamily:"'Cinzel',serif"}}>
            {i<3?["🥇","🥈","🥉"][i]:i+1}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:"#c8d8f0",fontFamily:"'Cinzel',serif",fontSize:"0.95rem",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
              {r.username}{r.username===currentUsername?" (you)":""}
            </div>
            <div style={{color:"#c0d8f0",fontSize:"0.78rem"}}>
              {isXP ? `Lv.${getLevelFromXP(r.xp)} · ${r.total_correct} correct` : `Lv.${getLevelFromXP(r.xp)} · ${(r.xp||0).toLocaleString()} XP`}
            </div>
          </div>
          <div style={{color:isXP?"#a8edea":"#ffcc44",fontFamily:"'Cinzel',serif",fontSize:"1rem",fontWeight:700,flexShrink:0}}>
            {isXP ? `${(r.xp||0).toLocaleString()} XP` : `🔥 ${r.best_streak||0}`}
          </div>
        </div>
      ))}
      {myRank>0&&<div style={{textAlign:"center",color:"#c0d8f0",marginTop:"1rem",fontSize:"0.88rem"}}>Your rank: #{myRank}</div>}
    </>
  );
}

function Leaderboard({ currentUsername, onClose }) {
  const [tab, setTab]           = useState("xp");
  const [xpRows, setXpRows]     = useState([]);
  const [strRows, setStrRows]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState("");

  useEffect(()=>{
    (async()=>{
      try {
        const [xp, str] = await Promise.all([
          sb.select("leaderboard","order=xp.desc&limit=10"),
          sb.select("leaderboard","order=best_streak.desc&limit=10"),
        ]);
        setXpRows(xp||[]);
        setStrRows(str||[]);
      } catch(e) { setErr("Could not load leaderboard."); }
      setLoading(false);
    })();
  },[]);

  const tabs = [
    { id:"xp",     label:"⚡ XP",          title:"Hall of Psychics",   subtitle:"Top XP earners" },
    { id:"streak", label:"🔥 Best Streak",  title:"Streak Masters",     subtitle:"Longest streaks" },
  ];
  const active = tabs.find(t=>t.id===tab);
  const rows = tab==="xp" ? xpRows : strRows;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"}} onClick={onClose}>
      <div style={{background:"linear-gradient(160deg,#070d1f,#0f1e40)",border:"1px solid #2a4a8a",borderRadius:24,padding:"2rem",width:"min(560px,95vw)",maxHeight:"85vh",overflowY:"auto",boxShadow:"0 0 60px rgba(100,150,255,0.3)"}} onClick={e=>e.stopPropagation()}>

        <div style={{textAlign:"center",marginBottom:"1.2rem"}}>
          <div style={{fontSize:"2rem"}}>{tab==="xp"?"🏆":"🔥"}</div>
          <h2 style={{fontFamily:"'Cinzel',serif",color:"#a8edea",fontSize:"1.5rem",margin:"0.3rem 0"}}>{active.title}</h2>
          <p style={{color:"#c0d8f0",fontSize:"0.85rem",margin:0}}>{active.subtitle}</p>
        </div>

        <div style={{display:"flex",borderRadius:10,overflow:"hidden",border:"1px solid #1a3a6a",marginBottom:"1.4rem"}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"0.6rem",border:"none",cursor:"pointer",
              fontFamily:"'Cinzel',serif",fontSize:"0.8rem",fontWeight:600,letterSpacing:"0.06em",transition:"all 0.2s",
              background:tab===t.id?"linear-gradient(135deg,#1a3a7a,#2a6aaa)":"transparent",
              color:tab===t.id?"#a8edea":"#6a9aba"}}>
              {t.label}
            </button>
          ))}
        </div>

        {loading&&<div style={{textAlign:"center",color:"#c0d8f0",padding:"2rem"}}>Reading the astral plane...</div>}
        {err    &&<div style={{textAlign:"center",color:"#ff6677",padding:"1rem"}}>{err}</div>}
        {!loading&&!err&&rows.length===0&&<div style={{textAlign:"center",color:"#c0d8f0",padding:"2rem"}}>No psychics yet. Be the first!</div>}
        {!loading&&!err&&<LeaderboardRows rows={rows} currentUsername={currentUsername} mode={tab}/>}

        <button onClick={onClose} style={{display:"block",margin:"1.5rem auto 0",padding:"0.6rem 2rem",background:"linear-gradient(135deg,#1a3a6a,#2a5a9a)",border:"1px solid #3a6aaa",borderRadius:10,color:"#a8edea",fontFamily:"'Cinzel',serif",cursor:"pointer",fontSize:"0.9rem"}}>Close</button>
      </div>
    </div>
  );
}


const DECK_PACKAGES = [
  { id:"deck1",  label:"1 Deck",   decks:1,  price:"$5",   priceNote:"$5.00",  highlight:false },
  { id:"deck5",  label:"5 Decks",  decks:5,  price:"$20",  priceNote:"$4.00 each", highlight:false },
  { id:"deck50", label:"50 Decks", decks:50, price:"$100", priceNote:"$2.00 each", highlight:true  },
];

function DeckCountdown({ userId }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [purchaseMsg, setPurchaseMsg] = useState("");

  useEffect(()=>{
    function calc() {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24,0,0,0);
      const diff = midnight - now;
      const h = Math.floor(diff/3600000);
      const m = Math.floor((diff%3600000)/60000);
      const s = Math.floor((diff%60000)/1000);
      setTimeLeft(String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0"));
    }
    calc();
    const id = setInterval(calc,1000);
    return ()=>clearInterval(id);
  },[]);

  async function handlePurchase(pkg) {
    setPurchaseMsg("Redirecting to checkout...");
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id, userId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPurchaseMsg("Something went wrong. Please try again.");
        setTimeout(()=>setPurchaseMsg(""), 3000);
      }
    } catch(e) {
      setPurchaseMsg("Something went wrong. Please try again.");
      setTimeout(()=>setPurchaseMsg(""), 3000);
    }
  }

  return (
    <div style={{position:"absolute",inset:0,borderRadius:24,background:"rgba(3,8,16,0.93)",backdropFilter:"blur(6px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"1rem",zIndex:10,padding:"1.5rem",overflowY:"auto"}}>
      <div style={{fontSize:"2.5rem"}}>&#128274;</div>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.2rem",fontWeight:700,color:"#a8edea",textAlign:"center",letterSpacing:"0.08em"}}>DECK EXHAUSTED</div>
      <div style={{color:"#c0d8f0",fontSize:"0.85rem",textAlign:"center",maxWidth:260,lineHeight:1.6}}>
        You have used up all of your cards. Your next deck arrives at midnight.
      </div>

      <div style={{background:"rgba(168,237,234,0.06)",border:"1px solid rgba(168,237,234,0.2)",borderRadius:14,padding:"0.8rem 1.8rem",textAlign:"center"}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.7rem",color:"#ffffff",letterSpacing:"0.12em",marginBottom:"0.4rem"}}>NEW DECK IN</div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:"2rem",fontWeight:700,color:"#a8edea",letterSpacing:"0.1em",textShadow:"0 0 20px rgba(168,237,234,0.5)"}}>{timeLeft}</div>
      </div>

      <div style={{width:"100%",maxWidth:320,borderTop:"1px solid rgba(168,237,234,0.12)",paddingTop:"1rem"}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.75rem",color:"#a8edea",letterSpacing:"0.12em",textAlign:"center",marginBottom:"0.8rem"}}>— OR PURCHASE MORE DECKS —</div>
        <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
          {DECK_PACKAGES.map(pkg=>(
            <button key={pkg.id} onClick={()=>handlePurchase(pkg)} style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"0.75rem 1rem",borderRadius:12,cursor:"pointer",
              background:pkg.highlight?"linear-gradient(135deg,#1a3a7a,#2a6aaa)":"rgba(255,255,255,0.04)",
              border:pkg.highlight?"1px solid #4a8aCC":"1px solid rgba(255,255,255,0.1)",
              boxShadow:pkg.highlight?"0 0 20px rgba(74,138,204,0.3)":"none",
              transition:"all 0.2s",position:"relative"
            }}>
              {pkg.highlight&&<div style={{position:"absolute",top:-9,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(90deg,#1a6aaa,#4aaaee)",borderRadius:6,padding:"0.15rem 0.6rem",fontFamily:"'Cinzel',serif",fontSize:"0.6rem",color:"#fff",letterSpacing:"0.08em",whiteSpace:"nowrap"}}>BEST VALUE</div>}
              <div style={{textAlign:"left"}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.85rem",fontWeight:700,color:"#c8d8f0"}}>{pkg.label}</div>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.65rem",color:"#6a9aba",marginTop:"0.1rem"}}>{pkg.priceNote}</div>
              </div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:"1rem",fontWeight:700,color:pkg.highlight?"#a8edea":"#7eb8f7"}}>{pkg.price}</div>
            </button>
          ))}
        </div>
        {purchaseMsg&&<div style={{marginTop:"0.8rem",textAlign:"center",fontFamily:"'Cinzel',serif",fontSize:"0.75rem",color:"#ffaa44",animation:"fadeIn 0.3s ease"}}>{purchaseMsg}</div>}
      </div>
    </div>
  );
}

function AuthScreen({ onEnter }) {
  const [mode, setMode]     = useState("login");
  const [f, setF]           = useState({ identifier:"", email:"", password:"", confirm:"" });
  const [error, setError]   = useState("");
  const [info, setInfo]     = useState("");
  const [loading, setLoad]  = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);

  const upd = (k,v) => { setF(p=>({...p,[k]:v})); setError(""); setInfo(""); };
  const pw  = checkPasswordStrength(f.password);
  const SC  = ["#ff4455","#ff7744","#ffaa00","#88cc44","#00ffcc"][pw.score-1]||"#2a4a6a";
  const SL  = ["","Weak","Fair","Good","Strong","Very Strong"][pw.score]||"";

  async function register() {
    const username = f.identifier.trim();
    if (username.length < 2)                   return setError("Username must be at least 2 characters.");
    if (username.length > 20)                  return setError("Username must be 20 characters or fewer.");
    if (!/^[a-zA-Z0-9 _-]+$/.test(username))  return setError("Username: letters, numbers, spaces, _ and - only.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setError("Please enter a valid email address.");
    if (!pw.strong)                            return setError("Password must meet all 5 requirements.");
    if (f.password !== f.confirm)              return setError("Passwords do not match.");

    setLoad(true); setError("");
    try {
      // Check username taken
      const existing = await sb.select("players", `username=eq.${encodeURIComponent(username)}&select=id`, true);
      if (existing) { setLoad(false); return setError("That username is already taken."); }

      // Create auth account (Supabase hashes password with bcrypt server-side)
      const authData = await sb.signUp(f.email.trim().toLowerCase(), f.password, username);
      const uid = authData.user?.id || authData.id;
      if (!uid) {
        setLoad(false);
        setInfo("Account created! Please check your email and click the confirmation link to begin playing.");
        switchMode("login", true);
        return;
      }

      // Player + stats rows are created automatically by the DB trigger on signup
      // If we have a session already (email confirm disabled), go straight in
      if (authData.access_token) {
        onEnter({ userId:uid, username, xp:0, totalCorrect:0, badges:[], bestStreak:0, isAdmin:false, dailyCount:0, bonusDecks:0 });
      } else {
        setInfo("Account created! Please check your email and click the confirmation link to begin playing.");
        switchMode("login", true);
      }
    } catch(e) {
      setError(e.message || "Registration failed. Please try again.");
    }
    setLoad(false);
  }

  async function login() {
    const identifier = f.identifier.trim();
    if (!identifier)  return setError("Please enter your psychic name or email.");
    if (!f.password)  return setError("Please enter your password.");

    setLoad(true); setError("");
    try {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
      let loginEmail = identifier.toLowerCase();

      // If identifier is a username, look up the associated email
      if (!isEmail) {
        const player = await sb.select("players", `username=eq.${encodeURIComponent(identifier)}&select=email`, true);
        if (!player || !player.email) { setLoad(false); return setError("No account found with that psychic name."); }
        loginEmail = player.email;
      }

      const authData = await sb.signIn(loginEmail, f.password);
      const uid = authData.user?.id;
      const player = await sb.select("players", `id=eq.${uid}&select=username`, true);
      const stats  = await sb.select("player_stats", `player_id=eq.${uid}&select=xp,total_correct,badges,best_streak,bonus_decks`, true);
      const adminRow = await sb.select("players", `id=eq.${uid}&select=is_admin`, true);
      const today = (()=>{ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); })();
      const dg = await sb.select("daily_guesses", `player_id=eq.${uid}&guess_date=eq.${today}`, true);
      const dc = dg?.guess_count || 0;
      onEnter({ userId:uid, username:player.username, xp:stats?.xp||0, totalCorrect:stats?.total_correct||0, badges:stats?.badges||[], bestStreak:stats?.best_streak||0, isAdmin:adminRow?.is_admin||false, dailyCount:dc, bonusDecks:stats?.bonus_decks||0 });
    } catch(e) {
      setError(e.message || "Incorrect credentials. Please try again.");
    }
    setLoad(false);
  }

  function switchMode(m, keepInfo=false) { setMode(m); setError(""); if (!keepInfo) setInfo(""); setF({identifier:"",email:"",password:"",confirm:""}); }

  const inp = { width:"100%", padding:"0.85rem 1rem", borderRadius:10, background:"rgba(255,255,255,0.05)", border:"1px solid #2a4a8a", color:"#c8d8f0", fontSize:"0.95rem", fontFamily:"'Crimson Text',serif", outline:"none", marginBottom:"0.8rem", transition:"border-color 0.2s" };
  const lbl = { display:"block", color:"#6a9aca", fontSize:"0.75rem", marginBottom:"0.3rem", fontFamily:"'Cinzel',serif", letterSpacing:"0.06em" };
  const stars = useRef(Array.from({length:100},(_,i)=>({ id:i, x:Math.random()*100, y:Math.random()*100, size:Math.random()*2+0.5, delay:Math.random()*4, dur:2+Math.random()*3 }))).current;

  return (
    <div style={{minHeight:"100vh",background:"#030810",fontFamily:"'Crimson Text',serif",color:"#c8d8f0",display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem",position:"relative",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        @keyframes twinkle{0%,100%{opacity:0.2;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}
        @keyframes orb{0%{transform:translateY(0)}50%{transform:translateY(-10px)}100%{transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes authPulse{0%,100%{box-shadow:0 0 20px rgba(168,237,234,0.15)}50%{box-shadow:0 0 50px rgba(168,237,234,0.4)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box} input::placeholder{color:#3a5a7a}
        input:focus{border-color:#4a8aca !important;box-shadow:0 0 0 2px rgba(74,138,202,0.2)}
      `}</style>
      {stars.map(s=><div key={s.id} style={{position:"fixed",left:`${s.x}%`,top:`${s.y}%`,width:s.size,height:s.size,borderRadius:"50%",background:"#fff",opacity:0.35,animation:`twinkle ${s.dur}s ${s.delay}s infinite`,pointerEvents:"none"}}/>)}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",background:"radial-gradient(ellipse at 20% 20%,rgba(80,40,180,0.15),transparent 60%),radial-gradient(ellipse at 80% 80%,rgba(0,100,200,0.12),transparent 60%)"}}/>

      <div style={{background:"linear-gradient(160deg,rgba(7,16,34,0.95),rgba(15,30,64,0.95))",backdropFilter:"blur(20px)",border:"1px solid #1a3a6a",borderRadius:24,padding:"2.5rem 2rem",width:"min(460px,100%)",animation:"authPulse 4s ease-in-out infinite",position:"relative",zIndex:1,maxHeight:"95vh",overflowY:"auto"}}>

        <div style={{textAlign:"center",marginBottom:"1.8rem"}}>
          <div style={{fontSize:"3.5rem",animation:"orb 3s ease-in-out infinite"}}>🔮</div>
          <h1 style={{fontFamily:"'Cinzel',serif",fontSize:"1.8rem",fontWeight:900,background:"linear-gradient(90deg,#a8edea,#7eb8f7,#a8edea)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 3s linear infinite",margin:"0.4rem 0 0.2rem"}}>PSYCHIC REALM</h1>
          <p style={{color:"#4a7aaa",fontSize:"0.85rem",margin:0,fontStyle:"italic"}}>An MMORPG of the Mind</p>
        </div>

        <div style={{display:"flex",borderRadius:10,overflow:"hidden",border:"1px solid #1a3a6a",marginBottom:"1.8rem"}}>
          {["login","register"].map(m=>(
            <button key={m} onClick={()=>switchMode(m)} style={{flex:1,padding:"0.65rem",border:"none",cursor:"pointer",fontFamily:"'Cinzel',serif",fontSize:"0.8rem",fontWeight:600,letterSpacing:"0.08em",transition:"all 0.2s",background:mode===m?"linear-gradient(135deg,#1a3a7a,#2a6aaa)":"transparent",color:mode===m?"#a8edea":"#4a6a8a"}}>
              {m==="login"?"SIGN IN":"REGISTER"}
            </button>
          ))}
        </div>

        <div key={mode} style={{animation:"fadeIn 0.2s ease"}}>
          {info  &&<div style={{background:"rgba(0,200,120,0.1)",border:"1px solid rgba(0,200,120,0.35)",borderRadius:8,padding:"0.65rem 0.9rem",marginBottom:"0.9rem",color:"#44ddaa",fontSize:"0.83rem"}}>{info}</div>}
          {error &&<div style={{background:"rgba(255,68,85,0.1)",border:"1px solid rgba(255,68,85,0.4)",borderRadius:8,padding:"0.6rem 0.9rem",marginBottom:"0.9rem",color:"#ff8899",fontSize:"0.83rem"}}>&#9888; {error}</div>}

          {mode==="login" ? <>
            <label style={lbl}>PSYCHIC NAME OR EMAIL</label>
            <input value={f.identifier} onChange={e=>upd("identifier",e.target.value)}
              placeholder="Your psychic name or email address" style={inp} autoComplete="username"/>
          </> : <>
            <label style={lbl}>PSYCHIC NAME</label>
            <input value={f.identifier} onChange={e=>upd("identifier",e.target.value)} maxLength={20}
              placeholder="Choose a unique name (2-20 chars)" style={inp}/>
            <label style={lbl}>EMAIL ADDRESS</label>
            <input type="email" value={f.email} onChange={e=>upd("email",e.target.value)} placeholder="your@email.com" style={inp}/>
            <div style={{fontSize:"0.72rem",color:"#6a9aba",marginTop:"-0.4rem",marginBottom:"0.8rem",fontFamily:"'Cinzel',serif",letterSpacing:"0.04em"}}>📧 A confirmation link will be sent to this address before you can play.</div>
          </>}

          <label style={lbl}>PASSWORD</label>
          <div style={{position:"relative",marginBottom:"0.8rem"}}>
            <input type={showPw?"text":"password"} value={f.password} onChange={e=>upd("password",e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&mode==="login"&&login()}
              placeholder={mode==="register"?"Create a strong password":"Your password"}
              style={{...inp,marginBottom:0,paddingRight:"2.8rem"}}/>
            <button onClick={()=>setShowPw(p=>!p)} style={{position:"absolute",right:"0.8rem",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#4a7aaa",cursor:"pointer",fontSize:"1.1rem",padding:0}}>{showPw?"🙈":"👁"}</button>
          </div>

          {mode==="register"&&f.password.length>0&&(
            <div style={{marginBottom:"0.9rem"}}>
              <div style={{display:"flex",gap:4,marginBottom:"0.35rem"}}>
                {[1,2,3,4,5].map(i=><div key={i} style={{flex:1,height:4,borderRadius:2,transition:"all 0.3s",background:i<=pw.score?SC:"rgba(255,255,255,0.08)"}}/>)}
              </div>
              <div style={{marginBottom:"0.4rem"}}><span style={{fontSize:"0.72rem",color:SC}}>{SL}</span></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.2rem"}}>
                {pw.checks.map(c=><div key={c.label} style={{display:"flex",alignItems:"center",gap:"0.3rem",fontSize:"0.72rem",color:c.pass?"#00ffcc":"#c0d8f0"}}><span>{c.pass?"✓":"○"}</span>{c.label}</div>)}
              </div>
            </div>
          )}

          {mode==="register"&&(
            <>
              <label style={lbl}>CONFIRM PASSWORD</label>
              <div style={{position:"relative",marginBottom:"0.8rem"}}>
                <input type={showCf?"text":"password"} value={f.confirm} onChange={e=>upd("confirm",e.target.value)}
                  placeholder="Re-enter your password"
                  style={{...inp,marginBottom:0,paddingRight:"2.8rem",borderColor:f.confirm&&f.confirm!==f.password?"#ff4455":f.confirm&&f.confirm===f.password?"#00ffcc":"#2a4a8a"}}/>
                <button onClick={()=>setShowCf(p=>!p)} style={{position:"absolute",right:"0.8rem",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#4a7aaa",cursor:"pointer",fontSize:"1.1rem",padding:0}}>{showCf?"🙈":"👁"}</button>
              </div>
            </>
          )}

          <button onClick={mode==="login"?login:register} disabled={loading}
            style={{width:"100%",padding:"0.9rem",borderRadius:12,background:loading?"rgba(42,90,130,0.5)":"linear-gradient(135deg,#1a3a7a,#2a6aaa)",border:"1px solid #3a7aba",color:"#a8edea",fontFamily:"'Cinzel',serif",fontSize:"0.95rem",fontWeight:700,cursor:loading?"not-allowed":"pointer",letterSpacing:"0.08em",transition:"all 0.2s",marginTop:"1.8rem",marginBottom:"1rem"}}>
            {loading?"...":mode==="login"?"ENTER THE REALM":"CREATE ACCOUNT"}
          </button>

        </div>

      </div>
    </div>
  );
}

const GAME_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
  @keyframes twinkle{0%,100%{opacity:0.2;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}
  @keyframes burst{to{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0}0%{opacity:1;transform:translate(0,0) scale(1)}}
  @keyframes floatUp{0%{opacity:1;transform:translateX(-50%) translateY(0)}100%{opacity:0;transform:translateX(-50%) translateY(-80px)}}
  @keyframes levelUp{0%{opacity:0;transform:translate(-50%,-50%) scale(0.5)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}80%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(0.9)}}
  @keyframes badgeIn{0%{opacity:0;transform:translateX(120%)}20%{opacity:1;transform:translateX(-8px)}85%{opacity:1;transform:translateX(0)}100%{opacity:0;transform:translateX(120%)}}
  @keyframes orb{0%{transform:translateY(0) scale(1)}50%{transform:translateY(-12px) scale(1.04)}100%{transform:translateY(0) scale(1)}}
  @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
  @keyframes cardReveal{0%{transform:rotateY(90deg)}100%{transform:rotateY(0deg)}}
  @keyframes nebula{0%{opacity:0.08;transform:scale(1) rotate(0deg)}50%{opacity:0.14;transform:scale(1.1) rotate(180deg)}100%{opacity:0.08;transform:scale(1) rotate(360deg)}}
  *{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#070d1f}::-webkit-scrollbar-thumb{background:#2a4a8a;border-radius:2px}
  @keyframes pillarBeam{0%{opacity:0;transform:scaleY(0.2)}15%{opacity:1;transform:scaleY(1)}75%{opacity:1}100%{opacity:0;transform:scaleY(1)}}
  @keyframes cardAura{0%,100%{box-shadow:0 0 20px rgba(100,180,255,0.2),0 0 40px rgba(100,180,255,0.1)}50%{box-shadow:0 0 40px rgba(100,180,255,0.5),0 0 80px rgba(100,180,255,0.2),0 0 120px rgba(100,180,255,0.1)}}
`;

async function restoreSession() {
  const token = sessionStorage.getItem("sb_token");
  if (!token) return null;
  try {
    // Verify token is still valid by fetching the user
    const r = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { apikey: SB_ANON, Authorization: `Bearer ${token}` }
    });
    if (!r.ok) { sessionStorage.removeItem("sb_token"); return null; }
    const user = await r.json();
    _token = token;
    return user;
  } catch(e) { return null; }
}

export default function PsychicMMORPG() {
  const [screen, setScreen]             = useState("auth");
  const [session, setSession]           = useState(null);
  const [restoring, setRestoring]       = useState(true);
  const [isAdmin, setIsAdmin]           = useState(false);
  const [dailyCount, setDailyCount]     = useState(0);
  const [deckLocked, setDeckLocked]     = useState(false);
  const [bonusDecks, setBonusDecks]     = useState(0);
  const [xp, setXp]                     = useState(0);
  const [streak, setStreak]             = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [bestStreak, setBestStreak]       = useState(0);
  const [badges, setBadges]             = useState([]);
  const [newBadge, setNewBadge]         = useState(null);
  const [card, setCard]                 = useState(null);
  const [revealed, setRevealed]         = useState(false);
  const [flash, setFlash]               = useState(null);
  const [burstTrig, setBurstTrig]       = useState(-1);
  const [novaFire, setNovaFire]           = useState(null);
  const [burstOk, setBurstOk]           = useState(true);
  const [xpTrig, setXpTrig]             = useState(-1);
  const [xpGained, setXpGained]         = useState(0);
  const xpEventRef = useRef({ amount:0, streakUsed:0 });
  const [levelUpAnim, setLevelUpAnim]   = useState(false);
  const [showLB, setShowLB]             = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [message, setMessage]           = useState("");
  const [stars]                         = useState(()=>Array.from({length:120},(_,i)=>({id:i,x:Math.random()*100,y:Math.random()*100,size:Math.random()*2+0.5,delay:Math.random()*4,dur:2+Math.random()*3})));
  const audio     = useAudio();
  const prevLevel = useRef(1);
  const saveTimer = useRef(null);
  const cardRef = useRef(null);

  // Restore session after Stripe redirect, page refresh, or email confirmation
  useEffect(()=>{
    (async()=>{
      let user = null;

      // Check for email confirmation token in URL hash (e.g. #access_token=...&type=signup)
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        const hashParams = new URLSearchParams(hash.replace("#", ""));
        const accessToken = hashParams.get("access_token");
        const tokenType = hashParams.get("type");
        if (accessToken && tokenType === "signup") {
          try {
            // Verify and store the token
            const r = await fetch(`${SB_URL}/auth/v1/user`, {
              headers: { apikey: SB_ANON, Authorization: `Bearer ${accessToken}` }
            });
            if (r.ok) {
              setToken(accessToken);
              user = await r.json();
              // Clear the hash from the URL
              window.history.replaceState({}, "", window.location.pathname);
            }
          } catch(e) { console.error("Email confirmation failed", e); }
        }
      }

      // Fall back to stored session token
      if (!user) user = await restoreSession();

      if (user) {
        const uid = user.id;
        try {
          const player  = await sb.select("players", `id=eq.${uid}&select=username`, true);
          const stats   = await sb.select("player_stats", `player_id=eq.${uid}&select=xp,total_correct,badges,best_streak,bonus_decks`, true);
          const adminRow= await sb.select("players", `id=eq.${uid}&select=is_admin`, true);
          const today   = (()=>{ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); })();
          const dg      = await sb.select("daily_guesses", `player_id=eq.${uid}&guess_date=eq.${today}`, true);
          const dc      = dg?.guess_count || 0;
          const bd      = stats?.bonus_decks || 0;
          const ia      = adminRow?.is_admin || false;

          // Check if returning from successful purchase
          const params = new URLSearchParams(window.location.search);
          if (params.get("purchase") === "success" || params.get("purchase") === "cancelled") {
            window.history.replaceState({}, "", window.location.pathname);
          }

          handleEnter({ userId:uid, username:player.username, xp:stats?.xp||0, totalCorrect:stats?.total_correct||0, badges:stats?.badges||[], bestStreak:stats?.best_streak||0, isAdmin:ia, dailyCount:dc, bonusDecks:bd });
        } catch(e) { console.error("Session restore failed", e); }
      }
      setRestoring(false);
    })();
  }, []);

  useEffect(()=>{ drawNewCard(); },[]);



  const persistStats = useCallback((nxp, nc, nb, uid, nbs=0) => {
    if (!uid) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async()=>{
      try { await sb.upsert("player_stats",{ player_id:uid, xp:nxp, total_correct:nc, badges:nb, best_streak:nbs, updated_at:new Date().toISOString() }); }
      catch(e) { console.error("Save failed",e); }
    }, 1500);
  },[]);

  useEffect(()=>{
    if (!session) return;
    const level = getLevelFromXP(xp);
    const earned = BADGES.filter(b=>{
      if (badges.includes(b.id)) return false;
      if (b.level  && level        >= b.level)  return true;
      if (b.streak && streak       >= b.streak) return true;
      if (b.total  && totalCorrect >= b.total)  return true;
      return false;
    });
    if (earned.length>0) {
      const next=[...badges,...earned.map(b=>b.id)];
      setBadges(next); setNewBadge(earned[0]);
      setTimeout(()=>setNewBadge(null),3500);
      persistStats(xp,totalCorrect,next,session.userId,bestStreak);
    }
  },[xp,streak,totalCorrect]);

  useEffect(()=>{
    const lv=getLevelFromXP(xp);
    if (lv>prevLevel.current) { prevLevel.current=lv; setLevelUpAnim(true); audio.playLevelUp(); setTimeout(()=>setLevelUpAnim(false),3000); }
  },[xp]);

  function drawNewCard() { setCard(SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)]); setRevealed(false); setFlash(null); setMessage(""); }

  function handleEnter({ userId, username, xp:sx, totalCorrect:sc, badges:sb2, bestStreak:sbs, isAdmin:ia, dailyCount:dc, bonusDecks:bd }) {
    setSession({ userId, username }); setXp(sx); setTotalCorrect(sc); setBadges(sb2); setBestStreak(sbs||0);
    const ia2 = ia||false;
    setIsAdmin(ia2);
    const count = dc||0;
    const bonus = bd||0;
    // If daily deck is used up but bonus decks available, consume one now and start fresh
    if (!ia2 && count >= 25 && bonus > 0) {
      setBonusDecks(bonus - 1);
      setDailyCount(0);
      setDeckLocked(false);
      // Persist the consumption
      const today = (()=>{ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); })();
      sb.upsert("daily_guesses", { player_id:userId, guess_date:today, guess_count:0 }).catch(()=>{});
      sb.rpc("consume_bonus_deck", { p_player_id: userId }).catch(()=>{});
    } else {
      setBonusDecks(bonus);
      setDailyCount(count);
      setDeckLocked(!ia2 && count >= 25 && bonus <= 0);
    }
    prevLevel.current=getLevelFromXP(sx); setScreen("game");
  }

  async function handleSignOut() {
    await sb.signOut();
    setScreen("auth"); setSession(null);
    setXp(0); setTotalCorrect(0); setStreak(0); setBadges([]); setBestStreak(0);
    setNovaFire(null); setBurstTrig(-1); setXpTrig(-1);
    setIsAdmin(false); setDailyCount(0); setDeckLocked(false); setBonusDecks(0);
    setShowSignOutConfirm(false);
  }

  async function persistDailyGuess(uid, newCount) {
    const today = (()=>{ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); })();
    try { await sb.upsert("daily_guesses", { player_id:uid, guess_date:today, guess_count:newCount }); }
    catch(e) { console.error("daily guess save failed", e); }
  }

  function handleGuess(sym) {
    if (revealed||!card||deckLocked) return;
    setRevealed(true);
    const correct=sym.id===card.id, newStreak=correct?streak+1:0, gained=correct?20+streak*4:0;
    if (correct) {
      const nxp=xp+gained, nc=totalCorrect+1;
      setFlash("correct"); setBurstOk(true); setBurstTrig(t=>t+1);
      if (cardRef.current) {
        const r = cardRef.current.getBoundingClientRect();
        setNovaFire({ x: r.left + r.width/2, y: r.top + r.height/2, t: Date.now() });
      } else {
        setNovaFire({ x: null, y: null, t: Date.now() });
      }
      xpEventRef.current = { amount: gained, streakUsed: streak };
      const nbs = Math.max(bestStreak, newStreak);
      setXp(nxp); setXpGained(gained); setXpTrig(t=>t+1);
      setStreak(newStreak); setTotalCorrect(nc); setBestStreak(nbs);
      setMessage(`Correct! +${gained} XP${streak>0?" (streak bonus!)":""}`);
      audio.playCorrect(); persistStats(nxp,nc,badges,session?.userId,nbs);
    } else {
      setFlash("wrong"); setBurstOk(false); setBurstTrig(t=>t+1);
      setStreak(0); setMessage(`It was ${card.label}`); audio.playWrong();
    }
    const newCount = dailyCount + 1;
    if (!isAdmin && newCount >= 25) {
      if (bonusDecks > 0) {
        // Consume one bonus deck in-session: UI resets to fresh deck immediately
        // DB stores 25 so on any restore it knows the daily deck was exhausted
        // bonus_decks is decremented in DB via RPC
        setBonusDecks(b => b - 1);
        setDailyCount(0);
        persistDailyGuess(session?.userId, 25);
        sb.rpc("consume_bonus_deck", { p_player_id: session?.userId }).catch(e => console.error("consume_bonus_deck failed", e));
      } else {
        setDailyCount(newCount);
        persistDailyGuess(session?.userId, newCount);
        setDeckLocked(true);
      }
    } else {
      setDailyCount(newCount);
      persistDailyGuess(session?.userId, newCount);
    }
    setTimeout(drawNewCard,1600);
  }

  const level     = getLevelFromXP(xp);
  const xpInLevel = xp - xpForLevel(level);
  const xpNeeded  = xpForNextLevel(level) - xpForLevel(level);
  const xpPct     = Math.min(100,(xpInLevel/xpNeeded)*100);
  const earnedBadgeObjs = BADGES.filter(b=>badges.includes(b.id));

  if (restoring) return <div style={{minHeight:"100vh",background:"#030810"}}/>;
  if (screen==="auth") return <AuthScreen onEnter={handleEnter}/>;

  return (
    <div style={{minHeight:"100vh",background:"#030810",fontFamily:"'Crimson Text',serif",color:"#c8d8f0",position:"relative",overflow:"visible"}}>
      <style>{GAME_CSS}</style>
      <NovaSpell fire={novaFire}/>
      {stars.map(s=><div key={s.id} style={{position:"fixed",left:`${s.x}%`,top:`${s.y}%`,width:s.size,height:s.size,borderRadius:"50%",background:"#fff",opacity:0.4,animation:`twinkle ${s.dur}s ${s.delay}s infinite`,pointerEvents:"none"}}/>)}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",background:"radial-gradient(ellipse at 20% 20%,rgba(80,40,180,0.15),transparent 60%),radial-gradient(ellipse at 80% 80%,rgba(0,100,200,0.12),transparent 60%)",animation:"nebula 20s linear infinite"}}/>

      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",padding:"1rem"}}>

        <div style={{width:"100%",maxWidth:900,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.8rem 1.2rem",background:"rgba(7,16,34,0.85)",backdropFilter:"blur(12px)",border:"1px solid #1a3a6a",borderRadius:16,marginBottom:"1.2rem",gap:"1rem",flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:"0.8rem"}}>
            <div style={{fontSize:"1.6rem",animation:"orb 3s ease-in-out infinite"}}>🔮</div>
            <div>
              <div style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:"#a8edea",fontSize:"0.95rem"}}>{session?.username}</div>
              <div style={{color:"#4a7aaa",fontSize:"0.75rem"}}>Level {level} Psychic</div>
            </div>
          </div>
          <div style={{flex:1,minWidth:160,maxWidth:300}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.3rem"}}>
              <span style={{color:"#a8edea",fontSize:"0.75rem",fontFamily:"'Cinzel',serif"}}>LV {level}</span>
              <span style={{color:"#4a7aaa",fontSize:"0.75rem"}}>{xpInLevel.toLocaleString()}/{xpNeeded.toLocaleString()} XP</span>
            </div>
            <div style={{height:8,background:"rgba(255,255,255,0.08)",borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:4,transition:"width 0.6s ease",width:`${xpPct}%`,background:"linear-gradient(90deg,#1a6aaa,#a8edea)",boxShadow:"0 0 10px rgba(168,237,234,0.6)"}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:"0.6rem",alignItems:"center",flexWrap:"wrap"}}>
            {!isAdmin&&(()=>{
              const left=Math.max(0,25-dailyCount);
              const totalLeft = left + (bonusDecks * 25);
              const bg=left===0&&bonusDecks===0?"linear-gradient(135deg,#5a0a0a,#aa1a1a)":left<=5&&bonusDecks===0?"linear-gradient(135deg,#5a3a00,#aa6a00)":"linear-gradient(135deg,#0a3a1a,#1a7a3a)";
              const border=left===0&&bonusDecks===0?"#ff4444":left<=5&&bonusDecks===0?"#ffaa00":"#22aa55";
              return (
                <div style={{display:"flex",alignItems:"center",gap:"0.5rem",background:bg,border:`1px solid ${border}`,borderRadius:8,padding:"0.3rem 0.7rem"}}>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:"0.7rem",color:"#c0d8f0",letterSpacing:"0.06em"}}>DECK</span>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:"0.8rem",fontWeight:700,color:"#c0d8f0"}}>{left}/25</span>
                  {bonusDecks>0&&<span style={{fontFamily:"'Cinzel',serif",fontSize:"0.7rem",color:"#ffcc44",marginLeft:"0.2rem"}}>+{bonusDecks} 🃏</span>}
                </div>
              );
            })()}
            <button onClick={()=>setShowLB(true)} style={{background:"linear-gradient(135deg,#1a3a6a,#2a5a8a)",border:"1px solid #3a6a9a",borderRadius:8,padding:"0.4rem 0.8rem",color:"#a8edea",fontFamily:"'Cinzel',serif",fontSize:"0.8rem",cursor:"pointer"}}>🏆 Ranks</button>
            <button onClick={()=>setShowSignOutConfirm(true)} style={{background:"linear-gradient(135deg,#3a1020,#6a1530)",border:"1px solid #aa3355",borderRadius:8,padding:"0.4rem 0.8rem",color:"#ff8899",fontFamily:"'Cinzel',serif",fontSize:"0.8rem",cursor:"pointer",fontWeight:600,letterSpacing:"0.05em",boxShadow:"0 0 12px rgba(170,51,85,0.3)"}}>Sign Out</button>
          </div>
        </div>

        {card&&(
          <div style={{width:"100%",maxWidth:680,background:"linear-gradient(160deg,rgba(7,16,34,0.9),rgba(15,30,64,0.9))",backdropFilter:"blur(20px)",border:"1px solid #1a3a6a",borderRadius:24,padding:"2rem",boxShadow:"0 0 60px rgba(20,60,150,0.3)",position:"relative",overflow:"hidden"}}>
            {deckLocked&&<DeckCountdown userId={session?.userId}/>}
            <ParticleBurst trigger={burstTrig} correct={burstOk}/>
            <FloatingXP trigger={xpTrig} xpEventRef={xpEventRef}/>
            <RuneCircle/>
            {levelUpAnim&&(
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",animation:"levelUp 3s ease forwards",zIndex:50,textAlign:"center",pointerEvents:"none"}}>
                <div style={{fontSize:"3rem"}}>⚡</div>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:"2.2rem",fontWeight:900,background:"linear-gradient(90deg,#ffd700,#ffaa00,#ffd700)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 1s linear infinite"}}>LEVEL UP!</div>
                <div style={{color:"#ffd700",fontSize:"1.2rem",fontFamily:"'Cinzel',serif"}}>Level {level}</div>
              </div>
            )}
            <h2 style={{textAlign:"center",fontFamily:"'Cinzel',serif",fontWeight:700,color:"#a8edea",fontSize:"1.1rem",marginBottom:"1.5rem",letterSpacing:"0.12em",opacity:0.8}}>FOCUS YOUR MIND · SENSE THE SYMBOL</h2>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"1rem",marginBottom:"2rem"}}>
              <div ref={cardRef} style={{animation:revealed?"cardReveal 0.4s ease":"orb 4s ease-in-out infinite"}}>
                <ZenerCard symbol={card} faceDown={!revealed} flash={flash}/>
              </div>
              <div style={{height:28,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cinzel',serif",
                color:flash==="correct"?"#00ffcc":flash==="wrong"?"#ff6677":"#4a7aaa",fontSize:"0.95rem",fontWeight:600,
                textShadow:flash==="correct"?"0 0 20px rgba(0,255,204,0.8)":flash==="wrong"?"0 0 20px rgba(255,100,120,0.6)":"none",transition:"all 0.3s"}}>
                {message||"What symbol is hidden?"}
              </div>
            </div>
            <StreakMeter streak={streak}/>
            <div style={{display:"flex",justifyContent:"center",gap:"0.8rem",flexWrap:"wrap"}}>
              {SYMBOLS.map(sym=>(
                <button key={sym.id} onClick={()=>handleGuess(sym)} disabled={revealed||deckLocked}
                  style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.4rem",padding:"0.9rem 1.1rem",borderRadius:14,cursor:(revealed||deckLocked)?"not-allowed":"pointer",
                    background:revealed&&sym.id===card.id?"linear-gradient(135deg,rgba(0,255,204,0.2),rgba(0,255,204,0.05))":"rgba(255,255,255,0.04)",
                    border:revealed&&sym.id===card.id?"1px solid #00ffcc":"1px solid rgba(255,255,255,0.08)",
                    color:"#c8d8f0",transition:"all 0.2s",opacity:(revealed||deckLocked)?0.3:1}}>
                  <SymbolSVG sym={sym} flash={revealed&&sym.id===card.id?flash:null} size={44}/>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:"0.7rem",letterSpacing:"0.08em",color:"#6a9aca"}}>{sym.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {earnedBadgeObjs.length>0&&(
          <div style={{width:"100%",maxWidth:680,marginTop:"1.2rem",background:"rgba(7,16,34,0.8)",backdropFilter:"blur(12px)",border:"1px solid #1a3a6a",borderRadius:16,padding:"1rem 1.2rem"}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.75rem",color:"#4a7aaa",marginBottom:"0.7rem",letterSpacing:"0.1em"}}>EARNED BADGES</div>
            <div style={{display:"flex",gap:"0.6rem",flexWrap:"wrap"}}>
              {earnedBadgeObjs.map(b=>(
                <div key={b.id} title={`${b.name}: ${b.desc}`} style={{display:"flex",alignItems:"center",gap:"0.4rem",background:"linear-gradient(135deg,rgba(168,237,234,0.1),rgba(100,180,255,0.08))",border:"1px solid rgba(168,237,234,0.25)",borderRadius:10,padding:"0.4rem 0.7rem"}}>
                  <span style={{fontSize:"1.1rem"}}>{b.icon}</span>
                  <span style={{fontFamily:"'Cinzel',serif",color:"#a8edea",fontSize:"0.72rem"}}>{b.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{width:"100%",maxWidth:680,marginTop:"1rem",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.8rem"}}>
          {[{label:"Total XP",value:xp.toLocaleString(),icon:"✨"},{label:"Correct",value:totalCorrect,icon:"🎯"},{label:"Best Streak",value:bestStreak,icon:"🔥"}].map(s=>(
            <div key={s.label} style={{background:"rgba(7,16,34,0.7)",border:"1px solid #1a3a6a",borderRadius:14,padding:"0.9rem",textAlign:"center"}}>
              <div style={{fontSize:"1.4rem"}}>{s.icon}</div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.1rem",color:"#a8edea",fontWeight:700}}>{s.value}</div>
              <div style={{color:"#c0d8f0",fontSize:"0.75rem"}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <CursorSparkle/>
      <AmbientOrbs/>
      <EnergyWisps/>
      <LevelUpPillar active={levelUpAnim}/>

      {newBadge&&(
        <div style={{position:"fixed",bottom:"2rem",right:"2rem",zIndex:150,background:"linear-gradient(135deg,#070d1f,#0f1e40)",border:"1px solid #a8edea44",borderRadius:16,padding:"1rem 1.2rem",display:"flex",alignItems:"center",gap:"0.8rem",boxShadow:"0 0 40px rgba(168,237,234,0.3)",animation:"badgeIn 3.5s ease forwards",minWidth:220}}>
          <span style={{fontSize:"2rem"}}>{newBadge.icon}</span>
          <div>
            <div style={{fontFamily:"'Cinzel',serif",color:"#a8edea",fontSize:"0.9rem",fontWeight:700}}>Badge Unlocked!</div>
            <div style={{color:"#7eb8f7",fontSize:"0.8rem"}}>{newBadge.name}</div>
            <div style={{color:"#c0d8f0",fontSize:"0.75rem"}}>{newBadge.desc}</div>
          </div>
        </div>
      )}

      {showLB&&<Leaderboard currentUsername={session?.username} onClose={()=>setShowLB(false)}/>}

      {showSignOutConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"}} onClick={()=>setShowSignOutConfirm(false)}>
          <div style={{background:"linear-gradient(160deg,#0a0f20,#12203d)",border:"1px solid #2a4a8a",borderRadius:20,padding:"2rem",width:"min(360px,90vw)",textAlign:"center",boxShadow:"0 0 60px rgba(100,150,255,0.25)"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:"2.5rem",marginBottom:"0.8rem"}}>🔮</div>
            <h3 style={{fontFamily:"'Cinzel',serif",color:"#a8edea",fontSize:"1.1rem",fontWeight:700,margin:"0 0 0.6rem",letterSpacing:"0.08em"}}>LEAVE THE REALM?</h3>
            <p style={{color:"#c0d8f0",fontSize:"0.92rem",margin:"0 0 1.8rem",lineHeight:1.5}}>Your progress is saved. You can return to your psychic journey at any time.</p>
            <div style={{display:"flex",gap:"0.8rem",justifyContent:"center"}}>
              <button onClick={()=>setShowSignOutConfirm(false)} style={{flex:1,padding:"0.75rem",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid #2a4a6a",color:"#a8edea",fontFamily:"'Cinzel',serif",fontSize:"0.85rem",fontWeight:600,cursor:"pointer",letterSpacing:"0.05em"}}>STAY</button>
              <button onClick={handleSignOut} style={{flex:1,padding:"0.75rem",borderRadius:10,background:"linear-gradient(135deg,#3a1020,#6a1530)",border:"1px solid #aa3355",color:"#ff8899",fontFamily:"'Cinzel',serif",fontSize:"0.85rem",fontWeight:600,cursor:"pointer",letterSpacing:"0.05em",boxShadow:"0 0 16px rgba(170,51,85,0.4)"}}>SIGN OUT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
