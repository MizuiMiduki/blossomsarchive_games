/* @refresh reload */
import { render } from '@solidjs/web';
import './index.css';
import { App } from './App.tsx';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error('Root element not found. Check index.html.');
}

render(() => <App />, root!);
