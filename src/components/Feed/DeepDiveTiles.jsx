/**
 * DeepDiveTiles — tile-based chat panel rendered inside a fragment card.
 *
 * Displays metadata tile + conversation tiles styled like feed cards.
 * Uses sendAmbientMessage() for Q&A.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchFragmentMetadata, sendAmbientMessage, sendDeepDiveSignal } from '../../services/api';
import './DeepDiveTiles.css';

const formatArchetype = (archetype) => {
  if (!archetype) return 'Fragment';
  return archetype
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

const DeepDiveTiles = ({ fragment, onClose }) => {
  const [metadata, setMetadata] = useState(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [conversation, setConversation] = useState([]);
  const [question, setQuestion] = useState('');
  const [answerLoading, setAnswerLoading] = useState(false);
  const tilesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch metadata on mount
  useEffect(() => {
    if (!fragment?.fragment_id) return;
    setMetaLoading(true);
    fetchFragmentMetadata(fragment.fragment_id)
      .then((data) => setMetadata(data))
      .catch(() => setMetadata(null))
      .finally(() => setMetaLoading(false));
  }, [fragment?.fragment_id]);

  // Auto-scroll to bottom when conversation updates
  useEffect(() => {
    tilesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, answerLoading]);

  // Focus input on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  const handleAsk = useCallback(async () => {
    const q = question.trim();
    if (!q || answerLoading) return;

    const userMsg = { role: 'user', content: q };
    const newConversation = [...conversation, userMsg];
    setConversation(newConversation);
    setQuestion('');
    setAnswerLoading(true);

    try {
      const result = await sendAmbientMessage(
        newConversation,
        fragment?.fragment_id || null,
        fragment?.page_id || null
      );
      const assistantMsg = {
        role: 'assistant',
        content: result.response || '(No response)',
      };
      setConversation(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: err?.response?.data?.error || 'Something went wrong. Try again.',
      };
      setConversation(prev => [...prev, errorMsg]);
    } finally {
      setAnswerLoading(false);
    }
  }, [question, conversation, answerLoading, fragment]);

  // Send deep dive signal when closing (if there was a conversation)
  const handleClose = useCallback(() => {
    if (conversation.length >= 2 && fragment?.fragment_id) {
      // Build a summary from the conversation
      const userMessages = conversation
        .filter(m => m.role === 'user')
        .map(m => m.content);
      const summary = userMessages.join('. ').slice(0, 500);

      // Extract topics from keywords + user questions
      const topics = [
        ...(metadata?.keywords || metadata?.metadata?.keywords || []).slice(0, 5),
        ...(fragment?.archetype ? [fragment.archetype] : []),
      ];

      sendDeepDiveSignal(
        fragment.fragment_id,
        summary,
        topics,
        conversation.length,
      );
    }
    onClose();
  }, [conversation, fragment, metadata, onClose]);

  // Extract metadata fields
  const meta = metadata?.metadata || metadata;
  const archetype = meta?.archetype || fragment?.archetype;
  const domain = meta?.domain || fragment?.domain;
  const purpose = meta?.purpose || meta?.label_metadata?.fragment_purpose || meta?.fragment_purpose;
  const keywords = meta?.keywords || meta?.label_metadata?.keywords || [];

  return (
    <div className="deep-dive-tiles" onClick={(e) => e.stopPropagation()}>
      {/* Close button */}
      <button className="dd-close-btn" onClick={handleClose} title="Close">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      {/* Scrollable tile area */}
      <div className="tiles-scroll-area">
        {/* Metadata tile */}
        <div className="dd-tile dd-tile-meta">
          {metaLoading ? (
            <div className="dd-meta-skeleton">
              <div className="dd-skeleton-bar" />
              <div className="dd-skeleton-bar" />
              <div className="dd-skeleton-bar" />
            </div>
          ) : (
            <>
              <div className="dd-tile-header">
                <span className="dd-tile-badge">{formatArchetype(archetype)}</span>
                <span className="dd-tile-domain">{domain}</span>
              </div>
              {purpose && <p className="dd-tile-purpose">{purpose}</p>}
              {keywords.length > 0 && (
                <div className="dd-tile-keywords">
                  {keywords.map((kw, i) => (
                    <span key={i} className="dd-keyword">{kw}</span>
                  ))}
                </div>
              )}
              {!purpose && keywords.length === 0 && (
                <p className="dd-tile-purpose" style={{ opacity: 0.4 }}>
                  No additional metadata available.
                </p>
              )}
            </>
          )}
        </div>

        {/* Conversation tiles */}
        {conversation.map((msg, i) => (
          <div key={i} className={`dd-tile dd-tile-${msg.role}`}>
            {msg.role === 'assistant' && (
              <span className="dd-tile-zoh-badge">ZOH</span>
            )}
            <p className="dd-tile-text">{msg.content}</p>
          </div>
        ))}

        {/* Loading tile */}
        {answerLoading && (
          <div className="dd-tile dd-tile-assistant dd-tile-loading">
            <span className="dd-tile-zoh-badge">ZOH</span>
            <div className="dd-loading-dots">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div ref={tilesEndRef} />
      </div>

      {/* Input area */}
      <div className="dd-input-area">
        <input
          ref={inputRef}
          type="text"
          className="dd-input"
          placeholder="Ask about this fragment..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAsk();
            }
            if (e.key === 'Escape') {
              e.stopPropagation();
              handleClose();
            }
          }}
          disabled={answerLoading}
        />
        <button
          className="dd-send-btn"
          onClick={handleAsk}
          disabled={!question.trim() || answerLoading}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default DeepDiveTiles;
