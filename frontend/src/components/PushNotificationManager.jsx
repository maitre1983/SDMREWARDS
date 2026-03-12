/**
 * Push Notification Manager Component for SDM
 * ============================================
 * Handles OneSignal push notification subscription
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Loader2, CheckCircle, XCircle, Smartphone } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import axios from 'axios';

// API URL imported from config
import { API_URL } from '@/config/api';
const ONESIGNAL_APP_ID = process.env.REACT_APP_ONESIGNAL_APP_ID;

export default function PushNotificationManager({ token, userType = 'user' }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playerId, setPlayerId] = useState(null);
  const [permissionState, setPermissionState] = useState('default');
  const [oneSignalReady, setOneSignalReady] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      setIsSupported(supported);
      
      if (supported) {
        setPermissionState(Notification.permission);
      }
      
      // Check if OneSignal is configured
      if (!ONESIGNAL_APP_ID) {
        console.log('OneSignal not configured - push notifications disabled');
        setIsLoading(false);
        return;
      }
      
      initOneSignal();
    };
    
    checkSupport();
  }, []);

  const initOneSignal = async () => {
    try {
      // Dynamically import OneSignal to avoid SSR issues
      const OneSignal = (await import('react-onesignal')).default;
      
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: {
          enable: false, // We use our own UI
        },
      });

      setOneSignalReady(true);

      // Check current subscription status
      const subscriptionId = await OneSignal.User.PushSubscription.getIdAsync();
      if (subscriptionId) {
        setPlayerId(subscriptionId);
        setIsSubscribed(true);
      }

      // Listen for subscription changes
      OneSignal.User.PushSubscription.addEventListener('change', (event) => {
        console.log('Subscription changed:', event);
        if (event.current.id) {
          setPlayerId(event.current.id);
          setIsSubscribed(event.current.optedIn);
        } else {
          setPlayerId(null);
          setIsSubscribed(false);
        }
      });

    } catch (error) {
      console.error('OneSignal init error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!oneSignalReady) {
      toast.error('Push notifications not available');
      return;
    }

    setIsLoading(true);

    try {
      const OneSignal = (await import('react-onesignal')).default;
      
      // Request permission via OneSignal
      await OneSignal.Slidedown.promptPush();

      // Get subscription ID
      const subscriptionId = await OneSignal.User.PushSubscription.getIdAsync();
      
      if (subscriptionId) {
        // Register with backend
        const endpoint = userType === 'merchant' 
          ? '/api/sdm/merchant/push/register' 
          : '/api/sdm/user/push/register';
        
        await axios.post(endpoint, {
          player_id: subscriptionId,
          platform: 'web',
          device_model: navigator.userAgent.substring(0, 100)
        }, { 
          baseURL: API_URL,
          headers 
        });

        setPlayerId(subscriptionId);
        setIsSubscribed(true);
        toast.success('🔔 Notifications push activées!');
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      if (error.message?.includes('denied')) {
        toast.error('Notifications bloquées. Activez-les dans les paramètres du navigateur.');
      } else {
        toast.error('Erreur lors de l\'activation des notifications');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!oneSignalReady || !playerId) return;

    setIsLoading(true);

    try {
      const OneSignal = (await import('react-onesignal')).default;
      
      // Unsubscribe from OneSignal
      await OneSignal.User.PushSubscription.optOut();

      // Unregister from backend
      const endpoint = userType === 'merchant' 
        ? '/api/sdm/merchant/push/unregister' 
        : '/api/sdm/user/push/unregister';
      
      await axios.post(`${endpoint}?player_id=${playerId}`, {}, { 
        baseURL: API_URL,
        headers 
      });

      setPlayerId(null);
      setIsSubscribed(false);
      toast.success('Notifications push désactivées');
    } catch (error) {
      console.error('Unsubscribe error:', error);
      toast.error('Erreur lors de la désactivation');
    } finally {
      setIsLoading(false);
    }
  };

  // Not supported or not configured
  if (!isSupported || !ONESIGNAL_APP_ID) {
    return (
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="flex items-center gap-3 text-slate-500">
          <BellOff size={20} />
          <div>
            <p className="font-medium">Notifications push</p>
            <p className="text-sm">
              {!isSupported 
                ? 'Non supportées par ce navigateur' 
                : 'Configuration en attente'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Permission denied
  if (permissionState === 'denied') {
    return (
      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
        <div className="flex items-center gap-3 text-red-600">
          <XCircle size={20} />
          <div>
            <p className="font-medium">Notifications bloquées</p>
            <p className="text-sm">
              Activez les notifications dans les paramètres de votre navigateur
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Bell size={20} className="text-emerald-600" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
              <BellOff size={20} className="text-slate-400" />
            </div>
          )}
          <div>
            <p className="font-medium text-slate-900">Notifications push</p>
            <p className="text-sm text-slate-500">
              {isSubscribed 
                ? 'Recevez des alertes en temps réel' 
                : 'Activez pour ne rien manquer'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <Loader2 className="animate-spin text-slate-400" size={20} />
        ) : isSubscribed ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnsubscribe}
            className="text-slate-600"
          >
            Désactiver
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleSubscribe}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Bell size={16} />
            Activer
          </Button>
        )}
      </div>

      {isSubscribed && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Smartphone size={14} />
            <span>Appareil enregistré</span>
            <CheckCircle size={14} className="text-emerald-500 ml-auto" />
          </div>
        </div>
      )}
    </div>
  );
}
