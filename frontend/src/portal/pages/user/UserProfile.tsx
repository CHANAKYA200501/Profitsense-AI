import React, { useState, useEffect } from 'react';
import { usePortalAuth } from '../../store/usePortalAuth';
import { portalApi } from '../../api/portalApi';

const UserProfile: React.FC = () => {
  const { user, setUser } = usePortalAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [dob, setDob] = useState(user?.dob || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If dob was not loaded initially, try to get full profile
    if (!user?.dob) {
      portalApi.getProfile().then(res => {
        if (res?.user) {
          setUser({ ...user, ...res.user });
          if (res.user.dob) setDob(res.user.dob);
          if (res.user.name) setName(res.user.name);
          if (res.user.email) setEmail(res.user.email);
        }
      }).catch(console.error);
    }
  }, [user, setUser]);

  const handleSave = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const res = await portalApi.updateProfile({ name, dob });
      if (res.status === 'success') {
        setMessage('Profile updated successfully');
        setUser({ ...user, name, dob } as any);
      } else {
        setMessage('Failed to update profile');
      }
    } catch (err) {
      setMessage('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-black text-slate-900 mb-6">Edit Profile</h2>
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2">Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-blue-500 transition" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2">Email</label>
            <input type="email" value={email} disabled
              className="w-full bg-slate-50 border border-slate-200/50 rounded-xl px-4 py-3 text-slate-400 text-sm cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2">Date of Birth</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-blue-500 transition" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2">Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-blue-500 transition" />
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2">Residential Address</label>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full street address" rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-blue-500 transition resize-none" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2">Account Status</label>
          <div className={`inline-block px-4 py-2 rounded-lg text-xs font-bold ${
            user?.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-500 border border-amber-200'
          }`}>{user?.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}</div>
        </div>

        {message && <div className={`p-4 border rounded-xl text-sm font-bold ${message.includes('success') ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-red-50 border-red-200 text-red-600'}`}>{message}</div>}

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button onClick={handleSave} disabled={isLoading}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm shadow-blue-600/20 disabled:opacity-50">
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
