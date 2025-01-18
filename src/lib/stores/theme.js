import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Get initial theme from localStorage or system preference
const getInitialTheme = () => {
  if (browser) {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
};

// Create the store
const darkMode = writable(getInitialTheme());

// Subscribe to changes and update localStorage and document class
if (browser) {
  darkMode.subscribe(isDark => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  });
}

export { darkMode };
