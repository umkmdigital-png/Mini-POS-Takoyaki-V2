/* ═══════════════════════════════════════════
   TAKOYAKI MAZBOY POS — script.js
   ═══════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════
   CONFIG
══════════════════════════════════════════ */
const ADMIN = "6285117010280";

const MP = [
  { id:'m1', em:'🐙', n:'Small  (5 btr)',      h:10000, badge:'5 Btr' },
  { id:'m2', em:'🐙', n:'Medium (10 btr)',     h:18000, badge:'10 Btr' },
  { id:'m3', em:'🐙', n:'Large  (15 btr)',     h:25000, badge:'15 Btr' },
  { id:'m4', em:'🎁', n:'Gratis / Promo',      h:0,     badge:'FREE' },
];

const MT = [
  { id:'t1', em:'🧀', n:'Keju',        h:0 },
  { id:'t2', em:'🥚', n:'Telur Puyuh', h:0 },
  { id:'t3', em:'🍗', n:'Ayam',        h:0 },
  { id:'t4', em:'🐙', n:'Gurita',      h:0 },
  { id:'t5', em:'🥓', n:'Kornet',      h:0 },
  { id:'t6', em:'🦀', n:'Crabstick',   h:0 },
  { id:'t7', em:'🌭', n:'Sosis',       h:0 },
];

const MS = [
  { id:'s1', em:'🍯', n:'Saus Takoyaki', h:0    },
  { id:'s2', em:'🥛', n:'Mayo',          h:0    },
  { id:'s3', em:'🧀', n:'Keju Leleh',    h:3000 },
  { id:'s4', em:'🟢', n:'Wasabi Mayo',   h:3000 },
  { id:'s5', em:'🔵', n:'Unagi Sauce',   h:3000 },
];

const STOK_AWAL = [
  { n:'Adonan Tepung',   unit:'kg',  qty:5 },
  { n:'Gurita / Cumi',   unit:'kg',  qty:2 },
  { n:'Saus Takoyaki',   unit:'btl', qty:3 },
  { n:'Mayo',            unit:'btl', qty:4 },
  { n:'Katsuobushi',     unit:'pck', qty:5 },
  { n:'Gas LPG',         unit:'tab', qty:2 },
];

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
let cP = {}, cT = {}, cS = {};
let orders = [], exps = [], oCnt = 0;
let selMat = 'Matang', selPay = 'Tunai';
let stokBahan = JSON.parse(JSON.stringify(STOK_AWAL));

// Printer state
let printerMethod    = 'lan';
let printerConnected = false;
let btDevice         = null;   // Web Bluetooth device
let btCharacteristic = null;   // BT write characteristic
let selectedBtDevice = null;   // device chosen in UI before connect
let usbDevice        = null;   // Web USB device

/* ══════════════════════════════════════════
   LOCALSTORAGE
══════════════════════════════════════════ */
function saveData() {
  const data = {
    cP, cT, cS, orders, exps, oCnt, selMat, selPay, stokBahan, printerMethod,
    inputs: {
      p_nama:          g('p_nama')?.value           || '',
      p_shift:         g('p_shift')?.value          || '',
      p_modal:         g('p_modal')?.value          || '',
      s_adonan:        g('s_adonan')?.value         || '',
      s_bahan:         g('s_bahan')?.value          || '',
      s_note:          g('s_note')?.value           || '',
      printer_ip:      g('printer-ip')?.value       || '',
      printer_port:    g('printer-port')?.value     || '9100',
      r_nama_toko:     g('r_nama_toko')?.value      || '',
      r_alamat:        g('r_alamat')?.value         || '',
      r_footer:        g('r_footer')?.value         || '',
      r_kontak:        g('r_kontak')?.value         || '',
      auto_print:      g('auto-print')?.checked     || false,
      auto_print_shift:g('auto-print-shift')?.checked !== false,
    }
  };
  localStorage.setItem('TAKO_POS_DATA', JSON.stringify(data));
}

function loadData() {
  const raw = localStorage.getItem('TAKO_POS_DATA');
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    cP = d.cP || {};  cT = d.cT || {};  cS = d.cS || {};
    orders = d.orders || [];  exps = d.exps || [];  oCnt = d.oCnt || 0;
    selMat = d.selMat || 'Matang';
    selPay = d.selPay || 'Tunai';
    if (d.stokBahan) stokBahan = d.stokBahan;
    printerMethod = d.printerMethod || 'lan';

    if (d.inputs) {
      const I = d.inputs;
      setV('p_nama',       I.p_nama);
      setV('p_shift',      I.p_shift);
      setV('p_modal',      I.p_modal);
      setV('s_adonan',     I.s_adonan);
      setV('s_bahan',      I.s_bahan);
      setV('s_note',       I.s_note);
      setV('printer-ip',   I.printer_ip);
      setV('printer-port', I.printer_port || '9100');
      setV('r_nama_toko',  I.r_nama_toko  || 'Takoyaki Mazboy');
      setV('r_alamat',     I.r_alamat     || 'Outlet Kalibaru');
      setV('r_footer',     I.r_footer     || 'Terima kasih! Arigato! 🐙');
      setV('r_kontak',     I.r_kontak     || '');
      if (g('auto-print'))       g('auto-print').checked       = !!I.auto_print;
      if (g('auto-print-shift')) g('auto-print-shift').checked = I.auto_print_shift !== false;
    }

    // Restore printer method UI
    const pmBtn = g('pm-' + printerMethod);
    if (pmBtn) setPrinterMethod(printerMethod, pmBtn, false);

    updProf();
  } catch(e) {
    console.error('Load error', e);
  }
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
const g   = id => document.getElementById(id);
const rp  = n  => 'Rp ' + n.toLocaleString('id-ID');
const nn  = v  => parseInt((v||'').toString().replace(/[^0-9]/g,'')) || 0;
const tNow= ()  => new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
const tgl = ()  => new Date().toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'});

function fmt(el) {
  const v = el.value.replace(/[^0-9]/g,'');
  el.value = v ? 'Rp ' + parseInt(v).toLocaleString('id-ID') : '';
}
function setV(id, v) {
  const e = g(id);
  if (e && v !== undefined && v !== null) e.value = v;
}

let _toastTimer;
function toast(m, dur = 2200) {
  const t = g('toast');
  t.innerText = m;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), dur);
}

// Clock
setInterval(() => {
  const e = g('clk');
  if (e) e.innerText = new Date().toLocaleTimeString('id-ID');
}, 1000);

/* ══════════════════════════════════════════
   NAV
══════════════════════════════════════════ */
function sw(id, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('on'));
  g('tab-' + id).classList.add('on');
  if (btn) btn.classList.add('on');
  if (id === 'rekap')   renderRekap();
  if (id === 'stok')    renderStok();
}

function updProf() {
  const n = g('p_nama').value;
  const r = g('p_shift').value;
  g('dn').innerText = n || 'Nama Staff';
  g('dr').innerText = r || 'Shift belum dipilih';
}

function checkin() {
  const n = g('p_nama').value.trim();
  const s = g('p_shift').value;
  if (!n || !s) return alert('Lengkapi Nama & Shift dulu!');
  toast('✓ Check-in Berhasil! Itadakimasu! 🐙');
  sw('jual', g('nb-jual'));
  saveData();
}

/* ══════════════════════════════════════════
   RENDER MENUS
══════════════════════════════════════════ */
function renderMenus() {
  // Menu utama
  const gm = g('gmenu'); gm.innerHTML = '';
  MP.forEach(m => {
    const q = cP[m.id]?.qty || 0;
    const d = document.createElement('div');
    d.className = 'mc' + (q ? ' hit' : '');
    d.onclick = () => addP(m);
    d.innerHTML = `
      ${q ? `<span class="qb">${q}</span>` : ''}
      <div class="mc-em">${m.em}</div>
      <div class="mc-name">${m.n}</div>
      <div class="mc-price">${m.h ? rp(m.h) : 'Gratis'}</div>
      ${m.badge ? `<div class="mc-badge">${m.badge}</div>` : ''}`;
    gm.appendChild(d);
  });

  // Topping / Isian
  const gt = g('gtopping'); gt.innerHTML = '';
  MT.forEach(m => {
    const q = cT[m.id]?.qty || 0;
    const d = document.createElement('div');
    d.className = 'tp' + (q ? ' hit' : '');
    d.onclick = () => addT(m);
    d.innerHTML = `
      ${q ? `<span class="qb">${q}</span>` : ''}
      <span class="tp-em">${m.em}</span>
      <div class="tp-name">${m.n}</div>
      <div class="tp-price">${m.h ? rp(m.h) : 'Gratis'}</div>`;
    gt.appendChild(d);
  });

  // Saus
  const gs = g('gsauce'); gs.innerHTML = '';
  MS.forEach(m => {
    const q = cS[m.id]?.qty || 0;
    const d = document.createElement('div');
    d.className = 'sc' + (q ? ' hit' : '');
    d.onclick = () => addS(m);
    d.innerHTML = `
      ${m.em} ${m.n} ${m.h ? '(+' + rp(m.h) + ')' : '(Gratis)'}
      ${q ? `<span class="qb">${q}</span>` : ''}`;
    gs.appendChild(d);
  });
}

function addP(m) { if(navigator.vibrate) navigator.vibrate(15); if(!cP[m.id]) cP[m.id]={qty:0,h:m.h,n:m.n}; cP[m.id].qty++; upd(); }
function addT(m) { if(navigator.vibrate) navigator.vibrate(15); if(!cT[m.id]) cT[m.id]={qty:0,h:m.h,n:m.n}; cT[m.id].qty++; upd(); }
function addS(m) { if(navigator.vibrate) navigator.vibrate(15); if(!cS[m.id]) cS[m.id]={qty:0,h:m.h,n:m.n}; cS[m.id].qty++; upd(); }

function chP(id,d) { if(!cP[id]) return; cP[id].qty+=d; if(cP[id].qty<=0) delete cP[id]; upd(); updModal(); }
function chT(id,d) { if(!cT[id]) return; cT[id].qty+=d; if(cT[id].qty<=0) delete cT[id]; upd(); updModal(); }
function chS(id,d) { if(!cS[id]) return; cS[id].qty+=d; if(cS[id].qty<=0) delete cS[id]; upd(); updModal(); }

function tots() {
  let qP=0, sP=0, sT=0, sSc=0;
  for(const k in cP) { qP+=cP[k].qty; sP+=cP[k].qty*cP[k].h; }
  for(const k in cT) { sT+=cT[k].qty*cT[k].h; }
  for(const k in cS) { sSc+=cS[k].qty*cS[k].h; }
  return { qP, sP, sT, sSc, tot: sP+sT+sSc };
}

function upd() { renderMenus(); updFloat(); calcTot(); saveData(); }

function updFloat() {
  const b = g('fcart');
  const { qP, tot } = tots();
  if (qP > 0) {
    b.classList.add('show');
    g('fc-cnt').innerText = qP;
    g('fc-lbl').innerText = 'porsi di keranjang';
    g('fc-tot').innerText = rp(tot);
  } else {
    b.classList.remove('show');
  }
}

function calcTot() {
  const omzetTunai  = orders.filter(o=>o.pay==='Tunai').reduce((a,o)=>a+o.sub, 0);
  const omzetQRIS   = orders.filter(o=>o.pay==='QRIS').reduce((a,o)=>a+o.sub, 0);
  const omzetOnline = orders.filter(o=>o.pay==='Gojek/Online').reduce((a,o)=>a+o.sub, 0);
  const { sP, sT, sSc } = tots();
  const keranjang = sP + sT + sSc;
  const totalQRIS   = omzetQRIS   + (selPay==='QRIS'          ? keranjang : 0);
  const totalOnline = omzetOnline + (selPay==='Gojek/Online'  ? keranjang : 0);
  const totalTunai  = omzetTunai  + (selPay==='Tunai'         ? keranjang : 0);
  const modal       = nn(g('p_modal').value);
  const pengeluaran = exps.reduce((a,b) => a+b.p, 0);
  g('p_qris').value   = rp(totalQRIS);
  g('p_online').value = rp(totalOnline);
  const nettoTunai    = modal + totalTunai - pengeluaran;
  const totalPorsi    = orders.reduce((a,o)=>a+o.porsi, 0) + Object.values(cP).reduce((a,b)=>a+b.qty, 0);
  g('t_porsi').innerText = totalPorsi + ' Porsi';
  g('t_tunai').innerText = rp(nettoTunai < 0 ? 0 : nettoTunai);
}

/* ══════════════════════════════════════════
   MODAL
══════════════════════════════════════════ */
function openM()  { g('ov').classList.add('on'); updModal(); }
function closeM() { g('ov').classList.remove('on'); }
function ovClick(e) { if(e.target.id==='ov') closeM(); }

function updModal() {
  const { qP, sP, sT, sSc, tot } = tots();

  // Pancong list
  const pl = g('ml-menu'); pl.innerHTML = '';
  let hasP = false;
  for(const k in cP) {
    hasP = true;
    const it = cP[k]; const sub = it.qty * it.h;
    const r = document.createElement('div'); r.className = 'm-item';
    r.innerHTML = `
      <div><div class="m-item-n">${it.n}</div><div class="m-item-p">${rp(it.h)} / porsi</div></div>
      <div class="m-ctrl">
        <button class="qbtn" onclick="chP('${k}',-1)">−</button>
        <span class="qv">${it.qty}</span>
        <button class="qbtn" onclick="chP('${k}',1)">+</button>
        <span class="m-sub-price">${rp(sub)}</span>
      </div>`;
    pl.appendChild(r);
  }
  if (!hasP) pl.innerHTML = '<div class="empty">Belum ada menu dipilih</div>';

  // Topping
  const tw = g('ml-top-wrap'); const tl = g('ml-topping'); tl.innerHTML = ''; let hasT = false;
  for(const k in cT) {
    hasT = true; const it = cT[k]; const sub = it.qty*it.h;
    const r = document.createElement('div'); r.className='m-item';
    r.innerHTML=`
      <div><div class="m-item-n">${it.n}</div><div class="m-item-p">${it.h?rp(it.h)+' / pcs':'Gratis'}</div></div>
      <div class="m-ctrl">
        <button class="qbtn" onclick="chT('${k}',-1)">−</button>
        <span class="qv">${it.qty}</span>
        <button class="qbtn" onclick="chT('${k}',1)">+</button>
        <span class="m-sub-price">${sub?rp(sub):'Gratis'}</span>
      </div>`;
    tl.appendChild(r);
  }
  tw.style.display = hasT ? 'block' : 'none';

  // Saus
  const sw2 = g('ml-sauce-wrap'); const sl = g('ml-sauce'); sl.innerHTML=''; let hasSc=false;
  for(const k in cS) {
    hasSc=true; const it=cS[k]; const sub=it.qty*it.h;
    const r=document.createElement('div'); r.className='m-item';
    r.innerHTML=`
      <div><div class="m-item-n">${it.n}</div><div class="m-item-p">${it.h?rp(it.h)+' / pcs':'Gratis'}</div></div>
      <div class="m-ctrl">
        <button class="qbtn" onclick="chS('${k}',-1)">−</button>
        <span class="qv">${it.qty}</span>
        <button class="qbtn" onclick="chS('${k}',1)">+</button>
        <span class="m-sub-price">${sub?rp(sub):'Gratis'}</span>
      </div>`;
    sl.appendChild(r);
  }
  sw2.style.display = hasSc ? 'block' : 'none';

  g('m-tot').innerText  = rp(tot);
  g('m-chip').innerText = qP + ' porsi';
  g('m-sub').innerText  = oCnt > 0 ? `Pesanan ke-${oCnt+1}` : 'Pesanan baru';
}

function setMat(btn) {
  document.querySelectorAll('.mc2').forEach(b=>b.classList.remove('sel'));
  btn.classList.add('sel'); selMat = btn.dataset.v; saveData();
}
function setPay(btn) {
  document.querySelectorAll('.pc2').forEach(b=>b.classList.remove('sel'));
  btn.classList.add('sel'); selPay = btn.dataset.v; calcTot(); saveData();
}

/* ══════════════════════════════════════════
   CONFIRM ORDER
══════════════════════════════════════════ */
function resetCart() {
  const { qP } = tots();
  if (!qP) { closeM(); return; }
  if (confirm('Kosongkan keranjang tanpa menyimpan?')) {
    cP={}; cT={}; cS={}; upd(); closeM(); toast('🗑 Keranjang dikosongkan'); saveData();
  }
}

function confirmOrder() {
  const { qP, tot } = tots();
  if (!qP) return alert('Pilih minimal 1 menu dulu!');
  const custName = (g('c_name')?.value.trim()) || 'Pelanggan';
  oCnt++;
  const pi=[], ti=[], si=[];
  for(const k in cP) pi.push({n:cP[k].n, q:cP[k].qty, h:cP[k].h});
  for(const k in cT) ti.push({n:cT[k].n, q:cT[k].qty, h:cT[k].h});
  for(const k in cS) si.push({n:cS[k].n, q:cS[k].qty, h:cS[k].h});
  const order = { id:oCnt, time:tNow(), tgl:tgl(), cust:custName, pi, ti, si, sub:tot, porsi:qP, mat:selMat, pay:selPay };
  orders.push(order);

  // Reset state
  cP={}; cT={}; cS={};
  if(g('c_name')) g('c_name').value='';
  selMat='Matang'; selPay='Tunai';
  document.querySelectorAll('.mc2').forEach(b=>b.classList.remove('sel'));
  document.querySelector('.mc2[data-v="Matang"]').classList.add('sel');
  document.querySelectorAll('.pc2').forEach(b=>b.classList.remove('sel'));
  document.querySelector('.pc2[data-v="Tunai"]').classList.add('sel');

  upd(); closeM(); toast(`✓ Pesanan #${oCnt} disimpan!`); renderRekap(); saveData();

  // Auto print
  const autoPrint = g('auto-print')?.checked;
  setTimeout(() => previewReceipt(order, autoPrint ? 'print' : 'preview'), 400);
}

/* ══════════════════════════════════════════
   EXPENSES
══════════════════════════════════════════ */
function addExp() {
  const n = g('en').value.trim();
  const p = nn(g('ep').value);
  if (!n || !p) return alert('Isi nama & jumlah!');
  exps.push({n,p}); g('en').value=''; g('ep').value='';
  renderExps(); calcTot(); saveData();
}
function delExp(i) { exps.splice(i,1); renderExps(); calcTot(); saveData(); }
function renderExps() {
  const el = g('explist'); el.innerHTML = '';
  exps.forEach((e,i) => {
    const d = document.createElement('div'); d.className='exp-row';
    d.innerHTML=`<span>${e.n}</span>
    <div style="display:flex;align-items:center;gap:8px">
      <b>${rp(e.p)}</b>
      <button class="exp-del" onclick="delExp(${i})">✕</button>
    </div>`;
    el.appendChild(d);
  });
}

/* ══════════════════════════════════════════
   STOK
══════════════════════════════════════════ */
function renderStok() {
  const el = g('stok-list'); el.innerHTML = '';
  stokBahan.forEach((b, i) => {
    const d = document.createElement('div'); d.className='stok-item';
    d.innerHTML=`
      <div>
        <div style="font-weight:800;font-size:14px">${b.n}</div>
        <div style="font-size:11px;color:var(--ink3)">${b.unit}</div>
      </div>
      <div class="stok-ctrl">
        <button class="stok-btn m" onclick="adjStok(${i},-1)">−</button>
        <span class="stok-q ${b.qty<=1?'low':''}">${b.qty}</span>
        <button class="stok-btn p" onclick="adjStok(${i},1)">+</button>
      </div>`;
    el.appendChild(d);
  });
}
function adjStok(i, d) {
  stokBahan[i].qty = Math.max(0, stokBahan[i].qty + d);
  renderStok(); saveData();
  if (stokBahan[i].qty <= 1)
    toast(`⚠️ ${stokBahan[i].n} hampir habis!`);
  else
    toast(`📦 ${stokBahan[i].n}: ${stokBahan[i].qty} ${stokBahan[i].unit}`);
}

/* ══════════════════════════════════════════
   REKAP
══════════════════════════════════════════ */
function renderRekap() {
  const rb = g('rbox'); const rl = g('rlist');
  if (!rb || !rl) return;
  const totalOmzet  = orders.reduce((a,o)=>a+o.sub, 0);
  const totalPorsi  = orders.reduce((a,o)=>a+o.porsi, 0);
  const modal       = nn(g('p_modal').value);
  const kel         = exps.reduce((a,b)=>a+b.p, 0);
  const qris        = nn(g('p_qris').value);
  const onl         = nn(g('p_online').value);
  const netto       = modal + totalOmzet - kel - qris - onl;
  const byPay       = {};
  orders.forEach(o => { byPay[o.pay] = (byPay[o.pay]||0) + o.sub; });

  if (!orders.length) {
    rb.innerHTML = '<div class="empty">Belum ada transaksi dikonfirmasi</div>';
    rl.innerHTML = ''; return;
  }

  const payStr = Object.entries(byPay)
    .map(([k,v]) => `<div class="rr"><span>• Omzet ${k}</span><strong>${rp(v)}</strong></div>`)
    .join('');

  rb.innerHTML = `
    <div class="rr"><span>Transaksi</span><strong>${orders.length}×</strong></div>
    <div class="rr"><span>Porsi Terjual</span><strong>${totalPorsi} porsi</strong></div>
    <div class="rr"><span>Omzet Penjualan</span><strong>${rp(totalOmzet)}</strong></div>
    ${payStr}
    <div class="rr" style="color:var(--red)"><span>💸 Pengeluaran</span><strong>−${rp(kel)}</strong></div>
    <div class="rr" style="color:var(--blue)"><span>📱 QRIS</span><strong>−${rp(qris)}</strong></div>
    <div class="rr" style="color:var(--green)"><span>🛵 Gojek/Online</span><strong>−${rp(onl)}</strong></div>
    <div class="rr tot"><span>💵 Setoran Tunai</span><span>${rp(netto<0?0:netto)}</span></div>`;

  rl.innerHTML = '';
  [...orders].reverse().forEach(o => {
    const ps  = o.pi.map(i=>`${i.n}×${i.q}`).join(', ');
    const ts  = o.ti.length ? ' + ' + o.ti.map(i=>`${i.n}×${i.q}`).join(', ') : '';
    const ss  = (o.si && o.si.length) ? ' [' + o.si.map(i=>i.n).join('+') + ']' : '';
    const oid = o.id;
    const d   = document.createElement('div'); d.className='tx';
    d.innerHTML=`
      <div class="tx-top">
        <span><span class="tx-id">#${o.id}</span><span class="tx-time">${o.time} · 👤 ${o.cust}</span></span>
        <span class="tx-amt">${rp(o.sub)}</span>
      </div>
      <div class="tx-tags">
        <span class="tag tm">🔥 ${o.mat}</span>
        <span class="tag tb">💳 ${o.pay}</span>
        <span class="tag tp2">🐙 ${o.porsi} porsi</span>
      </div>
      <div class="tx-items">${ps}${ts}${ss}</div>
      <div class="tx-btns">
        <button class="tx-btn preview" onclick="previewReceipt(orders.find(x=>x.id===${oid}),'preview')">👁 Struk</button>
        <button class="tx-btn print"   onclick="previewReceipt(orders.find(x=>x.id===${oid}),'print')">🖨 Cetak Ulang</button>
      </div>`;
    rl.appendChild(d);
  });
}

/* ══════════════════════════════════════════
   RECEIPT HTML BUILDER
══════════════════════════════════════════ */
function buildReceiptHTML(order) {
  const storeName = g('r_nama_toko')?.value || 'Takoyaki Mazboy';
  const addr      = g('r_alamat')?.value    || 'Outlet Kalibaru';
  const footer    = g('r_footer')?.value    || 'Terima kasih! Arigato! 🐙';
  const kontak    = g('r_kontak')?.value    || '';
  const L32       = '─'.repeat(32);
  const D32       = '═'.repeat(32);

  let html = `
    <div style="text-align:center;margin-bottom:10px">
      <div style="font-size:30px">🐙</div>
      <div style="font-family:'Noto Serif JP',serif;font-size:16px;font-weight:700">${storeName}</div>
      <div style="font-size:11px;color:#666">${addr}</div>
      ${kontak ? `<div style="font-size:11px;color:#666">${kontak}</div>` : ''}
      <div style="font-size:10px;color:#aaa;margin-top:4px">${D32}</div>
    </div>
    <div style="font-size:11px;margin-bottom:8px">
      <div>No. : <strong>#${String(order.id).padStart(4,'0')}</strong></div>
      <div>Tgl : ${order.tgl || tgl()}</div>
      <div>Jam : ${order.time}</div>
      <div>Nama: <strong>${order.cust}</strong></div>
      <div>Staff: ${g('p_nama')?.value || '-'}</div>
    </div>
    <div style="font-size:10px;color:#aaa">${L32}</div>
    <div style="margin:8px 0">`;

  order.pi.forEach(i => {
    html += `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
      <span>${i.n} ×${i.q}</span><span>${rp(i.q*i.h)}</span></div>`;
  });
  if (order.ti && order.ti.length) {
    html += `<div style="font-size:10px;color:#888;margin:4px 0">+ Isian:</div>`;
    order.ti.forEach(i => {
      html += `<div style="display:flex;justify-content:space-between;font-size:11px;color:#444;margin-bottom:2px">
        <span style="padding-left:8px">• ${i.n} ×${i.q}</span>
        <span>${i.h ? rp(i.q*i.h) : 'Gratis'}</span></div>`;
    });
  }
  if (order.si && order.si.length) {
    html += `<div style="font-size:10px;color:#888;margin:4px 0">+ Saus:</div>`;
    order.si.forEach(i => {
      html += `<div style="display:flex;justify-content:space-between;font-size:11px;color:#444;margin-bottom:2px">
        <span style="padding-left:8px">• ${i.n} ×${i.q}</span>
        <span>${i.h ? rp(i.q*i.h) : 'Gratis'}</span></div>`;
    });
  }
  html += `</div>
    <div style="font-size:10px;color:#aaa">${L32}</div>
    <div style="margin:8px 0;font-size:12px">
      <div style="display:flex;justify-content:space-between"><span>🔥 Kematangan:</span><strong>${order.mat}</strong></div>
      <div style="display:flex;justify-content:space-between"><span>💳 Pembayaran:</span><strong>${order.pay}</strong></div>
    </div>
    <div style="font-size:10px;color:#aaa">${D32}</div>
    <div style="display:flex;justify-content:space-between;margin:10px 0;font-family:'Noto Serif JP',serif;font-size:16px;font-weight:700">
      <span>TOTAL</span><span style="color:#E8003D">${rp(order.sub)}</span>
    </div>
    <div style="font-size:10px;color:#aaa">${D32}</div>
    <div style="text-align:center;margin-top:12px;font-size:12px;color:#666;line-height:1.8">
      ${footer}<br>
      <span style="font-size:10px">たこ焼き · Takoyaki Mazboy</span>
    </div>`;
  return html;
}

function previewReceipt(order, mode) {
  if (!order) {
    order = {
      id:'TEST', time:tNow(), tgl:tgl(), cust:'Preview Customer',
      pi:[{n:'Takoyaki Medium',q:2,h:18000}],
      ti:[{n:'Gurita',q:1,h:0}],
      si:[{n:'Mayo',q:1,h:0},{n:'Saus Takoyaki',q:1,h:0}],
      sub:36000, porsi:2, mat:'Matang', pay:'Tunai'
    };
  }
  g('receipt-content').innerHTML = buildReceiptHTML(order);
  g('print-ov').classList.add('on');
  if (mode === 'print') setTimeout(doPrint, 350);
}

function closePrintOv() { g('print-ov').classList.remove('on'); }

function doPrint() {
  if (printerConnected && (printerMethod==='bluetooth'||printerMethod==='usb')) {
    sendEscPosToPrinter(g('receipt-content'));
  } else {
    // Fallback: browser print popup
    const html = g('receipt-content').innerHTML;
    const w = window.open('','_blank','width=380,height=700');
    w.document.write(`<!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&family=Nunito:wght@400;700&display=swap" rel="stylesheet">
      <style>
        body{font-family:monospace;font-size:12px;margin:0;padding:16px;max-width:300px}
        .print-btn{display:block;width:100%;padding:12px;background:#E8003D;color:#fff;border:none;border-radius:8px;font-size:15px;cursor:pointer;margin-bottom:12px;font-family:Nunito,sans-serif;font-weight:800;}
        @media print{.print-btn{display:none}}
      </style></head>
      <body>
        <button class="print-btn" onclick="window.print()">🖨️ Cetak Struk</button>
        ${html}
      </body></html>`);
    w.document.close();
  }
  toast('🖨 Mencetak struk...');
}

function printTestReceipt() { previewReceipt(null, 'print'); }

/* ══════════════════════════════════════════
   ESC/POS PRINTER — CORE
══════════════════════════════════════════ */
const ESC_POS = {
  INIT:       new Uint8Array([0x1B,0x40]),
  ALIGN_C:    new Uint8Array([0x1B,0x61,0x01]),
  ALIGN_L:    new Uint8Array([0x1B,0x61,0x00]),
  BOLD_ON:    new Uint8Array([0x1B,0x45,0x01]),
  BOLD_OFF:   new Uint8Array([0x1B,0x45,0x00]),
  DOUBLE_ON:  new Uint8Array([0x1D,0x21,0x11]),
  DOUBLE_OFF: new Uint8Array([0x1D,0x21,0x00]),
  LF:         new Uint8Array([0x0A]),
  CUT:        new Uint8Array([0x1D,0x56,0x42,0x00]),
};

function buildEscPosBytes(order) {
  const storeName = g('r_nama_toko')?.value || 'Takoyaki Mazboy';
  const addr      = g('r_alamat')?.value    || 'Outlet Kalibaru';
  const footer    = g('r_footer')?.value    || 'Terima kasih! Arigato!';
  const staff     = g('p_nama')?.value      || '-';
  const enc       = new TextEncoder();
  const L         = '--------------------------------';
  const D         = '================================';

  const lines = [
    ...Object.values(ESC_POS).slice(0,1),  // INIT
    ESC_POS.ALIGN_C,
    ESC_POS.BOLD_ON, enc.encode(storeName + '\n'),
    ESC_POS.BOLD_OFF, enc.encode(addr + '\n'),
    ESC_POS.ALIGN_L, enc.encode(D + '\n'),
    enc.encode(`No  : #${String(order.id).padStart(4,'0')}\n`),
    enc.encode(`Tgl : ${order.tgl}\n`),
    enc.encode(`Jam : ${order.time}\n`),
    enc.encode(`Nama: ${order.cust}\n`),
    enc.encode(`Staff:${staff}\n`),
    enc.encode(L + '\n'),
  ];

  order.pi.forEach(i => {
    const sub = rp(i.q * i.h);
    lines.push(enc.encode(`${i.n} x${i.q}\n`));
    const line = `  ${rp(i.h)}/pcs`.padEnd(22) + sub + '\n';
    lines.push(enc.encode(line));
  });
  if (order.ti && order.ti.length) {
    lines.push(enc.encode('+ Isian:\n'));
    order.ti.forEach(i => lines.push(enc.encode(`  - ${i.n}\n`)));
  }
  if (order.si && order.si.length) {
    lines.push(enc.encode('+ Saus:\n'));
    order.si.forEach(i => {
      const sub = i.h ? rp(i.q*i.h) : 'Gratis';
      lines.push(enc.encode(`  - ${i.n} : ${sub}\n`));
    });
  }

  lines.push(
    enc.encode(L + '\n'),
    enc.encode(`Matang : ${order.mat}\n`),
    enc.encode(`Bayar  : ${order.pay}\n`),
    enc.encode(D + '\n'),
    ESC_POS.BOLD_ON,
    enc.encode(`TOTAL           ${rp(order.sub)}\n`),
    ESC_POS.BOLD_OFF,
    enc.encode(D + '\n'),
    ESC_POS.ALIGN_C,
    enc.encode(footer + '\n'),
    enc.encode('Takoyaki Mazboy\n'),
    ESC_POS.LF, ESC_POS.LF, ESC_POS.LF,
    ESC_POS.CUT
  );

  const total = lines.reduce((s,a)=>s+a.length, 0);
  const out   = new Uint8Array(total);
  let offset  = 0;
  lines.forEach(a => { out.set(a, offset); offset += a.length; });
  return out;
}

async function sendEscPosToPrinter(el) {
  const order = {
    id:   g('receipt-content').dataset.orderId || 'X',
    pi:[], ti:[], si:[],
    sub:0, mat:'-', pay:'-', cust:'-', time:tNow(), tgl:tgl()
  };
  // Use last order if available
  const lastOrder = orders[orders.length-1];
  const target = lastOrder || order;
  const bytes = buildEscPosBytes(target);

  try {
    if (printerMethod === 'bluetooth' && btCharacteristic) {
      await writeBTChunks(bytes);
      printerLog('✓ Print via Bluetooth OK');
    } else if (printerMethod === 'usb' && usbDevice) {
      const epNum = usbDevice.configuration.interfaces[0].alternate.endpoints
        .find(e=>e.direction==='out').endpointNumber;
      await usbDevice.transferOut(epNum, bytes);
      printerLog('✓ Print via USB OK');
    }
    toast('✓ Struk dicetak!');
  } catch(e) {
    printerLog('✗ Print error: ' + e.message);
    toast('❌ Print gagal, coba lagi');
  }
}

async function writeBTChunks(data, chunkSize = 20) {
  for (let i=0; i<data.length; i+=chunkSize) {
    const chunk = data.slice(i, Math.min(i+chunkSize, data.length));
    if (btCharacteristic.properties.writeWithoutResponse) {
      await btCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await btCharacteristic.writeValue(chunk);
    }
  }
}

/* ══════════════════════════════════════════
   PRINTER UI — METHOD TABS
══════════════════════════════════════════ */
function setPrinterMethod(method, btn, save=true) {
  printerMethod = method;
  document.querySelectorAll('.method-tab').forEach(b => b.classList.remove('sel'));
  if (btn) btn.classList.add('sel');
  g('lan-panel').style.display = method==='lan'       ? 'block' : 'none';
  g('bt-panel').style.display  = method==='bluetooth' ? 'block' : 'none';
  g('usb-panel').style.display = method==='usb'       ? 'block' : 'none';
  // Reset connection state when switching
  printerConnected    = false;
  btDevice            = null;
  btCharacteristic    = null;
  selectedBtDevice    = null;
  updatePrinterStatus('idle','Belum Terhubung','Pilih metode koneksi di bawah');
  if (save) saveData();
}

/* ──────────────────────────────────────────
   LAN / WiFi CONNECT
────────────────────────────────────────── */
async function connectLAN() {
  const ip   = g('printer-ip').value.trim();
  const port = g('printer-port').value || '9100';
  if (!ip) return alert('Masukkan IP Address printer!');

  printerLog(`Mencoba koneksi ke ${ip}:${port}…`);
  updatePrinterStatus('idle','Menghubungkan…','Harap tunggu');

  try {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 3000);
    await fetch(`http://${ip}:${port}`, { signal:ctrl.signal, mode:'no-cors' });
    clearTimeout(tid);
    _setConnected(`Printer LAN ${ip}`, `Port ${port}`);
  } catch(e) {
    if (e.name === 'AbortError') {
      printerLog(`✗ Timeout: printer tidak merespons di ${ip}:${port}`);
      updatePrinterStatus('err','Koneksi Gagal',`Printer tidak ditemukan di ${ip}`);
      toast('❌ Printer tidak ditemukan');
    } else {
      // Network error karena CORS → artinya IP bisa dicapai
      _setConnected(`Printer LAN ${ip}`, `Port ${port}`);
    }
  }
}

/* ──────────────────────────────────────────
   BLUETOOTH CONNECT
   Mendukung:
     - Android  : Web Bluetooth API (Chrome 56+, Android 6+)
     - iOS/iPadOS: TIDAK ada Web Bluetooth → tampilkan panduan
────────────────────────────────────────── */
async function scanBluetoothPrinter() {
  // Deteksi platform
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (isIOS) {
    toast('⚠️ iOS tidak mendukung Web Bluetooth. Lihat panduan di bawah.');
    printerLog('✗ iOS: Web Bluetooth tidak tersedia.\n  Gunakan PrintHand / LAN / AirPrint.');
    return;
  }

  if (!navigator.bluetooth) {
    toast('⚠️ Browser ini tidak mendukung Web Bluetooth. Gunakan Chrome Android.');
    printerLog('✗ Web Bluetooth API tidak ditemukan.\n  Pastikan Chrome terbaru di Android.');
    return;
  }

  printerLog('Memulai scan Bluetooth…\n(Popup browser akan muncul)');
  selectedBtDevice = null;

  // Filter umum untuk printer thermal ESC/POS
  const PRINTER_FILTERS = [
    { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },   // UUID umum thermal printer
    { services: ['e7810a71-73ae-499d-8c15-faa9aef0c3f2'] },   // Xprinter
    { namePrefix: 'Printer' },
    { namePrefix: 'EPSON'   },
    { namePrefix: 'Star'    },
    { namePrefix: 'RPP'     },
    { namePrefix: 'BT'      },
    { namePrefix: 'PT'      },
  ];

  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: PRINTER_FILTERS,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
      ]
    });

    selectedBtDevice = device;
    printerLog(`Ditemukan: ${device.name || '(no name)'}`);
    toast(`✓ Ditemukan: ${device.name}`);

    // Tampilkan di list
    const list = g('bt-device-list');
    list.innerHTML = '';
    const item = document.createElement('div'); item.className='bt-device-item';
    item.innerHTML=`
      <div>
        <div class="bt-device-name">📠 ${device.name || 'Printer Bluetooth'}</div>
        <div class="bt-device-addr">Siap dihubungkan</div>
      </div>
      <span class="bt-device-select chosen">Dipilih ✓</span>`;
    list.appendChild(item);

    const btn = g('btn-bt-connect');
    if (btn) btn.disabled = false;

  } catch(e) {
    if (e.name !== 'NotFoundError') {
      printerLog('✗ Scan error: ' + e.message);
      toast('❌ ' + e.message);
    } else {
      printerLog('ℹ️ Scan dibatalkan oleh pengguna.');
    }
  }
}

async function connectBluetooth() {
  if (!selectedBtDevice) {
    toast('Scan printer dulu!');
    return;
  }

  printerLog(`Menghubungkan ke ${selectedBtDevice.name}…`);
  updatePrinterStatus('idle','Menghubungkan…','Harap tunggu');

  try {
    const server = await selectedBtDevice.gatt.connect();
    printerLog('GATT terhubung, mencari service…');

    // Coba service UUID thermal printer yang umum
    const SERVICE_UUIDS = [
      '000018f0-0000-1000-8000-00805f9b34fb',
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
    ];
    const CHAR_UUIDS = [
      '00002af1-0000-1000-8000-00805f9b34fb',
      'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
    ];

    let service = null;
    for (const uuid of SERVICE_UUIDS) {
      try { service = await server.getPrimaryService(uuid); break; }
      catch(_) {}
    }
    if (!service) {
      // Fallback: ambil service pertama
      const all = await server.getPrimaryServices();
      service = all[0];
    }
    if (!service) throw new Error('Service printer tidak ditemukan.');

    const chars = await service.getCharacteristics();
    btCharacteristic = chars.find(c =>
      c.properties.write || c.properties.writeWithoutResponse
    ) || chars[0];

    if (!btCharacteristic) throw new Error('Karakteristik tulis tidak ditemukan.');

    btDevice = selectedBtDevice;
    printerLog(`✓ Karakteristik ditemukan: ${btCharacteristic.uuid}`);

    // Listen disconnect
    btDevice.addEventListener('gattserverdisconnected', () => {
      printerConnected = false;
      printerLog('⚠️ Bluetooth terputus!');
      updatePrinterStatus('err','Koneksi Terputus','Hubungkan ulang printer');
      _updateHeaderBadge(false);
    });

    _setConnected(btDevice.name || 'Printer Bluetooth', 'Bluetooth');

  } catch(e) {
    printerLog('✗ BT Error: ' + e.message);
    updatePrinterStatus('err','Gagal Terhubung', e.message.substring(0,50));
    toast('❌ Gagal: ' + e.message);
  }
}

/* ──────────────────────────────────────────
   USB CONNECT (PC/Laptop only)
────────────────────────────────────────── */
async function connectUSB() {
  if (!navigator.usb) {
    alert('Web USB tidak didukung.\nGunakan Chrome/Edge di PC, atau pilih Bluetooth/LAN untuk mobile.');
    printerLog('✗ Web USB API tidak tersedia');
    return;
  }
  try {
    printerLog('Meminta akses USB…');
    usbDevice = await navigator.usb.requestDevice({ filters:[{classCode:7}] });
    await usbDevice.open();
    if (usbDevice.configuration === null) await usbDevice.selectConfiguration(1);
    await usbDevice.claimInterface(0);
    printerLog(`✓ USB: ${usbDevice.productName}`);
    _setConnected(usbDevice.productName || 'USB Printer', 'USB');
  } catch(e) {
    if (e.name !== 'NotFoundError') {
      printerLog('✗ USB Error: ' + e.message);
      updatePrinterStatus('err','USB Gagal', e.message);
      toast('❌ USB gagal: ' + e.message);
    }
  }
}

/* ──────────────────────────────────────────
   STATUS HELPERS
────────────────────────────────────────── */
function _setConnected(name, via) {
  printerConnected = true;
  updatePrinterStatus('on', `✓ ${name}`, `Terhubung via ${via}`);
  printerLog(`✓ Printer terhubung: ${name}`);
  toast(`✓ Printer ${name} siap!`);
  _updateHeaderBadge(true, name);
}

function updatePrinterStatus(state, text, sub) {
  const dot = g('p-dot');
  dot.className = 'p-dot';
  if (state === 'on')  dot.classList.add('on');
  if (state === 'err') dot.classList.add('err');
  g('p-status-text').innerText = text;
  g('p-status-sub').innerText  = sub;
}

function _updateHeaderBadge(online, name='') {
  const txt = g('printer-badge-txt');
  const dot = document.querySelector('.hdr-dot');
  if (!txt || !dot) return;
  if (online) {
    txt.innerText = 'Printer: ' + (name || 'Online');
    dot.classList.remove('offline');
  } else {
    txt.innerText = 'Printer Offline';
    dot.classList.add('offline');
  }
}

function printerLog(msg) {
  const log = g('printer-log');
  if (!log) return;
  const t = new Date().toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  log.textContent += `\n[${t}] ${msg}`;
  log.scrollTop = log.scrollHeight;
}

async function testPrinter() {
  printerLog('Test koneksi…');
  if (printerConnected) {
    toast('🖨 Printer OK, kirim test print…');
    printerLog('✓ Printer terhubung dan siap.');
  } else {
    toast('⚠️ Printer belum terhubung');
    printerLog('⚠️ Hubungkan printer dulu.');
  }
}

/* ══════════════════════════════════════════
   CHECKOUT → WHATSAPP
══════════════════════════════════════════ */
function checkout() {
  const nama = g('p_nama').value.trim();
  if (!nama) return alert('Isi nama staff di tab Absen dulu!');
  const { qP } = tots();
  if (qP > 0) {
    if (!confirm('Masih ada item di keranjang. Simpan otomatis?')) return;
    confirmOrder();
  }
  if (!orders.length) return alert('Belum ada pesanan tersimpan!');

  const shift       = g('p_shift').value       || '-';
  const tanggal     = tgl();
  const modal       = nn(g('p_modal').value);
  const kel         = exps.reduce((a,b)=>a+b.p, 0);
  const qris        = nn(g('p_qris').value);
  const onl         = nn(g('p_online').value);
  const totalOmzet  = orders.reduce((a,o)=>a+o.sub, 0);
  const totalPorsi  = orders.reduce((a,o)=>a+o.porsi, 0);
  const netto       = modal + totalOmzet - kel - qris - onl;
  const byPay       = {};
  orders.forEach(o => { byPay[o.pay] = (byPay[o.pay]||0) + o.sub; });

  const pMap={}, tMap={}, sMap={};
  orders.forEach(o => {
    o.pi.forEach(i => { if(!pMap[i.n]) pMap[i.n]={q:0,h:i.h}; pMap[i.n].q+=i.q; });
    o.ti.forEach(i => { if(!tMap[i.n]) tMap[i.n]={q:0,h:i.h}; tMap[i.n].q+=i.q; });
    (o.si||[]).forEach(i => { if(!sMap[i.n]) sMap[i.n]={q:0,h:i.h}; sMap[i.n].q+=i.q; });
  });

  let txt = '';
  txt+=`╔═══════════════════════╗\n🐙 LAPORAN TAKOYAKI MAZBOY\n╚═══════════════════════╝\n`;
  txt+=`📅 ${tanggal}\n👤 ${nama}  |  ${shift}\n`;
  txt+=`━━━━━━━━━━━━━━━━━━━━━━━\n`;
  txt+=`💰 Modal Awal  : ${rp(modal)}\n`;
  txt+=`🐙 Omzet Jual  : ${rp(totalOmzet)}\n`;
  txt+=`📥 Total Kas   : ${rp(modal+totalOmzet)}\n`;
  txt+=`━━━━━━━━━━━━━━━━━━━━━━━\n`;
  for(const[k,v] of Object.entries(byPay)) {
    const ic = k==='Tunai'?'💵':k==='QRIS'?'📱':'🛵';
    txt += `${ic} ${k}: ${rp(v)}\n`;
  }
  txt+=`━━━━━━━━━━━━━━━━━━━━━━━\n`;
  txt+=`💸 Pengeluaran : −${rp(kel)}\n`;
  txt+=`📱 Setor QRIS  : −${rp(qris)}\n`;
  txt+=`🛵 Setor Online: −${rp(onl)}\n`;
  txt+=`━━━━━━━━━━━━━━━━━━━━━━━\n`;
  txt+=`💵 *SETORAN TUNAI: ${rp(netto<0?0:netto)}*\n\n`;
  txt+=`╔═══════════════════════╗\n🐙 TOTAL ITEM TERJUAL\n╚═══════════════════════╝\n`;
  txt+=`📦 Transaksi: ${orders.length}×  |  🐙 Porsi: ${totalPorsi}\n━━━━━━━━━━━━━━━━━━━━━━━\n`;
  for(const[k,v] of Object.entries(pMap)) txt+=`• ${k} ×${v.q} = ${rp(v.q*v.h)}\n`;
  if (Object.keys(tMap).length) { txt+=`─ Isian ─\n`; for(const[k,v] of Object.entries(tMap)) txt+=`• ${k} ×${v.q}\n`; }
  if (Object.keys(sMap).length) { txt+=`─ Saus ─\n`;  for(const[k] of Object.entries(sMap))  txt+=`• ${k}\n`; }
  txt+=`\n╔═══════════════════════╗\n📝 DETAIL PESANAN\n╚═══════════════════════╝\n`;
  orders.forEach(o => {
    txt+=`#${o.id} | 👤 ${o.cust} | ${o.time}\n`;
    const ps  = o.pi.map(i=>`${i.n} x${i.q}`).join(', ');
    const ts  = o.ti.length ? ' + '+o.ti.map(i=>`${i.n}`).join('+') : '';
    const ss  = (o.si&&o.si.length) ? ' ['+o.si.map(i=>i.n).join('+')+']' : '';
    txt+=`🛒 ${ps}${ts}${ss}\n💳 ${o.pay} | 🔥 ${o.mat} | 💰 ${rp(o.sub)}\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
  });

  const sAdonan = g('s_adonan').value;
  const sBhn    = g('s_bahan').value;
  const sNot    = g('s_note').value;
  if (sAdonan||sBhn||sNot) {
    txt+=`\n╔═══════════════════════╗\n📦 STOK OPNAME\n╚═══════════════════════╝\n`;
    if(sAdonan) txt+=`🐙 Sisa Ball : ${sAdonan}\n`;
    if(sBhn)    txt+=`🧂 Sisa Bahan: ${sBhn}\n`;
    const low = stokBahan.filter(b=>b.qty<=1);
    if(low.length) txt+=`⚠️ HAMPIR HABIS: ${low.map(b=>`${b.n}(${b.qty})`).join(', ')}\n`;
    if(sNot) txt+=`📝 Catatan: ${sNot}\n`;
  }

  window.open(`https://api.whatsapp.com/send?phone=${ADMIN}&text=${encodeURIComponent(txt)}`);

  if (g('auto-print-shift')?.checked) {
    setTimeout(() => printTestReceipt(), 900);
  }

  if (confirm('Laporan terkirim! Reset data shift ini?')) {
    orders=[]; exps=[]; oCnt=0; cP={}; cT={}; cS={};
    ['p_qris','p_online','s_adonan','s_bahan','s_note'].forEach(id=>{
      const e=g(id); if(e) e.value='';
    });
    localStorage.removeItem('TAKO_POS_DATA');
    upd(); renderExps(); renderRekap(); renderStok();
    toast('✓ Shift selesai, data di-reset. Arigatou! 🐙');
  }
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
window.onload = () => {
  loadData();
  renderMenus();
  renderRekap();
  renderExps();
  renderStok();
  updFloat();
  calcTot();
  updatePrinterStatus('idle','Belum Terhubung','Pilih metode koneksi di tab Printer');

  const inputIds = [
    'p_nama','p_shift','p_modal',
    's_adonan','s_bahan','s_note','c_name',
    'printer-ip','printer-port',
    'r_nama_toko','r_alamat','r_footer','r_kontak'
  ];
  inputIds.forEach(id => {
    const el = g(id);
    if (el) {
      el.addEventListener('input',  saveData);
      el.addEventListener('change', saveData);
    }
  });
};
