/**
 * AgentCard Component
 *
 * Renders agent content as a full-height card in the feed.
 * Supports two modes:
 * - Chat response: shows user question + agent answer (type='agent')
 * - Push card: proactive agent insight/synthesis/recommendation (type='agent-push')
 */

import React from 'react';
import './AgentCard.css';

const CARD_TYPE_LABELS = {
  insight: 'INSIGHT',
  synthesis: 'SYNTHESIS',
  recommendation: 'RECOMMENDED',
  digest: 'DIGEST',
};

const CARD_TYPE_COLORS = {
  insight: '#5b9eff',
  synthesis: '#a78bfa',
  recommendation: '#34d399',
  digest: '#fbbf24',
};

const AgentCard = ({
  response,
  error,
  fragmentContext,
  userMessage,
  onRetry,
  onOpenSettings,
  // Push card props
  cardType,
  title,
  sourceDomains,
  onDismiss,
  isReveal,
}) => {
  const isPushCard = !!cardType;
  const accentColor = isPushCard
    ? (CARD_TYPE_COLORS[cardType] || '#5b9eff')
    : '#5b9eff';
  const badgeLabel = isPushCard
    ? (CARD_TYPE_LABELS[cardType] || 'ZOH')
    : 'ZOH';

  const handleSourceClick = () => {
    if (fragmentContext?.url) {
      window.open(fragmentContext.url, '_blank', 'noopener,noreferrer');
    }
  };

  const formatArchetype = (archetype) => {
    if (!archetype) return 'Fragment';
    return archetype
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className={`fragment-card agent-card${isPushCard ? ' agent-push-card' : ''}${isReveal ? ' agent-result-reveal' : ''}`}>
      {/* Left accent border */}
      <div className="agent-accent" style={{ background: accentColor }} />

      <div className="agent-card-content">
        {/* Badge */}
        <div className="agent-badge" style={{ color: accentColor }}>
          {badgeLabel}
        </div>

        {/* Dismiss button for push cards */}
        {isPushCard && onDismiss && (
          <button className="agent-dismiss-btn" onClick={onDismiss} title="Dismiss">
            ×
          </button>
        )}

        {/* Title for push cards */}
        {isPushCard && title && (
          <div className="agent-push-title">{title}</div>
        )}

        {/* User's question (chat mode only) */}
        {!isPushCard && userMessage && (
          <div className="agent-question">
            "{userMessage}"
          </div>
        )}

        {/* Response or error */}
        {error ? (
          <div className="agent-error">
            <div className="agent-error-text">{error}</div>
            <div className="agent-error-actions">
              {onRetry && (
                <button className="agent-action-btn" onClick={onRetry}>
                  Try again
                </button>
              )}
              {error.toLowerCase().includes('api key') && onOpenSettings && (
                <button className="agent-action-btn agent-action-secondary" onClick={onOpenSettings}>
                  Open settings
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="agent-response">
            {response}
          </div>
        )}

        {/* Source reference (chat mode) */}
        {!isPushCard && fragmentContext && (
          <div className="agent-source" onClick={handleSourceClick}>
            <div className="fragment-archetype-badge">
              {formatArchetype(fragmentContext.archetype)}
            </div>
            <div className="fragment-domain">
              {fragmentContext.domain}
            </div>
          </div>
        )}

        {/* Source domains (push mode) */}
        {isPushCard && sourceDomains && sourceDomains.length > 0 && (
          <div className="agent-push-domains">
            {sourceDomains.map((domain, i) => (
              <span key={i} className="agent-domain-chip">{domain}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentCard;
