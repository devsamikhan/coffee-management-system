import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import { User } from '../../types/auth';
import { User as DbUser, UserRole } from '../../types';

interface UserManagementProps {
  token: string;
  employees: DbUser[];
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
  onRefresh: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  token,
  employees,
  currentUser,
  onRefresh,
}) => {
  const [editingEmployee, setEditingEmployee] = useState<Partial<DbUser> | null>(null);

  const isAdmin = currentUser.role === 'admin';
  const isManager = currentUser.role === 'manager';

  // Enroll or update staff members
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    // Security: Managers cannot modify base hourly wage
    if (isManager && editingEmployee.hourlyWage !== undefined) {
      const original = employees.find(emp => emp.id === editingEmployee.id);
      if (original && original.hourlyWage !== editingEmployee.hourlyWage) {
        alert("Permission Denied: Managers cannot modify base hourly wages.");
        return;
      }
    }

    const isNew = !editingEmployee.id;
    const url = isNew ? '/api/employees' : `/api/employees/${editingEmployee.id}`;
    const method = isNew ? 'POST' : 'PUT';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingEmployee)
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Save action failed.");
        return;
      }

      setEditingEmployee(null);
      onRefresh();
    } catch (err) {
      console.error("Save employee error: ", err);
    }
  };

  // Toggle active status
  const handleToggleActiveStatus = async (emp: DbUser) => {
    try {
      const response = await fetch(`/api/employees/${emp.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...emp,
          active: !emp.active
        })
      });

      if (response.ok) {
        onRefresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update status.");
      }
    } catch (err) {
      console.error("Toggle active status error: ", err);
    }
  };

  // Permanently remove employee
  const handleDeleteEmployee = async (id: string) => {
    if (!isAdmin) {
      alert("Permission Denied: Only Administrators can permanently remove staff.");
      return;
    }

    if (!confirm("Are you sure you want to permanently delete this employee?")) {
      return;
    }

    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        onRefresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete user.");
      }
    } catch (err) {
      console.error("Delete employee error: ", err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Tab Header Controls */}
      <div className="flex items-center justify-between border-b border-[#F2ECE4] pb-3">
        <div>
          <h3 className="text-base font-extrabold text-stone-800 select-none">Staff Profiles</h3>
          <p className="text-xs text-[#8B7565] mt-0.5 leading-none">
            Manage profiles, login PINs, statuses, and hourly rates.
          </p>
        </div>
        <button
          onClick={() => setEditingEmployee({ name: '', email: '', pin: '', role: 'barista', contact: '', hourlyWage: 15.00, active: true })}
          className="py-2 px-4 bg-[#5C3F2A] hover:bg-[#48301E] text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1 transition-all cursor-pointer min-h-[40px]"
        >
          <Plus className="h-4 w-4" /> Add Staff
        </button>
      </div>

      {/* Staff Enrollment Form Overlay */}
      {editingEmployee && (
        <form onSubmit={handleSaveEmployee} className="bg-[#FAF6EE] border border-[#DECFB5] rounded-3xl p-6 space-y-4 shadow-sm animate-fade-in">
          <h4 className="font-extrabold text-[#5C3F2A] text-sm border-b border-[#DECFB5] pb-2">
            Enroll Staff
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Name</label>
              <input
                type="text"
                required
                value={editingEmployee.name || ''}
                onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Email</label>
              <input
                type="email"
                value={editingEmployee.email || ''}
                onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">4-Digit PIN</label>
              <input
                type="text"
                maxLength={4}
                pattern="[0-9]{4}"
                required={!editingEmployee.id}
                placeholder={editingEmployee.id ? "Keep current" : "e.g., 1234"}
                value={editingEmployee.pin || ''}
                onChange={(e) => setEditingEmployee({ ...editingEmployee, pin: e.target.value.replace(/\D/g, '') })}
                className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none text-center font-mono font-bold tracking-widest"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Role</label>
              <select
                value={editingEmployee.role || 'barista'}
                onChange={(e) => setEditingEmployee({ ...editingEmployee, role: e.target.value as UserRole })}
                className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none cursor-pointer"
              >
                <option value="barista">Barista</option>
                <option value="manager">Shift Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">Phone</label>
              <input
                type="text"
                required
                value={editingEmployee.contact || ''}
                onChange={(e) => setEditingEmployee({ ...editingEmployee, contact: e.target.value })}
                className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-[#5C3F2A] uppercase mb-1">
                Hourly Wage ({settingsIcon => '$'})
              </label>
              {isManager ? (
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value="[REDACTED - ADMIN ONLY]"
                    className="w-full py-1.5 px-3 bg-white/50 border border-[#DECFB5] rounded-xl text-xs focus:outline-none font-bold text-amber-800 backdrop-blur-md cursor-not-allowed select-none"
                  />
                </div>
              ) : (
                <input
                  type="number"
                  step="0.10"
                  required
                  value={editingEmployee.hourlyWage || ''}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, hourlyWage: parseFloat(e.target.value) || 0 })}
                  className="w-full py-1.5 px-3 bg-white border border-[#DECFB5] rounded-xl text-xs focus:outline-none"
                />
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setEditingEmployee(null)}
              className="py-1.5 px-4 border border-stone-300 text-stone-600 rounded-xl font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-1.5 px-5 bg-[#5C3F2A] hover:bg-[#48301E] text-white rounded-xl font-black text-xs shadow-md cursor-pointer"
            >
              Confirm Setup
            </button>
          </div>
        </form>
      )}

      {/* Directory profiles display lists & Data Table */}
      <div className="bg-white rounded-3xl border border-[#EBE6DF] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#FAF6EE]">
          <h4 className="font-extrabold text-stone-800 text-sm">Staff Directory</h4>
        </div>
        <div className="w-full overflow-x-auto whitespace-nowrap scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-[#F4ECE4] text-[#8B7565] font-black uppercase tracking-wider">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-center">Hourly Wage</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(employees ?? []).map(emp => (
                <tr key={emp?.id ?? ""} className={`border-b border-[#FAF6EE] hover:bg-[#FAF9F6] text-stone-700 ${
                  !(emp?.active ?? false) ? 'opacity-60 bg-stone-50/50' : ''
                }`}>
                  <td className="py-3 px-4">
                    <div>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-lg uppercase select-none ${
                        (emp?.role ?? "barista") === 'admin' 
                          ? 'bg-purple-100 text-[#5C3F2A]' 
                          : (emp?.role ?? "barista") === 'manager' 
                            ? 'bg-blue-100 text-blue-900' 
                            : 'bg-emerald-50 text-emerald-800'
                      }`}>
                        {emp?.role ?? "barista"}
                      </span>
                      <h4 className="font-extrabold text-[#2B1B10] text-sm pt-1">{emp?.name ?? ""}</h4>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-stone-600">{emp?.contact ?? ""}</p>
                    <p className="text-[10px] text-stone-400 font-bold">{emp?.email ?? "No email"}</p>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold">
                    {isManager ? (
                      <span className="text-[9px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-sans font-bold border border-amber-250/20 backdrop-blur-md">
                        REDACTED
                      </span>
                    ) : (
                      `$${(emp?.hourlyWage ?? 0).toFixed(2)}/hr`
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => emp && handleToggleActiveStatus(emp)}
                      className={`text-[10px] font-black px-2 py-1 rounded-xl shadow-sm border transition-all cursor-pointer uppercase ${
                        (emp?.active ?? false)
                          ? 'bg-green-50 text-green-800 border-green-200' 
                          : 'bg-stone-100 text-stone-500 border-stone-200'
                      }`}
                    >
                      {(emp?.active ?? false) ? 'Active Status' : 'Deactivated'}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1.5 select-none">
                      <button
                        onClick={() => emp && setEditingEmployee(emp)}
                        className="p-1 rounded bg-stone-50 hover:bg-stone-100 text-stone-500 border border-stone-200 cursor-pointer min-h-[36px]"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => emp && handleDeleteEmployee(emp.id)}
                        disabled={!isAdmin}
                        className={`p-1 rounded border min-h-[36px] ${
                          isAdmin 
                            ? 'bg-stone-50 hover:bg-rose-50 text-stone-400 hover:text-red-600 border-stone-200 cursor-pointer' 
                            : 'bg-stone-100/50 text-stone-300 border-stone-200/50 cursor-not-allowed'
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
