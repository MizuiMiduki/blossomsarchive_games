// Google Analytics (GA4) & Google AdSense 遅延ロード・初期化モジュール
// ユーザーの初期インタラクション（タップ・キー操作等）を契機に読み込むことでLCPやCore Web Vitalsを最大化

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const ADSENSE_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID;

let thirdPartyLoaded = false;

export function initThirdPartyScripts(initialPath: string = window.location.pathname) {
  if (typeof window === 'undefined') return;

  const triggerLoad = () => {
    if (thirdPartyLoaded) return;
    thirdPartyLoaded = true;
    cleanupTriggers();

    // 1. Google Analytics (GA4) の遅延ロード
    if (GA_ID) {
      const gaScript = document.createElement('script');
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
      gaScript.onload = () => {
        const win = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
        win.dataLayer = win.dataLayer || [];
        function gtag(..._args: unknown[]) {
          win.dataLayer?.push(arguments);
        }
        win.gtag = gtag;
        gtag('js', new Date());
        gtag('config', GA_ID, {
          page_path: initialPath,
          page_title: document.title,
        });
      };
      document.head.appendChild(gaScript);
    }

    // 2. Google AdSense の遅延ロード
    if (ADSENSE_ID) {
      const adsScript = document.createElement('script');
      adsScript.async = true;
      adsScript.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`;
      adsScript.crossOrigin = 'anonymous';
      document.head.appendChild(adsScript);

      // AdSenseの自動広告がbody/htmlを無理に押し下げるのを防止
      if (typeof MutationObserver !== 'undefined') {
        const preventPushdown = () => {
          if (document.body.style.paddingTop) document.body.style.paddingTop = '0px';
          if (document.body.style.marginTop) document.body.style.marginTop = '0px';
          if (document.documentElement.style.paddingTop) document.documentElement.style.paddingTop = '0px';
          if (document.documentElement.style.marginTop) document.documentElement.style.marginTop = '0px';
        };
        const observer = new MutationObserver(preventPushdown);
        observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
      }
    }
  };

  const cleanupTriggers = () => {
    window.removeEventListener('pointerdown', triggerLoad);
    window.removeEventListener('touchstart', triggerLoad);
    window.removeEventListener('keydown', triggerLoad);
    window.removeEventListener('wheel', triggerLoad);
    window.removeEventListener('click', triggerLoad);
  };

  window.addEventListener('pointerdown', triggerLoad, { passive: true, once: true });
  window.addEventListener('touchstart', triggerLoad, { passive: true, once: true });
  window.addEventListener('keydown', triggerLoad, { passive: true, once: true });
  window.addEventListener('wheel', triggerLoad, { passive: true, once: true });
  window.addEventListener('click', triggerLoad, { passive: true, once: true });
}

// ページ遷移（SPAルーティング）時のページビュートラッキング
export function trackPageView(path: string, title?: string) {
  if (typeof window === 'undefined' || !GA_ID) return;
  const win = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (!win.gtag) return;
  try {
    win.gtag('config', GA_ID, {
      page_path: path,
      page_title: title || document.title,
    });
  } catch {
    // ignore
  }
}
