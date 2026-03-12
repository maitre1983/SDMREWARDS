import React from 'react';
import { Search, Eye, MessageSquare, Ban, XCircle, UserCheck, Trash2, Key, Star, TrendingUp, Zap, Crown, Award } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

// Level icon mapping
const getLevelIcon = (level) => {
  switch(level) {
    case 1: return <Star size={12} />;
    case 2: return <TrendingUp size={12} />;
    case 3: return <Zap size={12} />;
    case 4: return <Crown size={12} />;
    case 5: return <Award size={12} />;
    default: return <Star size={12} />;
  }
};

export default function AdminClients({
  clients,
  searchQuery,
  setSearchQuery,
  filteredClients,
  getStatusBadge,
  handleViewClientTransactions,
  setSelectedClient,
  setSmsRecipientType,
  setShowSMSModal,
  handleUpdateClientStatus,
  handleBlockClient,
  handleDeleteClient,
  handleOpenResetPassword
}) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <Input
          type="text"
          placeholder="Search by name, phone, or username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700 text-white"
        />
      </div>

      {/* Clients List */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 text-slate-400 text-sm">
              <tr>
                <th className="text-left p-4">Client</th>
                <th className="text-left p-4">Phone</th>
                <th className="text-left p-4">Card</th>
                <th className="text-left p-4">Level</th>
                <th className="text-left p-4">Balance</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredClients.map(client => {
                const levelInfo = client.level_info || { level: 1, name: 'SDM Starter', color: '#94a3b8', xp: 0 };
                
                return (
                  <tr key={client.id} className="hover:bg-slate-900/50">
                    <td className="p-4">
                      <p className="text-white font-medium">{client.full_name}</p>
                      <p className="text-slate-500 text-sm">@{client.username}</p>
                    </td>
                    <td className="p-4 text-slate-300">{client.phone}</td>
                    <td className="p-4">
                      {client.card_type ? (
                        <span className={`px-2 py-1 rounded text-xs ${
                          client.card_type === 'platinum' ? 'bg-slate-600 text-white' :
                          client.card_type === 'gold' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-slate-500/20 text-slate-300'
                        }`}>
                          {client.card_type.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-sm">None</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span 
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                          style={{ 
                            backgroundColor: `${levelInfo.color}20`,
                            color: levelInfo.color
                          }}
                        >
                          {getLevelIcon(levelInfo.level)}
                          {levelInfo.name}
                        </span>
                        <span className="text-slate-500 text-xs">
                          {levelInfo.xp.toLocaleString()} XP
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-emerald-400">
                      GHS {(client.cashback_balance || 0).toFixed(2)}
                    </td>
                    <td className="p-4">{getStatusBadge(client.status)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewClientTransactions(client)}
                          className="text-blue-400 hover:bg-blue-500/10"
                          title="View Transactions"
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedClient(client); setSmsRecipientType('client'); setShowSMSModal(true); }}
                          className="text-purple-400 hover:bg-purple-500/10"
                          title="Send SMS"
                        >
                          <MessageSquare size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenResetPassword('client', client)}
                          className="text-cyan-400 hover:bg-cyan-500/10"
                          title="Reset Password"
                        >
                        <Key size={14} />
                      </Button>
                      {client.status === 'active' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateClientStatus(client.id, 'suspend')}
                            className="text-amber-400 hover:bg-amber-500/10"
                            title="Suspend"
                          >
                            <Ban size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleBlockClient(client.id)}
                            className="text-red-400 hover:bg-red-500/10"
                            title="Block"
                          >
                            <XCircle size={14} />
                          </Button>
                        </>
                      )}
                      {(client.status === 'suspended' || client.status === 'blocked') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateClientStatus(client.id, 'activate')}
                          className="text-emerald-400 hover:bg-emerald-500/10"
                          title="Reactivate"
                        >
                          <UserCheck size={14} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClient(client.id)}
                        className="text-slate-400 hover:bg-slate-500/10"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredClients.length === 0 && (
          <p className="text-slate-500 text-center py-8">No clients found</p>
        )}
      </div>
    </div>
  );
}
