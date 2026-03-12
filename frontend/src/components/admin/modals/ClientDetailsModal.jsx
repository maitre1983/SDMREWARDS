import React from 'react';
import { Button } from '../../ui/button';
import { 
  Users, XCircle, Phone, Wallet, CreditCard, Gift, 
  Award, Eye, Ban, UserCheck, Trash2, Key, History, Send
} from 'lucide-react';

export default function ClientDetailsModal({
  client,
  onClose,
  onSuspend,
  onBlock,
  onActivate,
  onDelete,
  onResetPassword,
  onViewHistory,
  onSendSMS,
  getStatusBadge,
  actionLoading
}) {
  if (!client) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Users className="text-blue-400" size={24} />
            <div>
              <h2 className="text-white font-semibold">{client.full_name || client.username}</h2>
              <p className="text-slate-400 text-sm">@{client.username}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="text-slate-400">
            <XCircle size={24} />
          </Button>
        </div>

        {/* Client Info */}
        <div className="p-4 border-b border-slate-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-slate-400 text-xs">Phone</p>
              <p className="text-white">{client.phone}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-slate-400 text-xs">Cashback Balance</p>
              <p className="text-emerald-400">GHS {(client.cashback_balance || 0).toFixed(2)}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-slate-400 text-xs">Status</p>
              {getStatusBadge(client.status)}
            </div>
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-slate-400 text-xs">Joined</p>
              <p className="text-white">{new Date(client.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Cards & Referrals */}
        <div className="p-4 border-b border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* VIP Card */}
            <div className="bg-gradient-to-br from-amber-900/20 to-slate-900 border border-amber-500/30 rounded-lg p-4">
              <h3 className="text-amber-400 font-medium mb-2 flex items-center gap-2">
                <CreditCard size={18} /> VIP Card
              </h3>
              {client.vip_card ? (
                <div className="space-y-2">
                  <p className="text-white"><span className="text-slate-400">Type:</span> {client.vip_card.card_type}</p>
                  <p className="text-white"><span className="text-slate-400">Card #:</span> {client.vip_card.card_number}</p>
                  <p className="text-white"><span className="text-slate-400">Purchased:</span> {new Date(client.vip_card.purchase_date).toLocaleDateString()}</p>
                </div>
              ) : (
                <p className="text-slate-500">No VIP card purchased</p>
              )}
            </div>

            {/* Referrals */}
            <div className="bg-gradient-to-br from-purple-900/20 to-slate-900 border border-purple-500/30 rounded-lg p-4">
              <h3 className="text-purple-400 font-medium mb-2 flex items-center gap-2">
                <Gift size={18} /> Referral Program
              </h3>
              <div className="space-y-2">
                <p className="text-white"><span className="text-slate-400">Referral Code:</span> {client.referral_code || 'N/A'}</p>
                <p className="text-white"><span className="text-slate-400">Referrals Made:</span> {client.referral_count || 0}</p>
                <p className="text-white"><span className="text-slate-400">Referred By:</span> {client.referred_by || 'None'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Gamification Stats */}
        {client.gamification && (
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <Award size={18} className="text-amber-400" /> Gamification Stats
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">{client.gamification.xp || 0}</p>
                <p className="text-slate-400 text-xs">XP</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-400">{client.gamification.level?.name || 'Starter'}</p>
                <p className="text-slate-400 text-xs">Level</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">{client.gamification.missions_completed || 0}</p>
                <p className="text-slate-400 text-xs">Missions</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">{client.gamification.badges?.length || 0}</p>
                <p className="text-slate-400 text-xs">Badges</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-4 bg-slate-900 rounded-b-xl flex flex-wrap gap-2 justify-end">
          <Button 
            onClick={() => onViewHistory(client)}
            variant="outline"
            className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
          >
            <History size={16} className="mr-2" /> Transaction History
          </Button>
          <Button 
            onClick={() => onSendSMS(client)}
            variant="outline"
            className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
          >
            <Send size={16} className="mr-2" /> Send SMS
          </Button>
          <Button 
            onClick={() => onResetPassword('client', client)}
            variant="outline"
            className="border-amber-500 text-amber-400 hover:bg-amber-500/10"
            disabled={actionLoading}
          >
            <Key size={16} className="mr-2" /> Reset Password
          </Button>
          {client.status === 'active' && (
            <>
              <Button 
                onClick={() => onSuspend(client.id)}
                variant="outline"
                className="border-amber-500 text-amber-400 hover:bg-amber-500/10"
                disabled={actionLoading}
              >
                <Eye size={16} className="mr-2" /> Suspend
              </Button>
              <Button 
                onClick={() => onBlock(client.id)}
                variant="outline"
                className="border-red-500 text-red-400 hover:bg-red-500/10"
                disabled={actionLoading}
              >
                <Ban size={16} className="mr-2" /> Block
              </Button>
            </>
          )}
          {(client.status === 'suspended' || client.status === 'blocked') && (
            <Button 
              onClick={() => onActivate(client.id)}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={actionLoading}
            >
              <UserCheck size={16} className="mr-2" /> Reactivate
            </Button>
          )}
          <Button 
            onClick={() => onDelete(client.id)}
            variant="outline"
            className="border-red-500 text-red-400 hover:bg-red-500/10"
            disabled={actionLoading}
          >
            <Trash2 size={16} className="mr-2" /> Delete Account
          </Button>
        </div>
      </div>
    </div>
  );
}
