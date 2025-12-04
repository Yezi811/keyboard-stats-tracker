import { UIController } from './UIController';

/**
 * Renderer process entry point
 * Initializes the UI when the DOM is ready
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const uiController = new UIController();
  uiController.initialize();
});
