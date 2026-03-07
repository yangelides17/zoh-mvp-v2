/**
 * ChatPanel Component
 *
 * Desktop split-view conversation panel. Shows chat messages as bubbles
 * next to the currently-viewed fragment.
 */

import React, { useRef, useEffect } from 'react';
import ChatBar from './ChatBar';
import './ChatPanel.css';

const ChatPanel = ({
  cards,
  activeFragment,
  onSend,
  isLoading,
  chatInputRef,
  onClose,
  pendingMessage,
  chatMode = 'direct',
}) => {
  const messagesRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [cards, pendingMessage]);

  const formatArchetype = (archetype) => {
    if (!archetype) return 'Fragment';
    return archetype
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const hasMessages = cards.length > 0 || pendingMessage;

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-panel-header">
        <div className="chat-panel-context">
          {activeFragment ? (
            <>
              <span className="chat-panel-badge">
                {formatArchetype(activeFragment.archetype)}
              </span>
              <span className="chat-panel-domain">
                {activeFragment.domain}
              </span>
            </>
          ) : (
            <span className="chat-panel-badge">ZOH</span>
          )}
        </div>
        <button className="chat-panel-close" onClick={onClose} title="Close panel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="chat-panel-messages" ref={messagesRef}>
        {!hasMessages && (
          <div className="chat-panel-empty">
            <div className="chat-panel-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p>Ask a question about this content</p>
          </div>
        )}

        {cards.map((card) => (
          <div key={card.id} className="chat-msg-pair">
            {/* User message */}
            {card.userMessage && (
              <div className="chat-msg chat-msg-user">
                {card.userMessage}
              </div>
            )}

            {/* Agent response or error */}
            {card.error ? (
              <div className="chat-msg chat-msg-error">
                {card.error}
              </div>
            ) : card.response ? (
              <div className="chat-msg chat-msg-agent">
                <span className="chat-msg-label">ZOH</span>
                {card.response}
              </div>
            ) : null}
          </div>
        ))}

        {/* Pending message (awaiting response) */}
        {pendingMessage && (
          <div className="chat-msg-pair">
            <div className="chat-msg chat-msg-user">
              {pendingMessage}
            </div>
            <div className="chat-msg chat-msg-agent chat-msg-loading">
              <span className="chat-msg-label">ZOH</span>
              <div className="chat-loading-dots">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <ChatBar
        inline
        onSend={onSend}
        isLoading={isLoading}
        activeFragment={activeFragment}
        chatInputRef={chatInputRef}
        chatMode={chatMode}
      />
    </div>
  );
};

export default ChatPanel;
