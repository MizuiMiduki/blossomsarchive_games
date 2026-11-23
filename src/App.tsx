import { Component, onSettled } from 'solid-js';
import { createRouter, browserHistory } from '@solidjs/router';
import { Home } from './pages/Home.tsx';
import { GameView } from './pages/GameView.tsx';
import { loadAppData } from './utils/storage.ts';
import { sound } from './utils/sound.ts';
import { initThirdPartyScripts } from './utils/analytics.ts';

const AppRouter = createRouter({
  history: browserHistory(),
  routes: [
    { path: '/', component: () => <Home /> },
    { path: '/game/:id', component: () => <GameView /> },
    { path: '*all', component: () => <Home /> },
  ],
});

export const App: Component = () => {
  onSettled(() => {
    const data = loadAppData();
    if (data.settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    sound.setMuted(data.settings.soundMuted);
    sound.setVolume(data.settings.volume);

    // Google Analytics & AdSense の遅延初期化
    initThirdPartyScripts();
  });

  return (
    <AppRouter>
      {(props) => props.children}
    </AppRouter>
  );
};
