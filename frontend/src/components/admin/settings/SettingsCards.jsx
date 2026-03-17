import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { CreditCard, Medal, Award, Crown, Save, Loader2 } from 'lucide-react';

// API URL imported from config
import { API_URL } from '@/config/api';

export default function SettingsCards({ token, platformConfig, onConfigUpdate }) {
  const [isLoading, setIsLoading] = useState(false);
  const [cardPricesForm, setCardPricesForm] = useState({
    silver_price: 25, gold_price: 50, platinum_price: 100,
    silver_benefits: '3% cashback on all purchases', 
    gold_benefits: '5% cashback + Priority support',
    platinum_benefits: '7% cashback + VIP benefits + Exclusive offers',
    silver_duration: 365, gold_duration: 365, platinum_duration: 730,
    silver_welcome_bonus: 1, gold_welcome_bonus: 2, platinum_welcome_bonus: 3
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (platformConfig) {
      // Read from the correct nested structure stored in database
      const cardPrices = platformConfig.card_prices || {};
      const cardBenefits = platformConfig.card_benefits || {};
      const cardDurations = platformConfig.card_durations || {};
      const welcomeBonuses = platformConfig.welcome_bonuses || {};
      
      setCardPricesForm({
        silver_price: cardPrices.silver || platformConfig.silver_card_price || 25,
        gold_price: cardPrices.gold || platformConfig.gold_card_price || 50,
        platinum_price: cardPrices.platinum || platformConfig.platinum_card_price || 100,
        silver_benefits: cardBenefits.silver || platformConfig.silver_card_benefits || '3% cashback on all purchases',
        gold_benefits: cardBenefits.gold || platformConfig.gold_card_benefits || '5% cashback + Priority support',
        platinum_benefits: cardBenefits.platinum || platformConfig.platinum_card_benefits || '7% cashback + VIP benefits + Exclusive offers',
        silver_duration: cardDurations.silver || platformConfig.silver_card_duration || 365,
        gold_duration: cardDurations.gold || platformConfig.gold_card_duration || 365,
        platinum_duration: cardDurations.platinum || platformConfig.platinum_card_duration || 730,
        silver_welcome_bonus: welcomeBonuses.silver || platformConfig.silver_welcome_bonus || 1,
        gold_welcome_bonus: welcomeBonuses.gold || platformConfig.gold_welcome_bonus || 2,
        platinum_welcome_bonus: welcomeBonuses.platinum || platformConfig.platinum_welcome_bonus || 3
      });
    }
  }, [platformConfig]);

  const handleSaveCardPrices = async () => {
    try {
      setIsLoading(true);
      
      // Validate and sanitize numeric values
      const sanitizeNumber = (value, defaultValue = 0) => {
        const num = parseFloat(value);
        if (isNaN(num)) return defaultValue;
        return num;
      };
      
      const payload = {
        silver_card_price: sanitizeNumber(cardPricesForm.silver_price, 25),
        gold_card_price: sanitizeNumber(cardPricesForm.gold_price, 50),
        platinum_card_price: sanitizeNumber(cardPricesForm.platinum_price, 100),
        silver_card_benefits: cardPricesForm.silver_benefits || '3% cashback on all purchases',
        gold_card_benefits: cardPricesForm.gold_benefits || '5% cashback + Priority support',
        platinum_card_benefits: cardPricesForm.platinum_benefits || '7% cashback + VIP benefits',
        silver_card_duration: sanitizeNumber(cardPricesForm.silver_duration, 365),
        gold_card_duration: sanitizeNumber(cardPricesForm.gold_duration, 365),
        platinum_card_duration: sanitizeNumber(cardPricesForm.platinum_duration, 730),
        silver_welcome_bonus: sanitizeNumber(cardPricesForm.silver_welcome_bonus, 1),
        gold_welcome_bonus: sanitizeNumber(cardPricesForm.gold_welcome_bonus, 2),
        platinum_welcome_bonus: sanitizeNumber(cardPricesForm.platinum_welcome_bonus, 3)
      };
      
      await axios.put(`${API_URL}/api/admin/platform-config`, payload, { headers });
      toast.success('Card prices updated');
      onConfigUpdate?.();
    } catch (error) {
      console.error('Card prices update error:', error);
      toast.error(error.response?.data?.detail || 'Failed to update card prices');
    } finally {
      setIsLoading(false);
    }
  };

  const durationOptions = [
    { value: 30, label: '1 month' },
    { value: 90, label: '3 months' },
    { value: 180, label: '6 months' },
    { value: 365, label: '1 year' },
    { value: 730, label: '2 years' }
  ];

  return (
    <div className="space-y-6">
      {/* Default Cards Configuration */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
          <CreditCard size={20} className="text-amber-400" /> 
          Default Cards (Price, Duration, Benefits)
        </h3>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* Silver Card */}
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-600">
            <div className="flex items-center gap-2 mb-4">
              <Medal className="text-slate-400" size={24} />
              <h4 className="text-white font-medium">Silver Card</h4>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-slate-400 text-sm">Price (GHS)</Label>
                <Input
                  type="number"
                  value={cardPricesForm.silver_price}
                  onChange={(e) => setCardPricesForm({...cardPricesForm, silver_price: parseFloat(e.target.value)})}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-sm">Duration</Label>
                <select
                  value={cardPricesForm.silver_duration || 365}
                  onChange={(e) => setCardPricesForm({...cardPricesForm, silver_duration: parseInt(e.target.value)})}
                  className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                >
                  {durationOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-slate-400 text-sm">Benefits</Label>
                <textarea
                  value={cardPricesForm.silver_benefits}
                  onChange={(e) => setCardPricesForm({...cardPricesForm, silver_benefits: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm mt-1 min-h-[60px]"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-sm">Welcome Bonus (GHS)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={cardPricesForm.silver_welcome_bonus}
                  onChange={(e) => setCardPricesForm({...cardPricesForm, silver_welcome_bonus: parseFloat(e.target.value)})}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
            </div>
          </div>

          {/* Gold Card */}
          <div className="bg-gradient-to-br from-amber-900/30 to-slate-900 rounded-xl p-4 border border-amber-700/50">
            <div className="flex items-center gap-2 mb-4">
              <Award className="text-amber-400" size={24} />
              <h4 className="text-amber-400 font-medium">Gold Card</h4>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-slate-400 text-sm">Price (GHS)</Label>
                <Input
                  type="number"
                  value={cardPricesForm.gold_price}
                  onChange={(e) => setCardPricesForm({...cardPricesForm, gold_price: parseFloat(e.target.value)})}
                  className="bg-slate-800 border-amber-700/50 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-sm">Duration</Label>
                <select
                  value={cardPricesForm.gold_duration || 365}
                  onChange={(e) => setCardPricesForm({...cardPricesForm, gold_duration: parseInt(e.target.value)})}
                  className="w-full mt-1 px-3 py-2 bg-slate-800 border border-amber-700/50 rounded-md text-white"
                >
                  {durationOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-slate-400 text-sm">Benefits</Label>
                <textarea
                  value={cardPricesForm.gold_benefits}
                  onChange={(e) => setCardPricesForm({...cardPricesForm, gold_benefits: e.target.value})}
                  className="w-full bg-slate-800 border border-amber-700/50 rounded-lg p-2 text-white text-sm mt-1 min-h-[60px]"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-sm">Welcome Bonus (GHS)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={cardPricesForm.gold_welcome_bonus}
                  onChange={(e) => setCardPricesForm({...cardPricesForm, gold_welcome_bonus: parseFloat(e.target.value)})}
                  className="bg-slate-800 border-amber-700/50 text-white mt-1"
                />
              </div>
            </div>
          </div>

          {/* Platinum Card */}
          <div className="bg-gradient-to-br from-purple-900/30 to-slate-900 rounded-xl p-4 border border-purple-700/50">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="text-purple-400" size={24} />
              <h4 className="text-purple-400 font-medium">Platinum Card</h4>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-slate-400 text-sm">Price (GHS)</Label>
                <Input
                  type="number"
                  value={cardPricesForm.platinum_price}
                  onChange={(e) => setCardPricesForm({...cardPricesForm, platinum_price: parseFloat(e.target.value)})}
                  className="bg-slate-800 border-purple-700/50 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-sm">Duration</Label>
                <select
                  value={cardPricesForm.platinum_duration || 730}
                  onChange={(e) => setCardPricesForm({...cardPricesForm, platinum_duration: parseInt(e.target.value)})}
                  className="w-full mt-1 px-3 py-2 bg-slate-800 border border-purple-700/50 rounded-md text-white"
                >
                  {durationOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-slate-400 text-sm">Benefits</Label>
                <textarea
                  value={cardPricesForm.platinum_benefits}
                  onChange={(e) => setCardPricesForm({...cardPricesForm, platinum_benefits: e.target.value})}
                  className="w-full bg-slate-800 border border-purple-700/50 rounded-lg p-2 text-white text-sm mt-1 min-h-[60px]"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-sm">Welcome Bonus (GHS)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={cardPricesForm.platinum_welcome_bonus}
                  onChange={(e) => setCardPricesForm({...cardPricesForm, platinum_welcome_bonus: parseFloat(e.target.value)})}
                  className="bg-slate-800 border-purple-700/50 text-white mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleSaveCardPrices}
          disabled={isLoading}
          className="mt-6 bg-blue-600 hover:bg-blue-700"
          data-testid="save-card-prices-btn"
        >
          {isLoading ? (
            <Loader2 className="animate-spin mr-2" size={16} />
          ) : (
            <Save className="mr-2" size={16} />
          )}
          {isLoading ? 'Saving...' : 'Save Card Prices'}
        </Button>
      </div>
    </div>
  );
}
