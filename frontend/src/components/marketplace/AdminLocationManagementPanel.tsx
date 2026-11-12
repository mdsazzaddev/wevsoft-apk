import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe, Plus, Edit2, Trash2, Search, CheckCircle, XCircle,
  Download, Upload, RefreshCw, Layers, MapPin, Loader2, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

type LocationType = 'countries' | 'divisions' | 'districts' | 'upazilas' | 'unions';

export const AdminLocationManagementPanel: React.FC = () => {
  const token = useStore((s) => s.token);
  const [activeType, setActiveType] = useState<LocationType>('countries');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Parent selection for dependent types
  const [parentCountries, setParentCountries] = useState<any[]>([]);
  const [parentDivisions, setParentDivisions] = useState<any[]>([]);
  const [parentDistricts, setParentDistricts] = useState<any[]>([]);
  const [parentUpazilas, setParentUpazilas] = useState<any[]>([]);

  // Modal for add / edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formName, setFormName] = useState('');
  const [formLocalName, setFormLocalName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formSortOrder, setFormSortOrder] = useState('1');
  const [formParentId, setFormParentId] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchItems();
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchParents();
  }, [activeType]);

  const fetchParents = async () => {
    try {
      if (activeType === 'divisions') {
        const res = await fetch('/api/v1/locations/countries');
        const data = await res.json();
        if (data.success) setParentCountries(data.countries);
      } else if (activeType === 'districts') {
        const res = await fetch('/api/v1/locations/admin/divisions');
        const data = await res.json();
        if (data.success) setParentDivisions(data.data);
      } else if (activeType === 'upazilas') {
        const res = await fetch('/api/v1/locations/admin/districts');
        const data = await res.json();
        if (data.success) setParentDistricts(data.data);
      } else if (activeType === 'unions') {
        const res = await fetch('/api/v1/locations/admin/upazilas');
        const data = await res.json();
        if (data.success) setParentUpazilas(data.data);
      }
    } catch (e) {
      console.error('Error fetching parent locations:', e);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const url = `/api/v1/locations/admin/${activeType}${search ? `?search=${encodeURIComponent(search)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setItems(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch locations');
      }
    } catch (error) {
      toast.error('Network error loading locations');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormName(item.name || '');
      setFormLocalName(item.local_name || '');
      setFormCode(item.code || '');
      setFormSortOrder(String(item.sort_order || 1));
      setFormParentId(
        item.country_id || item.division_id || item.district_id || item.upazila_id || ''
      );
    } else {
      setEditingItem(null);
      setFormName('');
      setFormLocalName('');
      setFormCode('');
      setFormSortOrder('1');
      if (activeType === 'divisions' && parentCountries[0]) setFormParentId(parentCountries[0].id);
      if (activeType === 'districts' && parentDivisions[0]) setFormParentId(parentDivisions[0].id);
      if (activeType === 'upazilas' && parentDistricts[0]) setFormParentId(parentDistricts[0].id);
      if (activeType === 'unions' && parentUpazilas[0]) setFormParentId(parentUpazilas[0].id);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Location name is required');
      return;
    }
    try {
      const url = editingItem
        ? `/api/v1/locations/admin/${activeType}/${editingItem.id}`
        : `/api/v1/locations/admin/${activeType}`;

      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formName,
          local_name: formLocalName,
          code: formCode,
          sort_order: Number(formSortOrder),
          parent_id: formParentId || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Location ${editingItem ? 'updated' : 'created'} successfully!`);
        setIsModalOpen(false);
        fetchItems();
      } else {
        toast.error(data.error || 'Failed to save location');
      }
    } catch (err) {
      toast.error('Network error while saving location');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return;
    try {
      const res = await fetch(`/api/v1/locations/admin/${activeType}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Location deleted');
        fetchItems();
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch (err) {
      toast.error('Network error during deletion');
    }
  };

  const handleToggleStatus = async (item: any) => {
    try {
      const res = await fetch(`/api/v1/locations/admin/${activeType}/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: !item.status })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Location ${!item.status ? 'enabled' : 'disabled'}`);
        fetchItems();
      }
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };

  const handleSeedDefault = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/locations/seed-default', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Bangladesh administrative data seeded successfully!');
        fetchItems();
      } else {
        toast.error(data.error || 'Seed failed');
      }
    } catch (e) {
      toast.error('Error seeding defaults');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    const csvContent = [
      ['ID', 'Name', 'Local Name', 'Code', 'Status', 'Sort Order'],
      ...items.map(i => [i.id, i.name, i.local_name || '', i.code || '', i.status ? 'Active' : 'Inactive', i.sort_order])
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `wevsoft_locations_${activeType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${items.length} ${activeType} to CSV`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Admin Location & Address Hierarchy Management</h3>
            <p className="text-xs text-slate-400">
              Manage dynamic cascading addresses (Countries → Divisions → Districts → Upazilas → Unions)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedDefault}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-400 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Seed Bangladesh Data
          </button>
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add {activeType.slice(0, -1)}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'countries', label: 'Countries', count: activeType === 'countries' ? items.length : undefined },
          { id: 'divisions', label: 'Divisions / States', count: activeType === 'divisions' ? items.length : undefined },
          { id: 'districts', label: 'Districts / Cities', count: activeType === 'districts' ? items.length : undefined },
          { id: 'upazilas', label: 'Upazilas / Thanas', count: activeType === 'upazilas' ? items.length : undefined },
          { id: 'unions', label: 'Unions / Sub-Thanas', count: activeType === 'unions' ? items.length : undefined }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveType(tab.id as LocationType)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeType === tab.id
                ? 'bg-cyan-500/20 border border-cyan-500/60 text-cyan-400 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/30 text-cyan-300 text-[10px]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchItems()}
            placeholder={`Search ${activeType} by English or Bangla name...`}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <button
          onClick={fetchItems}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700"
        >
          Search
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <span className="text-xs">Loading {activeType}...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <MapPin className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-white">No {activeType} found</h4>
            <p className="text-xs max-w-sm mx-auto">
              You can seed the default Bangladesh administrative hierarchy or add custom locations manually.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-900/50">
                  <th className="py-3.5 px-6">Name (English)</th>
                  <th className="py-3.5 px-6">Bangla Name</th>
                  <th className="py-3.5 px-6">Code</th>
                  {activeType !== 'countries' && <th className="py-3.5 px-6">Parent Unit</th>}
                  <th className="py-3.5 px-6">Order</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {items.map(item => {
                  const parentName =
                    item.country?.name ||
                    item.division?.name ||
                    item.district?.name ||
                    item.upazila?.name ||
                    '-';
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-white">{item.name}</td>
                      <td className="py-3.5 px-6 font-semibold text-slate-300">{item.local_name || '-'}</td>
                      <td className="py-3.5 px-6 font-mono text-slate-400">{item.code || '-'}</td>
                      {activeType !== 'countries' && (
                        <td className="py-3.5 px-6 font-semibold text-cyan-400">{parentName}</td>
                      )}
                      <td className="py-3.5 px-6 text-slate-400">{item.sort_order}</td>
                      <td className="py-3.5 px-6">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                            item.status
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {item.status ? (
                            <>
                              <CheckCircle className="w-3 h-3" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" /> Disabled
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white">
                  {editingItem ? 'Edit' : 'Add'} {activeType.slice(0, -1)}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                {activeType !== 'countries' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Parent Administrative Unit
                    </label>
                    <select
                      value={formParentId}
                      onChange={e => setFormParentId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                    >
                      {activeType === 'divisions' &&
                        parentCountries.map(c => (
                          <option key={c.id} value={c.id}>
                            Country: {c.name}
                          </option>
                        ))}
                      {activeType === 'districts' &&
                        parentDivisions.map(d => (
                          <option key={d.id} value={d.id}>
                            Division: {d.name}
                          </option>
                        ))}
                      {activeType === 'upazilas' &&
                        parentDistricts.map(d => (
                          <option key={d.id} value={d.id}>
                            District: {d.name}
                          </option>
                        ))}
                      {activeType === 'unions' &&
                        parentUpazilas.map(u => (
                          <option key={u.id} value={u.id}>
                            Upazila: {u.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Name (English)
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Gazipur"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Name (Bangla / Local)
                  </label>
                  <input
                    type="text"
                    value={formLocalName}
                    onChange={e => setFormLocalName(e.target.value)}
                    placeholder="e.g. গাজীপুর"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Code (Optional)
                    </label>
                    <input
                      type="text"
                      value={formCode}
                      onChange={e => setFormCode(e.target.value)}
                      placeholder="e.g. GAZ"
                      className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={formSortOrder}
                      onChange={e => setFormSortOrder(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20"
                  >
                    Save Location
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
