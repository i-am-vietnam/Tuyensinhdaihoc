/* Tab "Tư vấn chọn ngành": RIASEC + MBTI + giá trị + học lực + điều kiện + điểm chuẩn THPT.
   Chuyển từ docs/prototype/tu-van-chon-nganh.prototype.html; câu hỏi, trọng số, cách giải thích giữ nguyên.
   Dữ liệu: api/career (uvicorn) hoặc data/career.json (bản tĩnh). Biến toàn cục duy nhất: window.Career. */
(function () {
  "use strict";
  const ROOT = document.getElementById("tab-career");
  if (!ROOT) return;
  const $ = (s) => ROOT.querySelector(s);

  /* ============ CÂU HỎI ============ */
  const RIASEC = {
    R:{name:'Kỹ thuật',desc:'làm việc với máy móc, công cụ, vật thể cụ thể'},
    I:{name:'Nghiên cứu',desc:'quan sát, phân tích, giải quyết vấn đề bằng tư duy'},
    A:{name:'Nghệ thuật',desc:'sáng tạo, tự do thể hiện bằng hình ảnh, âm thanh, ngôn từ'},
    S:{name:'Xã hội',desc:'giúp đỡ, giảng giải, chăm sóc con người'},
    E:{name:'Quản lý',desc:'thuyết phục, dẫn dắt, kinh doanh, chấp nhận rủi ro'},
    C:{name:'Nghiệp vụ',desc:'làm việc có quy trình, chính xác với số liệu, hồ sơ'}
  };
  const R_ITEMS = [
   ['R','Sửa xe đạp, đồ điện hoặc thiết bị hỏng trong nhà'],['I','Tìm hiểu vì sao một hiện tượng tự nhiên xảy ra'],['A','Vẽ, thiết kế, chụp ảnh hoặc dựng video'],
   ['S','Giảng lại bài cho bạn khi họ chưa hiểu'],['E','Thuyết phục người khác làm theo ý tưởng của mình'],['C','Sắp xếp tài liệu, ghi chép gọn gàng, có hệ thống'],
   ['R','Lắp ráp mô hình, mạch điện, đồ gỗ theo bản vẽ'],['I','Giải bài toán khó hoặc câu đố logic'],['A','Viết truyện, thơ, blog hoặc kịch bản'],
   ['S','Lắng nghe và an ủi khi ai đó gặp chuyện buồn'],['E','Làm lớp trưởng, trưởng nhóm, đứng ra dẫn dắt'],['C','Làm việc theo quy trình, hướng dẫn rõ từng bước'],
   ['R','Làm việc ngoài trời, vận động tay chân'],['I','Làm thí nghiệm, kiểm chứng một giả thuyết'],['A','Chơi nhạc, hát, diễn kịch hoặc nhảy'],
   ['S','Tham gia hoạt động tình nguyện, giúp cộng đồng'],['E','Buôn bán, kinh doanh nhỏ hoặc bán hàng online'],['C','Kiểm tra lỗi, đối chiếu số liệu cho chính xác'],
   ['R','Dùng công cụ, máy móc để tạo ra sản phẩm cụ thể'],['I','Đọc sách, xem video về khoa học, công nghệ'],['A','Trang trí, phối màu, sắp xếp không gian cho đẹp'],
   ['S','Làm việc nhóm, kết nối và hòa giải mọi người'],['E','Đặt mục tiêu cao và cạnh tranh để giành chiến thắng'],['C','Lập kế hoạch chi tiêu, làm bảng tính Excel'],
   ['R','Chăm sóc cây trồng, vật nuôi'],['I','Phân tích số liệu để tìm ra quy luật'],['A','Nghĩ ra cách làm mới lạ, không theo khuôn mẫu'],
   ['S','Chăm sóc trẻ nhỏ, người già hoặc người ốm'],['E','Thuyết trình, nói trước đám đông'],['C','Làm việc với sổ sách, con số cần chính xác cao']
  ];
  /* MBTI: 4 trục, mỗi trục 4 cặp câu; thêm trục "Vững vàng" (MBTI không có) vì nhiều nghề đòi chịu áp lực.
     [trục, câu bên trái, câu bên phải, cực "+" nằm bên phải?] ; cực +: E, N, F, J, Vững vàng */
  const DIMS = {
    EI:{plus:'E',minus:'I',pn:'Hướng ngoại',mn:'Hướng nội',need:{p:'giao tiếp nhiều, chủ động gặp gỡ người khác',m:'tập trung làm việc độc lập trong thời gian dài'}},
    SN:{plus:'N',minus:'S',pn:'Trực giác',mn:'Giác quan',need:{p:'thích ý tưởng mới, tư duy trừu tượng, nhìn bức tranh lớn',m:'chú ý chi tiết thực tế, làm việc với dữ kiện cụ thể'}},
    TF:{plus:'F',minus:'T',pn:'Cảm xúc',mn:'Lý trí',need:{p:'đồng cảm, quan tâm đến cảm xúc người khác',m:'quyết định bằng logic và dữ kiện khách quan'}},
    JP:{plus:'J',minus:'P',pn:'Nguyên tắc',mn:'Linh hoạt',need:{p:'kỷ luật, có kế hoạch, tuân thủ quy trình',m:'linh hoạt, thích nghi nhanh khi kế hoạch thay đổi'}},
    RS:{plus:'',minus:'',pn:'Vững vàng',mn:'Dễ căng thẳng',need:{p:'giữ bình tĩnh khi chịu áp lực cao',m:'môi trường ít áp lực'}}
  };
  const M_ITEMS = [
   ['EI','Sau một ngày mệt, tôi nạp lại năng lượng bằng cách ở một mình','Sau một ngày mệt, tôi thích đi chơi, gặp bạn bè',1],
   ['SN','Khi học, tôi thích ví dụ cụ thể và cách làm từng bước','Khi học, tôi thích hiểu nguyên lý, ý tưởng tổng quát',1],
   ['TF','Khi quyết định, tôi dựa vào lý lẽ và dữ kiện','Khi quyết định, tôi nghĩ nhiều đến cảm xúc của mọi người',1],
   ['JP','Với bài tập lớn, tôi lên kế hoạch và làm dần từ sớm','Với bài tập lớn, tôi dồn sức làm khi gần hạn',0],
   ['RS','Trước kỳ thi quan trọng, tôi lo lắng, khó ngủ','Trước kỳ thi quan trọng, tôi hồi hộp nhưng vẫn bình tĩnh',1],
   ['EI','Ở nhóm mới, tôi chủ động bắt chuyện ngay','Ở nhóm mới, tôi quan sát trước rồi mới nói',0],
   ['SN','Tôi tin vào kinh nghiệm thực tế, điều đã kiểm chứng','Tôi tin vào trực giác và những khả năng trong tương lai',1],
   ['TF','Bạn làm sai, tôi nói thẳng chỗ sai để sửa','Bạn làm sai, tôi tế nhị và động viên trước',1],
   ['JP','Tôi thoải mái khi mọi việc đã được quyết định rõ','Tôi thích để ngỏ lựa chọn, tùy tình hình',0],
   ['RS','Khi bị phê bình, tôi tiếp thu rồi cho qua nhanh','Khi bị phê bình, tôi buồn và nghĩ về nó khá lâu',0],
   ['EI','Tôi suy nghĩ tốt nhất khi tự ngẫm hoặc viết ra','Tôi suy nghĩ tốt nhất khi nói ra, trao đổi với người khác',1],
   ['SN','Tôi hay để ý ý nghĩa, mối liên hệ, bức tranh lớn','Tôi hay để ý chi tiết, con số, sự kiện cụ thể',0],
   ['TF','Tôi được khen nhiều về sự tử tế, biết quan tâm','Tôi được khen nhiều về đầu óc logic, công bằng',0],
   ['JP','Góc học tập của tôi hơi bừa nhưng tôi biết đồ ở đâu','Góc học tập của tôi ngăn nắp, có trật tự',1],
   ['RS','Khi nhiều việc dồn cùng lúc, tôi dễ rối và căng thẳng','Khi nhiều việc dồn cùng lúc, tôi vẫn xử lý từng việc',1],
   ['EI','Tôi thích vài người bạn thật thân','Tôi thích có nhiều mối quan hệ rộng',1],
   ['SN','Tôi thích thử cách mới dù chưa chắc chắn','Tôi thích làm theo cách đã chứng minh hiệu quả',0],
   ['TF','Trong tranh luận, quan trọng nhất là tìm ra đáp án đúng','Trong tranh luận, quan trọng nhất là giữ hòa khí',1],
   ['JP','Chuyến đi lý tưởng là đi đến đâu tính đến đó','Chuyến đi lý tưởng là có lịch trình cụ thể',1],
   ['RS','Khi thất bại, tôi rút kinh nghiệm và thử lại','Khi thất bại, tôi hay tự trách mình',0]
  ];
  const TYPE_NAME = {INTJ:'Nhà chiến lược',INTP:'Nhà tư duy',ENTJ:'Người chỉ huy',ENTP:'Người tranh biện',INFJ:'Người cố vấn',INFP:'Người lý tưởng',ENFJ:'Người dẫn dắt',ENFP:'Người truyền cảm hứng',ISTJ:'Người chu toàn',ISFJ:'Người tận tụy',ESTJ:'Người điều hành',ESFJ:'Người chăm lo',ISTP:'Người thợ giỏi',ISFP:'Người nghệ sĩ',ESTP:'Người hành động',ESFP:'Người trình diễn'};
  const VALUES = {income:'Thu nhập cao',stable:'Ổn định, ít rủi ro',creative:'Sáng tạo, tự do thể hiện',impact:'Giúp người, có ích cho xã hội',status:'Được công nhận, có vị thế',autonomy:'Tự chủ, có thể khởi nghiệp',learning:'Học hỏi, khám phá tri thức',balance:'Cân bằng công việc và cuộc sống'};
  const SUBJ = {toan:'Toán',van:'Ngữ văn',anh:'Tiếng Anh',ly:'Vật lí',hoa:'Hóa học',sinh:'Sinh học',su:'Lịch sử',dia:'Địa lí',tin:'Tin học',gdkt:'GD KT&PL',cncn:'CN công nghiệp',cnnn:'CN nông nghiệp',nnk:'Ngoại ngữ khác',ve:'Năng khiếu vẽ',nk:'NK âm nhạc, biểu diễn, TDTT'};
  const SUBJ_MAIN=['toan','van','anh','ly','hoa','sinh','su','dia','tin','gdkt'], SUBJ_EXTRA=['cncn','cnnn','nnk','ve','nk'];

  /* ============ DỮ LIỆU (nạp khi mở tab lần đầu) ============
     PROF: hồ sơ ngành từ data/manual/career_profiles.json (h: mã Holland, s: trọng số môn, t: yêu cầu tính cách,
     v: giá trị, env, st: áp lực, yrs: số năm học, physical: sơ tuyển thể lực) + tên chuẩn, điểm chuẩn từ DB. */
  let D = null, PROF = [], YEAR = 2026, SHOW_LINKS = false;
  function build(data) {
    D = data; YEAR = data.year;
    PROF = data.profiles.map((p) => ({
      code: p.code, g: p.group, h: p.holland, s: p.subjects, t: p.traits, v: p.values,
      env: p.env, st: p.stress, yrs: p.years, physical: p.physical, jobs: p.jobs, note: p.note,
      name: p.name, rows: (data.majors[p.code] || { rows: [] }).rows, slug: data.major_pages[p.code] || ""
    }));
    PROF.forEach(m=>{
      const cnt={}; let onlyVe=0, onlyNk=0;
      m.rows.forEach(r=>{const cbs=r[2].split(';'); cbs.forEach(c=>cnt[c]=(cnt[c]||0)+1);
        if(cbs.every(c=>D.combos[c].includes('ve'))) onlyVe++; if(cbs.every(c=>D.combos[c].includes('nk'))) onlyNk++;});
      m.topCombos=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>x[0]);
      m.veShare=m.rows.length?onlyVe/m.rows.length:0; m.nkShare=m.rows.length?onlyNk/m.rows.length:0;
      m.nUni=new Set(m.rows.map(r=>r[0])).size;
    });
  }

  /* ============ HỒ SƠ MẪU & LƯU TRỮ ============ */
  const SAMPLE_PLUS=[2,2,2,2, 4,4,4,5, 2,2,2,2, 4,4,3,3, 4,3,4,4]; // theo thứ tự trục EI×4, SN×4, TF×4, JP×4, RS×4 (giá trị hướng về cực +)
  function sampleB(){const idx={EI:0,SN:0,TF:0,JP:0,RS:0}, base={EI:0,SN:4,TF:8,JP:12,RS:16};
    return M_ITEMS.map(it=>{const x=SAMPLE_PLUS[base[it[0]]+idx[it[0]]++]; return it[3]?x:6-x;});}
  const SAMPLE = ()=>({
    r:[4,5,2,3,2,3, 4,5,2,3,2,4, 3,4,2,2,2,4, 4,5,2,3,3,3, 2,5,4,2,2,3],
    b:sampleB(),
    v:{income:4,stable:3,creative:3,impact:3,status:2,autonomy:4,learning:5,balance:4},
    g:{toan:8.6,van:6.8,anh:7.6,ly:8.2,hoa:7.4,sinh:6.9,su:6.5,dia:7.0,tin:8.8,gdkt:7.5},
    ex:{toan:1,van:1,ly:1,tin:1},
    prio:0.25,
    cond:{env:'office',st:3,yrs:'maybe',physical:'any'}
  });
  const BLANK = ()=>({r:Array(30).fill(null),b:Array(20).fill(null),v:{},g:{},ex:{toan:1,van:1},prio:0,cond:{env:'any',st:3,yrs:'maybe',physical:'any'}});
  const KEY='dtdh-tuvan-nganh-v2';
  let S=null, isSample=true;
  try{const o=JSON.parse(localStorage.getItem(KEY)||'null'); if(o&&o.s&&o.s.b&&o.s.b.length===20){S=o.s; isSample=!!o.sample;}}catch(e){}
  if(!S) S=SAMPLE();
  function save(){try{localStorage.setItem(KEY,JSON.stringify({s:S,sample:isSample}));}catch(e){}}

  /* ============ TÍNH TOÁN ============ */
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
  const fmt=(x,d=1)=>x==null||isNaN(x)?'–':(Math.round(x*10**d)/10**d).toLocaleString('vi-VN');
  const hasG=k=>S.g[k]!=null && S.g[k]!=='' && !isNaN(S.g[k]);
  function profile(){
    const ri={},riRaw={};
    for(const k in RIASEC){const v=R_ITEMS.map((it,i)=>it[0]===k?S.r[i]:null).filter(x=>x!=null); riRaw[k]=v.length?mean(v):null; ri[k]=riRaw[k]==null?.5:(riRaw[k]-1)/4;}
    const mb={},mbN={};
    for(const k in DIMS){const v=M_ITEMS.map((it,i)=>it[0]===k&&S.b[i]!=null?(it[3]?S.b[i]:6-S.b[i]):null).filter(x=>x!=null); mbN[k]=v.length; mb[k]=v.length?(mean(v)-1)/4:.5;}
    const type=['EI','SN','TF','JP'].map(k=>mb[k]>=.5?DIMS[k].plus:DIMS[k].minus).join('');
    const va={}; for(const k in VALUES) va[k]=S.v[k]==null?.5:(S.v[k]-1)/4;
    const vaMean=mean(Object.values(va));
    const gs=Object.keys(SUBJ).filter(k=>hasG(k)&&k!=='ve'&&k!=='nk').map(k=>Number(S.g[k]));
    const gAvg=gs.length?mean(gs):null;
    const order=Object.keys(RIASEC).sort((a,b)=>ri[b]-ri[a]);
    const vals=Object.values(ri), spread=Math.max(...vals)-Math.min(...vals);
    // Đối chiếu chéo RIASEC × MBTI
    const checks=[
      {a:'Nhóm Xã hội + Quản lý (RIASEC)',b:'Hướng ngoại (MBTI)',x:(ri.S+ri.E)/2,y:mb.EI},
      {a:'Nhóm Nghệ thuật + Nghiên cứu',b:'Trực giác (N)',x:(ri.A+ri.I)/2,y:mb.SN},
      {a:'Nhóm Nghiệp vụ (C)',b:'Nguyên tắc (J)',x:ri.C,y:mb.JP}
    ].map(c=>Object.assign(c,{ok:Math.abs(c.x-c.y)<=.3}));
    return {ri,riRaw,mb,mbN,type,va,vaMean,gAvg,gCount:gs.length,order,code:order.slice(0,3).join(''),spread,checks,
      nR:S.r.filter(x=>x!=null).length,nB:S.b.filter(x=>x!=null).length,nV:Object.keys(S.v).length};
  }
  function comboScore(cb){
    const subs=D.combos[cb]; if(!subs) return null;
    let t=0; for(const s of subs){ if(!S.ex[s]||!hasG(s)) return null; t+=Number(S.g[s]); }
    return t+(Number(S.prio)||0);
  }
  function myCombos(){
    return Object.keys(D.combos).map(c=>({c,v:comboScore(c)})).filter(x=>x.v!=null).sort((a,b)=>b.v-a.v);
  }
  const HW=[1,.6,.35];
  function interestFit(m,P){
    const w={R:0,I:0,A:0,S:0,E:0,C:0}; m.h.split('').forEach((L,i)=>w[L]=HW[i]);
    let n=0,d=0; for(const k in w){n+=w[k]*P.ri[k]; d+=w[k];}
    const ks=Object.keys(w), um=mean(ks.map(k=>P.ri[k])), wm=mean(ks.map(k=>w[k]));
    let dot=0,a2=0,b2=0; ks.forEach(k=>{const a=P.ri[k]-um,b=w[k]-wm; dot+=a*b; a2+=a*a; b2+=b*b;});
    const cos=a2>1e-4?dot/Math.sqrt(a2*b2):0;
    return .65*(n/d)+.35*(cos+1)/2;
  }
  function gradeOf(k,P){return hasG(k)?Number(S.g[k]):(P.gAvg??6.5);}
  function academicFit(m,P){
    let n=0,d=0; for(const k in m.s){n+=m.s[k]*gradeOf(k,P); d+=m.s[k];}
    const avg=n/d; return {fit:.75*clamp((avg-5)/4.5)+.25*clamp(.5+(avg-(P.gAvg??avg))/2.5),avg};
  }
  function persFit(m,P){
    let n=0,d=0; for(const k in m.t){const v=m.t[k]; if(P.mbN[k]===0) continue; n+=Math.abs(v)*Math.abs(.5+v/2-P.mb[k]); d+=Math.abs(v);}
    return d?1-n/d:.6;
  }
  function valueFit(m,P){
    const mv=mean(m.v.map(k=>P.va[k]));
    let f=.65*mv+.35*clamp(.5+(mv-P.vaMean));
    if(m.st>=4&&P.va.balance>.5) f-=(P.va.balance-.5)*.25*(m.st-3);
    return clamp(f);
  }
  function needVe(m){return m.veShare>=.8;}
  function needNk(m){return m.nkShare>=.8 || (m.physical && m.code==='7140206');}
  function practFit(m){
    const c=S.cond; let x=1, hard=0;
    if(c.env!=='any'&&m.env!==c.env) x-=(m.env==='mix'||c.env==='mix')?.12:.35;
    if(m.st>c.st) x-=.15*(m.st-c.st);
    if(m.yrs>=5){ if(c.yrs==='no') x-=m.yrs>=6?.45:.3; else if(c.yrs==='maybe') x-=m.yrs>=6?.12:.06; }
    if(needVe(m)&&!S.ex.ve){x-=.5; hard+=15;}
    if(needNk(m)&&!S.ex.nk){x-=.5; hard+=15;}
    if(m.physical&&c.physical==='no'){x-=.5; hard+=15;}
    return {fit:clamp(x),hard};
  }
  function feasibility(m){
    const mc=myCombos(); if(!mc.length) return null;
    const list=[]; let elig=0;
    m.rows.forEach(r=>{
      let best=null,bc=null; r[2].split(';').forEach(c=>{const v=comboScore(c); if(v!=null&&(best==null||v>best)){best=v;bc=c;}});
      if(best==null) return; elig++;
      const diff=best-r[1], lvl=diff>=1?'safe':diff>=0?'fit':diff>=-1?'try':null;
      if(lvl) list.push({u:r[0],cut:r[1],type:r[3],my:best,cb:bc,lvl,diff});
    });
    const n={safe:0,fit:0,try:0}; list.forEach(x=>n[x.lvl]++);
    const fit=elig?clamp((n.safe+.8*n.fit+.35*n.try)/5):0;
    return {fit,elig,total:m.rows.length,n,list};
  }
  const W={i:.35,a:.20,p:.15,v:.15,x:.15};
  const DN={i:'Sở thích',a:'Học lực',p:'Tính cách',v:'Giá trị',x:'Điều kiện',f:'Khả năng đỗ'};
  let sortMode='total';
  function scoreAll(P){
    return PROF.map(m=>{
      const ac=academicFit(m,P), px=practFit(m), fe=feasibility(m);
      const d={i:interestFit(m,P),a:ac.fit,p:persFit(m,P),v:valueFit(m,P),x:px.fit};
      let fit=0; for(const k in W) fit+=W[k]*d[k];
      fit=clamp(fit*100-px.hard,0,100);
      const hasF=fe&&m.rows.length>0;
      const total=hasF?.8*fit+.2*fe.fit*100:fit;
      return {m,d,fit,fe,total,acAvg:ac.avg,hard:px.hard};
    }).sort((a,b)=>sortMode==='fit'?b.fit-a.fit:b.total-a.total);
  }

  /* ============ GIẢI THÍCH ============ */
  const rn=k=>`${RIASEC[k].name} (${k})`;
  const dimLabel=(k,P)=>{const v=P.mb[k]; return v>=.5?`${DIMS[k].pn}${DIMS[k].plus?' ('+DIMS[k].plus+')':''} ${Math.round(v*100)}%`:`${DIMS[k].mn}${DIMS[k].minus?' ('+DIMS[k].minus+')':''} ${Math.round((1-v)*100)}%`;};
  function keySub(m){return Object.entries(m.s).sort((a,b)=>b[1]-a[1]).filter(([k,w],i)=>w>=2||i===0).map(([k])=>k);}
  const ENV={office:'trong văn phòng',field:'ở hiện trường, ngoài trời hoặc bệnh viện',mix:'kết hợp văn phòng và hiện trường'};
  function explain(res,P){
    const m=res.m, pros=[], cons=[];
    const L=m.h.split(''), L0=L[0], r0=P.order.indexOf(L0), raw0=P.riRaw[L0];
    const shared=L.filter(x=>P.order.slice(0,3).includes(x));
    if(r0<=1&&raw0!=null&&raw0>=3.4) pros.push({w:3,t:`Ngành mang mã Holland <b>${m.h}</b>. Nhóm ${rn(L0)}, sở thích chính của ngành, là nhóm mạnh ${r0===0?'nhất':'thứ hai'} của bạn (${fmt(raw0)}/5).`});
    else if(shared.length>=2) pros.push({w:2.4,t:`Mã ngành <b>${m.h}</b> trùng ${shared.length}/3 nhóm sở thích hàng đầu của bạn (<b>${P.code}</b>).`});
    if(raw0!=null&&raw0<2.9) cons.push({w:3,t:`Công việc chính của ngành thuộc nhóm ${rn(L0)}: ${RIASEC[L0].desc}. Bạn chỉ đạt ${fmt(raw0)}/5 ở nhóm này.`});
    const ks=keySub(m);
    if(P.gCount){
      if(res.d.a>=.62) pros.push({w:2.1,t:`Môn trọng tâm là ${ks.map(k=>`${SUBJ[k]} (${fmt(gradeOf(k,P))})`).join(', ')}; trung bình có trọng số ${fmt(res.acAvg)}${P.gAvg!=null?`, ${res.acAvg>=P.gAvg?'cao hơn':'gần'} mức chung ${fmt(P.gAvg)} của bạn`:''}.`});
      ks.forEach(k=>{const g=gradeOf(k,P); if(m.s[k]>=2&&g<6.5) cons.push({w:2.2,t:`${SUBJ[k]} là môn trọng tâm nhưng bạn đang ở mức ${fmt(g)}; năm nhất có nhiều học phần nền về môn này.`});});
    }
    for(const k in m.t){const v=m.t[k]; if(Math.abs(v)<.5||!P.mbN[k]) continue; const diff=Math.abs(.5+v/2-P.mb[k]); const need=v>0?DIMS[k].need.p:DIMS[k].need.m;
      if(diff<.3) pros.push({w:1.5,t:`Nghề cần người ${need}; bạn nghiêng về ${dimLabel(k,P)}.`});
      else if(diff>.5) cons.push({w:1.5,t:`Nghề cần người ${need}, còn bạn nghiêng về ${dimLabel(k,P)}.`});}
    const gv=m.v.filter(k=>S.v[k]>=4), lv=m.v.filter(k=>S.v[k]!=null&&S.v[k]<=2);
    if(gv.length) pros.push({w:1.6+gv.length*.2,t:`Đáp ứng điều bạn coi trọng: ${gv.map(k=>`${VALUES[k].toLowerCase()} (${S.v[k]}/5)`).join(', ')}.`});
    if(lv.length&&lv.length>=m.v.length/2) cons.push({w:1.3,t:`Thế mạnh của nghề là ${lv.map(k=>VALUES[k].toLowerCase()).join(', ')}, nhưng bạn không đặt nặng điều này.`});
    if(m.st>=4&&S.v.balance>=4) cons.push({w:1.5,t:`Bạn coi trọng cân bằng cuộc sống (${S.v.balance}/5), còn nghề này áp lực cao (${m.st}/5).`});
    const c=S.cond;
    if(needVe(m)&&!S.ex.ve) cons.push({w:4,t:`${Math.round(m.veShare*100)}% chương trình của ngành chỉ xét tổ hợp có môn Vẽ, bạn chưa chọn thi năng khiếu vẽ.`});
    else if(m.veShare>.2&&!S.ex.ve) cons.push({w:1,t:`${Math.round(m.veShare*100)}% chương trình bắt buộc thi Vẽ; số còn lại xét tổ hợp văn hóa.`});
    if(needNk(m)&&!S.ex.nk) cons.push({w:4,t:`Ngành có thi năng khiếu (âm nhạc, biểu diễn hoặc thể dục thể thao), bạn chưa chọn môn này.`});
    if(m.physical&&c.physical==='no') cons.push({w:4,t:`Ngành sơ tuyển sức khỏe, thể lực; bạn chọn “không phù hợp”.`});
    if(m.yrs>=5&&c.yrs==='no') cons.push({w:3,t:`Ngành học ${m.yrs} năm, bạn chọn không muốn học quá 4 năm.`});
    if(m.st>c.st+1) cons.push({w:1.8,t:`Mức áp lực của nghề (${m.st}/5) cao hơn mức bạn chấp nhận (${c.st}/5).`});
    if(c.env!=='any'&&m.env===c.env) pros.push({w:.9,t:`Môi trường làm việc ${ENV[m.env]}, đúng mong muốn của bạn.`});
    else if(c.env!=='any'&&m.env!=='mix'&&c.env!=='mix'&&m.env!==c.env) cons.push({w:1.5,t:`Công việc chủ yếu ${ENV[m.env]}, khác mong muốn ${ENV[c.env]} của bạn.`});
    const fe=res.fe;
    if(fe&&m.rows.length){
      if(!fe.elig) cons.push({w:3.2,t:`Không chương trình nào của ngành xét tổ hợp bạn thi (thường xét ${m.topCombos.slice(0,3).join(', ')}).`});
      else if(fe.n.safe+fe.n.fit>=3) pros.push({w:1.8,t:`Với điểm hiện tại, bạn đạt điểm chuẩn ${YEAR} ở ${fe.n.safe+fe.n.fit} chương trình (${fe.n.safe} an toàn, ${fe.n.fit} vừa sức).`});
      else if(fe.n.safe+fe.n.fit===0) cons.push({w:2.4,t:`Điểm của bạn chưa đạt điểm chuẩn ${YEAR} ở chương trình nào trong ${fe.elig} chương trình xét tổ hợp của bạn${fe.n.try?`; có ${fe.n.try} chương trình thử sức (thiếu dưới 1 điểm)`:''}.`});
    }
    pros.sort((a,b)=>b.w-a.w); cons.sort((a,b)=>b.w-a.w);
    return {pros:pros.slice(0,4),cons:cons.slice(0,3)};
  }
  function compare(A,B,P){
    const [hi,lo]=A.total>=B.total?[A,B]:[B,A];
    const Wf={i:W.i*.8,a:W.a*.8,p:W.p*.8,v:W.v*.8,x:W.x*.8,f:.2};
    const val=(r,k)=>k==='f'?(r.fe&&r.m.rows.length?r.fe.fit:null):r.d[k];
    const diffs=Object.keys(Wf).map(k=>{const a=val(hi,k),b=val(lo,k); return {k,v:a==null||b==null?0:Wf[k]*(a-b)*100};}).sort((a,b)=>b.v-a.v);
    const lines=diffs.filter(x=>x.v>.8).slice(0,3).map(({k,v})=>{
      const h=hi.m,l=lo.m, head=`<b>${DN[k]} (+${fmt(v)} điểm):</b> `;
      if(k==='i') return head+`${h.name} mang mã ${h.h}, ${l.name} mang mã ${l.h}. Nhóm chính của ${l.name} là ${rn(l.h[0])}, bạn đạt ${fmt(P.riRaw[l.h[0]])}/5; của ${h.name} là ${rn(h.h[0])}, bạn đạt ${fmt(P.riRaw[h.h[0]])}/5.`;
      if(k==='a') return head+`${l.name} dựa vào ${keySub(l).map(s=>`${SUBJ[s]} (${fmt(gradeOf(s,P))})`).join(', ')}; ${h.name} dựa vào ${keySub(h).map(s=>`${SUBJ[s]} (${fmt(gradeOf(s,P))})`).join(', ')}.`;
      if(k==='p'){const need=Object.entries(l.t).filter(([t,x])=>Math.abs(x)>=.5&&P.mbN[t]&&Math.abs(.5+x/2-P.mb[t])>.35).map(([t,x])=>`${x>0?DIMS[t].need.p:DIMS[t].need.m} (bạn: ${dimLabel(t,P)})`); return head+(need.length?`${l.name} cần người ${need.join('; ')}.`:`kiểu tính cách ${P.type} của bạn khớp ${h.name} hơn.`);}
      if(k==='v') return head+`${h.name} đáp ứng ${h.v.map(x=>VALUES[x].toLowerCase()).join(', ')}; ${l.name} thiên về ${l.v.map(x=>VALUES[x].toLowerCase()).join(', ')}.`;
      if(k==='x'){const ex=explain(lo,P).cons.filter(c=>/năng khiếu|Vẽ|học \d|áp lực của nghề|Công việc chủ yếu|sơ tuyển/.test(c.t)); return head+(ex.length?ex.map(e=>e.t).join(' '):`${l.name} có yêu cầu thực tế kém hợp với bạn hơn.`);}
      if(k==='f'){const f1=hi.fe,f2=lo.fe; return head+`với điểm của bạn, ${h.name} có ${f1.n.safe+f1.n.fit} chương trình đạt chuẩn ${YEAR}, ${l.name} có ${f2.n.safe+f2.n.fit}${!f2.elig?' (không xét tổ hợp bạn thi)':''}.`;}
    });
    return {hi,lo,lines,gap:hi.total-lo.total};
  }
  function pickSibling(res,ranked,i){const b=ranked.slice(i+1); return b.find(r=>r.m.g===res.m.g)||b.find(r=>r.m.h[0]===res.m.h[0])||b[0];}
  // Trang /truong/, /nganh/ chỉ có ở bản tĩnh (giống seoPages() trong app.js); đường dẫn tương đối.
  const link=(path,text)=>SHOW_LINKS&&path?`<a href="${path}">${text}</a>`:text;

  /* ============ GIAO DIỆN KHẢO SÁT ============ */
  const STEPS=[
    {id:'ri',label:'Sở thích',c:()=>[S.r.filter(x=>x!=null).length,30]},
    {id:'mb',label:'Tính cách',c:()=>[S.b.filter(x=>x!=null).length,20]},
    {id:'va',label:'Giá trị',c:()=>[Object.keys(S.v).length,8]},
    {id:'gr',label:'Điểm số',c:()=>[Object.keys(SUBJ).filter(hasG).length>=4?1:0,1]},
    {id:'co',label:'Điều kiện',c:()=>[1,1]}
  ];
  let step=0;
  const LK_R=['Rất ghét','Không thích','Bình thường','Thích','Rất thích'], LK_V=['Không cần','Ít','Vừa','Quan trọng','Rất quan trọng'];
  const likert=(name,val,lab)=>`<div class="tv-lk" role="radiogroup">${[1,2,3,4,5].map(n=>`<label><input type="radio" name="${name}" value="${n}" ${val===n?'checked':''} aria-label="${lab[n-1]}"><span><b>${n}</b>${lab[n-1]}</span></label>`).join('')}</div>`;
  function renderSteps(){
    $('#tv-steps').innerHTML=STEPS.map((s,i)=>{const [a,b]=s.c(); const done=a>=b; const lab=s.id==='gr'?(done?'✓':'chưa nhập'):s.id==='co'?'':done?'✓':`${a}/${b}`;
      return `<button class="tv-step" role="tab" type="button" aria-selected="${i===step}" data-i="${i}">${i+1}. ${s.label}<span class="n ${done&&s.id!=='co'?'ok':''}">${lab}</span></button>`;}).join('');
  }
  const combosHtml=mc=>mc.length?mc.slice(0,10).map(x=>`<span class="tv-cb">${x.c} · ${fmt(x.v,2)}</span>`).join('')+(mc.length>10?`<span class="tv-meta">và ${mc.length-10} tổ hợp khác</span>`:''):'<span class="tv-meta">Cần ít nhất 3 môn có đánh dấu “Thi” và có điểm.</span>';
  function renderStep(){
    const id=STEPS[step].id; let h='';
    if(id==='ri') h=`<h2 class="tv-sh">Bạn thích làm những việc này đến mức nào?</h2><p class="tv-help">Trắc nghiệm sở thích nghề nghiệp RIASEC (Holland). Chỉ cần thích hay không, đừng nghĩ mình có giỏi việc đó không.</p>`+R_ITEMS.map((it,i)=>`<div class="tv-q"><div class="tv-qt">${i+1}. ${it[1]}</div>${likert('r'+i,S.r[i],LK_R)}</div>`).join('');
    if(id==='mb') h=`<h2 class="tv-sh">Câu nào giống bạn hơn?</h2><p class="tv-help">Trắc nghiệm tính cách theo 4 trục MBTI và thêm trục “vững vàng trước áp lực”. Chấm tròn càng lệch về phía nào thì câu đó càng giống bạn; chấm giữa là như nhau.</p>`+
      M_ITEMS.map((it,i)=>`<div class="tv-q"><div class="tv-pair"><span class="l">${it[1]}</span><span class="tv-dots" role="radiogroup" aria-label="Câu ${i+1}">${[1,2,3,4,5].map(n=>`<label><input type="radio" name="b${i}" value="${n}" ${S.b[i]===n?'checked':''} aria-label="${['Rất giống câu trái','Hơi giống câu trái','Như nhau','Hơi giống câu phải','Rất giống câu phải'][n-1]}"><span></span></label>`).join('')}</span><span>${it[2]}</span></div></div>`).join('');
    if(id==='va') h=`<h2 class="tv-sh">Khi đi làm, điều gì quan trọng với bạn?</h2><p class="tv-help">Giá trị nghề nghiệp giúp phân biệt hai ngành có cùng nhóm sở thích.</p>`+Object.entries(VALUES).map(([k,n])=>`<div class="tv-q"><div class="tv-qt">${n}</div>${likert('v_'+k,S.v[k]??null,LK_V)}</div>`).join('');
    if(id==='gr'){
      const row=k=>`<tr><td><label for="g_${k}">${SUBJ[k]}</label></td><td><input type="number" id="g_${k}" min="0" max="10" step="0.05" inputmode="decimal" value="${S.g[k]??''}"></td><td class="c"><input type="checkbox" id="x_${k}" ${S.ex[k]?'checked':''} ${k==='toan'||k==='van'?'disabled':''} aria-label="Thi ${SUBJ[k]}"></td></tr>`;
      const mc=myCombos();
      h=`<h2 class="tv-sh">Điểm các môn và môn bạn thi</h2><p class="tv-help">Nhập điểm thi thử gần nhất (thang 10); chưa thi thử thì dùng điểm trung bình môn. Đánh dấu các môn bạn sẽ thi tốt nghiệp THPT: Toán, Văn bắt buộc, cộng 2 môn tự chọn và môn năng khiếu nếu có.</p>
      <table class="tv-subj"><thead><tr><th>Môn</th><th>Điểm</th><th class="c">Thi</th></tr></thead><tbody>${SUBJ_MAIN.map(row).join('')}<tr class="grp"><td colspan="3">Môn khác và năng khiếu</td></tr>${SUBJ_EXTRA.map(row).join('')}</tbody></table>
      <div class="tv-field"><label for="tv-prio">Điểm ưu tiên khu vực, đối tượng (nếu có)</label><input type="number" id="tv-prio" min="0" max="2.75" step="0.25" value="${S.prio||0}"></div>
      <div class="tv-field"><label>Tổ hợp bạn đủ điều kiện xét, điểm đã gồm ưu tiên</label><div class="tv-combos" id="tv-mycombos">${combosHtml(mc)}</div></div>`;
    }
    if(id==='co'){const c=S.cond; const sel=(id,o,v)=>`<select id="${id}">${o.map(([a,b])=>`<option value="${a}" ${String(v)===String(a)?'selected':''}>${b}</option>`).join('')}</select>`;
      h=`<h2 class="tv-sh">Điều kiện thực tế</h2><p class="tv-help">Những điều này có thể loại một ngành dù bạn rất thích.</p>
      <div class="tv-field"><label for="c_env">Bạn muốn làm việc chủ yếu ở đâu?</label>${sel('c_env',[['any','Ở đâu cũng được'],['office','Văn phòng'],['field','Hiện trường, ngoài trời, bệnh viện'],['mix','Kết hợp']],c.env)}</div>
      <div class="tv-field"><label for="c_st">Mức áp lực bạn chấp nhận (trực ca, chỉ tiêu, hạn chót)</label>${sel('c_st',[[1,'1 · Rất thấp'],[2,'2 · Thấp'],[3,'3 · Vừa phải'],[4,'4 · Cao'],[5,'5 · Rất cao']],c.st)}</div>
      <div class="tv-field"><label for="c_yrs">Sẵn sàng học 5–6 năm (Y, Dược, Kiến trúc, Thú y…)?</label>${sel('c_yrs',[['yes','Sẵn sàng'],['maybe','Có thể'],['no','Chỉ muốn học 4 năm']],c.yrs)}</div>
      <div class="tv-field"><label for="c_physical">Sức khỏe, thể lực cho ngành có sơ tuyển (công an, thể dục thể thao)</label>${sel('c_physical',[['any','Chưa rõ'],['yes','Đạt yêu cầu'],['no','Không phù hợp']],c.physical)}</div>
      <p class="tv-help">Năng khiếu vẽ, âm nhạc, thể thao được tính từ cột “Thi” ở bước Điểm số.</p>`;}
    $('#tv-sbody').innerHTML=h; $('#tv-sbody').scrollTop=0;
    $('#tv-prev').disabled=step===0; $('#tv-next').textContent=step===STEPS.length-1?'Xem kết quả':'Tiếp →';
    renderSteps();
  }
  function touched(){ if(isSample){isSample=false; notice();} save(); renderSteps(); renderResults(); }
  function bindSurvey(){
    $('#tv-sbody').addEventListener('change',e=>{
      const t=e.target,n=t.name||t.id;
      if(t.type==='radio'){const v=+t.value; if(n[0]==='r') S.r[+n.slice(1)]=v; else if(n[0]==='b') S.b[+n.slice(1)]=v; else if(n.startsWith('v_')) S.v[n.slice(2)]=v;}
      else if(t.type==='checkbox'&&t.id.startsWith('x_')){const k=t.id.slice(2); if(t.checked) S.ex[k]=1; else delete S.ex[k]; renderStep();}
      else if(t.id.startsWith('c_')){const k=t.id.slice(2); S.cond[k]=k==='st'?+t.value:t.value;}
      else return;
      touched();
    });
    $('#tv-sbody').addEventListener('input',e=>{const t=e.target; if(t.type!=='number') return;
      if(t.id==='tv-prio') S.prio=clamp(+t.value||0,0,2.75);
      else {const k=t.id.slice(2); if(t.value==='') delete S.g[k]; else S.g[k]=clamp(+t.value,0,10);}
      const box=$('#tv-mycombos'); if(box) box.innerHTML=combosHtml(myCombos());
      touched();});
    $('#tv-steps').addEventListener('click',e=>{const b=e.target.closest('.tv-step'); if(b){step=+b.dataset.i; renderStep();}});
    $('#tv-prev').onclick=()=>{if(step>0){step--; renderStep();}};
    $('#tv-next').onclick=()=>{if(step<STEPS.length-1){step++; renderStep();} else $('#tv-results').scrollIntoView({behavior:'smooth'});};
    $('#tv-reset').onclick=()=>{S=BLANK(); isSample=false; step=0; save(); notice(); renderStep(); renderResults();};
    $('#tv-sample').onclick=()=>{S=SAMPLE(); isSample=true; save(); notice(); renderStep(); renderResults();};
  }
  function notice(){
    $('#tv-noticeText').innerHTML=isSample?'Đang hiển thị kết quả của <b>hồ sơ mẫu</b>: một bạn thích nghiên cứu, mạnh Toán – Tin, thi Toán, Văn, Lí, Tin. Bấm “Làm khảo sát của tôi” để xóa và điền của bạn.':'Đang dùng <b>câu trả lời của bạn</b>. Kết quả cập nhật ngay khi bạn trả lời và được lưu trên trình duyệt này.';
    $('#tv-sample').style.display=isSample?'none':''; $('#tv-reset').textContent=isSample?'Làm khảo sát của tôi':'Xóa và làm lại';
  }

  /* ============ GIAO DIỆN KẾT QUẢ ============ */
  let showN=6, cmpA=null, cmpB=null;
  const fitCls=t=>t>=72?['f1','Rất phù hợp']:t>=60?['f2','Phù hợp']:['f3','Cân nhắc'];
  const LVL={safe:'An toàn',fit:'Vừa sức',try:'Thử sức'};
  function renderResults(){
    const P=profile(), R=$('#tv-results');
    if(P.nR<18||P.nB<10){
      R.innerHTML=`<div class="tv-card tv-empty"><h2 class="tv-sh">Kết quả sẽ hiện ở đây</h2><p class="tv-help">Bạn đã trả lời ${P.nR}/30 câu sở thích và ${P.nB}/20 câu tính cách. Cần ít nhất 18 câu sở thích và 10 câu tính cách để bắt đầu gợi ý; trả lời đủ 5 bước thì kết quả chính xác hơn.</p></div>`; return;
    }
    const ranked=scoreAll(P);
    const comp=(P.nR/30)*.4+(P.nB/20)*.25+(P.nV/8)*.15+(Math.min(P.gCount,6)/6)*.2, nOk=P.checks.filter(c=>c.ok).length;
    let conf=['hi','Độ tin cậy cao',`Hồ sơ đầy đủ, sở thích phân hóa rõ và ${nOk}/3 điểm đối chiếu RIASEC – MBTI khớp nhau.`];
    if(comp<.8) conf=['mid','Độ tin cậy trung bình',`Bạn mới hoàn thành ${Math.round(comp*100)}% khảo sát.`];
    else if(P.spread<.25) conf=['lo','Sở thích chưa rõ nét','6 nhóm sở thích khá đều nhau nên học lực và điểm số đang quyết định nhiều hơn. Hãy trải nghiệm thêm (câu lạc bộ, việc làm thêm, ngày hội hướng nghiệp) rồi làm lại.'];
    else if(nOk<=1) conf=['mid','Độ tin cậy trung bình',`Chỉ ${nOk}/3 điểm đối chiếu RIASEC – MBTI khớp; có thể bạn trả lời theo hình mẫu mong muốn hơn là con người thật. Xem phần đối chiếu bên dưới.`];
    const top3=P.order.slice(0,3);
    const rbars=Object.keys(RIASEC).map(k=>`<div class="tv-bar ${top3.includes(k)?'tv-hi':''}"><span class="lb">${k} · ${RIASEC[k].name}</span><span class="tv-track"><span class="tv-fill" style="width:${Math.round(P.ri[k]*100)}%"></span></span><span class="v">${fmt(P.riRaw[k])}</span></div>`).join('');
    const mbars=Object.keys(DIMS).map(k=>{const v=P.mb[k], l=Math.min(v,.5)*100, w=Math.abs(v-.5)*100;
      return `<div class="tv-mb"><span class="${v<.5?'on':''}">${DIMS[k].mn}${DIMS[k].minus?' ('+DIMS[k].minus+')':''}</span><span class="tv-mtrack"><span class="tv-mfill" style="left:${l}%;width:${w}%"></span></span><span class="r ${v>=.5?'on':''}">${DIMS[k].pn}${DIMS[k].plus?' ('+DIMS[k].plus+')':''}</span></div>`;}).join('');
    let h=`<div class="tv-card tv-sum">
     <div class="tv-codes"><div class="tv-code"><span class="tv-lab">Mã sở thích Holland</span><span class="tv-big" id="tv-holland">${P.code}</span></div>
     <div class="tv-code"><span class="tv-lab">Kiểu tính cách MBTI</span><span class="tv-big"><span id="tv-mbti">${P.type}</span><small>${TYPE_NAME[P.type]}</small></span></div>
     <span class="tv-conf ${conf[0]}">${conf[1]}</span></div>
     <p class="tv-sumtext">Bạn hứng thú nhất với nhóm <b>${RIASEC[top3[0]].name}</b> (${RIASEC[top3[0]].desc}), sau đó là <b>${RIASEC[top3[1]].name}</b> và <b>${RIASEC[top3[2]].name}</b>. Về tính cách, bạn nghiêng về ${['EI','SN','TF','JP'].map(k=>dimLabel(k,P).replace(/^\S+(\s\S+)?/,w=>w.toLowerCase())).join(', ')}; mức vững vàng trước áp lực ${Math.round(P.mb.RS*100)}%. ${conf[2]}</p>
     <div class="tv-profiles"><div><p class="tv-lab">Sở thích RIASEC (thang 5)</p><div class="tv-bars">${rbars}</div></div><div><p class="tv-lab">Tính cách (lệch khỏi vạch giữa là nghiêng về phía đó)</p><div class="tv-bars">${mbars}</div></div></div>
     <div class="tv-checks"><b>Đối chiếu hai bài trắc nghiệm</b>${P.checks.map(c=>`<span><span class="${c.ok?'tv-ok':'tv-no'}">${c.ok?'Khớp':'Lệch'}</span> · ${c.a} ${Math.round(c.x*100)}% so với ${c.b} ${Math.round(c.y*100)}%</span>`).join('')}</div>
    </div>
    <div class="tv-sort"><h2 class="tv-sh">Ngành gợi ý cho bạn</h2><div class="tv-seg" role="group" aria-label="Cách xếp hạng"><button type="button" data-s="total" aria-pressed="${sortMode==='total'}">Phù hợp + khả năng đỗ</button><button type="button" data-s="fit" aria-pressed="${sortMode==='fit'}">Chỉ độ phù hợp</button></div></div>
    ${ranked.slice(0,showN).map((r,i)=>card(r,i,ranked,P)).join('')}
    ${showN<12?`<button class="tv-btn tv-more" id="tv-more" type="button">Xem thêm 6 ngành</button>`:''}`;
    const bottom=[...ranked].sort((a,b)=>a.fit-b.fit).slice(0,4);
    h+=`<div class="tv-card tv-sec"><h2>Ngành ít phù hợp với bạn</h2><p class="tv-meta">Không phải ngành kém, chỉ là ít khớp với hồ sơ hiện tại. Lý do chính:</p><div class="tv-low">${bottom.map(r=>{const e=explain(r,P); return `<div><b>${r.m.name}</b> · phù hợp ${Math.round(r.fit)}/100. ${e.cons[0]?e.cons[0].t:'Nhiều tiêu chí cùng thấp.'}</div>`;}).join('')}</div></div>`;
    if(!cmpA||!PROF.find(x=>x.code===cmpA)) cmpA=ranked[0].m.code;
    if(!cmpB||cmpB===cmpA||!PROF.find(x=>x.code===cmpB)) cmpB=(ranked.find(r=>r.m.code==='7720101'&&r.m.code!==cmpA)||ranked[ranked.length-1]).m.code;
    const opts=sel=>[...PROF].sort((a,b)=>a.name.localeCompare(b.name,'vi')).map(x=>`<option value="${x.code}" ${x.code===sel?'selected':''}>${x.name}</option>`).join('');
    const A=ranked.find(r=>r.m.code===cmpA), B=ranked.find(r=>r.m.code===cmpB), ct=compare(A,B,P), rk=c=>ranked.findIndex(r=>r.m.code===c)+1;
    const fcell=r=>r.fe&&r.m.rows.length?Math.round(r.fe.fit*100):'–';
    h+=`<div class="tv-card tv-sec" id="tv-compare"><h2>Vì sao ngành này mà không phải ngành kia?</h2><p class="tv-meta">Chọn ngành bạn hoặc gia đình đang cân nhắc để xem khác ngành được gợi ý ở điểm nào.</p>
     <div class="tv-cmpctl"><div class="tv-field"><label for="tv-cmpA">Ngành A</label><select id="tv-cmpA">${opts(cmpA)}</select></div><div class="tv-field"><label for="tv-cmpB">Ngành B</label><select id="tv-cmpB">${opts(cmpB)}</select></div></div>
     <div class="tv-tbl"><table><thead><tr><th>Tiêu chí</th><th class="num">Trọng số</th><th class="num">${A.m.name}</th><th class="num">${B.m.name}</th></tr></thead><tbody>
     ${Object.keys(W).map(k=>`<tr><td>${DN[k]}</td><td class="num">${Math.round(W[k]*80)}%</td><td class="num">${Math.round(A.d[k]*100)}</td><td class="num">${Math.round(B.d[k]*100)}</td></tr>`).join('')}
     <tr><td>${DN.f} (THPT ${YEAR})</td><td class="num">20%</td><td class="num">${fcell(A)}</td><td class="num">${fcell(B)}</td></tr>
     <tr><td><b>Tổng</b></td><td class="num">100%</td><td class="num"><b>${Math.round(A.total)}</b> · hạng ${rk(cmpA)}</td><td class="num"><b>${Math.round(B.total)}</b> · hạng ${rk(cmpB)}</td></tr></tbody></table></div>
     ${ct.gap<2?`<p>Hai ngành gần như ngang nhau với hồ sơ của bạn (chênh ${fmt(ct.gap)} điểm). Hãy quyết định bằng trải nghiệm thực tế: tham quan trường, hỏi sinh viên và người đang làm nghề.</p>`:`<p><b>${ct.hi.m.name}</b> hơn <b>${ct.lo.m.name}</b> ${fmt(ct.gap)} điểm, chủ yếu vì:</p>${ct.lines.map(l=>`<p>${l}</p>`).join('')}`}
     <p class="tv-meta">Khác biệt về nội dung học: ${A.m.name} ${A.m.note}. ${B.m.name} ${B.m.note}.</p>
     <div><button class="tv-btn" id="tv-copy" type="button">Sao chép kết quả</button> <span class="tv-toast" id="tv-toast"></span></div></div>`;
    h+=`<div class="tv-card tv-sec tv-method"><h2>Cách tính điểm</h2>
     <p><b>Điểm tổng = 80% độ phù hợp + 20% khả năng trúng tuyển.</b> Độ phù hợp (0–100) gồm 5 tiêu chí, trọng số cố định để luôn giải thích được:</p>
     <ul><li><b>Sở thích 35%:</b> so hồ sơ RIASEC với mã Holland 3 chữ của ngành, gồm độ khớp về mức điểm và về hình dạng hồ sơ.</li>
     <li><b>Học lực 20%:</b> điểm trung bình có trọng số các môn ngành cần, và đó có phải môn mạnh tương đối của bạn không.</li>
     <li><b>Tính cách 15%:</b> 4 trục MBTI cộng trục vững vàng, dùng dạng phần trăm liên tục chứ không chỉ 4 chữ cái, để một câu trả lời sát vạch giữa không đẩy bạn sang hẳn một nhóm.</li>
     <li><b>Giá trị nghề nghiệp 15%</b> và <b>Điều kiện thực tế 15%:</b> môi trường làm việc, áp lực, số năm học, năng khiếu, sơ tuyển. Thiếu năng khiếu hoặc thể lực bắt buộc thì trừ thêm 15 điểm.</li></ul>
     <p><b>Khả năng trúng tuyển</b> tính từ ${PROF.reduce((a,m)=>a+m.rows.length,0).toLocaleString('vi-VN')} dòng điểm chuẩn THPT ${YEAR} của site: lấy tổ hợp tốt nhất bạn đủ điều kiện ở từng chương trình (cộng điểm ưu tiên), xếp mức An toàn (hơn chuẩn ≥1 điểm), Vừa sức (0–1 điểm), Thử sức (thiếu dưới 1 điểm), giống tab Tư vấn theo điểm.</p>
     <p>RIASEC là thang đo có nhiều bằng chứng nhất cho chọn nghề nên chiếm trọng số lớn nhất. MBTI chỉ bổ sung về cách bạn làm việc và được đối chiếu chéo với RIASEC; không ngành nào bị loại chỉ vì 4 chữ cái MBTI. Kết quả là gợi ý tham khảo, không thay cho trải nghiệm thực tế và tư vấn trực tiếp; nên làm lại sau 6–12 tháng.</p></div>`;
    R.innerHTML=h;
    $('#tv-more')&&($('#tv-more').onclick=()=>{showN=12; renderResults();});
    R.querySelectorAll('.tv-seg button').forEach(b=>b.onclick=()=>{sortMode=b.dataset.s; renderResults();});
    $('#tv-cmpA').onchange=e=>{cmpA=e.target.value; renderResults(); $('#tv-compare').scrollIntoView({block:'nearest'});};
    $('#tv-cmpB').onchange=e=>{cmpB=e.target.value; renderResults(); $('#tv-compare').scrollIntoView({block:'nearest'});};
    $('#tv-copy').onclick=async()=>{
      const strip=s=>s.replace(/<[^>]+>/g,'');
      const txt=`Mã Holland: ${P.code} · MBTI: ${P.type}\n`+ranked.slice(0,6).map((r,i)=>{const e=explain(r,P); return `${i+1}. ${r.m.name} (${r.m.code}) – ${Math.round(r.total)} điểm\n   Vì sao: ${e.pros.map(x=>strip(x.t)).join(' ')}\n   Cân nhắc: ${e.cons.map(x=>strip(x.t)).join(' ')||'không có'}`;}).join('\n');
      try{await navigator.clipboard.writeText(txt); $('#tv-toast').textContent='Đã sao chép.';}catch(err){$('#tv-toast').textContent='Trình duyệt chặn sao chép.';}
    };
  }
  const PTYPE={TIENG_ANH:'tiếng Anh',CLC:'chất lượng cao',LIEN_KET:'liên kết',TIEN_TIEN:'tiên tiến',PHAN_HIEU:'phân hiệu',TAI_NANG:'tài năng'};
  function admBlock(r){
    const m=r.m, fe=r.fe;
    if(!m.rows.length) return `<div class="tv-adm"><div class="tv-admh"><span><b>Khả năng trúng tuyển</b> · chưa có điểm chuẩn THPT ${YEAR} trong dữ liệu</span><span>${m.physical?'Ngành tuyển sinh riêng, xem đề án của trường.':''}</span></div></div>`;
    if(!fe) return `<div class="tv-adm"><div class="tv-admh"><span><b>Khả năng trúng tuyển</b> · nhập điểm và đánh dấu môn thi ở bước Điểm số để tính</span><span>${m.rows.length} chương trình, ${m.nUni} trường</span></div></div>`;
    if(!fe.elig) return `<div class="tv-adm"><div class="tv-admh"><span><b>Khả năng trúng tuyển</b> · không có chương trình xét tổ hợp bạn thi</span><span>Thường xét ${m.topCombos.slice(0,4).join(', ')}</span></div></div>`;
    const order={fit:0,try:1,safe:2};
    const rows=[...fe.list].sort((a,b)=>order[a.lvl]-order[b.lvl]||b.cut-a.cut).slice(0,5);
    const uni=c=>D.unis[c]||[c,c,null,''];
    return `<div class="tv-adm"><div class="tv-admh"><span><b>Khả năng trúng tuyển (điểm chuẩn THPT ${YEAR})</b></span><span><span class="tv-lvl safe">${fe.n.safe} an toàn</span> <span class="tv-lvl fit">${fe.n.fit} vừa sức</span> <span class="tv-lvl try">${fe.n.try} thử sức</span> · trong ${fe.elig} chương trình xét tổ hợp của bạn</span></div>
    ${rows.length?`<div class="tv-tbl"><table><thead><tr><th>Trường</th><th class="num">Điểm chuẩn</th><th class="num">Điểm bạn</th><th>Mức</th></tr></thead><tbody>${rows.map(x=>{const u=uni(x.u); return `<tr><td>${link(u[3],u[1])}${x.type?` <span class="tv-meta">· ${PTYPE[x.type]||x.type}</span>`:''}${u[2]?` <span class="tv-meta">· VNUR #${u[2]}</span>`:''}</td><td class="num">${fmt(x.cut,2)}</td><td class="num">${fmt(x.my,2)} <span class="tv-meta">${x.cb}</span></td><td><span class="tv-lvl ${x.lvl}">${LVL[x.lvl]}</span></td></tr>`;}).join('')}</tbody></table></div>`:''}</div>`;
  }
  function card(r,i,ranked,P){
    const m=r.m, [fc,fl]=fitCls(r.fit), e=explain(r,P), sib=pickSibling(r,ranked,i);
    let wn='';
    if(sib){const ct=compare(r,sib,P); wn=`<div class="tv-whynot"><p><b>Vì sao không phải ${sib.m.name}?</b> <span class="tv-meta">(${Math.round(sib.total)} điểm)</span></p>${ct.lines.length?ct.lines.slice(0,2).map(l=>`<p>${l}</p>`).join(''):'<p>Hai ngành gần như ngang nhau với bạn.</p>'}<p class="tv-meta">${m.name} ${m.note}; còn ${sib.m.name} ${sib.m.note}.</p></div>`;}
    const hasF=r.fe&&m.rows.length;
    return `<article class="tv-card tv-mj ${fc}" data-code="${m.code}">
     <div class="tv-mh"><div><span class="tv-meta">#${i+1} · ${m.g} · mã ${m.code} · Holland ${m.h}${m.yrs>4?` · học ${m.yrs} năm`:''}</span><h3>${m.name}</h3><span class="tv-meta">Nghề: ${m.jobs}</span></div>
     <div class="tv-score"><b>${Math.round(sortMode==='fit'?r.fit:r.total)}<small>/100</small></b><span class="tv-lvl ${fc}">${fl}</span></div></div>
     <div class="tv-dims">${Object.keys(W).map(k=>`<div class="tv-dim"><span>${DN[k]} <b>${Math.round(r.d[k]*100)}</b></span><span class="tv-track"><span class="tv-fill" style="width:${Math.round(r.d[k]*100)}%"></span></span></div>`).join('')}
     <div class="tv-dim feas"><span>${DN.f} <b>${hasF?Math.round(r.fe.fit*100):'–'}</b></span><span class="tv-track"><span class="tv-fill" style="width:${hasF?Math.round(r.fe.fit*100):0}%"></span></span></div></div>
     <div class="tv-why"><div class="tv-pros"><h4>Vì sao gợi ý ngành này</h4><ul>${e.pros.map(x=>`<li>${x.t}</li>`).join('')||'<li>Các tiêu chí ở mức trung bình, không có điểm nổi bật.</li>'}</ul></div>
     <div class="tv-cons"><h4>Điều cần cân nhắc</h4><ul>${e.cons.map(x=>`<li>${x.t}</li>`).join('')||'<li>Không có điểm vướng đáng kể.</li>'}</ul></div></div>
     ${admBlock(r)}
     ${wn}
     <div class="tv-foot"><span>Tổ hợp phổ biến: ${m.topCombos.join(', ')||'–'}</span>${SHOW_LINKS&&m.slug?`<a href="${m.slug}">Xem tất cả trường đào tạo →</a>`:''}</div>
    </article>`;
  }

  /* ============ NẠP DỮ LIỆU ============ */
  const getJson = async (p) => { const r = await fetch(p); if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r.json(); };
  let loading = null, ready = false;
  async function fetchData() {
    const isStatic = document.documentElement.dataset.mode === "static" || (typeof Data !== "undefined" && Data.static);
    if (!isStatic) { try { return { data: await getJson("api/career"), stat: false }; } catch { /* thử bản tĩnh */ } }
    return { data: await getJson("data/career.json"), stat: true };
  }
  function headHeight() {
    const top = document.querySelector(".top");
    if (top) ROOT.style.setProperty("--tv-head", `${Math.ceil(top.getBoundingClientRect().height)}px`);
  }
  window.addEventListener("resize", headHeight);
  function open() {
    headHeight();
    if (ready || loading) return loading;
    $('#tv-results').innerHTML = `<div class="tv-card tv-empty"><p class="tv-help">Đang tải dữ liệu…</p></div>`;
    loading = fetchData().then(({ data, stat }) => {
      SHOW_LINKS = stat;
      build(data);
      $('#tv-nmaj').textContent = PROF.length;
      bindSurvey(); notice(); renderStep(); renderResults();
      ready = true; loading = null;
    }).catch((e) => {
      loading = null;
      $('#tv-results').innerHTML = `<div class="tv-card tv-empty"><h2 class="tv-sh">Không tải được dữ liệu tư vấn</h2><p class="tv-help">${String(e.message || e).replace(/[<>&]/g, "")}</p><button class="tv-btn pri" id="tv-retry" type="button">Thử lại</button></div>`;
      $('#tv-retry').onclick = open;
    });
    return loading;
  }
  window.Career = { open };
})();
