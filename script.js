/* ═══════════════════════════════════════════
   TAKOYAKI MAZBOY POS — script.js
   ═══════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════
   1. KONFIGURASI & DATA MENU
══════════════════════════════════════════ */
const ADMIN = "6285117010280";

const MENU_TAKOYAKI = [
  { id: 'm1', em: '🐙', n: 'Small', h: 10000, badge: '5' },
  { id: 'm2', em: '🐙', n: 'Medium', h: 18000, badge: '10' },
  { id: 'm3', em: '🐙', n: 'Large', h: 25000, badge: '15' },
  { id: 'm4', em: '🎁', n: 'Gratis', h: 0, badge: 'FREE' },
];

const MENU_ISIAN = [
  { id: 't1', em: '🧀', n: 'Keju', h: 0 },
  { id: 't2', em: '🥚', n: 'Telur Puyuh', h: 0 },
  { id: 't3', em: '🍗', n: 'Ayam', h: 0 },
  { id: 't4', em: '🐙', n: 'Gurita', h: 0 },
  { id: 't5', em: '🍳', n: 'Eggroll', h: 0 },
  { id: 't6', em: '🥯', n: 'Cikuwa', h: 0 },
  { id: 't7', em: '🥓', n: 'Kornet', h: 0 },
  { id: 't8', em: '🦀', n: 'Crabstick', h: 0 },
  { id: 't9', em: '🌭', n: 'Sosis', h: 0 },
];

const MENU_SAUS = [
  { id: 's1', em: '🧀', n: 'Keju', h: 3000 },
  { id: 's2', em: '🍡', n: 'Saus takoyaki', h: 0 },
  { id: 's3', em: '🍯', n: 'Mayones', h: 0 },
  { id: 's4', em: '🌶️', n: 'Saus Pedas', h: 0 },
  { id: 's5', em: '⚫', n: 'Pisah Semua', h: 0 },
];

const STOK_AWAL = [
  { n: 'Adonan Tepung', unit: 'kg', qty: 5 },
  { n: 'Gurita / Cumi', unit: 'kg', qty: 2 },
  { n: 'Saus Takoyaki', unit: 'btl', qty: 3 },
  { n: 'Mayo', unit: 'btl', qty: 4 },
  { n: 'Katsuobushi', unit: 'pck', qty: 5 },
  { n: 'Gas LPG', unit: 'tab', qty: 2 },
];

/* ══════════════════════════════════════════
   2. STATE MANAGEMENT (DATA AKTIF)
══════════════════════════════════════════ */
let cartTakoyaki = {};
let cartIsian = {};
let cartSaus = {};
let orders = [];
let expenses = [];
let orderCount = 0;
let selectedVarian = 'Pake Cakalang';
let selectedPayment = 'Tunai';
let stokBahan = JSON.parse(JSON.stringify(STOK_AWAL));

// Printer state
let printerMethod = 'lan';
let printerConnected = false;
let btDevice = null;
let btCharacteristic = null;
let selectedBtDevice = null;
let usbDevice = null;

/* ══════════════════════════════════════════
   3. FUNGSI UTILITAS & HELPER
══════════════════════════════════════════ */
const getEl = (id) => document.getElementById(id);
const formatRp = (n) => 'Rp ' + (n || 0).toLocaleString('id-ID');
const parseNum = (v) => parseInt((v || '').toString().replace(/[^0-9]/g, '')) || 0;
const getTimeNow = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const getDateNow = () => new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

function fmt(el) {
  const v = el.value.replace(/[^0-9]/g, '');
  el.value = v ? 'Rp ' + parseInt(v).toLocaleString('id-ID') : '';
}

function setVal(id, v) {
  const e = getEl(id);
  if (e && v !== undefined && v !== null) e.value = v;
}

let toastTimer;
function toast(msg, dur = 2200) {
  const t = getEl('toast');
  if (!t) return;
  t.innerText = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), dur);
}

// Jam Real-time
setInterval(() => {
  const e = getEl('clk');
  if (e) e.innerText = new Date().toLocaleTimeString('id-ID');
}, 1000);

/* ══════════════════════════════════════════
   4. LOCAL STORAGE (ANTI RESET)
══════════════════════════════════════════ */
function saveData() {
  const data = {
    cartTakoyaki, cartIsian, cartSaus, orders, expenses, orderCount,
    selectedVarian, selectedPayment, stokBahan, printerMethod,
    inputs: {
      p_nama: getEl('p_nama')?.value || '',
      p_shift: getEl('p_shift')?.value || '',
      p_modal: getEl('p_modal')?.value || '',
      s_adonan: getEl('s_adonan')?.value || '',
      s_bahan: getEl('s_bahan')?.value || '',
      s_note: getEl('s_note')?.value || '',
      printer_ip: getEl('printer-ip')?.value || '',
      printer_port: getEl('printer-port')?.value || '9100',
      r_nama_toko: getEl('r_nama_toko')?.value || '',
      r_alamat: getEl('r_alamat')?.value || '',
      r_footer: getEl('r_footer')?.value || '',
      r_kontak: getEl('r_kontak')?.value || '',
      auto_print: getEl('auto-print')?.checked || false,
      auto_print_shift: getEl('auto-print-shift')?.checked !== false,
    }
  };
  localStorage.setItem('TAKO_POS_DATA', JSON.stringify(data));
}

function loadData() {
  const raw = localStorage.getItem('TAKO_POS_DATA');
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    cartTakoyaki = d.cartTakoyaki || {};
    cartIsian = d.cartIsian || {};
    cartSaus = d.cartSaus || {};
    orders = d.orders || [];
    expenses = d.expenses || [];
    orderCount = d.orderCount || 0;
    selectedVarian = d.selectedVarian || 'Pake Cakalang';
    selectedPayment = d.selectedPayment || 'Tunai';
    if (d.stokBahan) stokBahan = d.stokBahan;
    printerMethod = d.printerMethod || 'lan';

    if (d.inputs) {
      const I = d.inputs;
      setVal('p_nama', I.p_nama);
      setVal('p_shift', I.p_shift);
      setVal('p_modal', I.p_modal);
      setVal('s_adonan', I.s_adonan);
      setVal('s_bahan', I.s_bahan);
      setVal('s_note', I.s_note);
      setVal('printer-ip', I.printer_ip);
      setVal('printer-port', I.printer_port || '9100');
      setVal('r_nama_toko', I.r_nama_toko || 'Takoyaki Mazboy');
      setVal('r_alamat', I.r_alamat || 'Outlet Kalibaru');
      setVal('r_footer', I.r_footer || 'Terima kasih! Arigato! 🐙');
      setVal('r_kontak', I.r_kontak || '');
      if (getEl('auto-print')) getEl('auto-print').checked = !!I.auto_print;
      if (getEl('auto-print-shift')) getEl('auto-print-shift').checked = I.auto_print_shift !== false;
    }

    const pmBtn = getEl('pm-' + printerMethod);
    if (pmBtn) setPrinterMethod(printerMethod, pmBtn, false);

    updProf();
  } catch (e) {
    console.error('Gagal memuat data tersimpan', e);
  }
}

/* ══════════════════════════════════════════
   5. NAVIGASI & PROFIL
══════════════════════════════════════════ */
function sw(id, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('on'));
  getEl('tab-' + id)?.classList.add('on');
  if (btn) btn.classList.add('on');
  if (id === 'rekap') renderRekap();
  if (id === 'stok') renderStok();
}

function updProf() {
  const n = getEl('p_nama')?.value;
  const r = getEl('p_shift')?.value;
  if(getEl('dn')) getEl('dn').innerText = n || 'Nama Staff';
  if(getEl('dr')) getEl('dr').innerText = r || 'Shift belum dipilih';
}

function checkin() {
  const n = getEl('p_nama')?.value.trim();
  const s = getEl('p_shift')?.value;
  if (!n || !s) return alert('Lengkapi Nama & Shift dulu!');
  toast('✓ Check-in Berhasil! Itadakimasu! 🐙');
  sw('jual', getEl('nb-jual'));
  saveData();
}

/* ══════════════════════════════════════════
   6. LOGIKA KERANJANG & KALKULASI
══════════════════════════════════════════ */
function addTakoyaki(m) {
  if (navigator.vibrate) navigator.vibrate(15);
  if (!cartTakoyaki[m.id]) cartTakoyaki[m.id] = { qty: 0, h: m.h, n: m.n };
  cartTakoyaki[m.id].qty++;
  updateAllUi();
}

function addIsian(m) {
  if (navigator.vibrate) navigator.vibrate(15);
  if (!cartIsian[m.id]) cartIsian[m.id] = { qty: 0, h: m.h, n: m.n };
  cartIsian[m.id].qty++;
  updateAllUi();
}

function addSaus(m) {
  if (navigator.vibrate) navigator.vibrate(15);
  if (!cartSaus[m.id]) cartSaus[m.id] = { qty: 0, h: m.h, n: m.n };
  cartSaus[m.id].qty++;
  updateAllUi();
}

function ubahQtyTakoyaki(id, delta) {
  if (!cartTakoyaki[id]) return;
  cartTakoyaki[id].qty += delta;
  if (cartTakoyaki[id].qty <= 0) delete cartTakoyaki[id];
  updateAllUi(); updModal();
}

function ubahQtyIsian(id, delta) {
  if (!cartIsian[id]) return;
  cartIsian[id].qty += delta;
  if (cartIsian[id].qty <= 0) delete cartIsian[id];
  updateAllUi(); updModal();
}

function ubahQtySaus(id, delta) {
  if (!cartSaus[id]) return;
  cartSaus[id].qty += delta;
  if (cartSaus[id].qty <= 0) delete cartSaus[id];
  updateAllUi(); updModal();
}

function hitungTotalKeranjang() {
  let qtyTako = 0, subTako = 0, subIsian = 0, subSaus = 0;
  for (const k in cartTakoyaki) { qtyTako += cartTakoyaki[k].qty; subTako += cartTakoyaki[k].qty * cartTakoyaki[k].h; }
  for (const k in cartIsian) { subIsian += cartIsian[k].qty * cartIsian[k].h; }
  for (const k in cartSaus) { subSaus += cartSaus[k].qty * cartSaus[k].h; }
  return { qtyTako, subTako, subIsian, subSaus, grandTotal: subTako + subIsian + subSaus };
}

function kalkulasiKeuangan() {
  const omzetTunai = orders.filter(o => o.pay === 'Tunai').reduce((a, o) => a + o.sub, 0);
  const omzetQRIS = orders.filter(o => o.pay === 'QRIS').reduce((a, o) => a + o.sub, 0);
  const omzetOnline = orders.filter(o => o.pay === 'Gojek/Online').reduce((a, o) => a + o.sub, 0);
  
  const { grandTotal } = hitungTotalKeranjang();
  const totalQRIS = omzetQRIS + (selectedPayment === 'QRIS' ? grandTotal : 0);
  const totalOnline = omzetOnline + (selectedPayment === 'Gojek/Online' ? grandTotal : 0);
  const totalTunai = omzetTunai + (selectedPayment === 'Tunai' ? grandTotal : 0);
  
  const modal = parseNum(getEl('p_modal')?.value);
  const totalPengeluaran = expenses.reduce((a, b) => a + b.p, 0);
  
  if(getEl('p_qris')) getEl('p_qris').value = formatRp(totalQRIS);
  if(getEl('p_online')) getEl('p_online').value = formatRp(totalOnline);
  
  const nettoTunai = modal + totalTunai - totalPengeluaran;
  const totalPorsiTerjual = orders.reduce((a, o) => a + o.porsi, 0) + Object.values(cartTakoyaki).reduce((a, b) => a + b.qty, 0);
  
  if(getEl('t_porsi')) getEl('t_porsi').innerText = totalPorsiTerjual + ' Porsi';
  if(getEl('t_tunai')) getEl('t_tunai').innerText = formatRp(nettoTunai < 0 ? 0 : nettoTunai);
}

/* ══════════════════════════════════════════
   7. RENDER UI (MENU, FLOAT CART)
══════════════════════════════════════════ */
function updateAllUi() {
  renderMenus();
  updFloat();
  kalkulasiKeuangan();
  saveData();
}

function renderMenus() {
  const gm = getEl('gmenu'); 
  if(gm) {
    gm.innerHTML = '';
    MENU_TAKOYAKI.forEach(m => {
      const q = cartTakoyaki[m.id]?.qty || 0;
      const d = document.createElement('div');
      d.className = 'mc' + (q ? ' hit' : '');
      d.onclick = () => addTakoyaki(m);
      d.innerHTML = `
        ${q ? `<span class="qb">${q}</span>` : ''}
        <div class="mc-em">${m.em}</div>
        <div class="mc-name">${m.n}</div>
        <div class="mc-price">${m.h ? formatRp(m.h) : 'Gratis'}</div>
        ${m.badge ? `<div class="mc-badge">${m.badge}</div>` : ''}`;
      gm.appendChild(d);
    });
  }

  const gt = getEl('gtopping'); 
  if(gt) {
    gt.innerHTML = '';
    MENU_ISIAN.forEach(m => {
      const q = cartIsian[m.id]?.qty || 0;
      const d = document.createElement('div');
      d.className = 'tp' + (q ? ' hit' : '');
      d.onclick = () => addIsian(m);
      d.innerHTML = `
        ${q ? `<span class="qb">${q}</span>` : ''}
        <span class="tp-em">${m.em}</span>
        <div class="tp-name">${m.n}</div>
        <div class="tp-price">${m.h ? formatRp(m.h) : 'Gratis'}</div>`;
      gt.appendChild(d);
    });
  }

  const gs = getEl('gsauce'); 
  if(gs) {
    gs.innerHTML = '';
    MENU_SAUS.forEach(m => {
      const q = cartSaus[m.id]?.qty || 0;
      const d = document.createElement('div');
      d.className = 'sc' + (q ? ' hit' : '');
      d.onclick = () => addSaus(m);
      d.innerHTML = `
        ${m.em} ${m.n} ${m.h ? '(+' + formatRp(m.h) + ')' : '(Gratis)'}
        ${q ? `<span class="qb">${q}</span>` : ''}`;
      gs.appendChild(d);
    });
  }
}

function updFloat() {
  const btn = getEl('fcart');
  if (!btn) return;
  const { qtyTako, grandTotal } = hitungTotalKeranjang();
  if (qtyTako > 0) {
    btn.classList.add('show');
    getEl('fc-cnt').innerText = qtyTako;
    getEl('fc-lbl').innerText = 'porsi di keranjang';
    getEl('fc-tot').innerText = formatRp(grandTotal);
  } else {
    btn.classList.remove('show');
  }
}

/* ══════════════════════════════════════════
   8. MODAL & KONFIRMASI PESANAN
══════════════════════════════════════════ */
function openM() { getEl('ov')?.classList.add('on'); updModal(); }
function closeM() { getEl('ov')?.classList.remove('on'); }
function ovClick(e) { if (e.target.id === 'ov') closeM(); }

function updModal() {
  const { qtyTako, grandTotal } = hitungTotalKeranjang();

  // Menu Takoyaki List
  const pl = getEl('ml-menu');
  if(pl) {
    pl.innerHTML = '';
    let hasTako = false;
    for (const k in cartTakoyaki) {
      hasTako = true;
      const it = cartTakoyaki[k]; const sub = it.qty * it.h;
      const r = document.createElement('div'); r.className = 'm-item';
      r.innerHTML = `
        <div><div class="m-item-n">${it.n}</div><div class="m-item-p">${formatRp(it.h)} / porsi</div></div>
        <div class="m-ctrl">
          <button class="qbtn" onclick="ubahQtyTakoyaki('${k}',-1)">−</button>
          <span class="qv">${it.qty}</span>
          <button class="qbtn" onclick="ubahQtyTakoyaki('${k}',1)">+</button>
          <span class="m-sub-price">${formatRp(sub)}</span>
        </div>`;
      pl.appendChild(r);
    }
    if (!hasTako) pl.innerHTML = '<div class="empty">Belum ada menu dipilih</div>';
  }

  // Isian List
  const tw = getEl('ml-top-wrap'); const tl = getEl('ml-topping'); 
  if(tl && tw) {
    tl.innerHTML = ''; let hasIsian = false;
    for (const k in cartIsian) {
      hasIsian = true; const it = cartIsian[k]; const sub = it.qty * it.h;
      const r = document.createElement('div'); r.className = 'm-item';
      r.innerHTML = `
        <div><div class="m-item-n">${it.n}</div><div class="m-item-p">${it.h ? formatRp(it.h) + ' / pcs' : 'Gratis'}</div></div>
        <div class="m-ctrl">
          <button class="qbtn" onclick="ubahQtyIsian('${k}',-1)">−</button>
          <span class="qv">${it.qty}</span>
          <button class="qbtn" onclick="ubahQtyIsian('${k}',1)">+</button>
          <span class="m-sub-price">${sub ? formatRp(sub) : 'Gratis'}</span>
        </div>`;
      tl.appendChild(r);
    }
    tw.style.display = hasIsian ? 'block' : 'none';
  }

  // Saus List
  const sw2 = getEl('ml-sauce-wrap'); const sl = getEl('ml-sauce'); 
  if(sl && sw2) {
    sl.innerHTML = ''; let hasSaus = false;
    for (const k in cartSaus) {
      hasSaus = true; const it = cartSaus[k]; const sub = it.qty * it.h;
      const r = document.createElement('div'); r.className = 'm-item';
      r.innerHTML = `
        <div><div class="m-item-n">${it.n}</div><div class="m-item-p">${it.h ? formatRp(it.h) + ' / pcs' : 'Gratis'}</div></div>
        <div class="m-ctrl">
          <button class="qbtn" onclick="ubahQtySaus('${k}',-1)">−</button>
          <span class="qv">${it.qty}</span>
          <button class="qbtn" onclick="ubahQtySaus('${k}',1)">+</button>
          <span class="m-sub-price">${sub ? formatRp(sub) : 'Gratis'}</span>
        </div>`;
      sl.appendChild(r);
    }
    sw2.style.display = hasSaus ? 'block' : 'none';
  }

  if(getEl('m-tot')) getEl('m-tot').innerText = formatRp(grandTotal);
  if(getEl('m-chip')) getEl('m-chip').innerText = qtyTako + ' porsi';
  if(getEl('m-sub')) getEl('m-sub').innerText = orderCount > 0 ? `Pesanan ke-${orderCount + 1}` : 'Pesanan baru';
}

function setMat(btn) {
  document.querySelectorAll('.mc2').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel'); selectedVarian = btn.dataset.v; saveData();
}

function setPay(btn) {
  document.querySelectorAll('.pc2').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel'); selectedPayment = btn.dataset.v; kalkulasiKeuangan(); saveData();
}

/* ══════════════════════════════════════════
   9. KONFIRMASI PESANAN
══════════════════════════════════════════ */
function resetCart() {
  const { qtyTako } = hitungTotalKeranjang();
  if (!qtyTako) { closeM(); return; }
  if (confirm('Kosongkan keranjang tanpa menyimpan?')) {
    cartTakoyaki = {}; cartIsian = {}; cartSaus = {}; 
    updateAllUi(); closeM(); toast('🗑 Keranjang dikosongkan');
  }
}

function confirmOrder() {
  const { qtyTako, grandTotal } = hitungTotalKeranjang();
  if (!qtyTako) return alert('Pilih minimal 1 menu dulu!');
  
  const custName = (getEl('c_name')?.value.trim()) || 'Pelanggan';
  orderCount++;
  
  const pesananTako = [], pesananIsian = [], pesananSaus = [];
  for (const k in cartTakoyaki) pesananTako.push({ n: cartTakoyaki[k].n, q: cartTakoyaki[k].qty, h: cartTakoyaki[k].h });
  for (const k in cartIsian) pesananIsian.push({ n: cartIsian[k].n, q: cartIsian[k].qty, h: cartIsian[k].h });
  for (const k in cartSaus) pesananSaus.push({ n: cartSaus[k].n, q: cartSaus[k].qty, h: cartSaus[k].h });
  
  const order = { 
    id: orderCount, time: getTimeNow(), tgl: getDateNow(), cust: custName, 
    pi: pesananTako, ti: pesananIsian, si: pesananSaus, 
    sub: grandTotal, porsi: qtyTako, mat: selectedVarian, pay: selectedPayment 
  };
  orders.push(order);

  // Reset state keranjang
  cartTakoyaki = {}; cartIsian = {}; cartSaus = {};
  if (getEl('c_name')) getEl('c_name').value = '';
  selectedVarian = 'Pake Cakalang'; selectedPayment = 'Tunai';
  
  document.querySelectorAll('.mc2').forEach(b => b.classList.remove('sel'));
  document.querySelector('.mc2[data-v="Pake Cakalang"]')?.classList.add('sel');
  document.querySelectorAll('.pc2').forEach(b => b.classList.remove('sel'));
  document.querySelector('.pc2[data-v="Tunai"]')?.classList.add('sel');

  updateAllUi(); closeM(); toast(`✓ Pesanan #${orderCount} disimpan!`); renderRekap();
  
  // Auto print
  const autoPrint = getEl('auto-print')?.checked;
  setTimeout(() => previewReceipt(order, autoPrint ? 'print' : 'preview'), 400);
}

/* ══════════════════════════════════════════
   10. PENGELUARAN & MANAJEMEN STOK
══════════════════════════════════════════ */
function addExp() {
  const n = getEl('en')?.value.trim();
  const p = parseNum(getEl('ep')?.value);
  if (!n || !p) return alert('Isi nama & jumlah!');
  expenses.push({ n, p }); 
  getEl('en').value = ''; getEl('ep').value = '';
  renderExps(); kalkulasiKeuangan(); saveData();
}

function delExp(i) { 
  expenses.splice(i, 1); 
  renderExps(); kalkulasiKeuangan(); saveData(); 
}

function renderExps() {
  const el = getEl('explist');
  if(!el) return;
  el.innerHTML = '';
  expenses.forEach((e, i) => {
    const d = document.createElement('div'); d.className = 'exp-row';
    d.innerHTML = `<span>${e.n}</span>
    <div style="display:flex;align-items:center;gap:8px">
      <b>${formatRp(e.p)}</b>
      <button class="exp-del" onclick="delExp(${i})">✕</button>
    </div>`;
    el.appendChild(d);
  });
}

function renderStok() {
  const el = getEl('stok-list');
  if(!el) return;
  el.innerHTML = '';
  stokBahan.forEach((b, i) => {
    const d = document.createElement('div'); d.className = 'stok-item';
    d.innerHTML = `
      <div>
        <div style="font-weight:800;font-size:14px">${b.n}</div>
        <div style="font-size:11px;color:var(--ink3)">${b.unit}</div>
      </div>
      <div class="stok-ctrl">
        <button class="stok-btn m" onclick="adjStok(${i},-1)">−</button>
        <span class="stok-q ${b.qty <= 1 ? 'low' : ''}">${b.qty}</span>
        <button class="stok-btn p" onclick="adjStok(${i},1)">+</button>
      </div>`;
    el.appendChild(d);
  });
}

function adjStok(i, delta) {
  stokBahan[i].qty = Math.max(0, stokBahan[i].qty + delta);
  renderStok(); saveData();
  if (stokBahan[i].qty <= 1) toast(`⚠️ ${stokBahan[i].n} hampir habis!`);
  else toast(`📦 ${stokBahan[i].n}: ${stokBahan[i].qty} ${stokBahan[i].unit}`);
}

/* ══════════════════════════════════════════
   11. REKAP & RIWAYAT PESANAN
══════════════════════════════════════════ */
function renderRekap() {
  const rb = getEl('rbox'); const rl = getEl('rlist');
  if (!rb || !rl) return;
  
  const totalOmzet = orders.reduce((a, o) => a + o.sub, 0);
  const totalPorsi = orders.reduce((a, o) => a + o.porsi, 0);
  const modal = parseNum(getEl('p_modal')?.value);
  const totalPengeluaran = expenses.reduce((a, b) => a + b.p, 0);
  const qris = parseNum(getEl('p_qris')?.value);
  const online = parseNum(getEl('p_online')?.value);
  const netto = modal + totalOmzet - totalPengeluaran - qris - online;
  
  const omzetPerMetode = {};
  orders.forEach(o => { omzetPerMetode[o.pay] = (omzetPerMetode[o.pay] || 0) + o.sub; });

  if (!orders.length) {
    rb.innerHTML = '<div class="empty">Belum ada transaksi dikonfirmasi</div>';
    rl.innerHTML = ''; return;
  }

  const listOmzetStr = Object.entries(omzetPerMetode)
    .map(([k, v]) => `<div class="rr"><span>• Omzet ${k}</span><strong>${formatRp(v)}</strong></div>`).join('');

  rb.innerHTML = `
    <div class="rr"><span>Transaksi</span><strong>${orders.length}×</strong></div>
    <div class="rr"><span>Porsi Terjual</span><strong>${totalPorsi} porsi</strong></div>
    <div class="rr"><span>Omzet Penjualan</span><strong>${formatRp(totalOmzet)}</strong></div>
    ${listOmzetStr}
    <div class="rr" style="color:var(--red)"><span>💸 Pengeluaran</span><strong>−${formatRp(totalPengeluaran)}</strong></div>
    <div class="rr" style="color:var(--blue)"><span>📱 QRIS</span><strong>−${formatRp(qris)}</strong></div>
    <div class="rr" style="color:var(--green)"><span>🛵 Gojek/Online</span><strong>−${formatRp(online)}</strong></div>
    <div class="rr tot"><span>💵 Setoran Tunai</span><span>${formatRp(netto < 0 ? 0 : netto)}</span></div>`;

  rl.innerHTML = '';
  [...orders].reverse().forEach(o => {
    const ps = o.pi.map(i => `${i.n}×${i.q}`).join(', ');
    const ts = o.ti.length ? ' + ' + o.ti.map(i => `${i.n}×${i.q}`).join(', ') : '';
    const ss = (o.si && o.si.length) ? ' [' + o.si.map(i => i.n).join('+') + ']' : '';
    const oid = o.id;
    const d = document.createElement('div'); d.className = 'tx';
    d.innerHTML = `
      <div class="tx-top">
        <span><span class="tx-id">#${o.id}</span><span class="tx-time">${o.time} · 👤 ${o.cust}</span></span>
        <span class="tx-amt">${formatRp(o.sub)}</span>
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
   12. GENERATOR HTML STRUK (PRINTER FALLBACK)
══════════════════════════════════════════ */
function buildReceiptHTML(order) {
  const storeName = getEl('r_nama_toko')?.value || 'Takoyaki Mazboy';
  const addr = getEl('r_alamat')?.value || 'Outlet Kalibaru';
  const footer = getEl('r_footer')?.value || 'Terima kasih! Arigato! 🐙';
  const kontak = getEl('r_kontak')?.value || '';
  const L32 = '─'.repeat(32);
  const D32 = '═'.repeat(32);

  let html = `
    <div style="text-align:center;margin-bottom:10px">
      <div style="font-size:30px">🐙</div>
      <div style="font-family:'Noto Serif JP',serif;font-size:16px;font-weight:700">${storeName}</div>
      <div style="font-size:11px;color:#666">${addr}</div>
      ${kontak ? `<div style="font-size:11px;color:#666">${kontak}</div>` : ''}
      <div style="font-size:10px;color:#aaa;margin-top:4px">${D32}</div>
    </div>
    <div style="font-size:11px;margin-bottom:8px">
      <div>No. : <strong>#${String(order.id).padStart(4, '0')}</strong></div>
      <div>Tgl : ${order.tgl || getDateNow()}</div>
      <div>Jam : ${order.time}</div>
      <div>Nama: <strong>${order.cust}</strong></div>
      <div>Staff: ${getEl('p_nama')?.value || '-'}</div>
    </div>
    <div style="font-size:10px;color:#aaa">${L32}</div>
    <div style="margin:8px 0">`;

  order.pi.forEach(i => {
    html += `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
      <span>${i.n} ×${i.q}</span><span>${formatRp(i.q * i.h)}</span></div>`;
  });
  if (order.ti && order.ti.length) {
    html += `<div style="font-size:10px;color:#888;margin:4px 0">+ Isian:</div>`;
    order.ti.forEach(i => {
      html += `<div style="display:flex;justify-content:space-between;font-size:11px;color:#444;margin-bottom:2px">
        <span style="padding-left:8px">• ${i.n} ×${i.q}</span>
        <span>${i.h ? formatRp(i.q * i.h) : 'Gratis'}</span></div>`;
    });
  }
  if (order.si && order.si.length) {
    html += `<div style="font-size:10px;color:#888;margin:4px 0">+ Saus:</div>`;
    order.si.forEach(i => {
      html += `<div style="display:flex;justify-content:space-between;font-size:11px;color:#444;margin-bottom:2px">
        <span style="padding-left:8px">• ${i.n} ×${i.q}</span>
        <span>${i.h ? formatRp(i.q * i.h) : 'Gratis'}</span></div>`;
    });
  }
  html += `</div>
    <div style="font-size:10px;color:#aaa">${L32}</div>
    <div style="margin:8px 0;font-size:12px">
      <div style="display:flex;justify-content:space-between"><span>🔥 Saus Tambahan:</span><strong>${order.mat}</strong></div>
      <div style="display:flex;justify-content:space-between"><span>💳 Pembayaran:</span><strong>${order.pay}</strong></div>
    </div>
    <div style="font-size:10px;color:#aaa">${D32}</div>
    <div style="display:flex;justify-content:space-between;margin:10px 0;font-family:'Noto Serif JP',serif;font-size:16px;font-weight:700">
      <span>TOTAL</span><span style="color:#E8003D">${formatRp(order.sub)}</span>
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
      id: 'TEST', time: getTimeNow(), tgl: getDateNow(), cust: 'Preview Customer',
      pi: [{ n: 'Takoyaki Medium', q: 2, h: 18000 }],
      ti: [{ n: 'Gurita', q: 1, h: 0 }],
      si: [{ n: 'Mayo', q: 1, h: 0 }, { n: 'Saus Takoyaki', q: 1, h: 0 }],
      sub: 36000, porsi: 2, mat: 'Pake Cakalang', pay: 'Tunai'
    };
  }
  getEl('receipt-content').innerHTML = buildReceiptHTML(order);
  getEl('print-ov').classList.add('on');
  if (mode === 'print') setTimeout(doPrint, 350);
}

function closePrintOv() { getEl('print-ov').classList.remove('on'); }

function doPrint() {
  if (printerConnected && (printerMethod === 'bluetooth' || printerMethod === 'usb')) {
    sendEscPosToPrinter(getEl('receipt-content'));
  } else {
    // Fallback: browser print popup
    const html = getEl('receipt-content').innerHTML;
    const w = window.open('', '_blank', 'width=380,height=700');
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
   13. ESC/POS PRINTER BLUETOOTH/USB
══════════════════════════════════════════ */
const ESC_POS = {
  INIT: new Uint8Array([0x1B, 0x40]),
  ALIGN_C: new Uint8Array([0x1B, 0x61, 0x01]),
  ALIGN_L: new Uint8Array([0x1B, 0x61, 0x00]),
  BOLD_ON: new Uint8Array([0x1B, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([0x1B, 0x45, 0x00]),
  DOUBLE_ON: new Uint8Array([0x1D, 0x21, 0x11]),
  DOUBLE_OFF: new Uint8Array([0x1D, 0x21, 0x00]),
  LF: new Uint8Array([0x0A]),
  CUT: new Uint8Array([0x1D, 0x56, 0x42, 0x00]),
};

function buildEscPosBytes(order) {
  const storeName = getEl('r_nama_toko')?.value || 'Takoyaki Mazboy';
  const addr = getEl('r_alamat')?.value || 'Outlet Kalibaru';
  const footer = getEl('r_footer')?.value || 'Terima kasih! Arigato!';
  const staff = getEl('p_nama')?.value || '-';
  const enc = new TextEncoder();
  const L = '--------------------------------';
  const D = '================================';

  const lines = [
    ...Object.values(ESC_POS).slice(0, 1),
    ESC_POS.ALIGN_C,
    ESC_POS.BOLD_ON, enc.encode(storeName + '\n'),
    ESC_POS.BOLD_OFF, enc.encode(addr + '\n'),
    ESC_POS.ALIGN_L, enc.encode(D + '\n'),
    enc.encode(`No  : #${String(order.id).padStart(4, '0')}\n`),
    enc.encode(`Tgl : ${order.tgl}\n`),
    enc.encode(`Jam : ${order.time}\n`),
    enc.encode(`Nama: ${order.cust}\n`),
    enc.encode(`Staff:${staff}\n`),
    enc.encode(L + '\n'),
  ];

  order.pi.forEach(i => {
    const sub = formatRp(i.q * i.h);
    lines.push(enc.encode(`${i.n} x${i.q}\n`));
    const line = `  ${formatRp(i.h)}/pcs`.padEnd(22) + sub + '\n';
    lines.push(enc.encode(line));
  });
  if (order.ti && order.ti.length) {
    lines.push(enc.encode('+ Isian:\n'));
    order.ti.forEach(i => lines.push(enc.encode(`  - ${i.n}\n`)));
  }
  if (order.si && order.si.length) {
    lines.push(enc.encode('+ Saus:\n'));
    order.si.forEach(i => {
      const sub = i.h ? formatRp(i.q * i.h) : 'Gratis';
      lines.push(enc.encode(`  - ${i.n} : ${sub}\n`));
    });
  }

  lines.push(
    enc.encode(L + '\n'),
    enc.encode(`Pake Cakalang : ${order.mat}\n`),
    enc.encode(`Bayar  : ${order.pay}\n`),
    enc.encode(D + '\n'),
    ESC_POS.BOLD_ON,
    enc.encode(`TOTAL           ${formatRp(order.sub)}\n`),
    ESC_POS.BOLD_OFF,
    enc.encode(D + '\n'),
    ESC_POS.ALIGN_C,
    enc.encode(footer + '\n'),
    enc.encode('Takoyaki Mazboy\n'),
    ESC_POS.LF, ESC_POS.LF, ESC_POS.LF,
    ESC_POS.CUT
  );

  const total = lines.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  lines.forEach(a => { out.set(a, offset); offset += a.length; });
  return out;
}

async function sendEscPosToPrinter() {
  const dummyOrder = {
    id: getEl('receipt-content')?.dataset.orderId || 'X',
    pi: [], ti: [], si: [],
    sub: 0, mat: '-', pay: '-', cust: '-', time: getTimeNow(), tgl: getDateNow()
  };
  const target = orders[orders.length - 1] || dummyOrder;
  const bytes = buildEscPosBytes(target);

  try {
    if (printerMethod === 'bluetooth' && btCharacteristic) {
      await writeBTChunks(bytes);
      printerLog('✓ Print via Bluetooth OK');
    } else if (printerMethod === 'usb' && usbDevice) {
      const epNum = usbDevice.configuration.interfaces[0].alternate.endpoints
        .find(e => e.direction === 'out').endpointNumber;
      await usbDevice.transferOut(epNum, bytes);
      printerLog('✓ Print via USB OK');
    }
    toast('✓ Struk dicetak!');
  } catch (e) {
    printerLog('✗ Print error: ' + e.message);
    toast('❌ Print gagal, coba lagi');
  }
}

async function writeBTChunks(data, chunkSize = 20) {
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, Math.min(i + chunkSize, data.length));
    if (btCharacteristic.properties.writeWithoutResponse) {
      await btCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await btCharacteristic.writeValue(chunk);
    }
  }
}

/* ══════════════════════════════════════════
   14. MANAJEMEN KONEKSI PRINTER
══════════════════════════════════════════ */
function setPrinterMethod(method, btn, save = true) {
  printerMethod = method;
  document.querySelectorAll('.method-tab').forEach(b => b.classList.remove('sel'));
  if (btn) btn.classList.add('sel');
  
  if(getEl('lan-panel')) getEl('lan-panel').style.display = method === 'lan' ? 'block' : 'none';
  if(getEl('bt-panel')) getEl('bt-panel').style.display = method === 'bluetooth' ? 'block' : 'none';
  if(getEl('usb-panel')) getEl('usb-panel').style.display = method === 'usb' ? 'block' : 'none';
  
  printerConnected = false;
  btDevice = null;
  btCharacteristic = null;
  selectedBtDevice = null;
  updatePrinterStatus('idle', 'Belum Terhubung', 'Pilih metode koneksi di bawah');
  if (save) saveData();
}

async function connectLAN() {
  const ip = getEl('printer-ip').value.trim();
  const port = getEl('printer-port').value || '9100';
  if (!ip) return alert('Masukkan IP Address printer!');

  printerLog(`Mencoba koneksi ke ${ip}:${port}…`);
  updatePrinterStatus('idle', 'Menghubungkan…', 'Harap tunggu');

  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 3000);
    await fetch(`http://${ip}:${port}`, { signal: ctrl.signal, mode: 'no-cors' });
    clearTimeout(tid);
    _setConnected(`Printer LAN ${ip}`, `Port ${port}`);
  } catch (e) {
    if (e.name === 'AbortError') {
      printerLog(`✗ Timeout: printer tidak merespons di ${ip}:${port}`);
      updatePrinterStatus('err', 'Koneksi Gagal', `Printer tidak ditemukan di ${ip}`);
      toast('❌ Printer tidak ditemukan');
    } else {
      _setConnected(`Printer LAN ${ip}`, `Port ${port}`);
    }
  }
}

async function scanBluetoothPrinter() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) {
    toast('⚠️ iOS tidak mendukung Web Bluetooth.');
    printerLog('✗ iOS: Web Bluetooth tidak tersedia. Gunakan PrintHand / LAN.');
    return;
  }
  if (!navigator.bluetooth) {
    toast('⚠️ Browser ini tidak mendukung Web Bluetooth.');
    printerLog('✗ Web Bluetooth API tidak ditemukan.');
    return;
  }

  printerLog('Memulai scan Bluetooth…');
  selectedBtDevice = null;

  const PRINTER_FILTERS = [
    { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
    { services: ['e7810a71-73ae-499d-8c15-faa9aef0c3f2'] },
    { namePrefix: 'Printer' }, { namePrefix: 'EPSON' },
    { namePrefix: 'Star' }, { namePrefix: 'RPP' },
    { namePrefix: 'BT' }, { namePrefix: 'PT' },
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

    const list = getEl('bt-device-list');
    if(list) {
      list.innerHTML = '';
      const item = document.createElement('div'); item.className = 'bt-device-item';
      item.innerHTML = `
        <div>
          <div class="bt-device-name">📠 ${device.name || 'Printer Bluetooth'}</div>
          <div class="bt-device-addr">Siap dihubungkan</div>
        </div>
        <span class="bt-device-select chosen">Dipilih ✓</span>`;
      list.appendChild(item);
    }

    const btn = getEl('btn-bt-connect');
    if (btn) btn.disabled = false;

  } catch (e) {
    if (e.name !== 'NotFoundError') {
      printerLog('✗ Scan error: ' + e.message);
      toast('❌ ' + e.message);
    } else {
      printerLog('ℹ️ Scan dibatalkan oleh pengguna.');
    }
  }
}

async function connectBluetooth() {
  if (!selectedBtDevice) return toast('Scan printer dulu!');

  printerLog(`Menghubungkan ke ${selectedBtDevice.name}…`);
  updatePrinterStatus('idle', 'Menghubungkan…', 'Harap tunggu');

  try {
    const server = await selectedBtDevice.gatt.connect();
    printerLog('GATT terhubung, mencari service…');

    const SERVICE_UUIDS = [
      '000018f0-0000-1000-8000-00805f9b34fb',
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
    ];
    let service = null;
    for (const uuid of SERVICE_UUIDS) {
      try { service = await server.getPrimaryService(uuid); break; }
      catch (_) {}
    }
    if (!service) {
      const all = await server.getPrimaryServices();
      service = all[0];
    }
    if (!service) throw new Error('Service printer tidak ditemukan.');

    const chars = await service.getCharacteristics();
    btCharacteristic = chars.find(c => c.properties.write || c.properties.writeWithoutResponse) || chars[0];

    if (!btCharacteristic) throw new Error('Karakteristik tulis tidak ditemukan.');

    btDevice = selectedBtDevice;
    printerLog(`✓ Karakteristik ditemukan: ${btCharacteristic.uuid}`);

    btDevice.addEventListener('gattserverdisconnected', () => {
      printerConnected = false;
      printerLog('⚠️ Bluetooth terputus!');
      updatePrinterStatus('err', 'Koneksi Terputus', 'Hubungkan ulang printer');
      _updateHeaderBadge(false);
    });

    _setConnected(btDevice.name || 'Printer Bluetooth', 'Bluetooth');

  } catch (e) {
    printerLog('✗ BT Error: ' + e.message);
    updatePrinterStatus('err', 'Gagal Terhubung', e.message.substring(0, 50));
    toast('❌ Gagal: ' + e.message);
  }
}

async function connectUSB() {
  if (!navigator.usb) {
    alert('Web USB tidak didukung.\nGunakan Chrome/Edge di PC, atau pilih Bluetooth/LAN untuk mobile.');
    printerLog('✗ Web USB API tidak tersedia');
    return;
  }
  try {
    printerLog('Meminta akses USB…');
    usbDevice = await navigator.usb.requestDevice({ filters: [{ classCode: 7 }] });
    await usbDevice.open();
    if (usbDevice.configuration === null) await usbDevice.selectConfiguration(1);
    await usbDevice.claimInterface(0);
    printerLog(`✓ USB: ${usbDevice.productName}`);
    _setConnected(usbDevice.productName || 'USB Printer', 'USB');
  } catch (e) {
    if (e.name !== 'NotFoundError') {
      printerLog('✗ USB Error: ' + e.message);
      updatePrinterStatus('err', 'USB Gagal', e.message);
      toast('❌ USB gagal: ' + e.message);
    }
  }
}

function _setConnected(name, via) {
  printerConnected = true;
  updatePrinterStatus('on', `✓ ${name}`, `Terhubung via ${via}`);
  printerLog(`✓ Printer terhubung: ${name}`);
  toast(`✓ Printer ${name} siap!`);
  _updateHeaderBadge(true, name);
}

function updatePrinterStatus(state, text, sub) {
  const dot = getEl('p-dot');
  if(dot) {
    dot.className = 'p-dot';
    if (state === 'on') dot.classList.add('on');
    if (state === 'err') dot.classList.add('err');
  }
  if(getEl('p-status-text')) getEl('p-status-text').innerText = text;
  if(getEl('p-status-sub')) getEl('p-status-sub').innerText = sub;
}

function _updateHeaderBadge(online, name = '') {
  const txt = getEl('printer-badge-txt');
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
  const log = getEl('printer-log');
  if (!log) return;
  const t = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
   15. GENERATOR WHATSAPP REPORT
══════════════════════════════════════════ */
function checkout() {
  const nama = getEl('p_nama')?.value.trim();
  if (!nama) return alert('Isi nama staff di tab Absen dulu!');
  
  const { qtyTako } = hitungTotalKeranjang();
  if (qtyTako > 0) {
    if (!confirm('Masih ada item di keranjang. Simpan otomatis?')) return;
    confirmOrder();
  }
  if (!orders.length) return alert('Belum ada pesanan tersimpan!');

  // Penarikan Data
  const shift = getEl('p_shift')?.value || '-';
  const tanggal = getDateNow();
  const modal = parseNum(getEl('p_modal')?.value);
  const totalPengeluaran = expenses.reduce((a, b) => a + b.p, 0);
  const qris = parseNum(getEl('p_qris')?.value);
  const online = parseNum(getEl('p_online')?.value);
  const totalOmzet = orders.reduce((a, o) => a + o.sub, 0);
  const totalPorsi = orders.reduce((a, o) => a + o.porsi, 0);
  const netto = modal + totalOmzet - totalPengeluaran - qris - online;
  
  const omzetPerMetode = {};
  orders.forEach(o => { omzetPerMetode[o.pay] = (omzetPerMetode[o.pay] || 0) + o.sub; });

  const rekapTakoyaki = {}, rekapIsian = {}, rekapSaus = {};
  orders.forEach(o => {
    o.pi.forEach(i => { if (!rekapTakoyaki[i.n]) rekapTakoyaki[i.n] = { q: 0, h: i.h }; rekapTakoyaki[i.n].q += i.q; });
    o.ti.forEach(i => { if (!rekapIsian[i.n]) rekapIsian[i.n] = { q: 0, h: i.h }; rekapIsian[i.n].q += i.q; });
    (o.si || []).forEach(i => { if (!rekapSaus[i.n]) rekapSaus[i.n] = { q: 0, h: i.h }; rekapSaus[i.n].q += i.q; });
  });

  // FORMATTING TEXT WHATSAPP MENGGUNAKAN TEMPLATE LITERALS
  const formatListMap = (obj) => Object.entries(obj).map(([k, v]) => `• ${k} ×${v.q} = ${formatRp(v.q * v.h)}`).join('\n');
  const formatListPlain = (obj) => Object.entries(obj).map(([k, v]) => `• ${k} ×${v.q}`).join('\n');
  const strMetodeBayar = Object.entries(omzetPerMetode).map(([k, v]) => `${k === 'Tunai' ? '💵' : k === 'QRIS' ? '📱' : '🛵'} ${k.padEnd(8)} : ${formatRp(v)}`).join('\n');
  
  const strDetailPesanan = orders.map(o => {
    const ps = o.pi.map(i => `${i.n} x${i.q}`).join(', ');
    const ts = o.ti.length ? ' + ' + o.ti.map(i => `${i.n}`).join('+') : '';
    const ss = (o.si && o.si.length) ? ' [' + o.si.map(i => i.n).join('+') + ']' : '';
    return `#${o.id} | 👤 ${o.cust} | ${o.time}\n🛒 ${ps}${ts}${ss}\n💳 ${o.pay} | 🔥 ${o.mat} | 💰 ${formatRp(o.sub)}\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`;
  }).join('\n');

  const sAdonan = getEl('s_adonan')?.value;
  const sBhn = getEl('s_bahan')?.value;
  const sNot = getEl('s_note')?.value;
  const stokMenipis = stokBahan.filter(b => b.qty <= 1);

  const report = `╔═══════════════════════╗
🐙 LAPORAN TAKOYAKI MAZBOY
╚═══════════════════════╝
📅 ${tanggal}
👤 ${nama}  |  ${shift}
━━━━━━━━━━━━━━━━━━━━━━━
💰 Modal Awal  : ${formatRp(modal)}
🐙 Omzet Jual  : ${formatRp(totalOmzet)}
📥 Total Kas   : ${formatRp(modal + totalOmzet)}
━━━━━━━━━━━━━━━━━━━━━━━
${strMetodeBayar}
━━━━━━━━━━━━━━━━━━━━━━━
💸 Pengeluaran : −${formatRp(totalPengeluaran)}
📱 Setor QRIS  : −${formatRp(qris)}
🛵 Setor Online: −${formatRp(online)}
━━━━━━━━━━━━━━━━━━━━━━━
💵 *SETORAN TUNAI: ${formatRp(netto < 0 ? 0 : netto)}*

╔═══════════════════════╗
🐙 TOTAL ITEM TERJUAL
╚═══════════════════════╝
📦 Transaksi: ${orders.length}×  |  🐙 Porsi: ${totalPorsi}
━━━━━━━━━━━━━━━━━━━━━━━
${formatListMap(rekapTakoyaki)}
${Object.keys(rekapIsian).length ? `─ Isian ─\n${formatListPlain(rekapIsian)}` : ''}
${Object.keys(rekapSaus).length ? `─ Saus ─\n${formatListPlain(rekapSaus)}` : ''}

╔═══════════════════════╗
📝 DETAIL PESANAN
╚═══════════════════════╝
${strDetailPesanan}
${(sAdonan || sBhn || sNot || stokMenipis.length) ? `
╔═══════════════════════╗
📦 STOK OPNAME
╚═══════════════════════╝
${sAdonan ? `🐙 Sisa Ball : ${sAdonan}\n` : ''}${sBhn ? `🧂 Sisa Bahan: ${sBhn}\n` : ''}${stokMenipis.length ? `⚠️ HAMPIR HABIS: ${stokMenipis.map(b => `${b.n}(${b.qty})`).join(', ')}\n` : ''}${sNot ? `📝 Catatan: ${sNot}` : ''}` : ''}`;

  // Eksekusi Buka WhatsApp
  window.open(`https://api.whatsapp.com/send?phone=${ADMIN}&text=${encodeURIComponent(report.trim())}`);

  if (getEl('auto-print-shift')?.checked) {
    setTimeout(() => printTestReceipt(), 900);
  }

  if (confirm('Laporan terkirim! Reset data shift ini?')) {
    orders = []; expenses = []; orderCount = 0; cartTakoyaki = {}; cartIsian = {}; cartSaus = {};
    ['p_qris', 'p_online', 's_adonan', 's_bahan', 's_note', 'c_name'].forEach(id => {
      const e = getEl(id); if (e) e.value = '';
    });
    localStorage.removeItem('TAKO_POS_DATA');
    updateAllUi(); renderExps(); renderRekap(); renderStok();
    toast('✓ Shift selesai, data di-reset. Arigatou! 🐙');
  }
}

/* ══════════════════════════════════════════
   16. INITIALIZATION
══════════════════════════════════════════ */
window.onload = () => {
  loadData();
  renderMenus();
  renderRekap();
  renderExps();
  renderStok();
  updFloat();
  kalkulasiKeuangan();
  updatePrinterStatus('idle', 'Belum Terhubung', 'Pilih metode koneksi di tab Printer');

  const inputIds = [
    'p_nama', 'p_shift', 'p_modal',
    's_adonan', 's_bahan', 's_note', 'c_name',
    'printer-ip', 'printer-port',
    'r_nama_toko', 'r_alamat', 'r_footer', 'r_kontak'
  ];
  inputIds.forEach(id => {
    const el = getEl(id);
    if (el) {
      el.addEventListener('input', saveData);
      el.addEventListener('change', saveData);
    }
  });
};
