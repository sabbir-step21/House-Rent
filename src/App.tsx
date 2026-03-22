import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  LayoutDashboard,
  CreditCard,
  Plus,
  Trash2,
  Search,
  Download,
  Upload,
  Edit2,
  CheckCircle,
  XCircle,
  Phone,
  Home,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
  Calendar,
  Cloud,
  CloudOff,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface HouseCost {
  id: string;
  label: string;
  amount: number;
}

interface HouseCosts {
  caretaker: number;
  currentBill: number;
  gasBill: number;
  waterBill: number;
  tax: number;
  others: HouseCost[];
}

interface House {
  id: string;
  name: string;
  costs?: HouseCosts; // Legacy support
  monthlyCosts?: {
    [month: string]: HouseCosts;
  };
}

interface Tenant {
  id: string;
  houseId: string;
  flatNo: string;
  name?: string;
  phone?: string;
  rentAmount: number;
  securityAmount: number;
}

interface Payment {
  id: string;
  houseId: string;
  tenantId: string;
  month: string; // YYYY-MM
  rent: number;
  due: number;
  security: number;
  status: 'Paid' | 'Unpaid';
  datePaid?: string;
}

type View = 'dashboard' | 'tenants' | 'payments' | 'houses';
type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

// --- Server Sync Helpers ---

const API_URL = '/api/data';

async function fetchServerData(): Promise<{ houses: House[]; tenants: Tenant[]; payments: Payment[] } | null> {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function saveToServer(data: { houses?: House[]; tenants?: Tenant[]; payments?: Payment[] }): Promise<boolean> {
  try {
    const res = await fetch(API_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- App Component ---

export default function App() {
  // --- State ---
  const DEFAULT_HOUSES: House[] = [
    { id: 'h1', name: 'House 01', costs: { caretaker: 0, currentBill: 0, gasBill: 0, waterBill: 0, tax: 0, others: [] } },
    { id: 'h2', name: 'House 02', costs: { caretaker: 0, currentBill: 0, gasBill: 0, waterBill: 0, tax: 0, others: [] } },
    { id: 'h3', name: 'House 03', costs: { caretaker: 0, currentBill: 0, gasBill: 0, waterBill: 0, tax: 0, others: [] } },
  ];

  const [houses, setHouses] = useState<House[]>(DEFAULT_HOUSES);
  const [activeHouseId, setActiveHouseId] = useState<string>('h1');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [dashboardMonth, setDashboardMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
  const [dataLoaded, setDataLoaded] = useState(false);

  // Form States
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isHouseModalOpen, setIsHouseModalOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  // --- Persistence: Load from server first, fallback to localStorage ---
  useEffect(() => {
    async function loadData() {
      setSyncStatus('syncing');

      // Try to load from server
      const serverData = await fetchServerData();

      if (serverData) {
        setHouses(serverData.houses.length > 0 ? serverData.houses : DEFAULT_HOUSES);
        setTenants(serverData.tenants);
        setPayments(serverData.payments);
        // Cache locally
        localStorage.setItem('rm_houses', JSON.stringify(serverData.houses));
        localStorage.setItem('rm_tenants', JSON.stringify(serverData.tenants));
        localStorage.setItem('rm_payments', JSON.stringify(serverData.payments));
        setSyncStatus('synced');
      } else {
        // Fallback to localStorage when offline
        const savedHouses = localStorage.getItem('rm_houses');
        const savedTenants = localStorage.getItem('rm_tenants');
        const savedPayments = localStorage.getItem('rm_payments');
        if (savedHouses) setHouses(JSON.parse(savedHouses));
        if (savedTenants) setTenants(JSON.parse(savedTenants));
        if (savedPayments) setPayments(JSON.parse(savedPayments));
        setSyncStatus('offline');
      }

      // These are local-only preferences
      const savedActiveHouse = localStorage.getItem('rm_active_house');
      const savedDashboardMonth = localStorage.getItem('rm_dashboard_month');
      if (savedActiveHouse) setActiveHouseId(savedActiveHouse);
      if (savedDashboardMonth) setDashboardMonth(savedDashboardMonth);

      setDataLoaded(true);
    }
    loadData();
  }, []);

  // --- Sync to server + localStorage on data changes ---
  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem('rm_houses', JSON.stringify(houses));
    setSyncStatus('syncing');
    saveToServer({ houses }).then(ok => setSyncStatus(ok ? 'synced' : 'error'));
  }, [houses, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem('rm_tenants', JSON.stringify(tenants));
    setSyncStatus('syncing');
    saveToServer({ tenants }).then(ok => setSyncStatus(ok ? 'synced' : 'error'));
  }, [tenants, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem('rm_payments', JSON.stringify(payments));
    setSyncStatus('syncing');
    saveToServer({ payments }).then(ok => setSyncStatus(ok ? 'synced' : 'error'));
  }, [payments, dataLoaded]);

  // Local-only preferences (no server sync needed)
  useEffect(() => {
    localStorage.setItem('rm_active_house', activeHouseId);
  }, [activeHouseId]);

  useEffect(() => {
    localStorage.setItem('rm_dashboard_month', dashboardMonth);
  }, [dashboardMonth]);

  // Manual refresh from server
  const refreshFromServer = async () => {
    setSyncStatus('syncing');
    const serverData = await fetchServerData();
    if (serverData) {
      setHouses(serverData.houses.length > 0 ? serverData.houses : DEFAULT_HOUSES);
      setTenants(serverData.tenants);
      setPayments(serverData.payments);
      setSyncStatus('synced');
    } else {
      setSyncStatus('error');
    }
  };

  useEffect(() => {
    if (houses.length > 0 && !houses.find(h => h.id === activeHouseId)) {
      setActiveHouseId(houses[0].id);
    }
  }, [houses, activeHouseId]);

  // --- Filtered Data for Active House ---
  const activeTenants = useMemo(() => 
    tenants.filter(t => t.houseId === activeHouseId), 
  [tenants, activeHouseId]);

  const activePayments = useMemo(() => 
    payments.filter(p => p.houseId === activeHouseId), 
  [payments, activeHouseId]);

  // --- Calculations ---
  const stats = useMemo(() => {
    const houseStats = houses.map(house => {
      const hTenants = tenants.filter(t => t.houseId === house.id);
      const hPayments = payments.filter(p => p.houseId === house.id && p.month === dashboardMonth);
      const collected = hPayments.reduce((acc, curr) => acc + (curr.rent || 0) + (curr.security || 0), 0);
      const pending = hPayments.reduce((acc, curr) => acc + curr.due, 0);
      
      const monthlyCosts = house.monthlyCosts?.[dashboardMonth] || (dashboardMonth === new Date().toISOString().slice(0, 7) ? house.costs : null);
      
      const totalCost = monthlyCosts ? (
        monthlyCosts.caretaker + 
        monthlyCosts.currentBill + 
        monthlyCosts.gasBill + 
        monthlyCosts.waterBill + 
        monthlyCosts.tax + 
        monthlyCosts.others.reduce((acc, curr) => acc + curr.amount, 0)
      ) : 0;

      return {
        ...house,
        collected,
        pending,
        totalCost,
        netProfit: collected - totalCost,
        totalTenants: hTenants.length
      };
    });

    const totalCollected = houseStats.reduce((acc, curr) => acc + curr.collected, 0);
    const totalPending = houseStats.reduce((acc, curr) => acc + curr.pending, 0);
    const totalCosts = houseStats.reduce((acc, curr) => acc + curr.totalCost, 0);
    const totalNet = totalCollected - totalCosts;

    return { totalCollected, totalPending, totalCosts, totalNet, houseStats };
  }, [houses, tenants, payments, dashboardMonth]);

  const calculatePreviousDue = (tenantId: string, currentMonth: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return 0;

    const previousPayments = payments
      .filter(p => p.tenantId === tenantId && p.month < currentMonth)
      .sort((a, b) => b.month.localeCompare(a.month));
    
    if (previousPayments.length === 0) return 0;

    const lastPayment = previousPayments[0];
    const [lastYear, lastMonthNum] = lastPayment.month.split('-').map(Number);
    const [currYear, currMonthNum] = currentMonth.split('-').map(Number);
    const monthsDiff = (currYear - lastYear) * 12 + (currMonthNum - lastMonthNum);
    
    // Carry over the last balance + any skipped months' full rent
    const skippedMonthsRent = Math.max(0, monthsDiff - 1) * tenant.rentAmount;
    return lastPayment.due + skippedMonthsRent;
  };

  const activeHouse = useMemo(() => 
    houses.find(h => h.id === activeHouseId) || houses[0], 
  [houses, activeHouseId]);

  const filteredTenants = useMemo(() => {
    return activeTenants.filter(t => 
      t.flatNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.name && t.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [activeTenants, searchTerm]);

  // --- Handlers ---
  const addTenant = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTenant: Tenant = {
      id: editingTenant?.id || crypto.randomUUID(),
      houseId: activeHouseId,
      flatNo: formData.get('flatNo') as string,
      name: (formData.get('name') as string) || '',
      phone: (formData.get('phone') as string) || '',
      rentAmount: Number(formData.get('rentAmount')),
      securityAmount: Number(formData.get('securityAmount')),
    };

    if (editingTenant) {
      setTenants(tenants.map(t => t.id === editingTenant.id ? newTenant : t));
    } else {
      setTenants([...tenants, newTenant]);
    }
    setIsTenantModalOpen(false);
    setEditingTenant(null);
  };

  const handleHouseSubmit = (houseData: Omit<House, 'id'>) => {
    if (editingHouse) {
      setHouses(houses.map(h => h.id === editingHouse.id ? { ...h, ...houseData } : h));
    } else {
      const newHouse: House = {
        id: crypto.randomUUID(),
        ...houseData,
      };
      setHouses([...houses, newHouse]);
      setActiveHouseId(newHouse.id);
    }
    setIsHouseModalOpen(false);
    setEditingHouse(null);
  };

  const deleteHouse = (id: string) => {
    if (houses.length <= 1) {
      setConfirmModal({
        isOpen: true,
        title: 'Cannot Delete',
        message: 'You must have at least one house.',
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Delete House',
      message: 'Are you sure? This will delete all tenants and payments for this house.',
      onConfirm: () => {
        setHouses(houses.filter(h => h.id !== id));
        setTenants(tenants.filter(t => t.houseId !== id));
        setPayments(payments.filter(p => p.houseId !== id));
        if (activeHouseId === id) {
          setActiveHouseId(houses.find(h => h.id !== id)?.id || '');
        }
        setConfirmModal(null);
      }
    });
  };

  const deleteTenant = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Tenant',
      message: 'Are you sure? This will also delete their payment history.',
      onConfirm: () => {
        setTenants(tenants.filter(t => t.id !== id));
        setPayments(payments.filter(p => p.tenantId !== id));
        setConfirmModal(null);
      }
    });
  };

  const addPayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const tenantId = formData.get('tenantId') as string;
    const month = formData.get('month') as string;
    
    // Check if payment already exists for this month (only if not editing)
    if (!editingPayment) {
      const existing = payments.find(p => p.tenantId === tenantId && p.month === month);
      if (existing) {
        alert('Payment record already exists for this month. Please update the existing record.');
        return;
      }
    }

    const paymentData: Partial<Payment> = {
      houseId: activeHouseId,
      tenantId,
      month,
      rent: Number(formData.get('rent')),
      due: Number(formData.get('due')),
      security: Number(formData.get('security')),
      status: formData.get('status') as 'Paid' | 'Unpaid',
      datePaid: formData.get('datePaid') as string || new Date().toISOString().split('T')[0],
    };

    if (editingPayment) {
      setPayments(payments.map(p => p.id === editingPayment.id ? { ...p, ...paymentData } : p));
    } else {
      const newPayment: Payment = {
        id: crypto.randomUUID(),
        ...paymentData as Omit<Payment, 'id'>
      };
      setPayments([...payments, newPayment]);
    }
    
    setIsPaymentModalOpen(false);
    setEditingPayment(null);
  };

  const deletePayment = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Payment',
      message: 'Are you sure you want to delete this payment record? This action cannot be undone.',
      onConfirm: () => {
        setPayments(payments.filter(p => p.id !== id));
        setConfirmModal(null);
      }
    });
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const val = row[header];
          return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTenantPayments = (tenant: Tenant) => {
    const tenantPayments = payments
      .filter(p => p.tenantId === tenant.id)
      .sort((a, b) => b.month.localeCompare(a.month))
      .map(p => ({
        Flat: tenant.flatNo,
        Tenant: tenant.name || 'N/A',
        Month: p.month,
        Rent: p.rent,
        Security: p.security || 0,
        Due: p.due,
        Total: p.rent + (p.security || 0),
        Status: p.status,
        DatePaid: p.datePaid || 'N/A'
      }));
    
    downloadCSV(tenantPayments, `Payments_Tenant_${tenant.flatNo}_${new Date().toISOString().split('T')[0]}`);
  };

  const exportHousePayments = () => {
    const house = houses.find(h => h.id === activeHouseId);
    const housePayments = activePayments
      .sort((a, b) => b.month.localeCompare(a.month))
      .map(p => {
        const tenant = tenants.find(t => t.id === p.tenantId);
        return {
          House: house?.name || 'N/A',
          Flat: tenant?.flatNo || 'N/A',
          Tenant: tenant?.name || 'N/A',
          Month: p.month,
          Rent: p.rent,
          Security: p.security || 0,
          Due: p.due,
          Total: p.rent + (p.security || 0),
          Status: p.status,
          DatePaid: p.datePaid || 'N/A'
        };
      });
    
    downloadCSV(housePayments, `Payments_House_${house?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`);
  };

  const exportDashboardMonthPayments = () => {
    const monthPayments = payments
      .filter(p => p.month === dashboardMonth)
      .map(p => {
        const tenant = tenants.find(t => t.id === p.tenantId);
        const house = houses.find(h => h.id === p.houseId);
        return {
          House: house?.name || 'N/A',
          Flat: tenant?.flatNo || 'N/A',
          Tenant: tenant?.name || 'N/A',
          Month: p.month,
          Rent: p.rent,
          Security: p.security || 0,
          Due: p.due,
          Total: p.rent + (p.security || 0),
          Status: p.status,
          DatePaid: p.datePaid || 'N/A'
        };
      });
    
    downloadCSV(monthPayments, `Monthly_Payments_${dashboardMonth}_${new Date().toISOString().split('T')[0]}`);
  };

  const togglePaymentStatus = (id: string) => {
    setPayments(payments.map(p => {
      if (p.id === id) {
        const newStatus = p.status === 'Paid' ? 'Unpaid' : 'Paid';
        return { 
          ...p, 
          status: newStatus,
          datePaid: newStatus === 'Paid' ? new Date().toISOString().split('T')[0] : undefined
        };
      }
      return p;
    }));
  };

  const exportData = () => {
    const data = { houses, tenants, payments };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rentmaster_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.tenants && data.payments) {
          if (data.houses) setHouses(data.houses);
          setTenants(data.tenants);
          setPayments(data.payments);
          alert('Data imported successfully!');
        }
      } catch (err) {
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };

  // --- UI Components ---

  const NavItem = ({ icon: Icon, label, view }: { icon: any, label: string, view: View }) => (
    <button
      onClick={() => { setActiveView(view); setIsSidebarOpen(false); }}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${
        activeView === view 
          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
      {activeView === view && <motion.div layoutId="active" className="ml-auto"><ChevronRight size={16} /></motion.div>}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Mobile Menu Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 right-0 z-40 w-64 bg-white border-l border-slate-200 p-6 transition-transform lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Home size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">RentMaster</h1>
        </div>

        <div className="mb-6 px-2">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Select House</label>
            <button 
              onClick={() => { setEditingHouse(null); setIsHouseModalOpen(true); }}
              className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-md transition-colors"
              title="Add New House"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="space-y-1">
            {houses.map(house => (
              <div key={house.id} className="group relative flex items-center gap-2">
                <button
                  onClick={() => { setActiveHouseId(house.id); setIsSidebarOpen(false); }}
                  className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-lg text-sm transition-all ${
                    activeHouseId === house.id 
                      ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-100' 
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${activeHouseId === house.id ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="truncate">{house.name}</span>
                </button>
                <div className="absolute right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-inherit">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingHouse(house); setIsHouseModalOpen(true); }}
                    className="p-1 text-slate-400 hover:text-emerald-500"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteHouse(house.id); }}
                    className="p-1 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <nav className="space-y-2">
          <NavItem icon={LayoutDashboard} label="Dashboard" view="dashboard" />
          <NavItem icon={Home} label="Houses" view="houses" />
          <NavItem icon={Users} label="Tenants" view="tenants" />
          <NavItem icon={CreditCard} label="Payments" view="payments" />
        </nav>

        <div className="absolute bottom-6 left-6 right-6 space-y-2">
          {/* Cloud Sync Status */}
          <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-slate-50 border border-slate-100 mb-2">
            <div className="flex items-center gap-2 text-sm">
              {syncStatus === 'synced' && <><Cloud size={16} className="text-emerald-500" /><span className="text-emerald-600 font-medium">Synced</span></>}
              {syncStatus === 'syncing' && <><Loader2 size={16} className="text-blue-500 animate-spin" /><span className="text-blue-600 font-medium">Syncing...</span></>}
              {syncStatus === 'error' && <><CloudOff size={16} className="text-rose-500" /><span className="text-rose-600 font-medium">Sync Error</span></>}
              {syncStatus === 'offline' && <><CloudOff size={16} className="text-amber-500" /><span className="text-amber-600 font-medium">Offline</span></>}
            </div>
            <button
              onClick={refreshFromServer}
              className="p-1 text-slate-400 hover:text-emerald-500 rounded-md transition-colors"
              title="Refresh from server"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <button
            onClick={exportData}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Download size={16} /> Export Backup
          </button>
          <label className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
            <Upload size={16} /> Import Backup
            <input type="file" className="hidden" onChange={importData} accept=".json" />
          </label>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:mr-64 p-4 lg:p-8 max-w-7xl mx-auto w-full">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-2xl font-bold capitalize">{activeView}</h2>
              <p className="text-slate-500 text-sm flex items-center gap-2">
                {activeView === 'dashboard' || activeView === 'houses' 
                  ? 'Manage your property efficiently' 
                  : (
                    <>
                      Managing {houses.find(h => h.id === activeHouseId)?.name || 'House'}
                      <button 
                        onClick={() => { 
                          const house = houses.find(h => h.id === activeHouseId);
                          if (house) {
                            setEditingHouse(house);
                            setIsHouseModalOpen(true);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-md transition-colors"
                        title="Edit House Name"
                      >
                        <Edit2 size={12} />
                      </button>
                    </>
                  )}
              </p>
            </div>
          </div>
          
          {activeView === 'tenants' && (
            <button 
              onClick={() => { setEditingTenant(null); setIsTenantModalOpen(true); }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all"
            >
              <Plus size={20} /> Add Tenant
            </button>
          )}
          {activeView === 'houses' && (
            <button 
              onClick={() => { setEditingHouse(null); setIsHouseModalOpen(true); }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all"
            >
              <Plus size={20} /> Add House
            </button>
          )}
          {activeView === 'payments' && (
            <button 
              onClick={() => setIsPaymentModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all"
            >
              <Plus size={20} /> Record Payment
            </button>
          )}
        </header>

        <AnimatePresence mode="wait">
          {activeView === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Dashboard Month Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Monthly Overview</h3>
                    <p className="text-xs text-slate-500">Viewing stats for {new Date(dashboardMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={exportDashboardMonthPayments}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all text-sm font-medium shadow-sm mr-2"
                    title="Download Monthly CSV"
                  >
                    <Download size={16} />
                  </button>
                  <label className="text-sm font-medium text-slate-600">Change Month:</label>
                  <input 
                    type="month" 
                    value={dashboardMonth}
                    onChange={(e) => setDashboardMonth(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                  />
                </div>
              </div>

              {/* Global Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <div className="bg-emerald-600 p-5 lg:p-6 rounded-2xl shadow-lg shadow-emerald-100 text-white">
                  <p className="text-emerald-100 text-xs lg:text-sm font-medium mb-1">Total Collected</p>
                  <h3 className="text-xl lg:text-2xl font-bold">{stats.totalCollected.toLocaleString()} BDT</h3>
                  <p className="text-[10px] lg:text-xs text-emerald-200 mt-2">{new Date(dashboardMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="bg-white p-5 lg:p-6 rounded-2xl shadow-sm border border-slate-100">
                  <p className="text-slate-500 text-xs lg:text-sm font-medium mb-1">Total Pending</p>
                  <h3 className="text-xl lg:text-2xl font-bold text-rose-500">{stats.totalPending.toLocaleString()} BDT</h3>
                  <p className="text-[10px] lg:text-xs text-slate-400 mt-2">{new Date(dashboardMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="bg-white p-5 lg:p-6 rounded-2xl shadow-sm border border-slate-100">
                  <p className="text-slate-500 text-xs lg:text-sm font-medium mb-1">Total Costs</p>
                  <h3 className="text-xl lg:text-2xl font-bold text-slate-800">{stats.totalCosts.toLocaleString()} BDT</h3>
                  <p className="text-[10px] lg:text-xs text-slate-400 mt-2">Monthly Expenses</p>
                </div>
                <div className="bg-emerald-50 p-5 lg:p-6 rounded-2xl shadow-sm border border-emerald-100">
                  <p className="text-emerald-600 text-xs lg:text-sm font-medium mb-1">Total Net</p>
                  <h3 className="text-xl lg:text-2xl font-bold text-emerald-700">{stats.totalNet.toLocaleString()} BDT</h3>
                  <p className="text-[10px] lg:text-xs text-emerald-500 mt-2">Profit/Loss</p>
                </div>
              </div>

              {/* Per House Breakdown */}
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Home size={20} className="text-emerald-500" />
                  House-wise Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {stats.houseStats.map(h => (
                    <div 
                      key={h.id} 
                      onClick={() => setActiveHouseId(h.id)}
                      className={`bg-white p-6 rounded-2xl shadow-sm border transition-all cursor-pointer group ${
                        activeHouseId === h.id ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-100 hover:border-emerald-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-bold text-lg group-hover:text-emerald-600 transition-colors">{h.name}</h4>
                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          activeHouseId === h.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {activeHouseId === h.id ? 'Active' : 'Select'}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Collected</span>
                          <span className="font-bold text-emerald-600">{h.collected.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Pending</span>
                          <span className="font-bold text-rose-500">{h.pending.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Monthly Cost</span>
                          <span className="font-bold text-slate-800">{h.totalCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-50">
                          <span className="text-slate-900 font-bold">Total (Net)</span>
                          <span className={`font-bold ${h.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {h.netProfit.toLocaleString()} BDT
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Tenants</span>
                          <span className="font-bold text-slate-800">{h.totalTenants}</span>
                        </div>
                        <div className="pt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500" 
                            style={{ width: `${(h.collected / (h.collected + h.pending || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active House Costs */}
              {activeHouse && (
                <div className="mt-8">
                  {(() => {
                    const monthlyCosts = activeHouse.monthlyCosts?.[dashboardMonth] || (dashboardMonth === new Date().toISOString().slice(0, 7) ? activeHouse.costs : null);
                    
                    if (!monthlyCosts) {
                      return (
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
                            <CreditCard size={32} />
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 mb-1">No Cost Data for {new Date(dashboardMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                          <p className="text-slate-500 mb-6">You haven't recorded any costs for this house in the selected month.</p>
                          <button 
                            onClick={() => { setEditingHouse(activeHouse); setIsHouseModalOpen(true); }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold transition-all"
                          >
                            Record Costs
                          </button>
                        </div>
                      );
                    }

                    return (
                      <>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-bold flex items-center gap-2">
                            <CreditCard size={20} className="text-emerald-500" />
                            Monthly Costs: {activeHouse.name}
                          </h3>
                          <button 
                            onClick={() => { setEditingHouse(activeHouse); setIsHouseModalOpen(true); }}
                            className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-lg transition-colors"
                          >
                            <Edit2 size={14} /> Edit Costs
                          </button>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                            <div className="space-y-1">
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Caretaker</p>
                              <p className="text-lg font-bold text-slate-800">{monthlyCosts.caretaker.toLocaleString()}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Current Bill</p>
                              <p className="text-lg font-bold text-slate-800">{monthlyCosts.currentBill.toLocaleString()}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Gas Bill</p>
                              <p className="text-lg font-bold text-slate-800">{monthlyCosts.gasBill.toLocaleString()}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Water Bill</p>
                              <p className="text-lg font-bold text-slate-800">{monthlyCosts.waterBill.toLocaleString()}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Corp-Tax</p>
                              <p className="text-lg font-bold text-slate-800">{monthlyCosts.tax.toLocaleString()}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">Total Costs</p>
                              <p className="text-lg font-bold text-emerald-700">
                                {(
                                  monthlyCosts.caretaker + 
                                  monthlyCosts.currentBill + 
                                  monthlyCosts.gasBill + 
                                  monthlyCosts.waterBill + 
                                  monthlyCosts.tax + 
                                  monthlyCosts.others.reduce((acc, curr) => acc + curr.amount, 0)
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          
                          {monthlyCosts.others.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-slate-50">
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-3">Other Costs</p>
                              <div className="flex flex-wrap gap-4">
                                {monthlyCosts.others.map(other => (
                                  <div key={other.id} className="bg-slate-50 px-3 py-2 rounded-xl flex items-center gap-3 border border-slate-100">
                                    <span className="text-sm text-slate-600">{other.label}</span>
                                    <span className="text-sm font-bold text-slate-800">{other.amount.toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </motion.div>
          )}

          {activeView === 'houses' && (
            <motion.div 
              key="houses"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Houses Month Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Monthly Costs View</h3>
                    <p className="text-xs text-slate-500">Viewing costs for {new Date(dashboardMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-600">Change Month:</label>
                  <input 
                    type="month" 
                    value={dashboardMonth}
                    onChange={(e) => setDashboardMonth(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {houses.map(house => {
                  const monthlyCosts = house.monthlyCosts?.[dashboardMonth] || (dashboardMonth === new Date().toISOString().slice(0, 7) ? house.costs : null);
                  const totalCost = monthlyCosts ? (
                    monthlyCosts.caretaker + 
                    monthlyCosts.currentBill + 
                    monthlyCosts.gasBill + 
                    monthlyCosts.waterBill + 
                    monthlyCosts.tax + 
                    monthlyCosts.others.reduce((acc, curr) => acc + curr.amount, 0)
                  ) : 0;

                  return (
                    <div key={house.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-emerald-200 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                          <Home size={24} />
                        </div>
                        <div className="flex gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { setEditingHouse(house); setIsHouseModalOpen(true); }}
                            className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => deleteHouse(house.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-bold text-xl mb-2">{house.name}</h4>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-4">
                        <div className="flex items-center gap-1">
                          <Users size={14} /> {tenants.filter(t => t.houseId === house.id).length} Tenants
                        </div>
                        <div className="flex items-center gap-1 font-medium text-slate-500">
                          <CreditCard size={14} /> 
                          {totalCost.toLocaleString()} BDT Cost
                        </div>
                      </div>

                      {monthlyCosts && (
                        <div className="pt-4 border-t border-slate-100 space-y-3">
                          <div className="flex justify-between items-center">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Monthly Costs</p>
                            <button 
                              onClick={() => { setEditingHouse(house); setIsHouseModalOpen(true); }}
                              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider flex items-center gap-1"
                            >
                              <Edit2 size={10} /> Edit
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Caretaker</span>
                              <span className="font-semibold">{monthlyCosts.caretaker.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Bills</span>
                              <span className="font-semibold">
                                {(monthlyCosts.currentBill + monthlyCosts.gasBill + monthlyCosts.waterBill).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Tax</span>
                              <span className="font-semibold">{monthlyCosts.tax.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-50 pt-1">
                              <span className="text-emerald-600 font-bold">Total</span>
                              <span className="font-bold text-emerald-600">
                                {totalCost.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeView === 'tenants' && (
            <motion.div 
              key="tenants"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search by Flat No or Name..."
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTenants.map(tenant => (
                  <div key={tenant.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-emerald-200 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-emerald-600 font-bold">
                        {tenant.flatNo}
                      </div>
                      <div className="flex gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => exportTenantPayments(tenant)}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                          title="Download Payment History"
                        >
                          <Download size={16} />
                        </button>
                        <button 
                          onClick={() => { setEditingTenant(tenant); setIsTenantModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => deleteTenant(tenant.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-bold text-lg">{tenant.name || 'No Name'}</h4>
                    <div className="mt-3 space-y-2 text-sm text-slate-500">
                      {tenant.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} /> {tenant.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <CreditCard size={14} /> {tenant.rentAmount.toLocaleString()} BDT / month
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={14} /> Security: {tenant.securityAmount?.toLocaleString() || 0} BDT
                      </div>
                    </div>
                  </div>
                ))}
                {filteredTenants.length === 0 && (
                  <div className="col-span-full py-20 text-center text-slate-400">
                    No tenants found. Add your first tenant to get started!
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeView === 'payments' && (
            <motion.div 
              key="payments"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Payment Records</h3>
                <button 
                  onClick={exportHousePayments}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all text-sm font-medium shadow-sm"
                >
                  <Download size={16} /> Export CSV
                </button>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-semibold">Tenant</th>
                        <th className="px-6 py-4 font-semibold">Month</th>
                        <th className="px-6 py-4 font-semibold">Amount</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activePayments.sort((a, b) => b.month.localeCompare(a.month)).map(payment => {
                        const tenant = tenants.find(t => t.id === payment.tenantId);
                        return (
                          <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">Flat {tenant?.flatNo}</div>
                              <div className="text-xs text-slate-500">{tenant?.name || 'No Name'}</div>
                            </td>
                            <td className="px-6 py-4 text-sm font-mono">
                              <div className="font-bold">
                                {(() => {
                                  const [year, month] = payment.month.split('-');
                                  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                                  return `${months[parseInt(month) - 1]}-${year.slice(-2)}`;
                                })()}
                              </div>
                              <div className="text-[10px] text-slate-400">{payment.datePaid}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-emerald-600 text-base">{(payment.rent + (payment.security || 0)).toLocaleString()} BDT</div>
                              <div className="flex flex-col gap-0.5 mt-1">
                                <div className={`text-sm font-bold ${payment.due > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                  Due: {payment.due.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase font-medium tracking-tight">
                                  Payable: {(payment.rent + payment.due).toLocaleString()}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                                payment.status === 'Paid' 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-rose-100 text-rose-700'
                              }`}>
                                {payment.status === 'Paid' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                {payment.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => togglePaymentStatus(payment.id)}
                                  className="text-emerald-600 hover:text-emerald-700 text-xs font-bold uppercase tracking-wider"
                                >
                                  {payment.status === 'Paid' ? 'Unpaid' : 'Paid'}
                                </button>
                                <button 
                                  onClick={() => { setEditingPayment(payment); setIsPaymentModalOpen(true); }}
                                  className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Edit Payment"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  onClick={() => deletePayment(payment.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete Payment"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {activePayments.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                            No payment records found for this house.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {activePayments.sort((a, b) => b.month.localeCompare(a.month)).map(payment => {
                  const tenant = tenants.find(t => t.id === payment.tenantId);
                  return (
                    <div key={payment.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-slate-900">Flat {tenant?.flatNo}</div>
                          <div className="text-xs text-slate-500">{tenant?.name || 'No Name'}</div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          payment.status === 'Paid' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {payment.status === 'Paid' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {payment.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Month</p>
                          <p className="text-sm font-bold">
                            {(() => {
                              const [year, month] = payment.month.split('-');
                              const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                              return `${months[parseInt(month) - 1]}-${year.slice(-2)}`;
                            })()}
                          </p>
                          <p className="text-[10px] text-slate-400">{payment.datePaid}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Amount Paid</p>
                          <p className="text-sm font-bold text-emerald-600">{(payment.rent + (payment.security || 0)).toLocaleString()} BDT</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Due Balance</p>
                          <p className={`text-sm font-bold ${payment.due > 0 ? 'text-rose-600' : 'text-slate-500'}`}>{payment.due.toLocaleString()} BDT</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Payable</p>
                          <p className="text-sm font-bold text-slate-800">{(payment.rent + payment.due).toLocaleString()} BDT</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-50">
                        <button 
                          onClick={() => togglePaymentStatus(payment.id)}
                          className="flex-1 py-2 bg-slate-50 text-emerald-600 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-colors uppercase tracking-wider"
                        >
                          {payment.status === 'Paid' ? 'Unpaid' : 'Paid'}
                        </button>
                        <button 
                          onClick={() => { setEditingPayment(payment); setIsPaymentModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl border border-slate-100 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => deletePayment(payment.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl border border-slate-100 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {activePayments.length === 0 && (
                  <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">
                    No payment records found.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isTenantModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 my-auto"
            >
              <h3 className="text-xl font-bold mb-6">{editingTenant ? 'Edit Tenant' : 'Add New Tenant'}</h3>
              <form onSubmit={addTenant} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Flat Number</label>
                  <input name="flatNo" defaultValue={editingTenant?.flatNo} required className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. A-101" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name (Optional)</label>
                  <input name="name" defaultValue={editingTenant?.name} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number (Optional)</label>
                  <input name="phone" defaultValue={editingTenant?.phone} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="+1 234 567 890" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Rent Amount</label>
                  <input 
                    name="rentAmount" 
                    type="number" 
                    defaultValue={editingTenant?.rentAmount} 
                    onFocus={(e) => e.target.select()}
                    required 
                    className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" 
                    placeholder="1200" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Security Amount</label>
                  <input 
                    name="securityAmount" 
                    type="number" 
                    defaultValue={editingTenant?.securityAmount} 
                    onFocus={(e) => e.target.select()}
                    required 
                    className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" 
                    placeholder="5000" 
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsTenantModalOpen(false)} className="flex-1 px-4 py-2 border rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors">Save Tenant</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isHouseModalOpen && (
          <HouseModal 
            editingHouse={editingHouse} 
            onClose={() => { setIsHouseModalOpen(false); setEditingHouse(null); }} 
            onSubmit={handleHouseSubmit} 
          />
        )}

        {isPaymentModalOpen && (
          <PaymentModal 
            tenants={activeTenants} 
            editingPayment={editingPayment}
            onClose={() => { setIsPaymentModalOpen(false); setEditingPayment(null); }} 
            onSubmit={addPayment}
            calculatePreviousDue={calculatePreviousDue}
          />
        )}
        {confirmModal?.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 my-auto"
            >
              <h3 className="text-xl font-bold mb-2">{confirmModal.title}</h3>
              <p className="text-slate-600 mb-6">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(null)} 
                  className="flex-1 px-4 py-2 border rounded-xl hover:bg-slate-50 transition-colors"
                >
                  {confirmModal.title === 'Cannot Delete' ? 'Close' : 'Cancel'}
                </button>
                {confirmModal.title !== 'Cannot Delete' && (
                  <button 
                    onClick={confirmModal.onConfirm} 
                    className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors"
                  >
                    Confirm
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HouseModal({ 
  editingHouse, 
  onClose, 
  onSubmit 
}: { 
  editingHouse: House | null, 
  onClose: () => void, 
  onSubmit: (houseData: Omit<House, 'id'>) => void 
}) {
  const [name, setName] = useState(editingHouse?.name || '');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  // Initialize costs from selected month or defaults
  const getInitialCosts = (month: string) => {
    const monthlyCosts = editingHouse?.monthlyCosts?.[month];
    if (monthlyCosts) return monthlyCosts;
    
    // Fallback to legacy costs if it's the current month and no monthly costs exist
    if (month === new Date().toISOString().slice(0, 7) && editingHouse?.costs) {
      return editingHouse.costs;
    }

    return {
      caretaker: 0,
      currentBill: 0,
      gasBill: 0,
      waterBill: 0,
      tax: 0,
      others: []
    };
  };

  const [costs, setCosts] = useState<HouseCosts>(getInitialCosts(selectedMonth));

  useEffect(() => {
    setCosts(getInitialCosts(selectedMonth));
  }, [selectedMonth, editingHouse]);

  const handleAddOther = () => {
    setCosts({ ...costs, others: [...costs.others, { id: crypto.randomUUID(), label: 'Other', amount: 0 }] });
  };

  const handleRemoveOther = (id: string) => {
    setCosts({ ...costs, others: costs.others.filter(o => o.id !== id) });
  };

  const handleClearMonthlyData = () => {
    setCosts({
      caretaker: 0,
      currentBill: 0,
      gasBill: 0,
      waterBill: 0,
      tax: 0,
      others: []
    });
  };

  const handleOtherChange = (id: string, field: 'label' | 'amount', value: string | number) => {
    setCosts({ 
      ...costs, 
      others: costs.others.map(o => o.id === id ? { ...o, [field]: value } : o) 
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedMonthlyCosts = { ...(editingHouse?.monthlyCosts || {}) };
    
    const isAllZero = costs.caretaker === 0 && 
                      costs.currentBill === 0 && 
                      costs.gasBill === 0 && 
                      costs.waterBill === 0 && 
                      costs.tax === 0 && 
                      costs.others.length === 0;

    if (isAllZero) {
      delete updatedMonthlyCosts[selectedMonth];
    } else {
      updatedMonthlyCosts[selectedMonth] = costs;
    }

    // Determine what to save for legacy costs
    let legacyCosts = editingHouse?.costs;
    if (selectedMonth === new Date().toISOString().slice(0, 7)) {
      legacyCosts = isAllZero ? { caretaker: 0, currentBill: 0, gasBill: 0, waterBill: 0, tax: 0, others: [] } : costs;
    } else if (!legacyCosts) {
      legacyCosts = costs;
    }

    onSubmit({
      name,
      monthlyCosts: updatedMonthlyCosts,
      costs: legacyCosts
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">{editingHouse ? 'Edit House' : 'Add New House'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">House Name</label>
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required 
                className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" 
                placeholder="e.g. House 01" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Month</label>
              <input 
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                required 
                className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" 
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-emerald-500" />
                Monthly Costs for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <button 
                type="button"
                onClick={handleClearMonthlyData}
                className="text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider flex items-center gap-1 bg-rose-50 px-2 py-1 rounded transition-colors"
                title="Clear all costs for this month"
              >
                <Trash2 size={12} /> Clear Month
              </button>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Caretaker</label>
                <input 
                  type="number"
                  value={costs.caretaker}
                  onChange={(e) => setCosts({ ...costs, caretaker: Number(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Current Bill</label>
                <input 
                  type="number"
                  value={costs.currentBill}
                  onChange={(e) => setCosts({ ...costs, currentBill: Number(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Gas Bill</label>
                <input 
                  type="number"
                  value={costs.gasBill}
                  onChange={(e) => setCosts({ ...costs, gasBill: Number(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Water Bill</label>
                <input 
                  type="number"
                  value={costs.waterBill}
                  onChange={(e) => setCosts({ ...costs, waterBill: Number(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" 
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">City Corporation-Tax</label>
                <input 
                  type="number"
                  value={costs.tax}
                  onChange={(e) => setCosts({ ...costs, tax: Number(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" 
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Other Costs</label>
                <button 
                  type="button"
                  onClick={handleAddOther}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Plus size={14} /> Add Other
                </button>
              </div>
              
              {costs.others.map((other) => (
                <div key={other.id} className="flex gap-2 items-center">
                  <input 
                    value={other.label}
                    onChange={(e) => handleOtherChange(other.id, 'label', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm" 
                    placeholder="Cost Label"
                  />
                  <input 
                    type="number"
                    value={other.amount}
                    onChange={(e) => handleOtherChange(other.id, 'amount', Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-24 px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm" 
                    placeholder="Amount"
                  />
                  <button 
                    type="button"
                    onClick={() => handleRemoveOther(other.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-bold">Save House</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function PaymentModal({ tenants, editingPayment, onClose, onSubmit, calculatePreviousDue }: { 
  tenants: Tenant[], 
  editingPayment: Payment | null,
  onClose: () => void, 
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void,
  calculatePreviousDue: (tenantId: string, month: string) => number
}) {
  const [selectedTenantId, setSelectedTenantId] = useState(editingPayment?.tenantId || tenants[0]?.id || '');
  const [selectedMonth, setSelectedMonth] = useState(editingPayment?.month || new Date().toISOString().slice(0, 7));
  const [datePaid, setDatePaid] = useState(editingPayment?.datePaid || new Date().toISOString().split('T')[0]);
  const [rentPaid, setRentPaid] = useState(editingPayment?.rent || 0);
  const [securityPaid, setSecurityPaid] = useState(editingPayment?.security || 0);
  const [prevDue, setPrevDue] = useState(0);
  const [baseRent, setBaseRent] = useState(0);
  const [status, setStatus] = useState<'Paid' | 'Unpaid'>(editingPayment?.status || 'Paid');

  useEffect(() => {
    if (selectedTenantId && selectedMonth) {
      const pDue = calculatePreviousDue(selectedTenantId, selectedMonth);
      const tenant = tenants.find(t => t.id === selectedTenantId);
      const bRent = tenant ? tenant.rentAmount : 0;
      
      setBaseRent(bRent);
      setPrevDue(pDue);
      
      if (!editingPayment) {
        setSecurityPaid(0);
        setRentPaid(bRent + pDue); // Default to full rent payment
        setStatus('Paid');
      }
    }
  }, [selectedTenantId, selectedMonth, calculatePreviousDue, tenants, editingPayment]);

  const totalPayable = baseRent + prevDue;
  const currentDue = totalPayable - rentPaid;

  // Auto-update status when paid amount changes
  useEffect(() => {
    setStatus(currentDue > 0 ? 'Unpaid' : 'Paid');
  }, [currentDue]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 my-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">{editingPayment ? 'Edit Payment' : 'Record Payment'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tenant</label>
            <select 
              name="tenantId" 
              required 
              className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.flatNo} {t.name ? `- ${t.name}` : ''}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
              <input 
                name="month" 
                type="month" 
                required 
                className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date</label>
              <input 
                name="datePaid" 
                type="date" 
                required 
                className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                value={datePaid}
                onChange={(e) => setDatePaid(e.target.value)}
              />
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="flex justify-between text-[10px] text-emerald-600 uppercase font-bold tracking-wider mb-1">
              <span>Total Payable</span>
              <span className="text-right">{baseRent} (Rent) + {prevDue} (Prev. Due)</span>
            </div>
            <div className="text-2xl font-bold text-emerald-900">
              {totalPayable} <span className="text-sm font-normal text-emerald-600">BDT</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Security Paid</label>
              <input 
                name="security" 
                type="number" 
                required 
                className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" 
                value={securityPaid}
                onChange={(e) => setSecurityPaid(Number(e.target.value))}
                onFocus={(e) => e.target.select()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rent Paid</label>
              <input 
                name="rent" 
                type="number" 
                required 
                className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" 
                value={rentPaid}
                onChange={(e) => setRentPaid(Number(e.target.value))}
                onFocus={(e) => e.target.select()}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due (Balance)</label>
            <input 
              name="due" 
              type="number" 
              required 
              className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 font-medium text-slate-700" 
              value={currentDue}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select 
              name="status" 
              className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'Paid' | 'Unpaid')}
            >
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium">
              {editingPayment ? 'Update Payment' : 'Record Payment'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
