/**
 * Browser detection utilities for handling in-app browsers and mobile devices
 */

export const isInAppBrowser = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Detect common in-app browsers
  const inAppBrowserPatterns = [
    /FBAN|FBAV/i, // Facebook
    /Instagram/i, // Instagram
    /Line/i, // LINE
    /MicroMessenger/i, // WeChat
    /Twitter/i, // Twitter
    /LinkedIn/i, // LinkedIn
    /WhatsApp/i, // WhatsApp
    /Snapchat/i, // Snapchat
    /TikTok/i, // TikTok
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
  
  return '如果無法使用 Google 登入，請點擊右上角「在瀏覽器中開啟」後再試';
};

export const shouldShowGoogleLogin = (): boolean => {
  // Show Google login on desktop or normal mobile browsers
  // Hide on in-app browsers to avoid user confusion
  return !isInAppBrowser();
};
