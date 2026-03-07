/**
 * SpotlightBar Component
 *
 * Arc/Spotlight-style search bar at the top of the feed.
 * Collapsed: minimal pill with hint. Expanded: textarea with actions.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import './SpotlightBar.css';

const SpotlightBar = ({ onSubmit, isLoading, activeFragment, chatMode = 'direct' }) => {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [hasApiKey, setHasApiKey] = useState(
    () => !!localStorage.getItem('zoh_llm_api_key')
  );
  const [showSettings, setShowSettings] = useState(false);
  const textareaRef = useRef(null);
  const barRef = useRef(null);
  const settingsRef = useRef(null);

  // Focus textarea on expand
  useEffect(() => {
    if (expanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [expanded]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [query]);

  // Global `/` key to focus
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

      if (e.key === '/') {
        e.preventDefault();
        setExpanded(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to collapse (if empty)
  useEffect(() => {
    if (!expanded) return;

    const handleClickOutside = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        if (!query.trim()) {
          setExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expanded, query]);

  // Close settings on outside click
  useEffect(() => {
    if (!showSettings) return;
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSettings]);

  const handleSubmit = useCallback(() => {
    const text = query.trim();
    if (!text || isLoading) return;

    if (chatMode !== 'openclaw' && !hasApiKey) {
      setShowSettings(true);
      return;
    }

    onSubmit(text);
    setQuery('');
    setExpanded(false);
  }, [query, isLoading, chatMode, hasApiKey, onSubmit]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setQuery('');
      setExpanded(false);
    }
  };

  const handleSaveSettings = () => {
    const provider = document.getElementById('spotlight-provider')?.value || 'anthropic';
    const key = document.getElementById('spotlight-key')?.value || '';
    const model = document.getElementById('spotlight-model')?.value || '';
    localStorage.setItem('zoh_llm_provider', provider);
    localStorage.setItem('zoh_llm_api_key', key);
    localStorage.setItem('zoh_llm_model', model);
    setHasApiKey(!!key.trim());
    setShowSettings(false);
  };

  // Build contextual placeholder
  let placeholder = 'Ask Zoh anything...';
  if (activeFragment) {
    const arch = (activeFragment.archetype || 'fragment').replace(/_/g, ' ');
    placeholder = `Ask about this ${arch}...`;
  }

  return (
    <div className={`spotlight-bar ${expanded ? 'expanded' : ''}`} ref={barRef}>
      {!expanded ? (
        // Collapsed pill
        <button
          className="spotlight-pill"
          onClick={() => setExpanded(true)}
        >
          <svg className="spotlight-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span className="spotlight-placeholder">{placeholder}</span>
          <span className="spotlight-shortcut">/</span>
        </button>
      ) : (
        // Expanded input
        <div className="spotlight-expanded">
          <div className="spotlight-input-row">
            <svg className="spotlight-icon-expanded" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <textarea
              ref={textareaRef}
              className="spotlight-textarea"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
            />
          </div>
          <div className="spotlight-actions">
            {chatMode !== 'openclaw' && (
              <button
                className={`spotlight-settings-btn ${hasApiKey ? 'has-key' : ''}`}
                onClick={() => setShowSettings(!showSettings)}
                title="AI Settings"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                {hasApiKey && <span className="settings-dot" />}
              </button>
            )}
            <div className="spotlight-actions-right">
              <button
                className="spotlight-cancel-btn"
                onClick={() => { setQuery(''); setExpanded(false); }}
              >
                Cancel
              </button>
              <button
                className="spotlight-submit-btn"
                onClick={handleSubmit}
                disabled={!query.trim() || isLoading}
              >
                {isLoading ? (
                  <span className="spotlight-loading">
                    <span /><span /><span />
                  </span>
                ) : 'Ask'}
              </button>
            </div>
          </div>

          {/* Settings popover */}
          {showSettings && (
            <div className="spotlight-settings-popover" ref={settingsRef}>
              <div className="spotlight-settings-title">AI Settings</div>
              <label className="spotlight-settings-label">Provider</label>
              <select
                id="spotlight-provider"
                className="spotlight-settings-select"
                defaultValue={localStorage.getItem('zoh_llm_provider') || 'anthropic'}
              >
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
              </select>
              <label className="spotlight-settings-label">API Key</label>
              <input
                id="spotlight-key"
                type="password"
                className="spotlight-settings-input"
                placeholder="sk-..."
                defaultValue={localStorage.getItem('zoh_llm_api_key') || ''}
              />
              <label className="spotlight-settings-label">Model (optional)</label>
              <input
                id="spotlight-model"
                type="text"
                className="spotlight-settings-input"
                placeholder="Default"
                defaultValue={localStorage.getItem('zoh_llm_model') || ''}
              />
              <button className="spotlight-settings-save" onClick={handleSaveSettings}>
                Save
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SpotlightBar;
