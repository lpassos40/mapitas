import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import { init } from './state';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/space-mono/latin-400.css';
import '@fontsource/space-mono/latin-700.css';
import './styles/theme.css';

registerSW({ immediate: true });
render(<App />, document.getElementById('app')!);
void init();
