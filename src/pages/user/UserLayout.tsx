import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { UserProvider, useUser } from './UserContext';

import { Navbar } from '../../components/Navbar';
import { Toaster } from '../../components/ui/toaster';
import { BatchActionBar } from '../../components/BatchActionBar';
import { UploadModal } from '../../components/UploadModal';
import { LinkGeneratorModal } from '../../components/LinkGeneratorModal';
import { ImageLightbox } from '../../components/ImageLightbox';
import { AlbumManagerModal } from '../../components/AlbumManagerModal';
import { SettingsModal } from '../../components/SettingsModal';
import { AuthModal } from '../../components/AuthModal';
import { UserProfileModal } from '../../components/UserProfileModal';
import { ChangePasswordModal } from '../../components/ChangePasswordModal';

const UserLayoutContent: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const {
    images,
    albums,
    currentTab,
    handleTabChange,
    uploadQueue,
    setUploadQueue,
    isUploadModalOpen,
    setIsUploadModalOpen,
    isLinkModalOpen,
    setIsLinkModalOpen,
    linkModalImages,
    isAlbumModalOpen,
    setIsAlbumModalOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    isProfileModalOpen,
    setIsProfileModalOpen,
    isPasswordModalOpen,
    setIsPasswordModalOpen,
    previewImage,
    setPreviewImage,
    filters,
    setFilters,
    filteredImages,
    selectedImagesList,
    totalStorageBytes,
    showToast,
    handleUpdateImage,
    handleDeleteImage,
    handleToggleFavorite,
    handleSaveUploadMetadata,
    handleCreateAlbum,
    handleUpdateAlbum,
    handleDeleteAlbum,
    handleClearSelection,
    handleBatchMoveToAlbum,
    handleBatchDelete,
    handleOpenBatchLinks,
    handleOpenUpload,
    handleOpenAlbums,
    handleOpenSettings,
    handleOpenAuth,
    handleOpenProfile,
    handleOpenPassword,
  } = useUser();

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-blue-500 selection:text-white ${
        isDark ? 'bg-[#050505] text-white' : 'bg-neutral-50 text-neutral-900'
      }`}
    >
      {/* Toast Notification Container */}
      <Toaster />

      {/* Main Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        totalImagesCount={images.length}
        totalStorageBytes={totalStorageBytes}
        albums={albums}
        filters={filters}
        onFilterChange={(newFilters) => setFilters((prev) => ({ ...prev, ...newFilters }))}
        onOpenUpload={handleOpenUpload}
        onOpenAlbums={handleOpenAlbums}
        onOpenSettings={handleOpenSettings}
        onOpenAdmin={() => navigate('/admin')}
        onOpenAuth={handleOpenAuth}
        onOpenProfile={handleOpenProfile}
        onOpenPassword={handleOpenPassword}
        onShowToast={showToast}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer
        className={`w-full border-t py-8 px-4 text-center text-xs mt-12 transition-colors ${
          isDark
            ? 'border-white/10 bg-[#050505] text-white/40'
            : 'border-neutral-200 bg-white text-neutral-500'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className={`font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              {t('common.appName')} Wan Pictures
            </span>
            <span>— {t('common.appSubtitle')}</span>
          </div>
          <p className={isDark ? 'text-white/30' : 'text-neutral-400'}>
            Drag & Drop Upload · Clipboard Paste · Auto Link Generator · Light/Dark Theme · Multi-Cloud Storage
          </p>
        </div>
      </footer>

      {/* Floating Batch Action Bar - only when authenticated and in workspace */}
      {isAuthenticated && currentTab === 'workspace' && (
        <BatchActionBar
          selectedImages={selectedImagesList}
          albums={albums}
          onClearSelection={handleClearSelection}
          onOpenBatchLinks={handleOpenBatchLinks}
          onBatchMoveToAlbum={handleBatchMoveToAlbum}
          onBatchDelete={handleBatchDelete}
          onShowToast={showToast}
        />
      )}

      {/* Upload Progress Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        queue={uploadQueue}
        onClose={() => setIsUploadModalOpen(false)}
        onSaveMetadata={handleSaveUploadMetadata}
        onViewLinks={() => {
          setIsUploadModalOpen(false);
          setIsLinkModalOpen(true);
        }}
        onRemoveItem={(id) => setUploadQueue((prev) => prev.filter((i) => i.id !== id))}
      />

      {/* Link Generator & Copy Hub */}
      <LinkGeneratorModal
        isOpen={isLinkModalOpen}
        images={linkModalImages}
        onClose={() => setIsLinkModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Fullscreen Lightbox & Inspector */}
      <ImageLightbox
        image={previewImage}
        images={filteredImages}
        albums={albums}
        onClose={() => setPreviewImage(null)}
        onNavigate={setPreviewImage}
        onUpdateImage={handleUpdateImage}
        onDelete={handleDeleteImage}
        onToggleFavorite={handleToggleFavorite}
        onShowToast={showToast}
      />

      {/* Album Manager Modal */}
      <AlbumManagerModal
        isOpen={isAlbumModalOpen}
        albums={albums}
        images={images}
        onClose={() => setIsAlbumModalOpen(false)}
        onCreateAlbum={handleCreateAlbum}
        onUpdateAlbum={handleUpdateAlbum}
        onDeleteAlbum={handleDeleteAlbum}
        onShowToast={showToast}
        onOpenAuth={handleOpenAuth}
      />

      {/* Settings & Storage Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onShowToast={showToast}
      />

      {/* User Login & Register Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onShowToast={showToast}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onShowToast={showToast}
      />
    </div>
  );
};

export const UserLayout: React.FC = () => {
  return (
    <UserProvider>
      <UserLayoutContent />
    </UserProvider>
  );
};
