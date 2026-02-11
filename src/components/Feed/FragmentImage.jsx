/**
 * FragmentImage Component
 *
 * Lazy-loaded image component for fragment screenshots
 * Shows loading skeleton and error placeholder
 */

import React, { useState, useEffect, useRef } from 'react';
import { getFragmentScreenshotUrl } from '../../services/api';

const FragmentImage = ({ fragmentId, archetype, domain }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      {
        rootMargin: '3000px' // Start loading 3000px before entering viewport (3-4 fragments ahead)
      }
    );

    const currentRef = imgRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const screenshotUrl = getFragmentScreenshotUrl(fragmentId);

  return (
    <div ref={imgRef} className="fragment-image-container">
      {isLoading && !hasError && (
        <div className="fragment-image-skeleton">
          <div className="skeleton-pulse"></div>
          <span className="loading-text">Loading...</span>
        </div>
      )}

      {hasError && (
        <div className="fragment-image-placeholder">
          <div className="placeholder-icon">📷</div>
          <p className="placeholder-text">Screenshot unavailable</p>
          <p className="placeholder-meta">{archetype || 'Fragment'}</p>
          <p className="placeholder-domain">{domain}</p>
        </div>
      )}

      {isVisible && !hasError && (
        <img
          src={screenshotUrl}
          alt={`Fragment from ${domain} - ${archetype || 'content'}`}
          className={`fragment-image ${isLoading ? 'fragment-image-loading' : 'fragment-image-loaded'}`}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
};

export default FragmentImage;
