/**
 * ChatBar Component
 *
 * Fixed input bar at the bottom of the feed for chatting with the Zoh agent.
 * Includes a settings popover for API key configuration.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import './ChatBar.css';

const PROVIDER_DEFAULTS = {
  anthropic: { placeholder: 'sk-ant-...', model: 'claude-sonnet-4-20250514' },
  openai: { placeholder: 'sk-...', model: 'gpt-4o-mini' },
};

const ChatBar = ({ onSend, isLoading, activeFragment, chatInputRef, inline = false, chatMode = 'direct' }) => {
  const [message, setMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(
    () => !!localStorage.getItem('zoh_llm_api_key')
  );
  const [pendingSend, setPendingSend] = useState(false);
  const settingsRef = useRef(null);
  const localInputRef = useRef(null);
  const inputRef = chatInputRef || localInputRef;

  // Settings state
  const [settingsProvider, setSettingsProvider] = useState(
    () => localStorage.getItem('zoh_llm_provider') || 'anthropic'
  );
  const [settingsKey, setSettingsKey] = useState(
    () => localStorage.getItem('zoh_llm_api_key') || ''
  );
  const [settingsModel, setSettingsModel] = useState(
    () => localStorage.getItem('zoh_llm_model') || ''
  );
  const [showKey, setShowKey] = useState(false);

  // Close settings on click-outside or Escape
  useEffect(() => {
    if (!showSettings) return;

    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowSettings(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showSettings]);

  // Auto-send after saving settings if there was a pending message
  useEffect(() => {
    if (pendingSend && hasApiKey && message.trim()) {
      setPendingSend(false);
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSend, hasApiKey]);

  const handleSubmit = useCallback(() => {
    const text = message.trim();
    if (!text || isLoading) return;

    // In openclaw mode, no API key needed
    if (chatMode !== 'openclaw' && !hasApiKey) {
      setPendingSend(true);
      setShowSettings(true);
      return;
    }

    onSend(text);
    setMessage('');
  }, [message, isLoading, hasApiKey, onSend, chatMode]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('zoh_llm_provider', settingsProvider);
    localStorage.setItem('zoh_llm_api_key', settingsKey);
    localStorage.setItem('zoh_llm_model', settingsModel);
    setHasApiKey(!!settingsKey.trim());
    setShowSettings(false);
  };

  const maskKey = (key) => {
    if (!key || key.length < 8) return key;
    return '\u2022'.repeat(8) + key.slice(-4);
  };

  // Build contextual placeholder
  let placeholder = 'Ask Zoh anything...';
  if (isLoading) {
    placeholder = 'Zoh is thinking...';
  } else if (activeFragment) {
    const archetype = activeFragment.archetype || 'fragment';
    const formatted = archetype.replace(/_/g, ' ');
    placeholder = `Ask about this ${formatted}...`;
  }

  const providerDefaults = PROVIDER_DEFAULTS[settingsProvider] || PROVIDER_DEFAULTS.anthropic;

  return (
    <div className={`chat-bar ${inline ? 'chat-bar-inline' : ''}`}>
      <div className="chat-bar-inner">
        {/* Settings gear — hidden in openclaw mode (no API key needed) */}
        {chatMode !== 'openclaw' && (
          <button
            className="chat-gear-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="AI Settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            {hasApiKey && <span className="gear-dot" />}
          </button>
        )}

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />

        {/* Send button */}
        <button
          className="chat-send-btn"
          onClick={handleSubmit}
          disabled={!message.trim() || isLoading}
          title="Send"
        >
          {isLoading ? (
            <div className="send-loading">
              <span /><span /><span />
            </div>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>

      {/* Settings Popover */}
      {showSettings && (
        <div className="settings-popover" ref={settingsRef}>
          <div className="settings-header">
            {hasApiKey ? 'AI Settings' : 'Connect your AI to start chatting'}
          </div>

          {/* Provider toggle */}
          <div className="settings-provider-toggle">
            <button
              className={`provider-btn ${settingsProvider === 'anthropic' ? 'active' : ''}`}
              onClick={() => setSettingsProvider('anthropic')}
            >
              Anthropic
            </button>
            <button
              className={`provider-btn ${settingsProvider === 'openai' ? 'active' : ''}`}
              onClick={() => setSettingsProvider('openai')}
            >
              OpenAI
            </button>
          </div>

          {/* API Key */}
          <div className="settings-field">
            <label className="settings-label">API Key</label>
            <div className="key-input-wrapper">
              <input
                type={showKey ? 'text' : 'password'}
                className="settings-input"
                placeholder={providerDefaults.placeholder}
                value={settingsKey}
                onChange={(e) => setSettingsKey(e.target.value)}
              />
              <button
                className="key-toggle-btn"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            {hasApiKey && !settingsKey && (
              <div className="settings-hint">Saved: {maskKey(localStorage.getItem('zoh_llm_api_key'))}</div>
            )}
          </div>

          {/* Model override */}
          <div className="settings-field">
            <label className="settings-label">Model (optional)</label>
            <input
              type="text"
              className="settings-input"
              placeholder={`Default: ${providerDefaults.model}`}
              value={settingsModel}
              onChange={(e) => setSettingsModel(e.target.value)}
            />
          </div>

          {/* Save */}
          <button className="settings-save-btn" onClick={handleSaveSettings}>
            Save
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatBar;
