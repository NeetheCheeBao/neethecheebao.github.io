import { initBackgroundEffects } from './modules/bg-effects.js';
import { initGridCanvas } from './modules/grid-render.js';
import { loadBlogPosts } from './modules/blog-core.js';

initBackgroundEffects();
initGridCanvas();
window.addEventListener('DOMContentLoaded', loadBlogPosts);