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

export function renderMobileNav(container: HTMLElement) {
  container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; flex-grow: 1;">
        <span class="brand-name brand-name--compact">ASCENDIA</span>
        <span style="font-family: 'Inter', system-ui, sans-serif; font-size: 0.9rem; color: var(--ash);">Holistic Landmarker</span>
      </div>
  `;
}
