import React from 'react';
import { Search, Eye, MessageSquare, MapPin, CheckCircle, Ban, XCircle, UserCheck, Trash2, Key } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export default function AdminMerchants({
  merchants,
  searchQuery,
  setSearchQuery,
  filteredMerchants,
  getStatusBadge,
  handleViewMerchantTransactions,
  setSelectedMerchant,
  setSmsRecipientType,
  setShowSMSModal,
  setLocationForm,
  setShowLocationModal,
  handleUpdateMerchantStatus,
  handleRejectMerchant,
  handleBlockMerchant,
  handleDeleteMerchant,
  handleOpenResetPassword
}) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <Input
          type="text"
          placeholder="Search by business name, phone, or owner..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700 text-white"
        />
      </div>

      {/* Merchants List */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 text-slate-400 text-sm">
              <tr>
                <th className="text-left p-4">Business</th>
                <th className="text-left p-4">Phone</th>
                <th className="text-left p-4">Location</th>
                <th className="text-left p-4">Cashback</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredMerchants.map(merchant => (
                <tr key={merchant.id} className="hover:bg-slate-900/50">
                  <td className="p-4">
                    <p className="text-white font-medium">{merchant.business_name}</p>
                    <p className="text-slate-500 text-sm">{merchant.owner_name}</p>
                  </td>
                  <td className="p-4 text-slate-300">{merchant.phone}</td>
                  <td className="p-4">
                    {merchant.city ? (
                      <span className="text-slate-300 text-sm">{merchant.city}</span>
                    ) : (
                      <span className="text-slate-500 text-sm">Not set</span>
                    )}
                  </td>
                  <td className="p-4 text-amber-400">{merchant.cashback_rate}%</td>
                  <td className="p-4">{getStatusBadge(merchant.status)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewMerchantTransactions(merchant)}
                        className="text-blue-400 hover:bg-blue-500/10"
                        title="View Transactions"
                      >
                        <Eye size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedMerchant(merchant); setSmsRecipientType('merchant'); setShowSMSModal(true); }}
                        className="text-purple-400 hover:bg-purple-500/10"
                        title="Send SMS"
                      >
                        <MessageSquare size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedMerchant(merchant); setLocationForm({ address: merchant.address || '', google_maps_url: merchant.google_maps_url || '', city: merchant.city || '' }); setShowLocationModal(true); }}
                        className="text-cyan-400 hover:bg-cyan-500/10"
                        title="Edit Location"
                      >
                        <MapPin size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenResetPassword('merchant', merchant)}
                        className="text-teal-400 hover:bg-teal-500/10"
                        title="Reset Password"
                      >
                        <Key size={14} />
                      </Button>
                      {merchant.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateMerchantStatus(merchant.id, 'approve')}
                            className="text-emerald-400 hover:bg-emerald-500/10"
                            title="Approve"
                          >
                            <CheckCircle size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRejectMerchant(merchant.id)}
                            className="text-orange-400 hover:bg-orange-500/10"
                            title="Reject"
                          >
                            <XCircle size={14} />
                          </Button>
                        </>
                      )}
                      {merchant.status === 'active' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateMerchantStatus(merchant.id, 'suspend')}
                            className="text-amber-400 hover:bg-amber-500/10"
                            title="Suspend"
                          >
                            <Ban size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleBlockMerchant(merchant.id)}
                            className="text-red-400 hover:bg-red-500/10"
                            title="Block"
                          >
                            <XCircle size={14} />
                          </Button>
                        </>
                      )}
                      {(merchant.status === 'suspended' || merchant.status === 'blocked' || merchant.status === 'rejected') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateMerchantStatus(merchant.id, 'activate')}
                          className="text-emerald-400 hover:bg-emerald-500/10"
                          title="Reactivate"
                        >
                          <UserCheck size={14} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMerchant(merchant.id)}
                        className="text-slate-400 hover:bg-slate-500/10"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredMerchants.length === 0 && (
          <p className="text-slate-500 text-center py-8">No merchants found</p>
        )}
      </div>
    </div>
  );
}
