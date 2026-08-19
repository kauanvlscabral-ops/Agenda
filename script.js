(function(){
"use strict";

const { STATUS_LIST, STATUS_LABELS, STATUS_CSS, computeFinance } = window.MareFinance;

/* ===================== API ===================== */
const API_BASE = 'http://localhost:3000/api/reservas';
const CONFIG_BASE = 'http://localhost:3000/api/config';
let reservations = [];
let appConfig = { enderecoImovel: '', nomeLocador: '' };

async function apiRequest(method, path, body, base){
  const opts = { method, headers: {} };
  if(body !== undefined){
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch((base||API_BASE) + (path||''), opts);
  let data = null;
  if(res.status !== 204){
    try{ data = await res.json(); }catch(e){ data = null; }
  }
  if(!res.ok){
    const message = (data && data.error) ? data.error : `Erro ao comunicar com o servidor (${res.status}).`;
    throw new Error(message);
  }
  return data;
}

async function loadReservations(){
  try{
    const data = await apiRequest('GET', '');
    reservations = (data||[]).map(normalize);
  }catch(e){
    reservations = [];
    toast('Não foi possível carregar as reservas do banco de dados. Verifique se o servidor Node está rodando.', 'error');
  }
}
async function loadConfig(){
  try{
    const data = await apiRequest('GET', '', undefined, CONFIG_BASE);
    appConfig = { enderecoImovel: (data && data.enderecoImovel) || '', nomeLocador: (data && data.nomeLocador) || '' };
  }catch(e){
    appConfig = { enderecoImovel: '', nomeLocador: '' };
  }
}

// Preenche valores padrão para reservas antigas (compatibilidade)
function normalize(r){
  const status = STATUS_LIST.indexOf(r.status) !== -1 ? r.status : (r.sinalRecebido === 'sim' ? 'recebido' : 'pendente');
  const valorAluguel = Number(r.valorAluguel)||0;
  const valorSinal = Number(r.valorSinal)||0;
  const fin = computeFinance(status, valorAluguel, valorSinal);
  return {
    ...r,
    status,
    valorAluguel,
    valorSinal,
    valorRecebido: r.valorRecebido !== undefined && r.valorRecebido !== null ? Number(r.valorRecebido) : fin.valorRecebido,
    totalAReceber: r.totalAReceber !== undefined && r.totalAReceber !== null ? Number(r.totalAReceber) : fin.totalAReceber,
    telefone: r.telefone || '',
    checkinHora: r.checkinHora ? String(r.checkinHora).slice(0,5) : '14:00',
    checkoutHora: r.checkoutHora ? String(r.checkoutHora).slice(0,5) : '11:00',
    limiteHospedes: r.limiteHospedes !== undefined && r.limiteHospedes !== null ? Number(r.limiteHospedes) : 1,
  };
}

// Info de exibição do status, sempre a partir dos valores JÁ PERSISTIDOS (não recalculados na tela)
function statusInfo(r){
  return {
    key: STATUS_CSS[r.status] || 'pendente',
    label: STATUS_LABELS[r.status] || 'Sinal pendente',
    saldo: Number(r.totalAReceber) || 0,
  };
}

/* ===================== Helpers ===================== */
const fmtMoney = v => (isFinite(v)?v:0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmtDate = iso => {
  if(!iso) return '—';
  const [y,m,d] = String(iso).slice(0,10).split('-');
  return `${d}/${m}/${y}`;
};
const fmtDateShort = iso => {
  if(!iso) return '—';
  const [y,m,d] = String(iso).slice(0,10).split('-');
  const meses=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${d} ${meses[parseInt(m,10)-1]}`;
};
const todayISO = () => new Date().toISOString().slice(0,10);
const uid = () => 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2,8);

function overlaps(aStart, aEnd, bStart, bEnd){
  return aStart < bEnd && bStart < aEnd;
}
function findOverlap(checkin, checkout, excludeId){
  return reservations.find(r => r.id !== excludeId && overlaps(checkin, checkout, r.checkin, r.checkout));
}

function toast(msg, type){
  const wrap = document.getElementById('toast-wrap');
  const el = document.createElement('div');
  el.className = 'toast ' + (type||'');
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); }, 3200);
}

/* ===================== Icons ===================== */
const ICONS = {
  dashboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  report:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 15l4-6 3 3 5-8"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/></svg>',
  eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>',
  checkin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>',
  checkout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  excel:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="m8 8 8 8m0-8-8 8"/></svg>',
  pdf:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>',
  backup:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>',
  contract:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12h6M9 16h6M9 8h1"/><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>',
};

/* ===================== State ===================== */
let currentView = 'dashboard';
let calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let editingId = null;
let searchTerm = '';
let listFilters = { status:'todos', from:'', to:'' };

const NAV_ITEMS = [
  {key:'dashboard', label:'Painel', icon:ICONS.dashboard},
  {key:'calendar', label:'Calendário', icon:ICONS.calendar},
  {key:'list', label:'Reservas', icon:ICONS.list},
  {key:'reports', label:'Relatório', icon:ICONS.report},
];

/* ===================== Nav render ===================== */
function renderNav(){
  const nav = document.getElementById('nav');
  nav.innerHTML = NAV_ITEMS.map(it => `
    <div class="nav-item ${currentView===it.key?'active':''}" data-nav="${it.key}">
      ${it.icon}<span>${it.label}</span>
    </div>`).join('');
  nav.querySelectorAll('[data-nav]').forEach(el=>{
    el.addEventListener('click', ()=>{ currentView = el.dataset.nav; render(); });
  });

  const bn = document.getElementById('bottomNav');
  bn.innerHTML = NAV_ITEMS.map(it => `
    <div class="bn-item ${currentView===it.key?'active':''}" data-nav="${it.key}">
      ${it.icon}<span>${it.label}</span>
    </div>`).join('');
  bn.querySelectorAll('[data-nav]').forEach(el=>{
    el.addEventListener('click', ()=>{ currentView = el.dataset.nav; render(); });
  });
}

/* ===================== Dashboard ===================== */
function monthKey(d){ return d.getFullYear()+'-'+(d.getMonth()+1); }

function renderDashboard(){
  const now = new Date();
  const curMonthKey = monthKey(now);
  const inThisMonth = r => { const d = new Date(r.checkin+'T00:00:00'); return monthKey(d) === curMonthKey; };

  const resThisMonth = reservations.filter(inThisMonth);
  const totalSinaisMes = resThisMonth.reduce((s,r)=> s + (Number(r.valorRecebido)||0), 0);
  const totalAReceberGeral = reservations.reduce((s,r)=> s + (Number(r.totalAReceber)||0), 0);

  const todayStr = todayISO();
  const upcomingCheckins = reservations.filter(r=>r.checkin >= todayStr).sort((a,b)=>a.checkin.localeCompare(b.checkin)).slice(0,5);
  const upcomingCheckouts = reservations.filter(r=>r.checkout >= todayStr).sort((a,b)=>a.checkout.localeCompare(b.checkout)).slice(0,5);

  const html = `
    <div class="view-header">
      <div><h1>Painel</h1><p>Visão geral do apartamento na praia</p></div>
    </div>
    <div class="horizon">
      <svg class="horizon-wave" viewBox="0 0 400 40" preserveAspectRatio="none"><path d="M0 20 Q 25 5 50 20 T 100 20 T 150 20 T 200 20 T 250 20 T 300 20 T 350 20 T 400 20 V40 H0 Z" fill="#fff"/></svg>
      <div class="horizon-title">Este mês</div>
      <div class="horizon-stats">
        <div class="hstat"><span class="num mono">${resThisMonth.length}</span><span class="lbl">Reservas do mês</span></div>
        <div class="hstat"><span class="num mono">${fmtMoney(totalSinaisMes)}</span><span class="lbl">Recebido no mês</span></div>
        <div class="hstat"><span class="num mono">${fmtMoney(totalAReceberGeral)}</span><span class="lbl">Total a receber</span></div>
        <div class="hstat"><span class="num mono">${reservations.length}</span><span class="lbl">Reservas cadastradas</span></div>
      </div>
    </div>
    <div class="grid-2">
      <div class="card">
        <h3>${ICONS.checkin} Próximos check-ins</h3>
        <div class="mini-list">
          ${upcomingCheckins.length ? upcomingCheckins.map(r=>`
            <div class="mini-row">
              <div><div class="who">${esc(r.cliente)}</div><div class="when">${fmtDate(r.checkin)} às ${r.checkinHora}</div></div>
              <div class="amt">${fmtMoney(r.valorAluguel)}</div>
            </div>`).join('') : '<div class="empty-hint">Nenhum check-in futuro cadastrado.</div>'}
        </div>
      </div>
      <div class="card">
        <h3>${ICONS.checkout} Próximos check-outs</h3>
        <div class="mini-list">
          ${upcomingCheckouts.length ? upcomingCheckouts.map(r=>`
            <div class="mini-row">
              <div><div class="who">${esc(r.cliente)}</div><div class="when">${fmtDate(r.checkout)} às ${r.checkoutHora}</div></div>
              <div class="amt">${fmtMoney(r.valorAluguel)}</div>
            </div>`).join('') : '<div class="empty-hint">Nenhum check-out futuro cadastrado.</div>'}
        </div>
      </div>
    </div>
  `;
  document.getElementById('view').innerHTML = html;
}

/* ===================== Calendar ===================== */
function renderCalendar(){
  const year = calMonth.getFullYear(), month = calMonth.getMonth();
  const monthNames=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const todayStr = todayISO();

  function reservationsForDay(dISO){
    return reservations.filter(r => dISO >= r.checkin && dISO < r.checkout);
  }

  let cells = '';
  for(let i=0;i<startOffset;i++) cells += `<div class="cal-day pad"></div>`;
  for(let day=1; day<=daysInMonth; day++){
    const dISO = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayRes = reservationsForDay(dISO);
    const isToday = dISO === todayStr;
    let chips = dayRes.slice(0,2).map(r=>{
      let cls='';
      if(r.checkin===dISO) cls='checkin';
      else if(r.checkout===dISO) cls='checkout';
      return `<div class="cal-chip ${cls}" data-res="${r.id}" title="${esc(r.cliente)}">${esc(r.cliente)}</div>`;
    }).join('');
    const more = dayRes.length>2 ? `<div class="cal-more">+${dayRes.length-2} mais</div>` : '';
    cells += `<div class="cal-day ${isToday?'today':''}" data-day="${dISO}">
      <div class="d-num">${day}</div>${chips}${more}
    </div>`;
  }

  const html = `
    <div class="view-header">
      <div><h1>Calendário</h1><p>Períodos ocupados do apartamento</p></div>
    </div>
    <div class="cal-head">
      <div class="cal-nav">
        <button class="icon-btn" id="calPrev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg></button>
        <button class="icon-btn" id="calNext"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></button>
      </div>
      <div class="month-label">${monthNames[month]} ${year}</div>
    </div>
    <div class="cal-grid">
      ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d=>`<div class="cal-dow">${d}</div>`).join('')}
      ${cells}
    </div>
  `;
  document.getElementById('view').innerHTML = html;
  document.getElementById('calPrev').addEventListener('click', ()=>{ calMonth = new Date(year, month-1, 1); renderCalendar(); });
  document.getElementById('calNext').addEventListener('click', ()=>{ calMonth = new Date(year, month+1, 1); renderCalendar(); });

  document.querySelectorAll('.cal-day[data-day]').forEach(el=>{
    el.addEventListener('click', (ev)=>{
      if(ev.target.closest('.cal-chip')){
        openDetail(ev.target.closest('.cal-chip').dataset.res);
        return;
      }
      const dISO = el.dataset.day;
      const dayRes = reservationsForDay(dISO);
      if(dayRes.length===1) openDetail(dayRes[0].id);
      else if(dayRes.length>1) openDayList(dISO, dayRes);
    });
  });
}

function openDayList(dISO, list){
  const modal = document.getElementById('detailModal');
  modal.innerHTML = `
    <div class="modal-head"><h2>${fmtDate(dISO)}</h2>
      <button class="modal-close" onclick="document.getElementById('detailOverlay').classList.remove('open')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <p class="sub">${list.length} reservas ocupam esta data</p>
    <div class="mini-list">
      ${list.map(r=>`
        <div class="mini-row" style="cursor:pointer" data-res="${r.id}">
          <div><div class="who">${esc(r.cliente)}</div><div class="when">${fmtDate(r.checkin)} — ${fmtDate(r.checkout)}</div></div>
          <div class="amt">${fmtMoney(r.valorAluguel)}</div>
        </div>`).join('')}
    </div>
  `;
  modal.querySelectorAll('[data-res]').forEach(el=> el.addEventListener('click', ()=> openDetail(el.dataset.res)));
  document.getElementById('detailOverlay').classList.add('open');
}

/* ===================== Detail modal ===================== */
function openDetail(id){
  const r = reservations.find(x=>x.id===id);
  if(!r) return;
  const st = statusInfo(r);
  const modal = document.getElementById('detailModal');
  modal.innerHTML = `
    <div class="modal-head">
      <h2>${esc(r.cliente)}</h2>
      <button class="modal-close" id="closeDetailBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <p class="sub">Locatário: ${esc(r.locatario)}${r.telefone ? ' · Tel. hóspede: '+esc(r.telefone) : ''}</p>
    <div class="calc-box" style="margin-bottom:16px;">
      <div class="calc-item"><div class="l">Check-in</div><div class="v">${fmtDate(r.checkin)} ${r.checkinHora}</div></div>
      <div class="calc-item"><div class="l">Check-out</div><div class="v">${fmtDate(r.checkout)} ${r.checkoutHora}</div></div>
      <div class="calc-item"><div class="l">Limite de hóspedes</div><div class="v">${r.limiteHospedes}</div></div>
      <div class="calc-item"><div class="l">Status</div><div class="v"><span class="flag ${st.key}">${st.label}</span></div></div>
    </div>
    <div class="calc-box">
      <div class="calc-item"><div class="l">Valor do aluguel</div><div class="v">${fmtMoney(r.valorAluguel)}</div></div>
      <div class="calc-item"><div class="l">Valor do sinal</div><div class="v">${fmtMoney(r.valorSinal)}</div></div>
      <div class="calc-item"><div class="l">Valor recebido</div><div class="v">${fmtMoney(r.valorRecebido)}</div></div>
      <div class="calc-item"><div class="l">Total a receber</div><div class="v">${fmtMoney(st.saldo)}</div></div>
    </div>
    ${r.obs ? `<div class="field full" style="margin-top:14px;"><label>Observações</label><p style="margin:6px 0 0;font-size:14px;">${esc(r.obs)}</p></div>` : ''}
    <div class="modal-footer">
      <button class="btn btn-danger" id="detailDeleteBtn">${ICONS.trash} Excluir</button>
      <button class="btn btn-ghost" id="detailContractBtn">${ICONS.contract} Gerar contrato</button>
      <button class="btn btn-primary" id="detailEditBtn">${ICONS.edit} Editar</button>
    </div>
  `;
  document.getElementById('closeDetailBtn').addEventListener('click', ()=> document.getElementById('detailOverlay').classList.remove('open'));
  document.getElementById('detailEditBtn').addEventListener('click', ()=>{ document.getElementById('detailOverlay').classList.remove('open'); openForm(r.id); });
  document.getElementById('detailDeleteBtn').addEventListener('click', ()=>{ document.getElementById('detailOverlay').classList.remove('open'); confirmDelete(r.id); });
  document.getElementById('detailContractBtn').addEventListener('click', ()=> generateContract(r.id));
  document.getElementById('detailOverlay').classList.add('open');
}

/* ===================== List view ===================== */
function filteredReservations(){
  return reservations.filter(r=>{
    if(searchTerm && !r.cliente.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if(listFilters.status !== 'todos' && r.status !== listFilters.status) return false;
    if(listFilters.from && r.checkin < listFilters.from) return false;
    if(listFilters.to && r.checkout > listFilters.to) return false;
    return true;
  }).sort((a,b)=> b.checkin.localeCompare(a.checkin));
}

function renderList(){
  const rows = filteredReservations();
  const html = `
    <div class="view-header">
      <div><h1>Reservas</h1><p>${rows.length} reserva(s) encontrada(s)</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" id="exportExcelBtn">${ICONS.excel} Excel</button>
        <button class="btn btn-ghost btn-sm" id="exportPdfBtn">${ICONS.pdf} PDF</button>
        <button class="btn btn-ghost btn-sm" id="backupBtn">${ICONS.backup} Backup</button>
      </div>
    </div>
    <div class="filters">
      <div class="grp"><label>Status</label>
        <select id="filterStatus">
          <option value="todos">Todos</option>
          <option value="pendente">Sinal pendente</option>
          <option value="recebido">Sinal recebido</option>
          <option value="pago">Pago</option>
          <option value="nao_pago">Não pago</option>
        </select>
      </div>
      <div class="grp"><label>De</label><input type="date" id="filterFrom" /></div>
      <div class="grp"><label>Até</label><input type="date" id="filterTo" /></div>
      <div class="filters-spacer"></div>
      <button class="btn btn-ghost btn-sm" id="clearFilters">Limpar filtros</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Cliente</th><th>Locatário</th><th>Check-in</th><th>Check-out</th><th>Aluguel</th><th>Recebido</th><th>A receber</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>
          ${rows.length ? rows.map(r=>rowHtml(r)).join('') : `<tr><td colspan="9"><div class="empty-hint">Nenhuma reserva encontrada. Cadastre uma nova reserva para começar.</div></td></tr>`}
        </tbody>
      </table>
    </div>
    <div class="cards-list">
      ${rows.length ? rows.map(r=>cardHtml(r)).join('') : '<div class="empty-hint">Nenhuma reserva encontrada.</div>'}
    </div>
  `;
  document.getElementById('view').innerHTML = html;

  document.getElementById('filterStatus').value = listFilters.status;
  document.getElementById('filterFrom').value = listFilters.from;
  document.getElementById('filterTo').value = listFilters.to;
  document.getElementById('filterStatus').addEventListener('change', e=>{ listFilters.status = e.target.value; renderList(); });
  document.getElementById('filterFrom').addEventListener('change', e=>{ listFilters.from = e.target.value; renderList(); });
  document.getElementById('filterTo').addEventListener('change', e=>{ listFilters.to = e.target.value; renderList(); });
  document.getElementById('clearFilters').addEventListener('click', ()=>{ listFilters = {status:'todos',from:'',to:''}; renderList(); });
  document.getElementById('exportExcelBtn').addEventListener('click', ()=>exportExcel());
  document.getElementById('exportPdfBtn').addEventListener('click', ()=>exportPdf(rows,'Relatório de Reservas'));
  document.getElementById('backupBtn').addEventListener('click', exportBackup);

  document.querySelectorAll('[data-view]').forEach(el=> el.addEventListener('click', ()=> openDetail(el.dataset.view)));
  document.querySelectorAll('[data-edit]').forEach(el=> el.addEventListener('click', ()=> openForm(el.dataset.edit)));
  document.querySelectorAll('[data-del]').forEach(el=> el.addEventListener('click', ()=> confirmDelete(el.dataset.del)));
  document.querySelectorAll('[data-contract]').forEach(el=> el.addEventListener('click', ()=> generateContract(el.dataset.contract)));
}

function rowHtml(r){
  const st = statusInfo(r);
  return `<tr>
    <td class="cell-strong">${esc(r.cliente)}</td>
    <td class="cell-muted">${esc(r.locatario)}</td>
    <td class="mono">${fmtDate(r.checkin)}</td>
    <td class="mono">${fmtDate(r.checkout)}</td>
    <td class="mono">${fmtMoney(r.valorAluguel)}</td>
    <td class="mono">${fmtMoney(r.valorRecebido)}</td>
    <td class="mono">${fmtMoney(st.saldo)}</td>
    <td><span class="flag ${st.key}">${st.label}</span></td>
    <td><div class="row-actions">
      <button class="icon-btn" data-view="${r.id}" title="Ver">${ICONS.eye}</button>
      <button class="icon-btn" data-edit="${r.id}" title="Editar">${ICONS.edit}</button>
      <button class="icon-btn" data-contract="${r.id}" title="Gerar contrato">${ICONS.contract}</button>
      <button class="icon-btn" data-del="${r.id}" title="Excluir">${ICONS.trash}</button>
    </div></td>
  </tr>`;
}
function cardHtml(r){
  const st = statusInfo(r);
  return `<div class="res-card">
    <div class="res-card-top">
      <div><div class="client">${esc(r.cliente)}</div><div class="owner">Locatário: ${esc(r.locatario)}</div></div>
      <span class="flag ${st.key}">${st.label}</span>
    </div>
    <div class="dates">${fmtDateShort(r.checkin)} → ${fmtDateShort(r.checkout)}</div>
    <div class="money-row"><span>Aluguel</span><span class="mono">${fmtMoney(r.valorAluguel)}</span></div>
    <div class="money-row"><span>Recebido</span><span class="mono">${fmtMoney(r.valorRecebido)}</span></div>
    <div class="money-row"><span>A receber</span><span class="mono">${fmtMoney(st.saldo)}</span></div>
    <div class="actions">
      <button class="btn btn-soft btn-sm" data-view="${r.id}">${ICONS.eye} Ver</button>
      <button class="btn btn-soft btn-sm" data-edit="${r.id}">${ICONS.edit} Editar</button>
      <button class="btn btn-soft btn-sm" data-contract="${r.id}">${ICONS.contract} Contrato</button>
      <button class="btn btn-danger btn-sm" data-del="${r.id}">${ICONS.trash} Excluir</button>
    </div>
  </div>`;
}

/* ===================== Reports view ===================== */
function renderReports(){
  const pending = reservations.filter(r=> Number(r.totalAReceber) > 0).sort((a,b)=>a.checkin.localeCompare(b.checkin));
  const totalPendente = pending.reduce((s,r)=> s + (Number(r.totalAReceber)||0), 0);
  const totalRecebidoGeral = reservations.reduce((s,r)=> s + (Number(r.valorRecebido)||0), 0);
  const totalAlugueis = reservations.reduce((s,r)=> s + (Number(r.valorAluguel)||0), 0);

  const html = `
    <div class="view-header">
      <div><h1>Relatório financeiro</h1><p>Valores a receber e histórico de recebimentos</p></div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-ghost btn-sm" id="repExcel">${ICONS.excel} Excel</button>
        <button class="btn btn-ghost btn-sm" id="repPdf">${ICONS.pdf} PDF</button>
      </div>
    </div>
    <div class="grid-2" style="grid-template-columns:repeat(3,1fr);margin-bottom:18px;">
      <div class="card"><h3>Total de aluguéis</h3><div class="v mono" style="font-size:22px;font-weight:700;">${fmtMoney(totalAlugueis)}</div></div>
      <div class="card"><h3>Total recebido</h3><div class="v mono" style="font-size:22px;font-weight:700;color:var(--success);">${fmtMoney(totalRecebidoGeral)}</div></div>
      <div class="card"><h3>Total a receber</h3><div class="v mono" style="font-size:22px;font-weight:700;color:var(--accent);">${fmtMoney(totalPendente)}</div></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Cliente</th><th>Locatário</th><th>Check-in</th><th>Check-out</th><th>Aluguel</th><th>Recebido</th><th>A receber</th><th>Status</th></tr></thead>
        <tbody>
          ${pending.length ? pending.map(r=>{
            const st = statusInfo(r);
            return `<tr>
              <td class="cell-strong">${esc(r.cliente)}</td><td class="cell-muted">${esc(r.locatario)}</td>
              <td class="mono">${fmtDate(r.checkin)}</td><td class="mono">${fmtDate(r.checkout)}</td>
              <td class="mono">${fmtMoney(r.valorAluguel)}</td><td class="mono">${fmtMoney(r.valorRecebido)}</td>
              <td class="mono">${fmtMoney(st.saldo)}</td><td><span class="flag ${st.key}">${st.label}</span></td>
            </tr>`;
          }).join('') : `<tr><td colspan="8"><div class="empty-hint">Nenhum valor pendente. Tudo pago! 🌊</div></td></tr>`}
        </tbody>
      </table>
    </div>
  `;
  document.getElementById('view').innerHTML = html;
  document.getElementById('repExcel').addEventListener('click', ()=> exportExcel(pending, 'relatorio-a-receber'));
  document.getElementById('repPdf').addEventListener('click', ()=> exportPdf(pending, 'Relatório de Valores a Receber'));
}

/* ===================== Export (planilha / lista em PDF) ===================== */
function toExportRows(list){
  return (list||filteredReservations()).map(r=>{
    const st = statusInfo(r);
    return {
      'Cliente': r.cliente,'Locatário': r.locatario,'Telefone': r.telefone,'Data da Reserva': fmtDate(r.dataReserva),
      'Check-in': fmtDate(r.checkin)+' '+r.checkinHora,'Check-out': fmtDate(r.checkout)+' '+r.checkoutHora,
      'Limite de Hóspedes': r.limiteHospedes,
      'Valor do Aluguel': Number(r.valorAluguel)||0,'Valor do Sinal': Number(r.valorSinal)||0,
      'Valor Recebido': Number(r.valorRecebido)||0,'Total a Receber': st.saldo,'Status': st.label,'Observações': r.obs||''
    };
  });
}
function exportExcel(list, filename){
  if(typeof XLSX === 'undefined'){ toast('Não foi possível carregar o módulo de exportação.', 'error'); return; }
  const data = toExportRows(Array.isArray(list)?list:null);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reservas');
  XLSX.writeFile(wb, (filename||'reservas-mare')+'.xlsx');
  toast('Excel exportado com sucesso.', 'success');
}
function exportPdf(list, title){
  if(typeof window.jspdf === 'undefined'){ toast('Não foi possível carregar o módulo de PDF.', 'error'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({orientation:'landscape'});
  doc.setFontSize(16);
  doc.text(title||'Relatório de Reservas', 14, 16);
  doc.setFontSize(10);
  doc.text('Gerado em ' + fmtDate(todayISO()), 14, 22);
  const rows = toExportRows(Array.isArray(list)?list:null);
  const cols = rows.length ? Object.keys(rows[0]) : ['Cliente','Locatário','Check-in','Check-out','Valor do Aluguel','Valor Recebido','Total a Receber','Status'];
  doc.autoTable({
    startY: 28,
    head: [cols],
    body: rows.map(r=> cols.map(c=> typeof r[c]==='number' ? fmtMoney(r[c]) : r[c])),
    styles:{ fontSize:8 },
    headStyles:{ fillColor:[11,79,108] }
  });
  doc.save((title? title.toLowerCase().replace(/\s+/g,'-') : 'relatorio') + '.pdf');
  toast('PDF exportado com sucesso.', 'success');
}
function exportBackup(){
  const blob = new Blob([JSON.stringify(reservations,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'backup-mare-' + todayISO() + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast('Backup gerado com sucesso.', 'success');
}

/* ===================== Contrato em PDF ===================== */
const CLAUSULA_ITENS = [
  { t:'1. Danos e avarias:', b:'Qualquer dano, quebra, perda ou avaria causada pelo HÓSPEDE ou por qualquer pessoa que o acompanhe ou tenha acesso ao imóvel durante sua estadia será de sua inteira responsabilidade, incluindo, mas não se limitando a: camas, colchões, ventiladores, televisores, controles, copos, pratos, talheres, utensílios, móveis, eletrodomésticos, instalações e demais bens existentes no apartamento. Os custos necessários para reparo, reposição ou substituição dos itens danificados serão de responsabilidade do HÓSPEDE.' },
  { t:'2. Regras do edifício:', b:'O HÓSPEDE compromete-se a cumprir integralmente as regras, normas internas e regulamento do condomínio/edifício. Qualquer advertência, multa, cobrança ou penalidade aplicada em razão de ato praticado pelo HÓSPEDE, seus acompanhantes ou visitantes será de sua inteira responsabilidade, devendo o respectivo valor ser integralmente ressarcido ao LOCADOR/LOCATÁRIO, conforme aplicável.' },
  { t:'3. Sinal e garantia da reserva:', b:'O valor pago antecipadamente a título de sinal/reserva tem a finalidade de garantir as datas previamente escolhidas pelo HÓSPEDE. Em caso de desistência ou cancelamento por iniciativa do HÓSPEDE, o referido valor não será ressarcido, observadas as demais condições e disposições previstas neste contrato e na legislação aplicável.' },
  { t:'4. Entrega e limpeza do apartamento:', b:'O apartamento deverá ser devolvido pelo HÓSPEDE nas mesmas condições de conservação, organização e limpeza em que foi recebido, ressalvado o desgaste natural decorrente do uso regular. A limpeza do imóvel ao final da estadia será de responsabilidade do HÓSPEDE. Caso o apartamento seja devolvido em condições que exijam limpeza adicional, será cobrada uma taxa de R$ 150,00 (cento e cinquenta reais) referente à limpeza.' },
  { t:'5. Horário de saída e excedente de permanência:', b:'O HÓSPEDE deverá respeitar rigorosamente o horário de saída previamente combinado. Caso permaneça no apartamento após o horário estabelecido, sem autorização prévia do LOCADOR/LOCATÁRIO, poderá ser cobrada uma diária integral adicional, independentemente do período excedido.' },
  { t:'6. Prorrogação da estadia:', b:'Caso o HÓSPEDE tenha interesse em permanecer no apartamento por período superior ao inicialmente contratado, deverá entrar em contato previamente com o LOCADOR/LOCATÁRIO para consultar a disponibilidade das novas datas. A extensão da estadia somente será considerada autorizada após confirmação expressa do LOCADOR/LOCATÁRIO e eventual pagamento dos valores correspondentes.' },
  { t:'7. Responsabilidade por terceiros:', b:'O HÓSPEDE será responsável pelos atos praticados por seus acompanhantes, visitantes ou quaisquer terceiros por ele autorizados a acessar ou permanecer no apartamento, respondendo por eventuais danos, multas, advertências, perdas ou demais prejuízos decorrentes de suas condutas.' },
];
const CLAUSULA_FECHO = 'O HÓSPEDE declara ter lido, compreendido e concordado com todas as condições acima, comprometendo-se a cumprir integralmente as regras estabelecidas durante todo o período de sua permanência.';

const CHECKLIST_ITENS_OBRIGATORIOS = [
  'Gás desligado.',
  'Fogão limpo.',
  'Geladeira desligada e aberta.',
  'Micro-ondas desligado da tomada.',
  'Televisão desligada da tomada.',
  'Lixeiras do banheiro e da cozinha vazias.',
  'Louças lavadas e guardadas.',
  'Não deixar restos de comida no forno ou na geladeira.',
  'Luzes apagadas e janelas fechadas.',
  'Janela do banheiro aberta.',
];
const CHECKLIST_LIMPEZA = [
  'Opção de limpeza na saída: R$ 150,00.',
  'Caso não opte pela limpeza, o imóvel deverá ser entregue conforme este check-list.',
];
const CHECKLIST_INFO_IMPORTANTES = [
  'Caso o gás acabe durante a estadia, a troca é por conta do hóspede (não reembolsamos).',
  'Manter a porta de entrada sempre fechada durante a estadia.',
];
const CHECKLIST_VALORES_PERDA = [
  'Controle: R$ 30,00.',
  'Tag: consultar valor com o zelador.',
  'Chave simples: R$ 15,00 | Chave tetra: R$ 30,00.',
];
const CHECKLIST_OBS = 'Potes e panelas fazem falta para o próximo hóspede — se cada hóspede levar uma, por favor devolva junto com a chave.';

function generateContract(id){
  const r = typeof id === 'string' ? reservations.find(x=>x.id===id) : id;
  if(!r) { toast('Reserva não encontrada.', 'error'); return; }
  if(typeof window.jspdf === 'undefined'){ toast('Não foi possível carregar o módulo de PDF.', 'error'); return; }

  const st = statusInfo(r);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'pt', format:'a4' });
  const left = 50, right = 50, top = 56, bottom = 56;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - left - right;
  let y = top;

  function newPage(){ doc.addPage(); y = top; }

  function addParagraph(text, opts){
    opts = opts || {};
    const size = opts.size || 10;
    const lineHeight = opts.lineHeight || size * 1.4;
    const align = opts.align || 'justify';
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(opts.color || '#10262B');
    const lines = doc.splitTextToSize(text, opts.width || contentWidth);
    let idx = 0;
    while(idx < lines.length){
      if(y + lineHeight > pageHeight - bottom) newPage();
      const remainLines = Math.max(1, Math.floor((pageHeight - bottom - y) / lineHeight));
      const chunk = lines.slice(idx, idx + remainLines);
      const useAlign = (align === 'justify' && chunk.length > 1) ? 'justify' : (align === 'justify' ? 'left' : align);
      doc.text(chunk, opts.x || left, y, { maxWidth: opts.width || contentWidth, align: useAlign });
      y += chunk.length * lineHeight;
      idx += chunk.length;
    }
    return y;
  }

  function addSpacer(h){ y += h; }

  function addSectionTitle(text){
    if(y + 26 > pageHeight - bottom) newPage();
    y += 6;
    doc.setDrawColor('#0B4F6C');
    doc.setLineWidth(1.1);
    doc.line(left, y, pageWidth - right, y);
    y += 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor('#0B4F6C');
    doc.text(text, left, y);
    y += 14;
  }

  function addKeyValue(label, value){
    if(y + 15 > pageHeight - bottom) newPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor('#10262B');
    doc.text(String(label) + ':', left, y);
    const labelWidth = doc.getTextWidth(String(label) + ':  ');
    doc.setFont('helvetica', 'normal');
    doc.text(String(value == null || value === '' ? 'Não informado' : value), left + labelWidth + 4, y, { maxWidth: contentWidth - labelWidth - 4 });
    y += 15;
  }

  // ---------- Cabeçalho ----------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor('#0B4F6C');
  doc.text('CONTRATO DE HOSPEDAGEM', pageWidth/2, y, { align:'center' });
  y += 22;

  // ---------- 1. Identificação da reserva ----------
  addSectionTitle('1. IDENTIFICAÇÃO DA RESERVA');
  addKeyValue('Número/ID da reserva', r.id);
  addKeyValue('Data da reserva', fmtDate(r.dataReserva));
  addKeyValue('Locatário/responsável pela reserva', r.locatario);

  // ---------- 2. Hóspede ----------
  addSectionTitle('2. HÓSPEDE');
  addKeyValue('Nome', r.cliente);
  addKeyValue('Telefone', r.telefone);

  // ---------- 3. Dados da estadia ----------
  addSectionTitle('3. DADOS DA ESTADIA');
  addKeyValue('Endereço do imóvel', appConfig.enderecoImovel);
  addKeyValue('Check-in', fmtDate(r.checkin) + ' às ' + r.checkinHora);
  addKeyValue('Check-out', fmtDate(r.checkout) + ' às ' + r.checkoutHora);
  addKeyValue('Limite de hóspedes', r.limiteHospedes + ' pessoa(s)');

  // ---------- 4. Valores da reserva ----------
  addSectionTitle('4. VALORES DA RESERVA');
  addKeyValue('Valor total', fmtMoney(r.valorAluguel));
  addKeyValue('Valor do sinal', fmtMoney(r.valorSinal));
  addKeyValue('Valor recebido', fmtMoney(r.valorRecebido));
  addKeyValue('Valor a pagar', fmtMoney(st.saldo));
  addKeyValue('Status financeiro', st.label);

  // ---------- 5. Cláusula ----------
  addSectionTitle('5. RESPONSABILIDADES E CONDIÇÕES DA ESTADIA');
  addParagraph('CLÁUSULA – RESPONSABILIDADES DO HÓSPEDE, CONSERVAÇÃO DO IMÓVEL E CONDIÇÕES DA ESTADIA', { bold:true, size:10, align:'left' });
  addSpacer(6);
  addParagraph('O HÓSPEDE declara estar ciente de que será integralmente responsável pela conservação do apartamento, bem como de todos os móveis, eletrodomésticos, utensílios e demais itens disponibilizados durante o período da hospedagem.', { size:10 });
  addSpacer(8);
  CLAUSULA_ITENS.forEach(item=>{
    addParagraph(item.t, { bold:true, size:10, align:'left' });
    addSpacer(3);
    addParagraph(item.b, { size:10 });
    addSpacer(8);
  });
  addParagraph(CLAUSULA_FECHO, { size:10 });

  // ---------- 6. Aceite / assinaturas ----------
  addSectionTitle('6. ACEITE');
  addSpacer(4);
  function signatureBlock(titulo, nomePreenchido){
    if(y + 92 > pageHeight - bottom) newPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor('#0B4F6C');
    doc.text(titulo, left, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#10262B');
    doc.text('Nome: ' + (nomePreenchido || '_______________________________________________'), left, y); y += 18;
    doc.text('CPF: __________________________________________________', left, y); y += 18;
    doc.text('Assinatura: ___________________________________________', left, y); y += 18;
    doc.text('Data: ____ / ____ / ________', left, y); y += 22;
  }
  signatureBlock('HÓSPEDE', r.cliente);
  signatureBlock('LOCADOR/RESPONSÁVEL', appConfig.nomeLocador || r.locatario);

  // ---------- Rodapé com paginação (todas as páginas) ----------
  const totalPages = doc.internal.getNumberOfPages();
  for(let p=1; p<=totalPages; p++){
    doc.setPage(p);
    doc.setDrawColor('#D8E2E0');
    doc.setLineWidth(0.6);
    doc.line(left, pageHeight-34, pageWidth-right, pageHeight-34);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor('#4C6B6E');
    doc.text('Contrato de Hospedagem · Reserva ' + r.id, left, pageHeight-22);
    doc.text('Página ' + p + ' de ' + totalPages, pageWidth-right, pageHeight-22, { align:'right' });
  }

  doc.save('contrato-' + (r.cliente||'reserva').toLowerCase().replace(/\s+/g,'-') + '-' + r.id + '.pdf');
  toast('Contrato gerado com sucesso.', 'success');
}

/* ===================== Form (create/edit) ===================== */
function openForm(id){
  editingId = id || null;
  const overlay = document.getElementById('formOverlay');
  const title = document.getElementById('formTitle');
  const form = document.getElementById('resForm');
  form.reset();
  document.getElementById('dateError').textContent='';

  if(editingId){
    const r = reservations.find(x=>x.id===editingId);
    title.textContent = 'Editar reserva';
    document.getElementById('f_locatario').value = r.locatario;
    document.getElementById('f_cliente').value = r.cliente;
    document.getElementById('f_telefone').value = r.telefone || '';
    document.getElementById('f_dataReserva').value = String(r.dataReserva).slice(0,10);
    document.getElementById('f_checkin').value = String(r.checkin).slice(0,10);
    document.getElementById('f_checkinHora').value = r.checkinHora || '14:00';
    document.getElementById('f_checkout').value = String(r.checkout).slice(0,10);
    document.getElementById('f_checkoutHora').value = r.checkoutHora || '11:00';
    document.getElementById('f_limiteHospedes').value = r.limiteHospedes || 1;
    document.getElementById('f_valorAluguel').value = r.valorAluguel;
    document.getElementById('f_valorSinal').value = r.valorSinal;
    document.getElementById('f_status').value = r.status || 'pendente';
    document.getElementById('f_obs').value = r.obs || '';
  } else {
    title.textContent = 'Nova reserva';
    document.getElementById('f_dataReserva').value = todayISO();
    document.getElementById('f_valorSinal').value = 0;
    document.getElementById('f_status').value = 'pendente';
    document.getElementById('f_checkinHora').value = '14:00';
    document.getElementById('f_checkoutHora').value = '11:00';
    document.getElementById('f_limiteHospedes').value = 1;
  }
  updateCalc();
  overlay.classList.add('open');
}
function closeForm(){ document.getElementById('formOverlay').classList.remove('open'); editingId=null; }

function updateCalc(){
  const aluguel = parseFloat(document.getElementById('f_valorAluguel').value) || 0;
  const sinal = parseFloat(document.getElementById('f_valorSinal').value) || 0;
  const status = document.getElementById('f_status').value;
  const fin = computeFinance(status, aluguel, sinal);
  document.getElementById('calcRecebido').textContent = fmtMoney(fin.valorRecebido);
  document.getElementById('calcAReceber').textContent = fmtMoney(fin.totalAReceber);
  document.getElementById('calcSaldo').textContent = fmtMoney(fin.saldoRestante);
  document.getElementById('calcStatus').innerHTML = `<span class="flag ${STATUS_CSS[status]}" style="font-size:11px;">${STATUS_LABELS[status]}</span>`;
}

function validateForm(){
  const checkin = document.getElementById('f_checkin').value;
  const checkout = document.getElementById('f_checkout').value;
  const aluguel = parseFloat(document.getElementById('f_valorAluguel').value) || 0;
  const sinal = parseFloat(document.getElementById('f_valorSinal').value) || 0;
  const limite = parseInt(document.getElementById('f_limiteHospedes').value, 10);
  const errEl = document.getElementById('dateError');
  errEl.textContent='';

  if(!checkin || !checkout) return false;
  if(checkout <= checkin){
    errEl.textContent = 'A data de saída deve ser posterior à data de entrada.';
    return false;
  }
  if(sinal > aluguel){
    errEl.textContent = 'O valor do sinal não pode ser maior que o valor total do aluguel.';
    return false;
  }
  if(!limite || limite <= 0){
    errEl.textContent = 'O limite de hóspedes deve ser maior que zero.';
    return false;
  }
  const clash = findOverlap(checkin, checkout, editingId);
  if(clash){
    errEl.textContent = `Conflito de datas com a reserva de ${clash.cliente} (${fmtDate(clash.checkin)} — ${fmtDate(clash.checkout)}).`;
    return false;
  }
  return true;
}

async function handleFormSubmit(e){
  e.preventDefault();
  if(!validateForm()) return;

  const data = {
    id: editingId || uid(),
    locatario: document.getElementById('f_locatario').value.trim(),
    cliente: document.getElementById('f_cliente').value.trim(),
    telefone: document.getElementById('f_telefone').value.trim(),
    dataReserva: document.getElementById('f_dataReserva').value,
    checkin: document.getElementById('f_checkin').value,
    checkinHora: document.getElementById('f_checkinHora').value || '14:00',
    checkout: document.getElementById('f_checkout').value,
    checkoutHora: document.getElementById('f_checkoutHora').value || '11:00',
    limiteHospedes: parseInt(document.getElementById('f_limiteHospedes').value, 10) || 1,
    valorAluguel: parseFloat(document.getElementById('f_valorAluguel').value) || 0,
    valorSinal: parseFloat(document.getElementById('f_valorSinal').value) || 0,
    status: document.getElementById('f_status').value,
    obs: document.getElementById('f_obs').value.trim(),
  };

  const saveBtn = document.getElementById('saveResBtn');
  saveBtn.disabled = true; saveBtn.textContent = 'Salvando...';

  try{
    if(editingId){
      await apiRequest('PUT', '/' + encodeURIComponent(editingId), data);
      toast('Reserva atualizada com sucesso.', 'success');
    } else {
      await apiRequest('POST', '', data);
      toast('Reserva cadastrada com sucesso.', 'success');
    }
    await loadReservations();
    closeForm();
    render();
  }catch(err){
    document.getElementById('dateError').textContent = err.message;
    toast(err.message, 'error');
  }finally{
    saveBtn.disabled = false; saveBtn.textContent = 'Salvar reserva';
  }
}

async function confirmDelete(id){
  const r = reservations.find(x=>x.id===id);
  if(!r) return;
  if(confirm(`Excluir a reserva de ${r.cliente} (${fmtDate(r.checkin)} — ${fmtDate(r.checkout)})?`)){
    try{
      await apiRequest('DELETE', '/' + encodeURIComponent(id));
      await loadReservations();
      toast('Reserva excluída.', 'success');
      render();
    }catch(err){
      toast(err.message, 'error');
    }
  }
}

/* ===================== Configurações do imóvel ===================== */
function openSettings(){
  document.getElementById('s_endereco').value = appConfig.enderecoImovel || '';
  document.getElementById('s_locador').value = appConfig.nomeLocador || '';
  document.getElementById('settingsOverlay').classList.add('open');
}
function closeSettings(){ document.getElementById('settingsOverlay').classList.remove('open'); }

async function handleSettingsSubmit(e){
  e.preventDefault();
  const endereco = document.getElementById('s_endereco').value.trim();
  const locador = document.getElementById('s_locador').value.trim();
  const btn = document.getElementById('saveSettingsBtn');
  btn.disabled = true; btn.textContent = 'Salvando...';
  try{
    await apiRequest('PUT', '', { enderecoImovel: endereco, nomeLocador: locador }, CONFIG_BASE);
    appConfig = { enderecoImovel: endereco, nomeLocador: locador };
    toast('Configurações salvas com sucesso.', 'success');
    closeSettings();
  }catch(err){
    toast(err.message, 'error');
  }finally{
    btn.disabled = false; btn.textContent = 'Salvar configurações';
  }
}

/* ===================== Theme (localStorage) ===================== */
const THEME_KEY = 'mare_theme_pref';
function loadTheme(){
  const theme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(theme);
}
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeLabel').textContent = theme==='dark' ? 'Tema escuro' : 'Tema claro';
}
function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur==='dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
}

/* ===================== Utils ===================== */
function esc(s){
  if(s===undefined||s===null) return '';
  return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ===================== Master render ===================== */
function render(){
  renderNav();
  if(currentView==='dashboard') renderDashboard();
  else if(currentView==='calendar') renderCalendar();
  else if(currentView==='list') renderList();
  else if(currentView==='reports') renderReports();
}

/* ===================== Init & events ===================== */
document.getElementById('btnNewReservation').addEventListener('click', ()=> openForm(null));
document.getElementById('closeFormBtn').addEventListener('click', closeForm);
document.getElementById('cancelFormBtn').addEventListener('click', closeForm);
document.getElementById('resForm').addEventListener('submit', handleFormSubmit);
document.getElementById('formOverlay').addEventListener('click', e=>{ if(e.target.id==='formOverlay') closeForm(); });
document.getElementById('detailOverlay').addEventListener('click', e=>{ if(e.target.id==='detailOverlay') e.currentTarget.classList.remove('open'); });
document.getElementById('f_valorAluguel').addEventListener('input', updateCalc);
document.getElementById('f_valorSinal').addEventListener('input', updateCalc);
document.getElementById('f_status').addEventListener('change', updateCalc);
document.getElementById('themeToggle').addEventListener('click', toggleTheme);
document.getElementById('btnSettings').addEventListener('click', openSettings);
document.getElementById('closeSettingsBtn').addEventListener('click', closeSettings);
document.getElementById('cancelSettingsBtn').addEventListener('click', closeSettings);
document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);
document.getElementById('settingsOverlay').addEventListener('click', e=>{ if(e.target.id==='settingsOverlay') closeSettings(); });
document.getElementById('globalSearch').addEventListener('input', e=>{
  searchTerm = e.target.value;
  if(currentView!=='list'){ currentView='list'; }
  render();
});
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){
    document.getElementById('formOverlay').classList.remove('open');
    document.getElementById('detailOverlay').classList.remove('open');
    document.getElementById('settingsOverlay').classList.remove('open');
  }
});

(async function init(){
  loadTheme();
  await Promise.all([loadReservations(), loadConfig()]);
  render();
})();

})();