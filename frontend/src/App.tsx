import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays,
  BarChart3, Check, ChevronDown, CircleDollarSign, Download,
  FileText, LayoutDashboard, Menu, Pencil, Plus, ReceiptText, Search,
  Trash2, TrendingDown, TrendingUp, Wallet, X,
} from 'lucide-react';
import { api } from './api';
import type { EntryPayload, EntryType, FinanceEntry, FinancialSummary, MonthSummary } from './types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const SHORT_MONTHS = MONTHS.map((m) => m.slice(0, 3));
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Other Income'];
const EXPENSE_CATEGORIES = ['Bills', 'Groceries', 'Transport', 'Other Expenses'];
const BILL_TYPES = ['Water', 'BOHECO / Electricity', 'Wi-Fi', 'Gasoline', 'Other Bill'];
const PALETTE = ['#315ac9', '#3db6a5', '#edab5c', '#8c83d4', '#dc729e', '#78a5bd', '#c48a68'];
const peso = (amount: number) => new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(amount);
const smallPeso = (amount: number) => new Intl.NumberFormat('en-PH', {
  notation: 'compact', maximumFractionDigits: 1,
}).format(amount);
function localISO(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
const EMPTY_ANNUAL = (year: number): FinancialSummary => ({
  year, month: null, totalIncome: 0, totalExpenses: 0, netBalance: 0, savingsRate: 0,
  expenseCategories: [], monthlyTotals: MONTHS.map((_, i) => ({ month: i + 1, income: 0, expenses: 0, balance: 0 })),
});

interface ModalProps {
  initial?: FinanceEntry | null;
  selectedMonth: number | null;
  year: number;
  onClose: () => void;
  onSave: (data: EntryPayload, id?: number) => Promise<void>;
}
function EntryModal({ initial, selectedMonth, year, onClose, onSave }: ModalProps) {
  const preferredMonth = selectedMonth ?? (year === new Date().getFullYear() ? new Date().getMonth() + 1 : 1);
  const preferredDay = localISO();
  const defaultDate = Number(preferredDay.slice(0, 4)) === year && Number(preferredDay.slice(5, 7)) === preferredMonth
    ? preferredDay : `${year}-${String(preferredMonth).padStart(2, '0')}-01`;
  const [date, setDate] = useState(initial?.date || defaultDate);
  const [type, setType] = useState<EntryType>(initial?.type || 'EXPENSE');
  const [category, setCategory] = useState(initial?.category || 'Bills');
  const [subcategory, setSubcategory] = useState(initial?.subcategory || 'Water');
  const [description, setDescription] = useState(initial?.description || '');
  const [amount, setAmount] = useState(initial?.amount?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const categoryOptions = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const customCategory = !categoryOptions.includes(category);
  const isBills = type === 'EXPENSE' && category === 'Bills';
  const customBill = isBills && !BILL_TYPES.includes(subcategory);

  useEffect(() => {
    function onEscape(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter an amount greater than zero with at most 2 decimal places.');
      return;
    }
    if (!category.trim() || !description.trim()) { setError('Please provide a category and description.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ date, type, category: category.trim(),
        subcategory: isBills ? subcategory.trim() || null : null,
        description: description.trim(), amount: numericAmount }, initial?.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save entry.');
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={initial ? 'Edit transaction' : 'Add transaction'}>
        <div className="modal-top">
          <div><p className="eyebrow">FINANCIAL RECORD</p><h2>{initial ? 'Edit transaction' : 'New transaction'}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </div>
        <form className="entry-form" onSubmit={submit}>
          <label>Transaction type</label>
          <div className="type-picker">
            <button type="button" className={type === 'INCOME' ? 'active income' : ''}
              onClick={() => { setType('INCOME'); setCategory('Salary'); setSubcategory(''); }}>
              <ArrowDownLeft size={17} /> Income
            </button>
            <button type="button" className={type === 'EXPENSE' ? 'active expense' : ''}
              onClick={() => { setType('EXPENSE'); setCategory('Bills'); setSubcategory('Water'); }}>
              <ArrowUpRight size={17} /> Expense
            </button>
          </div>
          <div className="form-grid">
            <div className="form-field"><label htmlFor="entry-date">Date</label>
              <input id="entry-date" type="date" value={date} min="1900-01-01" max="2200-12-31" required onChange={e => setDate(e.target.value)} /></div>
            <div className="form-field"><label htmlFor="entry-amount">Amount (PHP)</label>
              <input id="entry-amount" type="number" step="0.01" min="0.01" max="999999999999.99" placeholder="0.00" value={amount} required onChange={e => setAmount(e.target.value)} /></div>
          </div>
          <div className="form-field"><label htmlFor="entry-category">Category</label>
            <select id="entry-category" value={customCategory ? '_custom' : category}
              onChange={e => { setCategory(e.target.value === '_custom' ? '' : e.target.value); setSubcategory(e.target.value === 'Bills' ? 'Water' : ''); }}>
              {categoryOptions.map(item => <option key={item}>{item}</option>)}
              <option value="_custom">Custom category...</option>
            </select>
          </div>
          {customCategory && <div className="form-field"><label htmlFor="entry-custom-category">Custom category</label>
            <input id="entry-custom-category" value={category} maxLength={70} onChange={e => setCategory(e.target.value)} required placeholder="Enter a category" /></div>}
          {isBills && <div className="form-field"><label htmlFor="entry-subcategory">Bill type</label>
            <select id="entry-subcategory" value={customBill ? '_custom' : subcategory}
              onChange={e => setSubcategory(e.target.value === '_custom' ? '' : e.target.value)}>
              {BILL_TYPES.map(item => <option key={item}>{item}</option>)}
              <option value="_custom">Custom bill...</option>
            </select>
            {customBill && <input className="custom-bill" aria-label="Custom bill type" value={subcategory} maxLength={70} onChange={e => setSubcategory(e.target.value)} placeholder="Enter bill type" />}
          </div>}
          <div className="form-field"><label htmlFor="entry-description">Description</label>
            <input id="entry-description" value={description} maxLength={200} onChange={e => setDescription(e.target.value)} required placeholder="e.g. BOHECO monthly payment" /></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="button primary" disabled={saving}><Check size={17} /> {saving ? 'Saving...' : 'Save transaction'}</button></div>
        </form>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon, kind, sub }: {
  label: string; value: number | string; icon: ReactNode; kind: 'income' | 'expense' | 'balance' | 'neutral'; sub: string;
}) {
  return <div className={`stat-card ${kind}`}>
    <div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div>
    <strong>{typeof value === 'number' ? peso(value) : value}</strong>
    <span className="stat-note">{sub}</span>
  </div>;
}

function EmptyCard({ title, description }: { title: string; description: string }) {
  return <div className="empty-card"><div className="empty-symbol"><ReceiptText size={22} /></div>
    <strong>{title}</strong><span>{description}</span></div>;
}

export default function App() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(null);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [annual, setAnnual] = useState<FinancialSummary>(() => EMPTY_ANNUAL(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState('');
  const [toast, setToast] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | EntryType>('ALL');
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [items, overview] = await Promise.all([api.list(year), api.annual(year)]);
      setEntries(items); setAnnual(overview); setNetworkError('');
    } catch (err) {
      setNetworkError(err instanceof Error ? err.message : 'Could not connect to server.');
      setEntries([]); setAnnual(EMPTY_ANNUAL(year));
    } finally { setLoading(false); }
  }, [year]);
  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const monthEntries = useMemo(() => month === null ? entries : entries.filter(e => Number(e.date.slice(5, 7)) === month), [entries, month]);
  const monthlySummary: MonthSummary | null = month === null ? null :
    annual.monthlyTotals.find(m => m.month === month) || { month, income: 0, expenses: 0, balance: 0 };
  const categories = useMemo(() => {
    if (month === null) return annual.expenseCategories;
    const map = new Map<string, number>();
    for (const e of monthEntries) if (e.type === 'EXPENSE') map.set(e.category, (map.get(e.category) || 0) + Number(e.amount));
    return [...map].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
  }, [annual.expenseCategories, monthEntries, month]);
  const chartData = useMemo(() => annual.monthlyTotals.map((m) => ({
    name: SHORT_MONTHS[m.month - 1], income: Number(m.income), expenses: Number(m.expenses), balance: Number(m.balance),
  })), [annual.monthlyTotals]);
  const dailyChart = useMemo(() => {
    const days = new Map<number, { income: number; expenses: number }>();
    monthEntries.forEach(e => {
      const day = Number(e.date.slice(8, 10));
      const totals = days.get(day) || { income: 0, expenses: 0 };
      totals[e.type === 'INCOME' ? 'income' : 'expenses'] += Number(e.amount);
      days.set(day, totals);
    });
    return [...days].sort((a, b) => a[0] - b[0]).map(([day, v]) => ({ name: String(day), ...v }));
  }, [monthEntries]);
  const filtered = useMemo(() => monthEntries.filter(e =>
    (filterType === 'ALL' || e.type === filterType) &&
    `${e.description} ${e.category} ${e.subcategory || ''}`.toLowerCase().includes(search.trim().toLowerCase()),
  ), [monthEntries, filterType, search]);
  const activeName = month === null ? 'Annual overview' : `${MONTHS[month - 1]} overview`;
  const screenTitle = month === null ? 'Financial dashboard' : `${MONTHS[month - 1]} statement`;
  const currentIncome = month === null ? annual.totalIncome : Number(monthlySummary?.income || 0);
  const currentExpenses = month === null ? annual.totalExpenses : Number(monthlySummary?.expenses || 0);
  const currentBalance = month === null ? annual.netBalance : Number(monthlySummary?.balance || 0);
  const currentRate = currentIncome > 0 ? ((currentBalance / currentIncome) * 100).toFixed(1) + '%' : '0%';

  function navigate(value: number | null) {
    setMonth(value); setFilterType('ALL'); setSearch(''); setMenuOpen(false);
  }
  function startCreate() { setEditing(null); setModalOpen(true); }
  async function save(data: EntryPayload, id?: number) {
    if (id) await api.update(id, data);
    else await api.create(data);
    setModalOpen(false); setEditing(null);
    await reload();
    setToast(id ? 'Transaction updated.' : 'Transaction added successfully.');
  }
  async function remove(entry: FinanceEntry) {
    if (!window.confirm(`Delete "${entry.description}" (${peso(Number(entry.amount))})? This cannot be undone.`)) return;
    try { await api.remove(entry.id); await reload(); setToast('Transaction deleted.'); }
    catch (err) { setToast(err instanceof Error ? err.message : 'Unable to delete.'); }
  }
  async function download() {
    if (month === null) return;
    setDownloading(true);
    try { await api.downloadStatement(year, month); setToast(`${MONTHS[month - 1]} PDF downloaded.`); }
    catch (err) { setToast(err instanceof Error ? err.message : 'Unable to download PDF.'); }
    finally { setDownloading(false); }
  }

  return <div className="app-shell">
    {menuOpen && <button className="mobile-shade" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><BarChart3 size={23} strokeWidth={2.4} /></div>
        <div className="brand-words"><strong>CATURZA</strong><span>FINANCING STATEMENT</span></div></div>
      <p className="nav-caption">WORKSPACE</p>
      <button className={`nav-item ${month === null ? 'selected' : ''}`} onClick={() => navigate(null)}>
        <LayoutDashboard size={18} /><span>Dashboard</span><span className="nav-active-dot" />
      </button>
      <div className="nav-head"><p className="nav-caption">MONTHLY STATEMENTS</p><span>{year}</span></div>
      <nav className="month-nav" aria-label="Monthly statements">
        {MONTHS.map((name, i) => <button key={name} className={`nav-item ${month === i + 1 ? 'selected' : ''}`} onClick={() => navigate(i + 1)}>
          <CalendarDays size={17} /><span>{name}</span><span className="nav-active-dot" />
        </button>)}
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-year"><span>FINANCIAL YEAR</span><strong>{year}</strong></div>
        <div className="sidebar-footer"><Wallet size={16} /> Organized money, clearer decisions.</div></div>
    </aside>
    <div className="main-side">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <span className="breadcrumbs">Workspace <span>/</span> <strong>{activeName}</strong></span></div>
        <div className="topbar-right"><div className="year-control"><button onClick={() => setYear(v => Math.max(1900, v - 1))} aria-label="Previous year"><ArrowLeft size={16} /></button>
          <span>{year}</span><button onClick={() => setYear(v => Math.min(2200, v + 1))} aria-label="Next year"><ArrowRight size={16} /></button></div>
          <div className="top-avatar">CF</div>
        </div>
      </header>
      <main className="content">
        <div className="page-heading"><div><div className="kicker"><span className="kicker-dot" /> FINANCE MANAGEMENT / {year}</div>
          <h1>{screenTitle}</h1><p>{month === null ? 'A clear picture of your money across the entire year.' : `Track ${MONTHS[month - 1]} income, spending and available balance.`}</p></div>
          <div className="heading-actions">{month !== null && <button className="button outline" onClick={() => void download()} disabled={downloading}><Download size={17} /> {downloading ? 'Generating...' : 'Download PDF'}</button>}
            <button className="button primary" onClick={startCreate}><Plus size={18} /> Add transaction</button></div></div>
        {networkError && <div className="network-error" role="alert"><strong>Backend connection unavailable.</strong> {networkError}. Start the Spring Boot API on port 8080, then <button onClick={() => void reload()}>retry</button>.</div>}
        {loading && <div className="loading-line">Updating financial overview...</div>}
        <div className="stats-grid">
          <StatCard label={month === null ? 'Total annual income' : 'Total monthly income'} value={currentIncome} icon={<ArrowDownLeft size={19} />} kind="income" sub={month === null ? `January – December ${year}` : `Income received in ${MONTHS[month - 1]}`} />
          <StatCard label={month === null ? 'Total annual expenses' : 'Total monthly expenses'} value={currentExpenses} icon={<ArrowUpRight size={19} />} kind="expense" sub={month === null ? 'All spending categories' : `Spent during ${MONTHS[month - 1]}`} />
          <StatCard label={month === null ? 'Annual net balance' : 'Monthly remaining balance'} value={currentBalance} icon={<Wallet size={19} />} kind="balance" sub="Income minus expenses" />
          <StatCard label="Remaining income rate" value={currentRate} icon={<CircleDollarSign size={19} />} kind="neutral" sub={currentIncome <= 0 ? 'Add income to see your rate' : 'Net balance as % of income'} />
        </div>
        <div className="analytics-grid">
          <section className="panel trend-panel"><div className="panel-heading"><div><p className="eyebrow">FINANCIAL PERFORMANCE</p>
            <h2>{month === null ? 'Income vs. expenses' : 'Daily transaction activity'}</h2><p>{month === null ? 'Monthly comparison across the year' : `Dates with recorded activity in ${MONTHS[month - 1]}`}</p></div>
            <div className="panel-symbol"><TrendingUp size={18} /></div></div>
            {(month === null ? entries.length === 0 : monthEntries.length === 0) ? <EmptyCard title="No financial activity yet" description="Add your first transaction to populate this chart." /> :
              <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%">
                {month === null ? <BarChart data={chartData} barGap={5} margin={{ top: 12, right: 4, left: -14, bottom: 0 }}>
                  <CartesianGrid stroke="#eaf0f8" vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8b9aaf', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b9aaf', fontSize: 11 }} tickFormatter={smallPeso} />
                  <Tooltip formatter={(v) => peso(Number(v ?? 0))} cursor={{ fill: '#f3f6fb' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="income" name="Income" fill="#3764dc" radius={[5, 5, 0, 0]} maxBarSize={26} />
                  <Bar dataKey="expenses" name="Expenses" fill="#48b6ab" radius={[5, 5, 0, 0]} maxBarSize={26} />
                </BarChart> : <AreaChart data={dailyChart} margin={{ top: 12, right: 4, left: -14, bottom: 0 }}>
                  <defs><linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3869db" stopOpacity={0.22} /><stop offset="95%" stopColor="#3869db" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="#eaf0f8" vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8b9aaf', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b9aaf', fontSize: 11 }} tickFormatter={smallPeso} />
                  <Tooltip formatter={v => peso(Number(v ?? 0))} /><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="income" name="Income" stroke="#3764dc" fill="url(#colorIn)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#e99d62" fill="transparent" strokeWidth={2.5} />
                </AreaChart>}
              </ResponsiveContainer></div>}
          </section>
          <section className="panel category-panel"><div className="panel-heading"><div><p className="eyebrow">SPENDING INSIGHTS</p>
            <h2>Expense categories</h2><p>Where your money goes</p></div><div className="panel-symbol"><TrendingDown size={18} /></div></div>
            {categories.length === 0 ? <EmptyCard title="No categorized expenses" description="Expense breakdown will appear here." /> : <>
              <div className="donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart>
                <Pie data={categories} dataKey="total" nameKey="category" innerRadius={65} outerRadius={87} paddingAngle={3} stroke="none">
                  {categories.map((c, i) => <Cell key={c.category} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie><Tooltip formatter={v => peso(Number(v ?? 0))} /></PieChart></ResponsiveContainer>
                <div className="donut-center"><span>Total spent</span><strong>{peso(currentExpenses)}</strong></div>
              </div>
              <div className="category-list">{categories.map((c, i) => <div key={c.category} className="category-row"><div className="category-name"><i style={{ background: PALETTE[i % PALETTE.length] }} />{c.category}</div>
                <div className="category-value"><strong>{peso(Number(c.total))}</strong><span>{currentExpenses ? ((Number(c.total) / currentExpenses) * 100).toFixed(1) : '0'}%</span></div></div>)}</div>
            </>}
          </section>
        </div>
        {month === null ? <section className="panel month-overview"><div className="panel-heading"><div><p className="eyebrow">YEAR AT A GLANCE</p>
          <h2>Monthly breakdown</h2><p>Choose a month to view details and download its statement.</p></div></div>
          <div className="month-grid">{chartData.map((row, i) => <button key={row.name} className="month-tile" onClick={() => navigate(i + 1)}>
            <div className="month-tile-top"><span>{SHORT_MONTHS[i]}</span><ArrowUpRight size={16} /></div>
            <strong className={row.balance < 0 ? 'negative' : ''}>{peso(row.balance)}</strong>
            <span className="month-tile-sub">Income {peso(row.income)} · Expenses {peso(row.expenses)}</span>
          </button>)}</div>
        </section> : <div className="statement-hint"><FileText size={19} /><div><strong>Monthly PDF statement ready</strong>
          <span>Your file includes income entries, expense entries, categories and remaining balance for {MONTHS[month - 1]} {year}.</span></div>
          <button onClick={() => void download()} disabled={downloading}>Download <Download size={16} /></button></div>}
        <section className="panel transactions-panel"><div className="panel-heading transaction-head"><div><p className="eyebrow">RECORDS & HISTORY</p>
          <h2>{month === null ? 'Annual transactions' : `${MONTHS[month - 1]} transactions`}</h2><p>{monthEntries.length} recorded {monthEntries.length === 1 ? 'entry' : 'entries'}</p></div>
          <div className="filters"><div className="search-field"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records..." aria-label="Search transactions" /></div>
            <div className="select-wrapper"><select aria-label="Filter by type" value={filterType} onChange={e => setFilterType(e.target.value as 'ALL' | EntryType)}>
              <option value="ALL">All types</option><option value="INCOME">Income only</option><option value="EXPENSE">Expenses only</option></select><ChevronDown size={15} /></div>
          </div></div>
          {filtered.length === 0 ? <EmptyCard title={monthEntries.length ? 'No matching transactions' : 'No transactions recorded'} description={monthEntries.length ? 'Try changing your search or type filter.' : 'Add an income or expense to begin your financial record.'} /> :
            <div className="table-scroll"><table className="transactions-table"><thead><tr><th>DESCRIPTION</th><th>DATE</th><th>CATEGORY</th><th>TYPE</th><th className="right">AMOUNT</th><th className="right">ACTIONS</th></tr></thead><tbody>
              {filtered.map(e => <tr key={e.id}><td><div className="desc-cell"><span className={`entry-symbol ${e.type.toLowerCase()}`}>{e.type === 'INCOME' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span><strong>{e.description}</strong></div></td>
                <td className="muted-cell">{new Date(`${e.date}T12:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td><span className="category-pill">{e.category}{e.subcategory ? ` / ${e.subcategory}` : ''}</span></td>
                <td><span className={`type-pill ${e.type.toLowerCase()}`}>{e.type === 'INCOME' ? 'Income' : 'Expense'}</span></td>
                <td className={`right amount-cell ${e.type.toLowerCase()}`}>{e.type === 'INCOME' ? '+' : '−'}{peso(Number(e.amount))}</td>
                <td className="right"><div className="row-actions"><button title="Edit" aria-label={`Edit ${e.description}`} onClick={() => { setEditing(e); setModalOpen(true); }}><Pencil size={16} /></button>
                  <button title="Delete" aria-label={`Delete ${e.description}`} onClick={() => void remove(e)}><Trash2 size={16} /></button></div></td></tr>)}
              </tbody></table></div>}
        </section>
        <footer className="app-footer">Caturza Financing Statement <span>© {year} · Personal finance workspace</span></footer>
      </main>
    </div>
    {modalOpen && <EntryModal initial={editing} selectedMonth={month} year={year} onClose={() => setModalOpen(false)} onSave={save} />}
    {toast && <div className="toast" role="status"><Check size={16} />{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={14} /></button></div>}
  </div>;
}
