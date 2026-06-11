/**
 * Copyright 2026 The MediaPipe Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { isAuthConfigured, signOut } from '../lib/auth';

export function renderSidebar(container: HTMLElement) {
  const showSignOut = isAuthConfigured();

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
    ${
      showSignOut
        ? `
    <div class="sidebar-footer">
      <button type="button" id="sign-out-btn" class="sign-out-btn">
        <span class="material-icons">logout</span>
        Sign Out
      </button>
    </div>`
        : ''
    }
  `;

  const signOutBtn = container.querySelector('#sign-out-btn');
  signOutBtn?.addEventListener('click', async () => {
    signOutBtn.setAttribute('disabled', 'true');
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out failed', err);
      signOutBtn.removeAttribute('disabled');
    }
  });
}
