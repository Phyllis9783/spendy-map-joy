/**
 * Browser detection utilities for handling in-app browsers and mobile devices
 */

export const isInAppBrowser = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Detect common in-app browsers (especially Taiwan popular apps)
  const inAppBrowserPatterns = [
    /FBAN|FBAV/i, // Facebook
    /Instagram/i, // Instagram
    /Line/i, // LINE (very popular in Taiwan)
    /MicroMessenger/i, // WeChat
    /Twitter/i, // Twitter
    /LinkedIn/i, // LinkedIn
    /WhatsApp/i, // WhatsApp
    /Snapchat/i, // Snapchat
    /TikTok/i, // TikTok
    /FB_IAB/i, // Facebook In-App Browser
    /FBIOS/i, // Facebook iOS
    /Messenger/i, // Facebook Messenger
    /Telegram/i, // Telegram
    /Puffin/i, // Puffin Browser
    /UCBrowser/i, // UC Browser
  ];
  
  return inAppBrowserPatterns.some(pattern => pattern.test(ua));
};

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

export const getOpenInBrowserHint = (): string => {
  if (!isInAppBrowser()) return '';
  
  const ua = navigator.userAgent || '';
  
  if (/Line/i.test(ua)) {
    return '請點擊右上角「⋯」選單，選擇「在 Safari/Chrome 開啟」';
  } else if (/Instagram|FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) {
    return '請點擊右上角「⋯」選單，選擇「在瀏覽器中開啟」';
  } else if (/Messenger/i.test(ua)) {
    return '請點擊右上角選單，選擇「在瀏覽器中開啟」';
  }
  
  return '請點擊右上角選單，選擇「在瀏覽器中開啟」';
};

export const shouldShowGoogleLogin = (): boolean => {
  // Show Google login on desktop or normal mobile browsers
  // Hide on in-app browsers to avoid user confusion
  return !isInAppBrowser();
};
