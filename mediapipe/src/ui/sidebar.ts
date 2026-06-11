import { signOut } from '../lib/auth';

export function renderSidebar(container: HTMLElement) {
  container.innerHTML = `
    <div class="sidebar-header">
      <button class="menu-toggle material-icons" style="margin-right: 12px; color: var(--text-secondary); background: none; border: none; font-size: 24px; cursor: pointer;">menu_open</button>
      <div class="sidebar-logo-text">
        <span class="brand-name">ASCENDIA</span>
      </div>
    </div>
    <nav class="sidebar-nav">
      <ul>
        <li><a href="#/vision/holistic_landmarker" class="nav-button" data-task="holistic-landmarker">Holistic Landmarker</a></li>
        <li><a href="#/analysis/movement/overview" class="nav-button" data-task="movement-analysis">Movement Analysis</a></li>
      </ul>
    </nav>
    <div class="sidebar-footer">
      <button type="button" id="sign-out-btn" class="sign-out-btn">
        <span class="material-icons">logout</span>
        Sign Out
      </button>
    </div>
  `;

  const signOutBtn = container.querySelector('#sign-out-btn') as HTMLButtonElement | null;
  signOutBtn?.addEventListener('click', async () => {
    if (!signOutBtn) return;
    signOutBtn.disabled = true;
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out failed', err);
      signOutBtn.disabled = false;
    }
  });
}
