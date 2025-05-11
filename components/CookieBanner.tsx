'use client';

import { useState, useEffect } from 'react';
import { X, Settings, Cookie, Shield, BarChart } from 'lucide-react';

// Cookie consent expiration in days
const CONSENT_EXPIRATION_DAYS = 180; // 6 months

// Define types for cookie preferences
interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
}

// Define valid cookie category keys for type safety
type CookieCategory = keyof CookiePreferences;

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always required
    functional: true,
    analytics: true
  });
  
  useEffect(() => {
    // Check if user has already set cookie preferences
    const storedConsent = getCookieConsent();
    if (!storedConsent) {
      setShowBanner(true);
    } else {
      setPreferences(storedConsent);
    }
  }, []);
  
  // Get stored cookie consent from actual cookie (not localStorage)
  const getCookieConsent = (): CookiePreferences | null => {
    const consentCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('cookie-consent='));
      
    if (consentCookie) {
      try {
        return JSON.parse(decodeURIComponent(consentCookie.split('=')[1]));
      } catch (e) {
        return null;
      }
    }
    return null;
  };
  
  // Set cookie consent with expiration
  const setCookieConsent = (preferences: CookiePreferences): void => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + CONSENT_EXPIRATION_DAYS);
    
    document.cookie = `cookie-consent=${encodeURIComponent(JSON.stringify(preferences))}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
    
    // Apply preferences to existing cookies
    if (!preferences.functional) {
      // Remove functional cookies
      removeCookie('signup_team_id');
      removeCookie('google_drive_auth_state');
    }
    
    if (!preferences.analytics) {
      // Remove analytics cookies (if you add any in the future)
    }
  };
  
  const removeCookie = (name: string): void => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
  };
  
  const handleAcceptAll = (): void => {
    const newPreferences: CookiePreferences = {
      essential: true,
      functional: true,
      analytics: true
    };
    setPreferences(newPreferences);
    setCookieConsent(newPreferences);
    setShowBanner(false);
    setShowSettings(false);
  };
  
  const handleDeclineNonEssential = (): void => {
    const newPreferences: CookiePreferences = {
      essential: true,
      functional: false,
      analytics: false
    };
    setPreferences(newPreferences);
    setCookieConsent(newPreferences);
    setShowBanner(false);
    setShowSettings(false);
  };
  
  const handleSavePreferences = (): void => {
    setCookieConsent(preferences);
    setShowBanner(false);
    setShowSettings(false);
  };
  
  const togglePreference = (key: CookieCategory): void => {
    if (key === 'essential') return; // Cannot toggle essential
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  if (!showBanner && !showSettings) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-xl border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {showSettings ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Cookie className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Cookie Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-5 mb-6">
              {/* Essential cookies - always enabled */}
              <div className="flex items-start lg:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex gap-3">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-1 lg:mt-0 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Essential Cookies</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-xl">
                      Required for website functionality including authentication and session management.
                    </p>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-mono space-y-0.5">
                      <p>next-auth.session-token, next-auth.session</p>
                    </div>
                  </div>
                </div>
                <div className="ml-4 shrink-0">
                  <span className="px-3 py-1.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded-full font-medium">
                    Required
                  </span>
                </div>
              </div>
              
              {/* Functional cookies */}
              <div className="flex items-start lg:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex gap-3">
                  <Cookie className="h-5 w-5 text-amber-500 dark:text-amber-400 mt-1 lg:mt-0 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Functional Cookies</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-xl">
                      Enable additional features like team sign-up and external service connections.
                    </p>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-mono space-y-0.5">
                      <p>signup_team_id, google_drive_auth_state</p>
                    </div>
                  </div>
                </div>
                <div className="ml-4 shrink-0">
                  <button
                    onClick={() => togglePreference('functional')}
                    className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                      preferences.functional 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                        : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {preferences.functional ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
              
              {/* Analytics cookies */}
              <div className="flex items-start lg:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex gap-3">
                  <BarChart className="h-5 w-5 text-indigo-500 dark:text-indigo-400 mt-1 lg:mt-0 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Analytics Cookies</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-xl">
                      Help us understand how you use our website to improve your experience.
                    </p>
                  </div>
                </div>
                <div className="ml-4 shrink-0">
                  <button
                    onClick={() => togglePreference('analytics')}
                    className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                      preferences.analytics 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                        : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {preferences.analytics ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSettings(false)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreferences}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex gap-3">
                <Cookie className="h-6 w-6 text-blue-600 dark:text-blue-400 shrink-0 mt-1 md:mt-0" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Blolabel uses cookies
                  </h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300 max-w-2xl">
                    We use cookies to enhance your browsing experience and provide essential functionality. 
                    You can customize which cookies you allow us to use.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white dark:border-gray-700 rounded-lg text-sm font-medium flex items-center transition-colors"
                >
                  <Settings size={16} className="mr-2" />
                  Customize
                </button>
                <button
                  onClick={handleDeclineNonEssential}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Essential Only
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Accept All
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}