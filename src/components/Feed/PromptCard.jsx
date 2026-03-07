/**
 * PromptCard Component
 *
 * Agent-initiated conversational card with action buttons + optional text input.
 * Feels like a friend noticing something interesting and suggesting an exploration.
 */

import React, { useState } from 'react';
import { sendPromptAction } from '../../services/api';
import './PromptCard.css';

const PromptCard = ({ card, onDismiss, onActionComplete }) => {
  const [inputValue, setInputValue] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleAction = async (action) => {
    if (actionLoading) return;

    if (action.action === 'dismiss') {
      onDismiss?.();
      return;
    }

    setActionLoading(true);
    try {
      const result = await sendPromptAction(
        card.cardId,
        action.action,
        action.payload || null,
        card.allows_input ? inputValue.trim() || null : null,
      );
      onActionComplete?.(result);
    } catch (err) {
      console.error('Prompt action failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleInputSubmit = async () => {
    if (!inputValue.trim() || actionLoading) return;
    setActionLoading(true);
    try {
      const result = await sendPromptAction(
        card.cardId,
        'user_input',
        null,
        inputValue.trim(),
      );
      onActionComplete?.(result);
    } catch (err) {
      console.error('Prompt input failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInputSubmit();
    }
  };

  const actions = card.actions || [];

  return (
    <div className="fragment-card prompt-card">
      <div className="prompt-card-content">
        {/* Dismiss */}
        <button className="prompt-dismiss-btn" onClick={onDismiss} title="Dismiss">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Zoh badge */}
        <div className="prompt-badge">ZOH</div>

        {/* Body text */}
        <div className="prompt-body">{card.response || card.body}</div>

        {/* Action buttons */}
        {actions.length > 0 && (
          <div className="prompt-actions">
            {actions.map((action, i) => (
              <button
                key={i}
                className={`prompt-action-btn ${i === 0 ? 'primary' : 'secondary'}`}
                onClick={() => handleAction(action)}
                disabled={actionLoading}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Optional text input */}
        {card.allows_input && (
          <div className="prompt-input-row">
            <input
              type="text"
              className="prompt-input"
              placeholder={card.input_placeholder || 'Type your response...'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={actionLoading}
            />
            <button
              className="prompt-input-send"
              onClick={handleInputSubmit}
              disabled={!inputValue.trim() || actionLoading}
            >
              {actionLoading ? (
                <span className="prompt-loading"><span /><span /><span /></span>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        )}

        {/* Source domains */}
        {card.source_domains?.length > 0 && (
          <div className="prompt-domains">
            {card.source_domains.map((domain, i) => (
              <span key={i} className="prompt-domain-chip">{domain}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptCard;
