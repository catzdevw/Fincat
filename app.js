/* Caturza Financing Statement — dependency-free, offline-friendly finance tracker.
   All user data stays in this browser's localStorage. */
'use strict';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const EXPENSE_CATEGORIES = ['Bills','Groceries','Food & Dining','Transportation','Education','Health','Shopping','Other Expenses'];
const INCOME_CATEGORIES = ['Salary','Freelance','Business','Allowance','Gift','Other Income'];
const BILL_SUBCATEGORIES = ['Water Bill','Electricity / BOHECO','Wi-Fi / Internet','Gas / LPG','Rent','Mobile Load','Other Bill'];
const CATEGORY_COLORS = {'Bills':'#346fcb','Groceries':'#1d9f87','Food & Dining':'#ebad4e','Transportation':'#9670e4','Education':'#63a5da','Health':'#e27692','Shopping':'#d68e53','Other Expenses':'#8b9bab'};
const STORAGE_KEY = 'caturza_financing_statement_transactions_v1';
const moneyFormatter = new Intl.NumberFormat('en-PH', {style:'currency',currency:'PHP',minimumFractionDigits:2,maximumFractionDigits:2});
const compactFormatter = new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1});
const dateFormatter = new Intl.DateTimeFormat('en-PH',{month:'short',day:'numeric',year:'numeric'});
const today = new Date();
const initialYear = today.getFullYear();
const state = {year: initialYear, view:'dashboard', transactions:readTransactions(), filter:'all', search:'', chartMode:'flow', mobileOpen:false};

const $ = (s,root=document) => root.querySelector(s);
const $$ = (s,root=document) => [...root.querySelectorAll(s)];
const pad = n => String(n).padStart(2,'0');
const localToday = () => `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
const money = n => moneyFormatter.format(Number(n)||0);
const amountClass = n => Number(n)<-0.005?'negative':Number(n)>0.005?'positive':'';
const clean = str => String(str??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isDate = x => /^\d{4}-\d{2}-\d{2}$/.test(x||'') && !Number.isNaN(Date.parse(`${x}T00:00:00`)) && new Date(`${x}T00:00:00`).toISOString().slice(0,10) === x;
const dateDisplay = date => isDate(date)?dateFormatter.format(new Date(`${date}T12:00:00`)):String(date||'');
const dateMonth = tx => Number(tx.date.slice(5,7))-1;
const dateYear = tx => Number(tx.date.slice(0,4));
const sorted = txs => [...txs].sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
const txLabel = t => t.category==='Bills'&&t.subcategory?`${t.category} · ${t.subcategory}`:t.category;

function validateTransaction(x){
  if(!x||typeof x!=='object'||!isDate(x.date)||!['income','expense'].includes(x.type))return null;
  const amount = Number(x.amount);
  if(!Number.isFinite(amount)||amount<=0||amount>999999999999)return null;
  const allowed = x.type==='income'?INCOME_CATEGORIES:EXPENSE_CATEGORIES;
  return {id:String(x.id||makeId()),date:x.date,type:x.type,amount:Math.round((amount+Number.EPSILON)*100)/100,
    category:allowed.includes(x.category)?x.category:(x.type==='income'?'Other Income':'Other Expenses'),
    subcategory:String(x.subcategory||'').slice(0,90),description:String(x.description||'').slice(0,130),notes:String(x.notes||'').slice(0,350),createdAt:String(x.createdAt||new Date().toISOString())};
}
function readTransactions(){try{const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(raw)?raw.map(validateTransaction).filter(Boolean):[]}catch{return []}}
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.transactions));return true}catch{toast('Browser storage unavailable. Export a backup to retain your entries.',true);return false}}
function makeId(){return (typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function')?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`}
function monthly(month,year=state.year){return state.transactions.filter(t=>dateYear(t)===year&&dateMonth(t)===month)}
function yearly(year=state.year){return state.transactions.filter(t=>dateYear(t)===year)}
function sum(txs,type){return Math.round(txs.filter(t=>t.type===type).reduce((n,t)=>n+t.amount,0)*100)/100}
function stats(txs){const income=sum(txs,'income'),expense=sum(txs,'expense');return {income,expense,balance:Math.round((income-expense)*100)/100,rate:income>0?(income-expense)/income*100:0,count:txs.length}}
function categories(txs){const result={};for(const t of txs){if(t.type!=='expense')continue;result[t.category]=(result[t.category]||0)+t.amount}return Object.entries(result).sort((a,b)=>b[1]-a[1])}
function monthDate(month){return `${state.year}-${pad(month+1)}-${pad(Math.min(today.getDate(),new Date(state.year,month+1,0).getDate()))}`}
function icon(type){
  const paths={income:'<path d="M4 17l6-6 4 4 6-7"/><path d="M15 8h5v5"/>',expense:'<path d="M4 7l6 6 4-4 6 7"/><path d="M15 16h5v-5"/>',balance:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18M16 14h2"/>',rate:'<circle cx="12" cy="12" r="9"/><path d="M8 16l8-8M8 8h.01M16 16h.01"/>',receipt:'<path d="M5 3h14v18l-3-2-4 2-4-2-3 2zM8 9h8M8 13h8"/>',download:'<path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v3h16v-3"/>',search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>'};return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[type]||paths.balance}</svg>`}
function statCard(label,value,iconName,color,foot,extraClass=''){
 return `<div class="metric-card"><div class="metric-card-top"><span>${clean(label)}</span><span class="metric-icon ${color}">${icon(iconName)}</span></div><div class="metric-value ${extraClass}">${clean(value)}</div><div class="metric-foot">${foot}</div></div>`;
}
function emptyIllustration(title,description){return `<div class="chart-empty"><span class="empty-icon">▥</span><strong>${clean(title)}</strong><span>${clean(description)}</span></div>`}
function renderNav(){
 $('#nav-year').textContent=state.year;
 $('#year-label').textContent=state.year;
 $('#copyright-year').textContent=today.getFullYear();
 $$('#sidebar-nav .nav-item').forEach(btn=>{btn.classList.toggle('active',state.view==='dashboard');btn.setAttribute('aria-current',state.view==='dashboard'?'page':'false')});
 $('#months-nav').innerHTML=MONTHS.map((m,i)=>{let count=monthly(i).length;let active=state.view===i;return `<button type="button" class="nav-item ${active?'active':''}" data-month="${i}" ${active?'aria-current="page"':''}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg><span>${m}</span>${count?`<span class="month-count">${count}</span>`:''}</button>`}).join('');
 $('#breadcrumb-current').textContent=state.view==='dashboard'?'Dashboard':MONTHS[state.view];
}
function showView(view,year=state.year){state.year=year;state.view=view;state.filter='all';state.search='';const locationHash=`#/${year}/${view==='dashboard'?'dashboard':pad(view+1)}`;if(location.hash!==locationHash)history.replaceState(null,'',locationHash);render();window.scrollTo({top:0,behavior:'instant'});closeMobile()}
function initRoute(){const match=location.hash.match(/^#\/(\d{4})\/(dashboard|0?[1-9]|1[0-2])$/);if(match){state.year=Number(match[1]);state.view=match[2]==='dashboard'?'dashboard':Number(match[2])-1}}
function render(){renderNav();$('#main-content').innerHTML=state.view==='dashboard'?dashboardMarkup():monthlyMarkup(state.view);attachChartClickEvents()}

function dashboardMarkup(){
 const txs=yearly();const s=stats(txs);const recent=sorted(txs).slice(0,5);
 return `<section class="page-heading"><div><div class="eyebrow">FINANCIAL OVERVIEW · ${state.year}</div><h1 class="page-title">Your money, at a glance.</h1><p class="page-subtitle">A complete picture of your income, spending and savings throughout ${state.year}.</p></div><div class="heading-actions"><button class="button-outline" data-open-settings="true">${icon('download')} Back up data</button></div></section>
 <section class="metric-grid" aria-label="Annual financial overview">
 ${statCard('Total income',money(s.income),'income','blue','Across all 12 months')}
 ${statCard('Total expenses',money(s.expense),'expense','red','Across all spending categories')}
 ${statCard('Net balance',money(s.balance),'balance','green','Income minus expenses',amountClass(s.balance))}
 ${statCard('Savings rate',`${s.rate.toFixed(1)}%`,'rate','purple','Net balance as % of income',s.rate<0?'negative':'')}
 </section>
 <section class="charts-grid"><div class="panel"><div class="panel-header"><div><h2 class="panel-title">Annual cash flow</h2><p class="panel-note">Compare each month. Click a month on the chart to open its statement.</p></div><div class="segmented" aria-label="Cash flow chart type"><button data-chart-mode="flow" class="${state.chartMode==='flow'?'selected':''}">Income vs Expense</button><button data-chart-mode="net" class="${state.chartMode==='net'?'selected':''}">Net</button></div></div>${annualChart()}${state.chartMode==='flow'?'<div class="legend"><span class="legend-item"><span class="legend-dot"></span>Income</span><span class="legend-item"><span class="legend-dot expense"></span>Expenses</span></div>':'<div class="legend"><span class="legend-item"><span class="legend-dot"></span>Net monthly balance</span></div>'}</div>
 <div class="panel"><div class="panel-header"><div><h2 class="panel-title">Where your money goes</h2><p class="panel-note">Year-to-date expense categories</p></div></div>${donutMarkup(categories(txs),s.expense)}</div></section>
 <section class="section-grid"><div class="panel"><div class="panel-header"><div><h2 class="panel-title">Monthly overview</h2><p class="panel-note">All 12 months in ${state.year} · click any row to open</p></div></div><div class="transaction-table-wrapper"><table class="data-table"><thead><tr><th>Month</th><th class="text-right">Income</th><th class="text-right">Expenses</th><th class="text-right">Balance</th></tr></thead><tbody>${MONTHS.map((m,i)=>{const st=stats(monthly(i));return `<tr class="table-month" data-table-month="${i}" tabindex="0" role="button" aria-label="Open ${m}"><td><span class="mini-month-icon">${pad(i+1)}</span><span class="table-strong">${m}</span></td><td class="text-right">${money(st.income)}</td><td class="text-right">${money(st.expense)}</td><td class="text-right table-strong ${amountClass(st.balance)}">${money(st.balance)}</td></tr>`}).join('')}</tbody></table></div></div>
 <div class="panel"><div class="panel-header"><div><h2 class="panel-title">Recent transactions</h2><p class="panel-note">Your latest activity in ${state.year}</p></div></div>${recent.length?`<div class="activity-list">${recent.map(t=>`<div class="activity-item"><span class="activity-icon ${t.type}">${t.type==='income'?'↗':'↘'}</span><div class="activity-meta"><div class="activity-name">${clean(t.description||txLabel(t))}</div><div class="activity-date">${clean(txLabel(t))} · ${dateDisplay(t.date)}</div></div><div class="activity-amount ${t.type==='income'?'positive':'amount-expense'}">${t.type==='income'?'+':'−'}${money(t.amount)}</div></div>`).join('')}</div>`:`<div class="empty-message"><strong>No transactions yet</strong>Add your first income or expense to see recent activity.<div style="margin-top:12px"><button class="primary-button" data-add="true">+ Add transaction</button></div></div>`}<div class="statement-tip"><span class="tip-mark">ⓘ</span><span><strong>Monthly statements are ready when you are.</strong> Open any month in the sidebar to download its financial statement as a PDF.</span></div></div></section>`;
}
function annualChart(){
 const monthlyStats=MONTHS.map((_,i)=>stats(monthly(i)));if(!monthlyStats.some(s=>s.income||s.expense))return emptyIllustration('No chart data yet','Add transactions or load sample data from Settings.');
 const W=760,H=270,left=54,right=17,top=15,bottom=39,plotW=W-left-right,plotH=H-top-bottom,step=plotW/12;
 let values=state.chartMode==='net'?monthlyStats.map(s=>s.balance):monthlyStats.flatMap(s=>[s.income,s.expense]);
 let max=Math.max(1,...values,0),min=Math.min(0,...values);
 if(state.chartMode==='net'){const spacing=Math.max(1000,Math.ceil((max-min)/4/1000)*1000);max=Math.max(spacing,Math.ceil(max/spacing)*spacing);min=Math.min(0,Math.floor(min/spacing)*spacing)}else{max=Math.max(100,Math.ceil(max/1000)*1000)}
 const y=v=>top+((max-v)/(max-min))*plotH;
 let svg=`<svg class="cashflow-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Annual ${state.chartMode==='net'?'net balance':'income and expense'} chart">`;
 for(let i=0;i<=4;i++){const value=min+(max-min)*i/4,yy=y(value);svg+=`<line class="gridline" x1="${left}" x2="${W-right}" y1="${yy}" y2="${yy}"/><text class="axis-label" x="${left-8}" y="${yy+4}" text-anchor="end">${clean(compactFormatter.format(value))}</text>`}
 if(state.chartMode==='flow'){
  monthlyStats.forEach((s,i)=>{const x=left+i*step+step/2,bw=15,gap=2;const incomeY=y(s.income),expenseY=y(s.expense),zeroY=y(0);svg+=`<rect class="bar-income" x="${x-bw-gap/2}" y="${incomeY}" width="${bw}" height="${Math.max(0,zeroY-incomeY)}" rx="3"><title>${MONTHS[i]} income: ${money(s.income)}</title></rect><rect class="bar-expense" x="${x+gap/2}" y="${expenseY}" width="${bw}" height="${Math.max(0,zeroY-expenseY)}" rx="3"><title>${MONTHS[i]} expenses: ${money(s.expense)}</title></rect>`})
 }else{
  const points=monthlyStats.map((s,i)=>[left+i*step+step/2,y(s.balance)]);let line=points.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');let area=`${line} L${points.at(-1)[0]},${y(0)} L${points[0][0]},${y(0)} Z`;svg+=`<path class="net-area" d="${area}"/><path class="net-line" d="${line}"/>`;points.forEach((p,i)=>{svg+=`<circle class="active-point" cx="${p[0]}" cy="${p[1]}" r="4"><title>${MONTHS[i]} balance: ${money(monthlyStats[i].balance)}</title></circle>`})
 }
 monthlyStats.forEach((s,i)=>{const x=left+i*step+step/2;svg+=`<text class="x-label" x="${x}" y="${H-11}" text-anchor="middle">${SHORT_MONTHS[i]}</text><rect class="hit-area" data-chart-month="${i}" x="${left+i*step}" y="${top}" width="${step}" height="${plotH+17}"><title>${MONTHS[i]}: income ${money(s.income)}; expenses ${money(s.expense)}; balance ${money(s.balance)}. Click to open.</title></rect>`});
 return `<div class="chart-wrap">${svg}</svg></div>`;
}
function donutMarkup(items,total){if(!items.length)return emptyIllustration('No expenses recorded','Your expense breakdown will appear here.');
 const radius=64,circum=2*Math.PI*radius;let start=0;
 const sections=items.map(([name,value])=>{let len=value/total*circum;let seg=`<circle cx="100" cy="100" r="${radius}" fill="none" stroke="${CATEGORY_COLORS[name]||'#9ca3af'}" stroke-width="23" stroke-dasharray="${Math.max(0,len-3)} ${circum}" stroke-dashoffset="${-start}" transform="rotate(-90 100 100)"><title>${clean(name)}: ${money(value)} (${(100*value/total).toFixed(1)}%)</title></circle>`;start+=len;return seg}).join('');
 return `<div class="donut-layout"><svg viewBox="0 0 200 200" class="donut-svg" role="img" aria-label="Expenses by category"><circle cx="100" cy="100" r="${radius}" fill="none" stroke="#f1f4f8" stroke-width="23"/>${sections}<text x="100" y="92" class="donut-center-label" text-anchor="middle">TOTAL SPENT</text><text x="100" y="111" class="donut-center-amount" text-anchor="middle" style="font-size:${String(Math.floor(total)).length>8?12:17}px">${clean(compactFormatter.format(total))}</text></svg><div class="donut-legend">${items.map(([name,value])=>`<div class="donut-row" title="${clean(money(value))}"><span class="donut-color" style="background:${CATEGORY_COLORS[name]||'#9ca3af'}"></span><span class="donut-name">${clean(name)}</span><span class="donut-percent">${(100*value/total).toFixed(0)}%</span></div>`).join('')}</div></div>`;
}
function monthlyMarkup(month){
 const txs=monthly(month),s=stats(txs),cat=categories(txs);const display=MONTHS[month];const searched=sorted(txs).filter(t=>(state.filter==='all'||t.type===state.filter)&&`${t.description} ${t.category} ${t.subcategory} ${t.notes} ${t.amount}`.toLowerCase().includes(state.search.toLowerCase()));
 return `<section class="page-heading"><div><div class="eyebrow">MONTHLY FINANCIAL STATEMENT · ${state.year}</div><h1 class="page-title">${display} ${state.year}</h1><p class="page-subtitle">Track every peso earned and spent during ${display}.</p></div><div class="heading-actions"><button class="button-outline" data-csv="${month}">${icon('download')} CSV</button><button class="primary-button" data-pdf="${month}">${icon('download')} Download PDF statement</button></div></section>
 <section class="metric-grid" aria-label="Monthly financial summary">${statCard('Monthly income',money(s.income),'income','blue','All recorded income')}${statCard('Monthly expenses',money(s.expense),'expense','red','All recorded expenses')}${statCard('Remaining balance',money(s.balance),'balance','green','Income minus expenses',amountClass(s.balance))}${statCard('Transactions',s.count.toString(),'receipt','purple','Income and expense entries')}</section>
 <section class="month-grid"><div class="panel"><div class="panel-header"><div><h2 class="panel-title">Transaction history</h2><p class="panel-note">Your ${display} income and expense records</p></div><button class="button-outline" data-add="true">+ New entry</button></div><div class="transaction-toolbar"><div class="filter-bar"><button data-filter="all" class="${state.filter==='all'?'active':''}">All</button><button data-filter="income" class="${state.filter==='income'?'active':''}">Income</button><button data-filter="expense" class="${state.filter==='expense'?'active':''}">Expenses</button></div><label class="search-field">${icon('search')}<input id="transaction-search" type="search" autocomplete="off" placeholder="Search transactions" value="${clean(state.search)}" aria-label="Search transactions" /></label></div>
 <div id="monthly-transaction-table">${monthlyTable(searched,txs.length)}</div></div>
 <div class="panel"><div class="panel-header"><div><h2 class="panel-title">Spending breakdown</h2><p class="panel-note">Which categories used your budget?</p></div></div>${cat.length?`<div class="breakdown-list">${cat.map(([name,amount])=>`<div><div class="breakdown-head"><span>${clean(name)}</span><strong>${money(amount)}</strong></div><div class="progress-track"><div class="progress-fill" style="width:${Math.min(100,100*amount/s.expense)}%;background:${CATEGORY_COLORS[name]}"></div></div></div>`).join('')}</div>`:emptyIllustration('Nothing spent yet','Record an expense to see category breakdown.')}
 <div class="insight-box"><strong>${s.balance>=0?'Your monthly position':'Your expenses exceed income'}</strong>${s.income===0&&s.expense===0?'Add income and expense entries to calculate your balance.':s.balance>=0?`You have ${money(s.balance)} remaining after ${money(s.expense)} in expenses.`:`Your expenses are ${money(Math.abs(s.balance))} higher than your recorded income this month.`}</div><div class="statement-tip"><span class="tip-mark">ⓘ</span><span>Your PDF includes a full income/expense summary, spending categories and every transaction for <strong>${display} ${state.year}</strong>.</span></div></div></section>`;
}
function monthlyTable(txs,fullCount){if(!txs.length){return `<div class="empty-message"><strong>${fullCount?'No matching transactions':'No transactions recorded'}</strong>${fullCount?'Try clearing your search or changing the filter.':'Use New entry to record your first income or expense.'}</div>`}
 return `<div class="transaction-table-wrapper"><table class="data-table transactions-table"><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th class="text-right">Amount</th><th class="text-right">Actions</th></tr></thead><tbody>${txs.map(t=>`<tr><td>${dateDisplay(t.date)}</td><td><div class="table-strong">${clean(t.description||txLabel(t))}</div>${t.notes?`<div style="font-size:10px;color:#9aa5b6;margin-top:4px" title="${clean(t.notes)}">${clean(t.notes.slice(0,35))}${t.notes.length>35?'…':''}</div>`:''}</td><td>${clean(txLabel(t))}</td><td><span class="type-chip ${t.type}">${t.type==='income'?'Income':'Expense'}</span></td><td class="text-right ${t.type==='income'?'amount-income':'amount-expense'}">${t.type==='income'?'+':'−'}${money(t.amount)}</td><td><div class="row-actions"><button class="small-icon-btn" data-edit="${clean(t.id)}" aria-label="Edit transaction">Edit</button><button class="small-icon-btn danger" data-delete="${clean(t.id)}" aria-label="Delete transaction">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
function refreshMonthlyTable(){if(typeof state.view!=='number')return;const txs=monthly(state.view);const searched=sorted(txs).filter(t=>(state.filter==='all'||t.type===state.filter)&&`${t.description} ${t.category} ${t.subcategory} ${t.notes} ${t.amount}`.toLowerCase().includes(state.search.toLowerCase()));const el=$('#monthly-transaction-table');if(el)el.innerHTML=monthlyTable(searched,txs.length)}
function attachChartClickEvents(){ /* delegated click and keyboard handlers are registered once below */ }
function closeMobile(){$('#sidebar').classList.remove('open');$('#mobile-overlay').classList.remove('open')}
function toast(message,error=false){const root=$('#toast-root'),node=document.createElement('div');node.className=`toast${error?' error':''}`;node.textContent=message;root.append(node);setTimeout(()=>node.remove(),4300)}

function openTransaction(id=null){
 const t=id?state.transactions.find(x=>x.id===id):null;const defaultDate=t?.date||(typeof state.view==='number'?monthDate(state.view):(state.year===today.getFullYear()?localToday():`${state.year}-01-01`));const type=t?.type||'expense';
 $('#modal-root').innerHTML=`<div class="modal-overlay" id="modal-overlay"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="transaction-dialog-title"><header class="modal-head"><div><h2 id="transaction-dialog-title">${t?'Edit transaction':'Add transaction'}</h2><p>Changes instantly update your financial statements.</p></div><button class="close-modal" type="button" data-close-modal aria-label="Close dialog">×</button></header><form id="transaction-form" data-id="${t?clean(t.id):''}"><div class="modal-body"><label class="form-field"><span class="form-hint">TRANSACTION TYPE</span></label><div class="type-select"><button type="button" id="select-income" data-form-type="income" class="${type==='income'?'chosen income':''}">↗ Income</button><button type="button" id="select-expense" data-form-type="expense" class="${type==='expense'?'chosen expense':''}">↘ Expense</button></div><input type="hidden" id="entry-type" name="type" value="${type}" />
 <div class="form-row"><div class="form-field"><label for="entry-amount">Amount (PHP) *</label><input id="entry-amount" name="amount" type="number" inputmode="decimal" min="0.01" max="999999999999" step="0.01" value="${t?t.amount:''}" placeholder="0.00" required /></div><div class="form-field"><label for="entry-date">Date *</label><input id="entry-date" name="date" type="date" value="${defaultDate}" required /></div></div>
 <div class="form-row"><div class="form-field"><label for="entry-category">Category *</label><select id="entry-category" name="category" required>${(type==='income'?INCOME_CATEGORIES:EXPENSE_CATEGORIES).map(c=>`<option value="${clean(c)}" ${t?.category===c?'selected':''}>${clean(c)}</option>`).join('')}</select></div><div class="form-field" id="bill-field"><label for="entry-subcategory">Bill type</label><select id="entry-subcategory" name="subcategory"><option value="">General bill</option>${BILL_SUBCATEGORIES.map(b=>`<option value="${clean(b)}" ${t?.subcategory===b?'selected':''}>${clean(b)}</option>`).join('')}</select></div></div>
 <div class="form-field"><label for="entry-description">Description *</label><input id="entry-description" name="description" maxlength="130" value="${clean(t?.description||'')}" placeholder="e.g. Monthly salary, BOHECO payment" required /></div><div class="form-field"><label for="entry-notes">Notes (optional)</label><textarea id="entry-notes" name="notes" maxlength="350" placeholder="Any additional details...">${clean(t?.notes||'')}</textarea></div><div class="form-hint">Entries are saved locally on this device and reflected in the selected month.</div></div><footer class="modal-foot"><button class="button-outline" type="button" data-close-modal>Cancel</button><button class="primary-button" type="submit">${t?'Save changes':'Add transaction'}</button></footer></form></section></div>`;
 $('#entry-category').addEventListener('change',updateBillField);updateBillField();$('#entry-amount').focus();
}
function updateBillField(){const type=$('#entry-type')?.value,cat=$('#entry-category')?.value;const field=$('#bill-field');if(field)field.style.display=type==='expense'&&cat==='Bills'?'flex':'none'}
function changeFormType(type){const category=$('#entry-category');if(!category)return;const previous=category.value;$('#entry-type').value=type;category.innerHTML=(type==='income'?INCOME_CATEGORIES:EXPENSE_CATEGORIES).map(c=>`<option value="${clean(c)}" ${c===previous?'selected':''}>${clean(c)}</option>`).join('');if(!(type==='income'?INCOME_CATEGORIES:EXPENSE_CATEGORIES).includes(previous))category.selectedIndex=0;$('#select-income').className=type==='income'?'chosen income':'';$('#select-expense').className=type==='expense'?'chosen expense':'';updateBillField()}
function closeModal(){$('#modal-root').innerHTML=''}
function saveForm(form){const fd=new FormData(form),id=form.dataset.id,existing=state.transactions.find(t=>t.id===id);const amount=Number(fd.get('amount'));const date=String(fd.get('date')||'');const description=String(fd.get('description')||'').trim();const type=String(fd.get('type'));
 if(!Number.isFinite(amount)||amount<=0||amount>999999999999||!isDate(date)||!description||!['income','expense'].includes(type)){toast('Enter a valid date, description and positive amount.',true);return}
 const tx=validateTransaction({id:existing?.id||makeId(),date,type,amount,category:fd.get('category'),subcategory:fd.get('category')==='Bills'?fd.get('subcategory'):'',description,notes:fd.get('notes'),createdAt:existing?.createdAt||new Date().toISOString()});if(!tx){toast('The transaction could not be saved.',true);return}
 if(existing)state.transactions=state.transactions.map(t=>t.id===existing.id?tx:t);else state.transactions.push(tx);
 persist();closeModal();showView(dateMonth(tx),dateYear(tx));toast(existing?'Transaction updated.':'Transaction added and totals recalculated.');
}
function deleteTransaction(id){const t=state.transactions.find(t=>t.id===id);if(!t)return;if(!confirm(`Delete "${t.description||txLabel(t)}" (${money(t.amount)})? This cannot be undone.`))return;state.transactions=state.transactions.filter(t=>t.id!==id);persist();render();toast('Transaction deleted and totals recalculated.')}
function openSettings(){
 $('#modal-root').innerHTML=`<div class="modal-overlay" id="modal-overlay"><section class="modal large" role="dialog" aria-modal="true" aria-labelledby="settings-title"><header class="modal-head"><div><h2 id="settings-title">Backup & settings</h2><p>Your financial records are stored only in this browser.</p></div><button class="close-modal" type="button" data-close-modal aria-label="Close dialog">×</button></header><div class="modal-body"><div class="settings-action"><div><strong>Download full backup</strong><small>Save all years and transactions as a JSON file. Recommended regularly.</small></div><button class="button-outline" id="export-backup" type="button">Download JSON</button></div><div class="settings-action"><div><strong>Restore a backup</strong><small>Import a Caturza JSON backup; your current records will be replaced after confirmation.</small></div><button class="button-outline" id="import-backup" type="button">Import JSON</button><input type="file" id="backup-file" accept="application/json,.json" hidden /></div><div class="settings-action"><div><strong>Try sample financial data</strong><small>Load example income and expenses for ${state.year} to preview the dashboard and reports.</small></div><button class="button-outline" id="load-sample" type="button">Load demo</button></div><div class="settings-action"><div><strong class="text-danger">Clear all financial data</strong><small>Permanently delete records from every year on this browser. Export a backup first.</small></div><button class="button-outline text-danger" id="clear-all" type="button">Clear data</button></div><p class="summary-small">Privacy note: this MVP does not connect to a server, bank or cloud account. Clearing browser data, changing browsers or devices, or using private browsing may remove your records. Monthly PDFs and JSON backups are saved to your computer when downloaded.</p></div><footer class="modal-foot"><button class="primary-button" type="button" data-close-modal>Done</button></footer></section></div>`;
}
function downloadBlob(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000)}
function backupData(){const pack={app:'Caturza Financing Statement',version:1,exportedAt:new Date().toISOString(),transactions:state.transactions};downloadBlob(new Blob([JSON.stringify(pack,null,2)],{type:'application/json;charset=utf-8'}),`Caturza-Financing-Backup-${localToday()}.json`);toast('Backup JSON downloaded. Keep it in a safe location.')}
async function importBackup(file){if(!file)return;try{if(file.size>20*1024*1024)throw new Error('Backup is too large.');const raw=JSON.parse(await file.text());if(raw?.app!=='Caturza Financing Statement'||!Array.isArray(raw.transactions))throw new Error('Not a Caturza financial backup.');const sanitized=raw.transactions.map(validateTransaction);if(sanitized.some(x=>!x))throw new Error('The backup contains invalid transactions.');const ids=new Set(sanitized.map(t=>t.id));if(ids.size!==sanitized.length)throw new Error('The backup contains duplicate IDs.');if(!confirm(`Replace your current ${state.transactions.length} transactions with ${sanitized.length} records from this backup?`))return;state.transactions=sanitized;persist();closeModal();showView(state.view,state.year);toast(`${sanitized.length} transactions restored.`)}catch(err){toast(`Could not import: ${err.message}`,true)}}
function loadSample(){if(state.transactions.length&&!confirm(`You have ${state.transactions.length} existing transaction(s). Add sample entries for ${state.year} without deleting them?`))return;const add=(m,day,type,category,description,amount,subcategory='')=>{state.transactions.push(validateTransaction({id:makeId(),date:`${state.year}-${pad(m+1)}-${pad(day)}`,type,category,description,amount,subcategory,createdAt:new Date().toISOString()}))};
 for(let m=0;m<12;m++){const factor=1+(m%4)*.04;add(m,5,'income','Salary','Monthly salary',Math.round(36500*factor));if(m%2===0)add(m,16,'income','Freelance','Freelance project',8500+m*200);add(m,8,'expense','Bills','Electric bill',Math.round(1900*factor),'Electricity / BOHECO');add(m,10,'expense','Bills','Water bill',420+m*7,'Water Bill');add(m,11,'expense','Bills','Home internet',1499,'Wi-Fi / Internet');add(m,13,'expense','Groceries','Grocery supplies',Math.round(5200*factor));add(m,18,'expense','Transportation','Fuel and rides',2000+m*65);add(m,20,'expense','Food & Dining','Meals and snacks',2100+m*80);add(m,24,'expense','Other Expenses','Home essentials',Math.round(900*factor));if(m===5||m===11)add(m,25,'expense','Education','School expenses',3500)}persist();closeModal();showView('dashboard');toast('Sample entries added. These are fictional demo values.');}
function clearAll(){if(!state.transactions.length){toast('There are no transactions to clear.');return}if(!confirm(`Delete ALL ${state.transactions.length} transactions from every year on this device?`))return;if(!confirm('Final confirmation: this permanently clears your records. Did you export a backup?'))return;state.transactions=[];persist();closeModal();showView('dashboard');toast('All transactions cleared.')}
function exportCSV(month){const rows=sorted(monthly(month)),cells=[['Date','Type','Description','Category','Bill Type','Amount (PHP)','Notes'],...rows.map(t=>[t.date,t.type,t.description,t.category,t.subcategory,t.amount.toFixed(2),t.notes])];const quote=x=>{const raw=String(x??'');const safe=/^[\s]*[=+\-@]/.test(raw)?`'${raw}`:raw;return `"${safe.replace(/"/g,'""')}"`};const csv='\ufeff'+cells.map(row=>row.map(quote).join(',')).join('\r\n');downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),`Caturza-${state.year}-${pad(month+1)}-Transactions.csv`);toast(`${MONTHS[month]} CSV downloaded.`)}

/* Small dependency-free PDF writer. Uses PDF standard Helvetica fonts, so textual
   PHP amounts are used in reports for reliable rendering on every PDF reader. */
function ascii(text){return String(text??'').replace(/₱/g,'PHP ').replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/\u2026/g,'...').replace(/\u00b7/g,' - ').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?')}
function pdfEscape(text){return ascii(text).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
const pdfMoney=value=>'PHP '+Number(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
function pdfWriter(){
 const pw=595.28,ph=841.89;let pages=[];let p=null;
 const makePage=()=>{p={cmd:[]};pages.push(p);return p};
 const rect=(x,top,w,h,color)=>p.cmd.push(`${color} rg ${x.toFixed(2)} ${(ph-top-h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
 const rule=(x1,top,x2,color='#ddd')=>{p.cmd.push(`${rgb(color)} RG 0.65 w ${x1.toFixed(2)} ${(ph-top).toFixed(2)} m ${x2.toFixed(2)} ${(ph-top).toFixed(2)} l S`)};
 const rgb=hex=>{hex=hex.replace('#','');return [0,2,4].map(i=>(parseInt(hex.slice(i,i+2),16)/255).toFixed(3)).join(' ')};
 const text=(x,top,str,size=10,bold=false,color='#172b46')=>p.cmd.push(`BT /${bold?'F2':'F1'} ${size} Tf ${rgb(color)} rg 1 0 0 1 ${x.toFixed(2)} ${(ph-top-size).toFixed(2)} Tm (${pdfEscape(str)}) Tj ET`);
 const fit=(str,chars=36)=>{const s=ascii(str);return s.length>chars?s.slice(0,chars-3)+'...':s};
 const build=()=>{
   const objs=[null,'<< /Type /Catalog /Pages 2 0 R >>',null,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];
   let pageRefs=[];for(const page of pages){const pageIdx=objs.length,streamIdx=pageIdx+1;pageRefs.push(`${pageIdx} 0 R`);objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamIdx} 0 R >>`);const stream=page.cmd.join('\n')+'\n';objs.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`)}
   objs[2]=`<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >>`;
   let result='%PDF-1.4\n%----\n',offsets=[0];for(let i=1;i<objs.length;i++){offsets.push(result.length);result+=`${i} 0 obj\n${objs[i]}\nendobj\n`}const xref=result.length;result+=`xref\n0 ${objs.length}\n0000000000 65535 f \n`;for(let i=1;i<offsets.length;i++)result+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;result+=`trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return new Blob([result],{type:'application/pdf'});
 };
 return {makePage,rect,rule,text,rgb,fit,build,pw,ph,pages};
}
function createStatementPDF(month,year=state.year){
 const ts=sorted(monthly(month,year)),s=stats(ts),cats=categories(ts),pdf=pdfWriter();const {rect,rule,text,rgb,fit,makePage}=pdf;const dark=rgb('#102441'),muted='#73839a';let y=0;
 const startPage=(continuation=false)=>{makePage();if(!continuation){rect(0,0,595.28,112,dark);rect(39,33,32,32,rgb('#2f75cd'));text(46,39,'CF',14,true,'#ffffff');text(84,30,'CATURZA FINANCING STATEMENT',15,true,'#ffffff');text(84,52,'PERSONAL MONTHLY FINANCIAL REPORT',8,false,'#c3d9fa');text(40,81,`${MONTHS[month].toUpperCase()} ${year}`,14,true,'#ffffff');text(414,84,'MONTHLY STATEMENT',8,true,'#b8d3f5');y=139}else{rect(0,0,595.28,58,dark);text(38,18,'CATURZA  /  MONTHLY STATEMENT',11,true,'#ffffff');text(412,19,`${MONTHS[month]} ${year}`,10,false,'#d5e5f8');y=84}};
 const newPageIf=(height=18)=>{if(y+height>765){startPage(true)}};
 startPage();
 const cards=[['TOTAL INCOME',s.income,'#1f8d69'],['TOTAL EXPENSES',s.expense,'#bd596a'],['REMAINING BALANCE',s.balance,s.balance<0?'#bd596a':'#205caf']];
 cards.forEach(([label,value,color],i)=>{let x=38+i*177;rect(x,y,165,72,rgb('#f1f5fa'));text(x+12,y+11,label,8,true,muted);text(x+12,y+32,pdfMoney(value),12,true,color)});y+=96;
 text(39,y,'STATEMENT DETAILS',10,true);y+=23;rule(39,y,556,'#e2e8f0');y+=12;
 text(39,y,`Period:  ${MONTHS[month]} 1 - ${new Date(year,month+1,0).getDate()}, ${year}`,9,false,'#445972');y+=18;text(39,y,`Entries:  ${ts.length} transaction${ts.length===1?'':'s'}`,9,false,'#445972');y+=21;
 text(39,y,'EXPENSES BY CATEGORY',11,true);y+=23;
 if(cats.length){cats.forEach(([name,value])=>{newPageIf(20);text(41,y,fit(name,41),9,false,'#4f6078');text(396,y,pdfMoney(value),9,true,'#24466c');y+=19});y+=7}else{text(42,y,'No expense transactions this month.',9,false,muted);y+=29}
 newPageIf(76);text(39,y,'TRANSACTION DETAILS',11,true);y+=20;
 const tableHeader=()=>{rect(38,y,518,25,rgb('#eaf0f8'));text(45,y+6,'DATE',8,true,'#304760');text(102,y+6,'DESCRIPTION / CATEGORY',8,true,'#304760');text(354,y+6,'TYPE',8,true,'#304760');text(428,y+6,'AMOUNT',8,true,'#304760');y+=30};tableHeader();
 if(!ts.length){text(45,y+8,'No transactions recorded for this period.',9,false,muted);y+=35}
 for(const [idx,t] of ts.entries()){if(y+45>765){startPage(true);text(39,y,'TRANSACTIONS (CONTINUED)',11,true);y+=24;tableHeader()}
 if(idx%2===0)rect(38,y-1,518,43,rgb('#f8fafc'));
 text(45,y+6,t.date.slice(5),9,false,'#52647a');text(102,y+3,fit(t.description||t.category,37),9,true,'#243851');text(102,y+19,fit(txLabel(t),42),8,false,muted);text(354,y+8,t.type==='income'?'INCOME':'EXPENSE',8,true,t.type==='income'?'#218964':'#cb6171');text(426,y+7,fit((t.type==='income'?'+':'-')+pdfMoney(t.amount),21),8.5,true,'#243851');y+=43;rule(38,y,556,'#e9edf2');}
 for(let i=0;i<pdf.pages.length;i++){const savedPage=pdf.pages[i]; // Re-select each page so footer is appended to its own content stream.
  const footerRgb=rgb('#7c8ba0');savedPage.cmd.push(`${footerRgb} RG 0.6 w 38 55 m 557 55 l S`);
  const dateString=ascii(new Date().toISOString().slice(0,10));savedPage.cmd.push(`BT /F1 8 Tf ${footerRgb} rg 1 0 0 1 39 40 Tm (${pdfEscape('Generated '+dateString+' | All amounts in Philippine pesos (PHP)')}) Tj ET`);
  savedPage.cmd.push(`BT /F2 8 Tf ${footerRgb} rg 1 0 0 1 500 40 Tm (${pdfEscape(`Page ${i+1} / ${pdf.pages.length}`)}) Tj ET`);
 }
 return pdf.build();
}
function exportPDF(month){try{const blob=createStatementPDF(month);downloadBlob(blob,`Caturza-Financial-Statement-${state.year}-${pad(month+1)}-${SHORT_MONTHS[month]}.pdf`);toast(`${MONTHS[month]} ${state.year} PDF statement downloaded.`)}catch(err){toast(`Could not generate PDF: ${err.message}`,true)}}

// Event delegation keeps dynamically rendered month views functional.
document.addEventListener('click',event=>{
 const el=event.target.closest('button,[data-table-month],[data-chart-month]');if(!el)return;
 if(el.matches('[data-view="dashboard"]'))return showView('dashboard');
 if(el.hasAttribute('data-month'))return showView(Number(el.dataset.month));
 if(el.hasAttribute('data-chart-month'))return showView(Number(el.dataset.chartMonth));
 if(el.hasAttribute('data-table-month'))return showView(Number(el.dataset.tableMonth));
 if(el.id==='previous-year')return showView(state.view,state.year-1);
 if(el.id==='next-year')return showView(state.view,state.year+1);
 if(el.id==='add-transaction'||el.hasAttribute('data-add'))return openTransaction();
 if(el.id==='backup-button'||el.hasAttribute('data-open-settings'))return openSettings();
 if(el.id==='menu-button'){$('#sidebar').classList.add('open');$('#mobile-overlay').classList.add('open');return}
 if(el.id==='mobile-overlay')return closeMobile();
 if(el.hasAttribute('data-chart-mode')){state.chartMode=el.dataset.chartMode;return render()}
 if(el.hasAttribute('data-filter')){state.filter=el.dataset.filter;return render()}
 if(el.hasAttribute('data-pdf'))return exportPDF(Number(el.dataset.pdf));
 if(el.hasAttribute('data-csv'))return exportCSV(Number(el.dataset.csv));
 if(el.hasAttribute('data-edit'))return openTransaction(el.dataset.edit);
 if(el.hasAttribute('data-delete'))return deleteTransaction(el.dataset.delete);
 if(el.hasAttribute('data-form-type'))return changeFormType(el.dataset.formType);
 if(el.hasAttribute('data-close-modal')||el.id==='modal-overlay')return closeModal();
 if(el.id==='export-backup')return backupData();
 if(el.id==='import-backup')return $('#backup-file')?.click();
 if(el.id==='load-sample')return loadSample();
 if(el.id==='clear-all')return clearAll();
});
document.addEventListener('submit',event=>{if(event.target.id==='transaction-form'){event.preventDefault();saveForm(event.target)}});
document.addEventListener('input',event=>{if(event.target.id==='transaction-search'){state.search=event.target.value;refreshMonthlyTable()}});
document.addEventListener('change',event=>{if(event.target.id==='backup-file'){importBackup(event.target.files?.[0])}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){if($('#modal-root').innerHTML)closeModal();else closeMobile()}if((event.key==='Enter'||event.key===' ')&&event.target.matches('[data-table-month]')){event.preventDefault();showView(Number(event.target.dataset.tableMonth))}});
window.addEventListener('hashchange',()=>{initRoute();render()});
initRoute();render();
