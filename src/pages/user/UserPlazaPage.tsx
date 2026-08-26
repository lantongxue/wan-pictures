import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from './UserContext';
import { ImagePlaza } from '../../components/ImagePlaza';

export const UserPlazaPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    images,
    albums,
    setPreviewImage,
    handleToggleFavorite,
    handleOpenBatchLinks,
    showToast,
    setAuthModalMode,
    setIsAuthModalOpen,
  } = useUser();

  return (
    <ImagePlaza
      images={images}
      albums={albums}
      onPreview={setPreviewImage}
      onToggleFavorite={handleToggleFavorite}
      onOpenBatchLinks={handleOpenBatchLinks}
      onShowToast={showToast}
      onOpenUpload={() => {
        if (!isAuthenticated) {
          showToast(t('albums.authRequiredTitle'), t('albums.authRequiredDesc'), 'warning');
          setAuthModalMode('login');
          setIsAuthModalOpen(true);
          return;
        }
        navigate('/workspace');
      }}
    />
  );
};
