/* Xếp nguyện vọng: chuyển từ bản mẫu đã chốt, chỉ xuất window.NV. */
(function () {
"use strict";
const ROOT = document.getElementById("tab-nv");
if (!ROOT) return;
const $ = s => ROOT.querySelector(s);
const SHOW_LINKS = document.documentElement.dataset.mode === "static";
let ready = false, loading = null;
async function read(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
async function open() {
  if (ready) return;
  if (loading) return loading;
  $('#nv-out').textContent = 'Đang tải dữ liệu…';
  loading = (async () => {
    try {
      let data;
      if (SHOW_LINKS) data = await read('data/nv.json');
      else {
        try { data = await read('api/nv'); }
        catch { data = await read('data/nv.json'); }
      }
      initialize(data);
      ready = true;
    } catch {
      $('#nv-out').innerHTML = '<div class="nv-card nv-empty">Không tải được dữ liệu. <button class="nv-btn" id="nv-retry" type="button">Thử lại</button></div>';
      $('#nv-retry').onclick = open;
    } finally { loading = null; }
  })();
  return loading;
}
function initialize(D) {


/* ============ DỮ LIỆU ============ */
const PROGS = D.p.map(p=>({u:p[0],c:p[1],n:p[2],t:p[3],m:p[4],cb:p[5],h:p[6],ov:p[7]}));
const KEY = p=>p.u+'|'+p.c;
const BYKEY = new Map(PROGS.map(p=>[KEY(p),p]));
const UNI = c=>D.u[c]||[c,c,null,''];
const YEARS = D.years, NEXT = D.next;
const TYPE = {TIENG_ANH:'dạy bằng tiếng Anh',CLC:'chất lượng cao',LIEN_KET:'liên kết',TIEN_TIEN:'tiên tiến',PHAN_HIEU:'phân hiệu',TAI_NANG:'tài năng'};
const unaccent=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
PROGS.forEach(p=>{const u=UNI(p.u); p.k=unaccent(`${u[0]} ${u[1]} ${p.u} ${p.n} ${p.c} ${p.m}`);});
const MAXNV=15, SP_MAX=5; // Thông tư 06/2026: tối đa 15 NV; ngành sư phạm chỉ xét ở NV1–5
const isSP=p=>/^7140/.test(p.m||'');

/* ============ MÔ HÌNH DỰ BÁO ============
   Học từ ba năm THPT mới nhất: dự báo năm thứ ba từ hai năm trước rồi so với thực tế.
   Điểm chuẩn năm sau = ½ × hồi quy (năm trước, năm gần nhất) + ½ × năm gần nhất.
   Sai số không giả định phân phối chuẩn: dùng chính phân phối sai số thực tế (41 phân vị),
   chia theo độ dao động giữa hai năm gần nhất. Chương trình chỉ có 1 năm dùng phân phối sai số riêng, rộng hơn. */
const MD=D.model;
function forecast(p,combo){
  const h=(combo&&p.ov[combo])?p.ov[combo]:p.h;
  const [a,b,c]=h; let pred,q,kind;
  if(b!=null){ pred=MD.blend*(MD.co2[0]+MD.co2[1]*b+MD.co2[2]*c)+(1-MD.blend)*c;
    const v=Math.abs(c-b); const i=MD.bins.findIndex(([lo,hi])=>v>=lo&&v<hi); q=MD.q2[i<0?2:i]; kind=['ổn định','dao động vừa','dao động mạnh'][i<0?2:i]; }
  else { pred=MD.blend*(MD.co1[0]+MD.co1[1]*c)+(1-MD.blend)*c; q=MD.q1; kind='chỉ có 1 năm gần nhất'; }
  return {h,pred,lo:pred+q[4],hi:pred+q[36],q,kind,own:!!(combo&&p.ov[combo])};
}
function cdf(q,z){ // P(sai số ≤ z) từ 41 phân vị
  if(z<q[0]) return 0; if(z>=q[40]) return 1;
  let k=0; while(k<40&&q[k+1]<=z) k++;
  const lo=q[k],hi=q[k+1]; const f=hi>lo?(z-lo)/(hi-lo):0;
  return (k+f)/40;
}
function assess(p,score,combo){
  if(combo&&!p.cb.includes(combo)) return {ok:false,prob:0,grp:'na'};
  const f=forecast(p,combo); let prob=cdf(f.q,score-f.pred); prob=Math.min(.99,Math.max(.01,prob));
  return Object.assign(f,{ok:true,prob,grp:grpOf(prob)});
}
const GRP={safe:{n:'An toàn',c:'var(--safe)'},target:{n:'Vừa sức',c:'var(--target)'},reach:{n:'Mạo hiểm',c:'var(--reach)'},hard:{n:'Rất khó',c:'var(--hard)'},na:{n:'Không xét tổ hợp',c:'var(--muted)'}};
function grpOf(p){return p>=.9?'safe':p>=.6?'target':p>=.2?'reach':'hard';}

/* ============ TRẠNG THÁI ============ */
const SAMPLE={score:26,combo:'A00',items:[['TLA','TLA121',3],['BVH','7480202',3],['BKA','IT1',3],['QHI','CN8',3],['KHA','7480101',3],['BVH','7480101',3],['BVH','7520216',3],['MHN','7480201',3]]};
const SKEY='dtdh-xep-nv-v1';
let S;
try{S=JSON.parse(localStorage.getItem(SKEY)||'null');}catch(e){}
if(!S||!Array.isArray(S.items)) S=JSON.parse(JSON.stringify(SAMPLE));
S.items=S.items.filter(x=>Array.isArray(x)&&BYKEY.has(x[0]+'|'+x[1]))
  .filter((x,i,a)=>a.findIndex(y=>y[0]===x[0]&&y[1]===x[1])===i).slice(0,MAXNV)
  .map(([u,c,star])=>[u,c,Math.min(5,Math.max(1,Number(star)||3))]);
S.score=S.score==null||!Number.isFinite(Number(S.score))?null:Math.min(30,Math.max(0,Number(S.score)));
S.combo=typeof S.combo==='string'?S.combo:'';
function save(){try{localStorage.setItem(SKEY,JSON.stringify(S));}catch(e){}}

const fmt=(x,d=2)=>x==null||isNaN(x)?'–':(+x).toLocaleString('vi-VN',{minimumFractionDigits:0,maximumFractionDigits:d});
const pct=x=>x>=.99?'>99%':x<=.01?'<1%':Math.round(x*100)+'%';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ============ NHẬP LIỆU ============ */
const comboCount={}; PROGS.forEach(p=>p.cb.forEach(c=>comboCount[c]=(comboCount[c]||0)+1));
$('#nv-combo').innerHTML='<option value="">Mọi tổ hợp (lấy điểm chuẩn cao nhất)</option>'+Object.entries(comboCount).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`<option value="${c}">${c} · ${n} chương trình</option>`).join('');
$('#nv-score').value=S.score??''; $('#nv-combo').value=S.combo||'';
$('#nv-score').addEventListener('input',e=>{S.score=e.target.value===''?null:Math.max(0,Math.min(30,+e.target.value)); save(); render(); refreshSearch();});
$('#nv-combo').addEventListener('change',e=>{S.combo=e.target.value; save(); render(); refreshSearch();});
let sugg=[], sel=-1, shown=50;
/* Tìm đầy đủ: mọi chương trình khớp tất cả từ khóa (tên/mã trường, tên/mã ngành, mã chương trình).
   Không lọc theo khả năng đỗ hay tổ hợp; chỉ xếp theo độ khớp rồi theo tên trường, tên chương trình. */
function search(q){
  const key=unaccent(q).trim(), ws=key.split(/\s+/).filter(Boolean); if(!ws.length) return [];
  const sc=S.score, cb=S.combo;
  const tier=p=>{const u=UNI(p.u), codes=[p.c,p.m,p.u].map(unaccent);
    if(codes.includes(key)) return 0;
    if(unaccent(u[0])===key||unaccent(p.n)===key) return 1;
    if(unaccent(p.n).startsWith(key)||unaccent(u[0]).startsWith(key)||unaccent(u[1]).startsWith(key)) return 2;
    return 3;};
  return PROGS.filter(p=>ws.every(w=>p.k.includes(w))).map(p=>({p,t:tier(p)}))
    .sort((x,y)=>x.t-y.t||UNI(x.p.u)[1].localeCompare(UNI(y.p.u)[1],'vi')||x.p.n.localeCompare(y.p.n,'vi'))
    .map(x=>({p:x.p,a:sc!=null?assess(x.p,sc,cb):null}));
}
function drawSugg(){
  const box=$('#nv-sugg'), list=sugg.slice(0,shown);
  box.innerHTML=sugg.length?`<div class="nv-hd">Tìm thấy ${sugg.length.toLocaleString('vi-VN')} chương trình${sugg.length>shown?`, đang hiện ${shown}`:''}</div>`+list.map(({p,a},i)=>{const u=UNI(p.u), inList=S.items.some(([x,y])=>x===p.u&&y===p.c);
    return `<button type="button" role="option" data-i="${i}" class="${i===sel?'nv-sel':''}" ${inList?'disabled':''}><span class="nv-t">${esc(p.n)}</span><span class="nv-s">${esc(u[1])} (${esc(p.u)}) · mã CT ${esc(p.c)} · mã ngành ${esc(p.m||'chưa có')} · ${esc(TYPE[p.t]||p.t||'chuẩn')} · chuẩn ${YEARS[2]}: ${fmt(p.h[2])}${inList?' · đã có trong danh sách':''}</span><span class="nv-r">${a?(a.ok?`<span class="nv-tag nv-${a.grp}">${pct(a.prob)}</span>`:`<span class="nv-tag nv-na">Không xét ${esc(S.combo)}</span>`):''}</span></button>`;}).join('')
    +(sugg.length>shown?`<button type="button" class="nv-more" data-more="1">Hiện thêm ${Math.min(50,sugg.length-shown)} chương trình</button>`:'')
    :'<div class="nv-help" style="padding:8px 10px">Không tìm thấy. Thử tên viết tắt của trường (HUST, NEU, PTIT…), mã trường (BKA), mã ngành (7480201) hoặc bỏ bớt từ khóa.</div>';
  box.classList.toggle('nv-open',!!$('#nv-q').value.trim()); $('#nv-q').setAttribute('aria-expanded',box.classList.contains('nv-open'));
}
function refreshSearch(){if($('#nv-q').value.trim()){sugg=search($('#nv-q').value); sel=-1; shown=50; drawSugg();}}
$('#nv-q').addEventListener('input',e=>{sugg=search(e.target.value); sel=-1; shown=50; drawSugg();});
$('#nv-q').addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'){sel=Math.min(Math.min(shown,sugg.length)-1,sel+1); drawSugg(); e.preventDefault();}
  else if(e.key==='ArrowUp'){sel=Math.max(0,sel-1); drawSugg(); e.preventDefault();}
  else if(e.key==='Enter'&&$('#nv-sugg').classList.contains('nv-open')&&sugg[sel>=0?sel:0]){add(sugg[sel>=0?sel:0].p); e.preventDefault();}
  else if(e.key==='Escape'){closeSugg();}
});
$('#nv-sugg').addEventListener('click',e=>{if(e.target.closest('[data-more]')){shown+=50; drawSugg(); return;} const b=e.target.closest('button[data-i]'); if(b&&!b.disabled) add(sugg[+b.dataset.i].p);});
function closeSugg(){ $('#nv-sugg').classList.remove('nv-open'); $('#nv-q').setAttribute('aria-expanded','false'); }
document.addEventListener('click',e=>{if(!e.target.closest('.nv-search')) closeSugg();});
let msg='';
function add(p){
  if(S.items.length>=MAXNV){msg=`Quy chế 2026 cho đăng ký tối đa ${MAXNV} nguyện vọng.`; render(); return;}
  if(!S.items.some(([u,c])=>u===p.u&&c===p.c)) S.items.push([p.u,p.c,3]);
  $('#nv-q').value=''; sugg=[]; shown=50; drawSugg(); msg=''; save(); render(); $('#nv-q').focus();
}
$('#nv-list').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return; const i=+b.dataset.i;
  if(b.dataset.a==='del') S.items.splice(i,1);
  if(b.dataset.a==='up'&&i>0) [S.items[i-1],S.items[i]]=[S.items[i],S.items[i-1]];
  if(b.dataset.a==='dn'&&i<S.items.length-1) [S.items[i+1],S.items[i]]=[S.items[i],S.items[i+1]];
  if(b.dataset.a==='star') S.items[i][2]=+b.dataset.v;
  save(); render();
});
$('#nv-sample').onclick=()=>{S=JSON.parse(JSON.stringify(SAMPLE)); S.items=S.items.filter(([u,c])=>BYKEY.has(u+'|'+c)); $('#nv-score').value=S.score; $('#nv-combo').value=S.combo; save(); render();};
$('#nv-clear').onclick=()=>{S.items=[]; save(); render();};

/* ============ TỐI ƯU THỨ TỰ ============
   Hệ thống chung xét mọi NV bình đẳng theo điểm và chỉ cho trúng NV có thứ tự cao nhất mà bạn đủ điểm.
   Vì vậy đặt NV khó lên trên không làm giảm cơ hội của NV dưới, còn đặt NV an toàn lên trên sẽ "chặn" mọi NV phía sau.
   Thứ tự đề xuất: mức mong muốn (sao) giảm dần; cùng mức thì NV khó (xác suất thấp) lên trước.
   Sau đó đưa NV sư phạm vào 5 vị trí đầu theo quy chế 2026. */
function optimize(list){
  const rec=[...list].sort((x,y)=>y.star-x.star||(x.a.ok?x.a.prob:2)-(y.a.ok?y.a.prob:2)||x.idx-y.idx);
  rec.slice(SP_MAX).filter(x=>isSP(x.p)).forEach(x=>{
    if(rec.slice(0,SP_MAX).filter(y=>isSP(y.p)).length>=SP_MAX) return;
    rec.splice(rec.indexOf(x),1); rec.splice(SP_MAX-1,0,x); x.spMoved=true;});
  return rec;
}
function chain(order){ // xác suất được xét tới và trúng ở từng NV (giả định các NV độc lập)
  let reach=1; return order.map(x=>{const p=x.a.ok?x.a.prob:0; const r={reach,land:reach*p}; reach*=1-p; return r;}).concat([{fail:reach}]);
}
function spark(h,f){
  const pts=h.map((v,i)=>v==null?null:[i,v]).filter(Boolean); const all=[...pts.map(x=>x[1]),f.lo,f.hi,S.score??f.pred];
  const mn=Math.min(...all)-.3, mx=Math.max(...all)+.3, W=104,H=40, X=i=>4+i*(W-12)/3, Y=v=>H-4-(v-mn)/(mx-mn)*(H-8);
  const line=pts.map(([i,v],k)=>`${k?'L':'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  const last=pts[pts.length-1];
  return `<svg class="nv-spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Điểm chuẩn ${pts.map(([i,v])=>YEARS[i]+': '+fmt(v)).join(', ')}; dự báo ${NEXT}: ${fmt(f.lo,1)} đến ${fmt(f.hi,1)}">
   <rect x="${X(3)-5}" y="${Y(f.hi)}" width="10" height="${Math.max(2,Y(f.lo)-Y(f.hi))}" rx="3" fill="var(--accent-soft)"/>
   <line x1="${X(3)-7}" x2="${X(3)+7}" y1="${Y(f.pred)}" y2="${Y(f.pred)}" stroke="var(--accent)" stroke-width="2"/>
   ${S.score!=null?`<line x1="2" x2="${W-2}" y1="${Y(S.score)}" y2="${Y(S.score)}" stroke="var(--safe)" stroke-dasharray="3 3" stroke-width="1.2"/>`:''}
   <path d="${line}" fill="none" stroke="var(--accent-deep)" stroke-width="1.8"/>${pts.map(([i,v])=>`<circle cx="${X(i)}" cy="${Y(v)}" r="2.6" fill="var(--accent-deep)"/>`).join('')}
   <path d="M${X(last[0])},${Y(last[1])}L${X(3)},${Y(f.pred)}" stroke="var(--accent)" stroke-dasharray="2 2" fill="none"/></svg>`;
}
function why(x,score){
  const a=x.a; if(!a.ok) return `Chương trình này không xét tổ hợp ${S.combo}. Đổi tổ hợp hoặc bỏ nguyện vọng này.`;
  const hs=a.h.map((v,i)=>v==null?null:`${YEARS[i]}: ${fmt(v)}`).filter(Boolean).join(' · ');
  const vals=a.h.filter(v=>v!=null), sd=vals.length>1?Math.sqrt(vals.reduce((s,v)=>s+(v-vals.reduce((a,b)=>a+b,0)/vals.length)**2,0)/vals.length):null;
  const d=score-a.pred;
  return `Điểm chuẩn ${hs}${sd!=null?` (độ lệch chuẩn ${fmt(sd)})`:''}${a.own?`, theo riêng tổ hợp ${S.combo}`:''}. Dự báo ${NEXT} khoảng ${fmt(a.pred,1)}; 8/10 khả năng nằm trong ${fmt(a.lo,1)}–${fmt(a.hi,1)} (${a.kind}). Điểm bạn ${d>=0?'cao':'thấp'} hơn dự báo ${fmt(Math.abs(d),1)} điểm.`;
}
function moveText(x,i){
  const d=x.idx-i; if(x.spMoved) return `<span class="nv-mv nv-up">↑ ${d} · sư phạm phải ở NV1–5</span>`;
  if(d>0) return `<span class="nv-mv nv-up">↑ lên ${d} bậc</span>`; if(d<0) return `<span class="nv-mv nv-dn">↓ xuống ${-d} bậc</span>`; return `<span class="nv-mv nv-eq">giữ nguyên</span>`;
}
function moveReason(x,i,rec){
  const d=x.idx-i; if(!d||!x.a.ok||x.spMoved) return '';
  if(d>0){const over=rec.slice(i+1).filter(y=>y.idx<x.idx);
    return over.every(y=>y.star<x.star)?' Đưa lên vì bạn chấm sao cao hơn các NV vừa bị vượt.':` Đưa lên vì khó đỗ hơn (${pct(x.a.prob)}) các NV giờ xếp sau nó: đặt NV khó trước không làm mất cơ hội của NV sau, còn đặt sau NV dễ hơn thì ít khi được xét tới.`;}
  const over=rec.slice(0,i).filter(y=>y.idx>x.idx);
  return over.every(y=>y.star>x.star)?' Đưa xuống vì bạn chấm sao thấp hơn.':` Đưa xuống vì dễ đỗ hơn (${pct(x.a.prob)}): nếu đứng trên, bạn sẽ trúng ngay NV này và các NV khó hơn phía sau không còn được xét.`;
}

/* ============ HIỂN THỊ ============ */
function render(){
  const score=S.score, list=S.items.map(([u,c,star],idx)=>{const p=BYKEY.get(u+'|'+c); return {p,star,idx,a:score!=null?assess(p,score,S.combo):{ok:false,prob:0,grp:'na'}};});
  // danh sách bên trái
  $('#nv-list').innerHTML=list.map((x,i)=>{const u=UNI(x.p.u); return `<li class="nv-item"><span class="nv-no">${i+1}</span><span class="nv-nm">${esc(x.p.n)}<br><span class="nv-sub">${esc(u[0])} · ${esc(x.p.c)}${x.a.ok&&score!=null?` · <span class="nv-tag nv-${x.a.grp}">${pct(x.a.prob)}</span>`:''}</span></span>
    <span class="nv-ctl"><button class="nv-ic" type="button" data-a="up" data-i="${i}" ${i?'':'disabled'} aria-label="Đưa lên">▲</button><button class="nv-ic" type="button" data-a="dn" data-i="${i}" ${i<list.length-1?'':'disabled'} aria-label="Đưa xuống">▼</button><button class="nv-ic" type="button" data-a="del" data-i="${i}" aria-label="Xóa">✕</button></span>
    <span class="nv-stars" aria-label="Mức mong muốn">${[1,2,3,4,5].map(v=>`<button type="button" data-a="star" data-i="${i}" data-v="${v}" class="${v<=x.star?'nv-on':''}" aria-label="${v} sao">★</button>`).join('')}<span>mức mong muốn</span></span></li>`;}).join('');
  $('#nv-listhelp').innerHTML=(msg?`<b>${msg}</b> `:'')+(list.length?`${list.length}/${MAXNV} nguyện vọng. Thứ tự ở đây là thứ tự bạn định đăng ký; chấm thêm sao cho nơi bạn thật sự muốn học hơn.`:'Chưa có nguyện vọng nào. Gõ tên trường hoặc ngành để thêm, nên có 5–10 lựa chọn.');
  const O=$('#nv-out');
  if(score==null||!list.length){O.innerHTML=`<div class="nv-card nv-empty"><h2 class="nv-h2">Thứ tự đề xuất sẽ hiện ở đây</h2><p class="nv-help">Nhập điểm dự kiến và thêm ít nhất 1 nguyện vọng.</p></div>${rulesBox()}`; return;}
  const rec=optimize(list), ch=chain(rec), mine=chain(list);
  const any=1-ch[ch.length-1].fail;
  const cnt={safe:0,target:0,reach:0,hard:0,na:0}; list.forEach(x=>cnt[x.a.grp]++);
  const expRec=rec.reduce((s,x,i)=>s+ch[i].land*x.star,0), expMine=list.reduce((s,x,i)=>s+mine[i].land*x.star,0);
    const blocked=rec.filter((x,i)=>rec.slice(0,i).some(y=>y.a.ok&&y.a.prob>=.95));
  const anyLo=Math.max(0,...rec.map(x=>x.a.ok?x.a.prob:0));
  // cảnh báo
  const al=[];
  if(!cnt.safe) al.push(['bad',`<b>Chưa có nguyện vọng an toàn (≥90%).</b> Nếu điểm chuẩn ${NEXT} tăng, bạn có thể trượt tất cả. Hãy thêm ít nhất 1–2 NV an toàn làm chốt chặn cuối; gợi ý ở bên dưới.`]);
  if(cnt.hard) al.push(['warn',`<b>${cnt.hard} nguyện vọng rất khó (dưới 20%).</b> Giữ lại nếu bạn thật sự thích, vì đặt ở đầu không làm hại các NV khác; nhưng mỗi NV chiếm 1 trong ${MAXNV} suất đăng ký.`]);
  if(cnt.na) al.push(['bad',`<b>${cnt.na} nguyện vọng không xét tổ hợp ${S.combo}.</b> Bạn sẽ không được xét ở các NV này.`]);
  if(blocked.length) al.push(['warn',`<b>${blocked.length} nguyện vọng gần như không bao giờ được xét tới</b> vì đứng sau một NV gần chắc đỗ (từ 95%): ${blocked.map(x=>esc(x.p.n)+' – '+esc(UNI(x.p.u)[0])).join('; ')}. Nếu thích hơn, chấm thêm sao để đưa lên; nếu không, có thể bỏ để dành chỗ.`]);
  if(list.filter(x=>isSP(x.p)).length>SP_MAX) al.push(['bad',`<b>Có hơn ${SP_MAX} NV ngành sư phạm.</b> Quy chế 2026 chỉ xét NV sư phạm ở thứ tự 1–5.`]);
  if(cnt.safe>=1&&!blocked.length&&anyLo>=.9) al.push(['ok',`<b>Danh sách cân đối.</b> Có ${cnt.reach+cnt.hard} NV mạo hiểm để thử sức, ${cnt.target} NV vừa sức và ${cnt.safe} NV an toàn làm chốt chặn.`]);
  const changed=rec.some((x,i)=>x.idx!==i);
  let h=`<div class="nv-tiles">
    <div class="nv-card nv-tile"><span class="nv-k">Đỗ ít nhất 1 NV</span><span class="nv-v">${Math.round(anyLo*100)===Math.round(any*100)||any-anyLo<.01?pct(any):`${Math.round(anyLo*100)}–${pct(any)}`}</span><span class="nv-d">khoảng ước tính, xem cách tính</span></div>
    <div class="nv-card nv-tile"><span class="nv-k">Mạo hiểm / Rất khó</span><span class="nv-v">${cnt.reach} / ${cnt.hard}</span><span class="nv-d">xác suất dưới 60%</span></div>
    <div class="nv-card nv-tile"><span class="nv-k">Vừa sức</span><span class="nv-v">${cnt.target}</span><span class="nv-d">60% đến dưới 90%</span></div>
    <div class="nv-card nv-tile"><span class="nv-k">An toàn</span><span class="nv-v">${cnt.safe}</span><span class="nv-d">từ 90% trở lên</span></div></div>
   <div class="nv-alerts">${al.map(([c,t])=>`<div class="nv-alert nv-${c}">${t}</div>`).join('')}</div>
   <div class="nv-card nv-plan"><h2>Thứ tự đăng ký đề xuất</h2><p>${changed?`Đã sắp xếp lại ${rec.filter((x,i)=>x.idx!==i).length}/${rec.length} nguyện vọng so với thứ tự bạn nhập. Với cùng mức mong muốn, NV khó đứng trước, NV an toàn đứng cuối.`:'Thứ tự bạn nhập đã tối ưu, không cần đổi.'}</p>
   <div class="nv-legend" style="margin:0 18px 6px"><span>Biểu đồ nhỏ: điểm chuẩn ${YEARS.join("–")}, ô xanh nhạt là khoảng dự báo ${NEXT}, nét đứt xanh lá là điểm của bạn.</span></div>
   <div class="nv-tbl"><table><thead><tr><th>NV</th><th>Ngành, trường</th><th class="nv-num">Xác suất đỗ</th><th>Điểm chuẩn</th><th class="nv-num">Trúng ở NV này</th></tr></thead><tbody>
   ${rec.map((x,i)=>{const u=UNI(x.p.u); return `<tr>
     <td><span class="nv-nvno">NV${i+1}</span>${moveText(x,i)}</td>
     <td><div class="nv-prog">${esc(x.p.n)}</div><div class="nv-meta">${SHOW_LINKS&&u[3]?`<a href="${esc(u[3])}">${esc(u[1])}</a>`:esc(u[1])} · mã ${esc(x.p.c)}${x.p.t?' · '+esc(TYPE[x.p.t]||x.p.t):''}${u[2]?' · VNUR #'+u[2]:''} · ${'★'.repeat(x.star)}</div></td>
     <td class="nv-num"><div class="nv-prob"><span><span class="nv-tag nv-${x.a.grp}">${GRP[x.a.grp].n}</span> <b>${x.a.ok?pct(x.a.prob):'–'}</b></span><span class="nv-ptrack"><i style="width:${Math.round(x.a.prob*100)}%;background:${GRP[x.a.grp].c}"></i></span></div></td>
     <td>${x.a.ok?spark(x.a.h,x.a):''}</td>
     <td class="nv-num">${pct(ch[i].land)}<div class="nv-meta">được xét tới: ${pct(ch[i].reach)}</div></td></tr>
     <tr class="nv-sub"><td></td><td colspan="4"><div class="nv-why">${why(x,score)}${moveReason(x,i,rec)}</div></td></tr>`;}).join('')}
   </tbody></table></div></div>`;
  // phân bố kết quả
  const rows=rec.map((x,i)=>({l:`NV${i+1} · ${UNI(x.p.u)[0]}`,v:ch[i].land,c:GRP[x.a.grp].c})).concat([{l:'Trượt tất cả',v:ch[ch.length-1].fail,c:'var(--hard)'}]);
  const mx=Math.max(...rows.map(r=>r.v),.01);
  h+=`<div class="nv-card nv-flow"><h2>Bạn có khả năng trúng ở đâu?</h2><p class="nv-help">Mỗi thí sinh chỉ trúng 1 nguyện vọng, là NV cao nhất mà bạn đủ điểm. Thanh dưới đây là xác suất kết quả cuối cùng rơi vào từng NV theo thứ tự đề xuất.</p>
   ${rows.map(r=>`<div class="nv-fbar"><span class="nv-l" title="${esc(r.l)}">${esc(r.l)}</span><span class="nv-tr"><i style="width:${(r.v/mx*100).toFixed(1)}%;background:${r.c}"></i></span><span class="nv-v">${pct(r.v)}</span></div>`).join('')}
   <p class="nv-help">${new Set(list.map(x=>x.star)).size>1?`Mức mong muốn kỳ vọng (số sao trung bình của nơi trúng tuyển): thứ tự bạn nhập ${fmt(expMine,2)} sao, thứ tự đề xuất ${fmt(expRec,2)} sao. `:''}Đổi thứ tự không làm thay đổi khả năng đỗ ít nhất 1 NV; nó quyết định bạn trúng ở NV nào. Với thứ tự bạn nhập, khả năng trúng ngay NV1 là ${pct(mine[0].land)}${list[0]?` (${esc(list[0].p.n)} – ${esc(UNI(list[0].p.u)[0])})`:''}; với thứ tự đề xuất là ${pct(ch[0].land)} cho lựa chọn khó nhất, và các NV phía sau vẫn còn nguyên cơ hội.</p></div>`;
  // gợi ý NV an toàn
  if(cnt.safe<2) h+=safeSuggest(list,score);
  // sao chép
  h+=`<div class="nv-card nv-sec"><h2>Danh sách để nhập lên hệ thống</h2><p class="nv-help">Sao chép rồi đối chiếu khi đăng ký trên Cổng tuyển sinh của Bộ GD&ĐT.</p>
   <textarea class="nv-copy" id="nv-copytext" readonly>${esc(rec.map((x,i)=>`NV${i+1}: ${x.p.u} - ${x.p.c} - ${x.p.n} (${UNI(x.p.u)[1]})${S.combo?' - tổ hợp '+S.combo:''}`).join('\n'))}</textarea>
   <div><button class="nv-btn" type="button" id="nv-copy">Sao chép danh sách</button> <span class="nv-toast" id="nv-toast"></span></div></div>`;
  h+=rulesBox()+methodBox();
  O.innerHTML=h;
  O.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>add(BYKEY.get(b.dataset.add)));
  const cp=$('#nv-copy'); if(cp) cp.onclick=async()=>{try{await navigator.clipboard.writeText($('#nv-copytext').value); $('#nv-toast').textContent='Đã sao chép.';}catch(e){$('#nv-copytext').select(); $('#nv-toast').textContent='Trình duyệt chặn sao chép, hãy nhấn Ctrl+C.';}};
}
function safeSuggest(list,score){
  const majors=new Set(list.map(x=>x.p.m).filter(Boolean)), groups=new Set([...majors].map(m=>m.slice(0,5)));
  const have=new Set(list.map(x=>KEY(x.p)));
  const cand=PROGS.filter(p=>!have.has(KEY(p))&&(majors.has(p.m)||groups.has((p.m||'').slice(0,5)))).map(p=>({p,a:assess(p,score,S.combo)})).filter(x=>x.a.ok&&x.a.prob>=.9)
    .sort((x,y)=>(majors.has(y.p.m)?1:0)-(majors.has(x.p.m)?1:0)||(UNI(x.p.u)[2]??999)-(UNI(y.p.u)[2]??999)||y.p.h[2]-x.p.h[2]).slice(0,6);
  if(!cand.length) return '';
  return `<div class="nv-card nv-sec"><h2>Gợi ý thêm nguyện vọng an toàn</h2><p class="nv-help">Cùng ngành hoặc nhóm ngành với danh sách của bạn, xác suất đỗ từ 90%, ưu tiên trường xếp hạng VNUR cao.</p>
   ${cand.map(({p,a})=>{const u=UNI(p.u); return `<div class="nv-sugrow"><span><b>${esc(p.n)}</b><br><span class="nv-meta">${esc(u[1])}${u[2]?' · VNUR #'+u[2]:''} · chuẩn ${YEARS[2]}: ${fmt(p.h[2])}</span></span><span class="nv-tag nv-safe">${pct(a.prob)}</span><button class="nv-btn nv-sm" type="button" data-add="${KEY(p)}">+ Thêm</button></div>`;}).join('')}</div>`;
}
function rulesBox(){return `<div class="nv-card nv-sec"><h2>Quy tắc xét nguyện vọng cần nhớ</h2><ul>
  <li>Mọi nguyện vọng được xét bình đẳng theo điểm; nếu đủ điểm nhiều NV, bạn chỉ trúng NV có thứ tự cao nhất. Vì vậy NV1 nên là nơi bạn muốn học nhất, kể cả khi khó đỗ.</li>
  <li>Đặt NV an toàn lên trên là cách “lãng phí điểm” phổ biến nhất: bạn trúng ngay NV đó và các NV mong muốn hơn phía sau không còn được xét.</li>
  <li>Quy chế tuyển sinh 2026 (Thông tư 06/2026/TT-BGDĐT): tối đa ${MAXNV} nguyện vọng; ngành sư phạm chỉ xét ở NV1–5. Quy chế ${NEXT} có thể thay đổi, hãy cập nhật khi Bộ công bố.</li>
  <li>Luôn đối chiếu đề án tuyển sinh ${NEXT} của từng trường: chỉ tiêu, tổ hợp và cách quy đổi điểm có thể khác năm trước.</li></ul></div>`;}
function methodBox(){const m=MD; return `<div class="nv-card nv-sec nv-method"><h2>Cách tính xác suất</h2>
  <p class="nv-help">Site hiện có điểm chuẩn THPT 3 năm (${YEARS.join(", ")}), chưa đủ 5 năm. Mô hình học từ chính dữ liệu này: với ${m.n3.toLocaleString('vi-VN')} chương trình có đủ 3 năm, dự báo điểm chuẩn ${YEARS[2]} từ ${YEARS[0]}–${YEARS[1]} rồi so với điểm thật.</p>
  <ul><li><b>Dự báo:</b> trung bình của điểm chuẩn năm gần nhất và một hồi quy có xu hướng kéo về mức trung bình (ngành điểm rất cao thường giảm nhẹ, ngành điểm thấp thường tăng nhẹ). Sai số tuyệt đối trung bình khi kiểm lại: ${fmt(m.mae2)} điểm, so với ${fmt(m.mae_last)} điểm nếu chỉ lấy điểm năm trước.</li>
  <li><b>Xác suất:</b> không giả định phân phối chuẩn. Hệ thống dùng phân phối sai số dự báo thật, chia 3 nhóm theo mức dao động giữa hai năm gần nhất (${m.n2.map(n=>n.toLocaleString('vi-VN')).join(' / ')} chương trình). Chương trình chỉ có 1 năm dùng phân phối riêng, rộng hơn (${m.n1.toLocaleString('vi-VN')} cặp năm).</li>
  <li><b>Kiểm định:</b> chia đôi dữ liệu, học ở một nửa rồi kiểm ở nửa còn lại; các mức xác suất ${m.calib.map(([p,o])=>`${Math.round(p*100)}% → thực tế ${Math.round(o*100)}%`).join(', ')}.</li>
  <li><b>Nhóm:</b> Rất khó dưới 20%, Mạo hiểm 20% đến dưới 60%, Vừa sức 60% đến dưới 90%, An toàn từ 90%.</li>
  <li><b>Giới hạn:</b> mô hình mới học từ một lần chuyển năm (${YEARS[1]} → ${YEARS[2]}), việc thay đổi kỳ thi giữa các năm có thể ảnh hưởng kết quả. “Đỗ ít nhất 1 NV” hiện dạng khoảng: cận dưới là xác suất của NV dễ nhất (khi điểm chuẩn mọi ngành cùng tăng giảm), cận trên là khi các NV độc lập với nhau. Thực tế nằm giữa hai mức này. Kết quả chỉ để tham khảo.</li></ul></div>`;}
render();

}
window.NV = { open };
})();
