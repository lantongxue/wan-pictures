import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useUser } from './UserContext';
import { StorageAuthGuard } from '../../components/StorageAuthGuard';
import { UploadHero } from '../../components/UploadHero';
import { GalleryGrid } from '../../components/GalleryGrid';
import { Badge } from '../../components/ui/badge';

export const UserWorkspacePage: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const {
    albums,
    filteredImages,
    filters,
    setFilters,
    selectedIds,
    uploadTargetAlbumId,
    setUploadTargetAlbumId,
    handleFilesSelected,
    handleUrlImport,
    handleToggleSelect,
    handleSelectAll,
    handleClearSelection,
    setPreviewImage,
    handleDeleteImage,
    handleToggleFavorite,
    showToast,
    handleOpenAuth,
    handleTabChange,
  } = useUser();

  if (!isAuthenticated) {
    return (
      <StorageAuthGuard
        onOpenAuth={handleOpenAuth}
        onGoToPlaza={() => handleTabChange('plaza')}
        onShowToast={showToast}
      />
    );
  }

  return (
    <>
      {/* Grand Hero Upload Zone */}
      <UploadHero
        onFilesSelected={handleFilesSelected}
        onUrlImport={handleUrlImport}
        albums={albums}
        selectedAlbumId={uploadTargetAlbumId}
        onAlbumChange={setUploadTargetAlbumId}
      />

      {/* Gallery Library Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2
              className={`text-xl sm:text-2xl font-light tracking-tight flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-neutral-950'
              }`}
            >
              <span>{t('nav.workspace')}</span>
              <Badge variant="subtle" className="text-xs font-mono">
                {filteredImages.length} {t('common.items')}
              </Badge>
            </h2>
            <p
              className={`text-xs uppercase tracking-wide mt-0.5 ${
                isDark ? 'text-white/40' : 'text-neutral-500'
              }`}
            >
              Multi-format compiler, batch exporter, zoom/pan inspector & custom album spaces
            </p>
          </div>
        </div>

        <GalleryGrid
          images={filteredImages}
          albums={albums}
          filters={filters}
          onFilterChange={(newFilters) => setFilters((prev) => ({ ...prev, ...newFilters }))}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          onPreview={setPreviewImage}
          onDelete={handleDeleteImage}
          onToggleFavorite={handleToggleFavorite}
          onShowToast={showToast}
          onOpenUpload={() => document.getElementById('hidden-file-input')?.click()}
        />
      </div>
    </>
  );
};
