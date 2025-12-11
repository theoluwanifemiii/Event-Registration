import React, { useState, useEffect } from 'react';
import { Ticket, Users, DollarSign, CheckCircle, Clock, Download, Lock, LogOut, Mail, QrCode, Check, X } from 'lucide-react';

interface Registration {
  id: string;
  name: string;
  phone: string;
  email: string;
  church: string;
  zone: 'Akoka' | 'Ilaje' | 'Jebako' | 'Shomolu';
  ticketType: 'solo' | 'guest';
  guestName?: string;
  totalDue: number;
  totalPaid: number;
  balance: number;
  paymentMethod: 'cash' | 'transfer';
  status: 'paid' | 'pending';
  transactionRef?: string;
  receiptImage?: string;
  createdAt: string;
  ticketQR?: string;
  emailSent?: boolean;
  checkedIn?: boolean;
}

export default function EventRegistrationApp() {
  const [view, setView] = useState<'register' | 'admin' | 'scanner'>('register');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  useEffect(() => {
    loadRegistrations();
  }, []);

  const loadRegistrations = async () => {
    try {
      const result = await window.storage.get('registrations');
      if (result?.value) {
        setRegistrations(JSON.parse(result.value));
      }
    } catch (error) {
      console.log('No existing registrations');
    }
  };

  const saveRegistrations = async (newRegistrations: Registration[]) => {
    try {
      await window.storage.set('registrations', JSON.stringify(newRegistrations));
      setRegistrations(newRegistrations);
    } catch (error) {
      console.error('Failed to save registrations:', error);
    }
  };

  const addRegistration = (registration: Registration) => {
    const updated = [...registrations, registration];
    saveRegistrations(updated);
  };

  const updateRegistration = (id: string, updates: Partial<Registration>) => {
    const updated = registrations.map(reg =>
      reg.id === id ? { ...reg, ...updates } : reg
    );
    saveRegistrations(updated);
  };

  const generateQRCode = (registration: Registration): string => {
    const qrData = JSON.stringify({
      id: registration.id,
      name: registration.name,
      ticketType: registration.ticketType,
      guestName: registration.guestName,
    });
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
  };

  const sendETicket = async (registration: Registration) => {
    const qrCode = generateQRCode(registration);
    updateRegistration(registration.id, {
      ticketQR: qrCode,
      emailSent: true,
    });
    return { to: registration.email, subject: 'Your Event E-Ticket', qrCode: qrCode };
  };

  if (view === 'register') {
    return (
      <RegistrationPage
        onRegister={addRegistration}
        onSwitchToAdmin={() => {
          setView('admin');
          setIsAdminAuth(false);
        }}
      />
    );
  }

  if (view === 'scanner') {
    return (
      <QRScannerPage
        registrations={registrations}
        onUpdateRegistration={updateRegistration}
        onBack={() => {
          setView('admin');
          setIsAdminAuth(true);
        }}
      />
    );
  }

  if (view === 'admin' && !isAdminAuth) {
    return (
      <AdminLogin
        onLogin={() => {
          setIsAdminAuth(true);
        }}
        onBack={() => setView('register')}
      />
    );
  }

  if (view === 'admin' && isAdminAuth) {
    return (
      <AdminDashboard
        registrations={registrations}
        onUpdateRegistration={updateRegistration}
        onSendETicket={sendETicket}
        onLogout={() => {
          setIsAdminAuth(false);
          setView('register');
        }}
        onBackToRegister={() => setView('register')}
        onOpenScanner={() => setView('scanner')}
      />
    );
  }

  return null;
}

function RegistrationPage({ onRegister, onSwitchToAdmin }: {
  onRegister: (reg: Registration) => void;
  onSwitchToAdmin: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    church: '',
    zone: 'Akoka' as 'Akoka' | 'Ilaje' | 'Jebako' | 'Shomolu',
    ticketType: 'solo' as 'solo' | 'guest',
    guestName: '',
  });
  const [paymentStep, setPaymentStep] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | null>(null);
  const [staffPin, setStaffPin] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const ticketPrice = formData.ticketType === 'solo' ? 2000 : 3000;

  const handleSubmit = () => {
    if (!formData.name || !formData.phone || !formData.email || !formData.church) {
      setError('Please fill all required fields');
      return;
    }

    if (formData.ticketType === 'guest' && !formData.guestName) {
      setError('Please enter guest name');
      return;
    }

    setError('');
    setPaymentStep(true);
  };

  const handlePayment = () => {
    if (paymentMethod === 'cash') {
      if (staffPin !== '1234') {
        setError('Invalid Staff PIN');
        return;
      }
    } else if (paymentMethod === 'transfer') {
      if (!transactionRef.trim()) {
        setError('Please enter transaction reference');
        return;
      }
      if (!receiptImage) {
        setError('Please upload payment receipt');
        return;
      }
    }

    const registration: Registration = {
      id: Date.now().toString(),
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      church: formData.church,
      zone: formData.zone,
      ticketType: formData.ticketType,
      guestName: formData.ticketType === 'guest' ? formData.guestName : undefined,
      totalDue: ticketPrice,
      totalPaid: paymentMethod === 'cash' ? ticketPrice : 0,
      balance: paymentMethod === 'cash' ? 0 : ticketPrice,
      paymentMethod: paymentMethod!,
      status: paymentMethod === 'cash' ? 'paid' : 'pending',
      transactionRef: paymentMethod === 'transfer' ? transactionRef : undefined,
      receiptImage: paymentMethod === 'transfer' ? receiptImage! : undefined,
      createdAt: new Date().toISOString(),
    };

    onRegister(registration);
    setShowSuccess(true);
    
    setTimeout(() => {
      setShowSuccess(false);
      setPaymentStep(false);
      setPaymentMethod(null);
      setStaffPin('');
      setTransactionRef('');
      setReceiptImage(null);
      setFormData({ name: '', phone: '', email: '', church: '', zone: 'Akoka', ticketType: 'solo', guestName: '' });
    }, 3000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Registration Successful!</h2>
          {paymentMethod === 'transfer' ? (
            <p className="text-gray-600">Your ticket will be active once we verify the transfer.</p>
          ) : (
            <p className="text-gray-600">Your payment has been confirmed. See you at the event!</p>
          )}
        </div>
      </div>
    );
  }

  if (paymentStep) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">How are you paying?</h2>
          
          <div className="space-y-4 mb-6">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'cash'
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-300 hover:border-purple-400'
              }`}
            >
              <div className="flex items-center">
                <DollarSign className="w-6 h-6 text-purple-600 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Cash at Venue</div>
                  <div className="text-sm text-gray-600">Pay when you arrive</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('transfer')}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'transfer'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center">
                <Clock className="w-6 h-6 text-blue-600 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Bank Transfer</div>
                  <div className="text-sm text-gray-600">Already transferred</div>
                </div>
              </div>
            </button>
          </div>

          {paymentMethod === 'cash' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Staff PIN <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={staffPin}
                onChange={(e) => setStaffPin(e.target.value)}
                placeholder="Enter 4-digit PIN"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          )}

          {paymentMethod === 'transfer' && (
            <div className="space-y-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Bank Account Details</h3>
                <div className="space-y-1 text-sm text-blue-800">
                  <div><span className="font-medium">Bank:</span> First Bank of Nigeria</div>
                  <div><span className="font-medium">Account Name:</span> Event Organizers Ltd</div>
                  <div><span className="font-medium">Account Number:</span> 1234567890</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Reference / Sender Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g., TRF123456 or John Doe"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Payment Receipt <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="receipt-upload"
                />
                <label
                  htmlFor="receipt-upload"
                  className="block w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-500 transition-colors"
                >
                  {receiptImage ? (
                    <div>
                      <img src={receiptImage} alt="Receipt" className="max-h-40 mx-auto mb-2 rounded" />
                      <span className="text-sm text-green-600 font-medium">✓ Receipt uploaded - Click to change</span>
                    </div>
                  ) : (
                    <div>
                      <div className="text-gray-500 mb-1">📸 Click to upload receipt</div>
                      <div className="text-xs text-gray-400">PNG, JPG up to 5MB</div>
                    </div>
                  )}
                </label>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setPaymentStep(false);
                setPaymentMethod(null);
                setError('');
              }}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handlePayment}
              disabled={!paymentMethod || (paymentMethod === 'cash' && !staffPin) || (paymentMethod === 'transfer' && (!transactionRef || !receiptImage))}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Event Registration</h1>
          <button
            onClick={onSwitchToAdmin}
            className="p-2 text-gray-600 hover:text-purple-600 transition-colors"
            title="Admin Login"
          >
            <Lock className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Church <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.church}
              onChange={(e) => setFormData({ ...formData, church: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Your church name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zone <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.zone}
              onChange={(e) => setFormData({ ...formData, zone: e.target.value as any })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
            >
              <option value="Akoka">Akoka</option>
              <option value="Ilaje">Ilaje</option>
              <option value="Jebako">Jebako</option>
              <option value="Shomolu">Shomolu</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="+234 800 000 0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Are you bringing a guest? <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, ticketType: 'solo' })}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  formData.ticketType === 'solo'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-300 hover:border-purple-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Ticket className="w-6 h-6 text-purple-600 mr-3" />
                    <div className="text-left">
                      <div className="font-semibold">Solo Ticket</div>
                      <div className="text-sm text-gray-600">Just for you</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-purple-600">₦2,000</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, ticketType: 'guest' })}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  formData.ticketType === 'guest'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-300 hover:border-purple-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="w-6 h-6 text-purple-600 mr-3" />
                    <div className="text-left">
                      <div className="font-semibold">Me + 1 Guest</div>
                      <div className="text-sm text-gray-600">Bring a friend</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-purple-600">₦3,000</div>
                </div>
              </button>
            </div>
          </div>

          {formData.ticketType === 'guest' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Guest Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Guest's full name"
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
          >
            Continue to Payment
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminLogin({ onLogin, onBack }: { onLogin: () => void; onBack: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setError('');
      onLogin();
    } else {
      setError('Invalid password');
    }
  };

  const handleLoginClick = () => {
    if (password === 'admin123') {
      setError('');
      onLogin();
    } else {
      setError('Invalid password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <Lock className="w-16 h-16 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Admin Login</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter admin password"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleLoginClick}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminDashboard({ registrations, onUpdateRegistration, onSendETicket, onLogout, onBackToRegister, onOpenScanner }: {
  registrations: Registration[];
  onUpdateRegistration: (id: string, updates: Partial<Registration>) => void;
  onSendETicket: (reg: Registration) => Promise<any>;
  onLogout: () => void;
  onBackToRegister: () => void;
  onOpenScanner: () => void;
}) {
  const [showAddPayment, setShowAddPayment] = useState<string | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [viewReceipt, setViewReceipt] = useState<string | null>(null);
  const [viewTicket, setViewTicket] = useState<Registration | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  const handleApprove = async (reg: Registration) => {
    onUpdateRegistration(reg.id, {
      status: 'paid',
      totalPaid: reg.totalDue,
      balance: 0,
    });
    setTimeout(() => handleSendETicket(reg), 500);
  };

  const handleSendETicket = async (reg: Registration) => {
    setSendingEmail(reg.id);
    await onSendETicket(reg);
    setTimeout(() => setSendingEmail(null), 1000);
  };

  const handleAddPartialPayment = (reg: Registration) => {
    const amount = parseFloat(partialAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newTotalPaid = reg.totalPaid + amount;
    const newBalance = reg.totalDue - newTotalPaid;

    onUpdateRegistration(reg.id, {
      totalPaid: newTotalPaid,
      balance: newBalance,
      status: newBalance <= 0 ? 'paid' : reg.status,
    });

    setShowAddPayment(null);
    setPartialAmount('');
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Church', 'Zone', 'Ticket Type', 'Guest Name', 'Total Due', 'Total Paid', 'Balance', 'Payment Method', 'Status', 'Transaction Ref'];
    const rows = registrations.map(reg => [
      reg.name,
      reg.email,
      reg.phone,
      reg.church,
      reg.zone,
      reg.ticketType === 'solo' ? 'Solo' : 'Me + 1 Guest',
      reg.guestName || '-',
      reg.totalDue,
      reg.totalPaid,
      reg.balance,
      reg.paymentMethod === 'cash' ? 'Cash' : 'Bank Transfer',
      reg.status === 'paid' ? 'Paid' : 'Pending Approval',
      reg.transactionRef || '-',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-registrations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRevenue = registrations.reduce((sum, reg) => sum + reg.totalPaid, 0);
  const pendingAmount = registrations.reduce((sum, reg) => sum + reg.balance, 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            <div className="flex gap-2 flex-wrap">
              <button onClick={onOpenScanner} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2">
                <QrCode className="w-4 h-4" />Scanner
              </button>
              <button onClick={onBackToRegister} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors">
                Register New
              </button>
              <button onClick={exportToCSV} className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />Export
              </button>
              <button onClick={onLogout} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2">
                <LogOut className="w-4 h-4" />Logout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
              <div className="text-sm opacity-90">Total Revenue</div>
              <div className="text-3xl font-bold">₦{totalRevenue.toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
              <div className="text-sm opacity-90">Pending Balance</div>
              <div className="text-3xl font-bold">₦{pendingAmount.toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
              <div className="text-sm opacity-90">Total Registrations</div>
              <div className="text-3xl font-bold">{registrations.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Name</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Church</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Zone</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700">Amount</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-700">Status</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {registrations.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No registrations yet</td></tr>
              ) : (
                registrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <div className="font-medium text-gray-900">{reg.name}</div>
                      {reg.guestName && <div className="text-xs text-gray-500">+ {reg.guestName}</div>}
                      <div className="text-xs text-gray-500">{reg.phone}</div>
                    </td>
                    <td className="px-3 py-3 text-gray-700 text-sm">{reg.church}</td>
                    <td className="px-3 py-3">
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">{reg.zone}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="font-medium">₦{reg.totalDue.toLocaleString()}</div>
                      <div className="text-xs text-green-600">Paid: ₦{reg.totalPaid.toLocaleString()}</div>
                      {reg.balance > 0 && <div className="text-xs text-red-600">Bal: ₦{reg.balance.toLocaleString()}</div>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${reg.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {reg.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                      {reg.balance === 0 && reg.emailSent && <div className="text-xs text-blue-600 mt-1">✓ Ticket Sent</div>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1 justify-center flex-wrap">
                        {reg.status === 'pending' && reg.paymentMethod === 'transfer' && (
                          <button onClick={() => handleApprove(reg)} className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">Approve</button>
                        )}
                        {reg.balance > 0 && (
                          <button onClick={() => setShowAddPayment(reg.id)} className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">Add $</button>
                        )}
                        {reg.balance === 0 && !reg.emailSent && (
                          <button onClick={() => handleSendETicket(reg)} disabled={sendingEmail === reg.id} className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50">
                            {sendingEmail === reg.id ? 'Sending...' : 'Send Ticket'}
                          </button>
                        )}
                        {reg.ticketQR && (
                          <button onClick={() => setViewTicket(reg)} className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700">View</button>
                        )}
                        {reg.receiptImage && (
                          <button onClick={() => setViewReceipt(reg.receiptImage!)} className="px-2 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500">Receipt</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showAddPayment && registrations.find(r => r.id === showAddPayment) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-4">Add Partial Payment</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input
                  type="number"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-sm text-gray-500 mt-1">Balance: ₦{registrations.find(r => r.id === showAddPayment)?.balance.toLocaleString()}</div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowAddPayment(null); setPartialAmount(''); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={() => handleAddPartialPayment(registrations.find(r => r.id === showAddPayment)!)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Payment</button>
              </div>
            </div>
          </div>
        )}

        {viewTicket && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={() => setViewTicket(null)}>
            <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">E-Ticket</h3>
                <button onClick={() => setViewTicket(null)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
              </div>
              <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 bg-gradient-to-br from-purple-50 to-blue-50">
                <div className="text-center mb-4">
                  <h4 className="text-2xl font-bold text-gray-800 mb-2">Annual Gala 2024</h4>
                  <p className="text-gray-600">Dec 31, 2024 • 7:00 PM</p>
                </div>
                <div className="bg-white rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><div className="text-gray-500">Name</div><div className="font-semibold">{viewTicket.name}</div></div>
                    <div><div className="text-gray-500">Church</div><div className="font-semibold">{viewTicket.church}</div></div>
                    <div><div className="text-gray-500">Zone</div><div className="font-semibold">{viewTicket.zone}</div></div>
                    {viewTicket.guestName && <div><div className="text-gray-500">Guest</div><div className="font-semibold">{viewTicket.guestName}</div></div>}
                  </div>
                </div>
                {viewTicket.ticketQR && (
                  <div className="text-center">
                    <img src={viewTicket.ticketQR} alt="QR" className="w-48 h-48 mx-auto mb-2" />
                    <p className="text-xs text-gray-600">Scan at entrance</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {viewReceipt && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={() => setViewReceipt(null)}>
            <div className="bg-white rounded-lg p-4 max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Payment Receipt</h3>
                <button onClick={() => setViewReceipt(null)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
              </div>
              <img src={viewReceipt} alt="Receipt" className="w-full rounded" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QRScannerPage({ registrations, onUpdateRegistration, onBack }: {
  registrations: Registration[];
  onUpdateRegistration: (id: string, updates: Partial<Registration>) => void;
  onBack: () => void;
}) {
  const [scanResult, setScanResult] = useState<Registration | null>(null);
  const [manualId, setManualId] = useState('');
  const [error, setError] = useState('');

  const handleManualSearch = () => {
    const reg = registrations.find(r => r.id === manualId.trim());
    if (!reg) {
      setError('Ticket ID not found');
      return;
    }
    if (reg.balance > 0) {
      setError('Payment incomplete. Balance: ₦' + reg.balance.toLocaleString());
      return;
    }
    setScanResult(reg);
    setError('');
  };

  const handleCheckIn = () => {
    if (scanResult) {
      onUpdateRegistration(scanResult.id, { checkedIn: true });
      setTimeout(() => {
        setScanResult(null);
        setManualId('');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 p-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="mb-4 px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-gray-100">← Back</button>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <QrCode className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800">QR Scanner</h2>
            <p className="text-gray-600">Scan tickets at entrance</p>
          </div>
          <div className="mb-6">
            <div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
              <p className="text-gray-500 mb-4">📱 Camera would open here</p>
              <p className="text-sm text-gray-400">Use manual search for demo</p>
            </div>
          </div>
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-800 mb-4">Manual Lookup</h3>
            <div className="flex gap-3 mb-4">
              <input type="text" value={manualId} onChange={(e) => setManualId(e.target.value)} placeholder="Enter Ticket ID" className="flex-1 px-4 py-3 border rounded-lg" />
              <button onClick={handleManualSearch} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700">Search</button>
            </div>
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">{error}</div>}
            {scanResult && (
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-6 border-2 border-green-300">
                {scanResult.checkedIn ? (
                  <div className="text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-green-700 mb-2">Checked In!</h3>
                    <p className="text-gray-600">Welcome {scanResult.name}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                        <h3 className="text-xl font-bold">Valid Ticket</h3>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">Paid ✓</span>
                    </div>
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><div className="text-gray-500">Name</div><div className="font-semibold text-lg">{scanResult.name}</div></div>
                        <div><div className="text-gray-500">Church</div><div className="font-semibold">{scanResult.church}</div></div>
                        <div><div className="text-gray-500">Zone</div><div className="font-semibold">{scanResult.zone}</div></div>
                        {scanResult.guestName && <div><div className="text-gray-500">Guest</div><div className="font-semibold">{scanResult.guestName}</div></div>}
                      </div>
                    </div>
                    <button onClick={handleCheckIn} className="w-full py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 flex items-center justify-center gap-2">
                      <Check className="w-6 h-6" />Check In
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="mt-6 border-t pt-6">
            <h4 className="font-semibold text-gray-800 mb-3">Stats</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{registrations.filter(r => r.balance === 0).length}</div>
                <div className="text-xs text-gray-600">Paid</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{registrations.filter(r => r.checkedIn).length}</div>
                <div className="text-xs text-gray-600">Checked In</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{registrations.length}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}