import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import PinnedApp from './PinnedApp.svelte';

const params = new URLSearchParams(window.location.search);
const windowRole = params.get('window'); // 'pin' for popup windows, else main

const target = document.getElementById('app');
if (!target) throw new Error('#app element not found');

const Root = windowRole === 'pin' ? PinnedApp : App;

export default mount(Root, { target });
