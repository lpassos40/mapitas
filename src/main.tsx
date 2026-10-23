import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import { init } from './state';
import './styles/theme.css';

registerSW({ immediate: true });
render(<App />, document.getElementById('app')!);
void init();
