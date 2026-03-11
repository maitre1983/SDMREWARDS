import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Gift, Save, Loader2, Users, TrendingUp } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SettingsReferrals({ token, platformConfig, onConfigUpdate }) {
  const [isLoading, setIsLoading] = useState(false);
  const [referralForm, setReferralForm] = useState({ 
    welcome_bonus: 1, 
    referrer_bonus: 3 
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (platformConfig) {
      setReferralForm({
        welcome_bonus: platformConfig.referral_welcome_bonus || 1,
        referrer_bonus: platformConfig.referral_referrer_bonus || 3
      });
    }
  }, [platformConfig]);

  const handleSaveReferrals = async () => {
    try {
      setIsLoading(true);
      await axios.put(`${API_URL}/api/admin/platform-config`, {
        referral_welcome_bonus: referralForm.welcome_bonus,
        referral_referrer_bonus: referralForm.referrer_bonus
      }, { headers });
      toast.success('Referral bonuses updated');
      onConfigUpdate?.();
    } catch (error) {
      toast.error('Failed to update referral settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
          <Gift size={20} className="text-pink-400" />
          Referral Bonus Configuration
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          {/* New User Welcome Bonus */}
          <div className="bg-gradient-to-br from-emerald-900/30 to-slate-900 rounded-xl p-5 border border-emerald-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Users className="text-emerald-400" size={20} />
              </div>
              <div>
                <h4 className="text-white font-medium">New User Bonus</h4>
                <p className="text-slate-400 text-sm">Bonus for users who sign up with a referral code</p>
              </div>
            </div>
            <div>
              <Label className="text-slate-400 text-sm">Bonus Amount (GHS)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={referralForm.welcome_bonus}
                onChange={(e) => setReferralForm({
                  ...referralForm, 
                  welcome_bonus: parseFloat(e.target.value)
                })}
                className="mt-1 bg-slate-800 border-emerald-700/50 text-white text-lg"
              />
            </div>
          </div>

          {/* Referrer Bonus */}
          <div className="bg-gradient-to-br from-amber-900/30 to-slate-900 rounded-xl p-5 border border-amber-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <TrendingUp className="text-amber-400" size={20} />
              </div>
              <div>
                <h4 className="text-white font-medium">Referrer Bonus</h4>
                <p className="text-slate-400 text-sm">Bonus for users who refer new members</p>
              </div>
            </div>
            <div>
              <Label className="text-slate-400 text-sm">Bonus Amount (GHS)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={referralForm.referrer_bonus}
                onChange={(e) => setReferralForm({
                  ...referralForm, 
                  referrer_bonus: parseFloat(e.target.value)
                })}
                className="mt-1 bg-slate-800 border-amber-700/50 text-white text-lg"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-6 p-4 bg-slate-900 rounded-lg border border-slate-700">
          <p className="text-slate-400 text-sm mb-2">Preview:</p>
          <p className="text-white">
            When <span className="text-emerald-400 font-medium">User A</span> refers <span className="text-amber-400 font-medium">User B</span>:
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            <li className="text-slate-300">
              • User B (new user) receives: <span className="text-emerald-400 font-semibold">GHS {referralForm.welcome_bonus.toFixed(2)}</span>
            </li>
            <li className="text-slate-300">
              • User A (referrer) receives: <span className="text-amber-400 font-semibold">GHS {referralForm.referrer_bonus.toFixed(2)}</span>
            </li>
          </ul>
        </div>

        <Button 
          onClick={handleSaveReferrals}
          disabled={isLoading}
          className="mt-6 bg-pink-600 hover:bg-pink-700"
          data-testid="save-referrals-btn"
        >
          {isLoading ? (
            <Loader2 className="animate-spin mr-2" size={16} />
          ) : (
            <Save className="mr-2" size={16} />
          )}
          {isLoading ? 'Saving...' : 'Save Referral Settings'}
        </Button>
      </div>
    </div>
  );
}
