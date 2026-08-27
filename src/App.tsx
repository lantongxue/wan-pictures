/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';

// User Front-End System & Pages
import { UserLayout, UserWorkspacePage, UserPlazaPage, DeveloperPage } from './pages/user';

// Admin Management System & Sub-pages
import { AdminLayout } from './layouts/AdminLayout';
import { AdminGuard } from './pages/admin/AdminGuard';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminImagesPage } from './pages/admin/AdminImagesPage';
import { AdminAlbumsPage } from './pages/admin/AdminAlbumsPage';
import { AdminTagsPage } from './pages/admin/AdminTagsPage';
import { AdminStoragePage } from './pages/admin/AdminStoragePage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminApiKeysPage } from './pages/admin/AdminApiKeysPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminLogsPage } from './pages/admin/AdminLogsPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* User Front-End Routes: Default root route is Image Plaza */}
            <Route path="/" element={<UserLayout />}>
              <Route index element={<UserPlazaPage />} />
              <Route path="plaza" element={<UserPlazaPage />} />
              <Route path="workspace" element={<UserWorkspacePage />} />
              <Route path="developer" element={<DeveloperPage />} />
            </Route>

            {/* Independent Admin Management System */}
            <Route path="/admin" element={<AdminGuard />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/overview" replace />} />
                <Route path="overview" element={<AdminOverviewPage />} />
                <Route path="images" element={<AdminImagesPage />} />
                <Route path="albums" element={<AdminAlbumsPage />} />
                <Route path="tags" element={<AdminTagsPage />} />
                <Route path="storage" element={<AdminStoragePage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="api-keys" element={<AdminApiKeysPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="logs" element={<AdminLogsPage />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
