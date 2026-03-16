/**
 * AgentThinking Component
 *
 * Full-height feed card showing real-time agent tool calls and thinking steps.
 * Shows tool calls as they happen, then transitions to result or dismisses.
 */

import React, { useEffect, useRef } from 'react';
import './AgentThinking.css';

const TOOL_LABELS = {
  zoh_read_content: 'Reading content',
  zoh_browse_feed: 'Browsing feed',
  zoh_feed_overview: 'Checking feed overview',
  zoh_probe: 'Searching knowledge graph',
  zoh_similar: 'Finding similar content',
  zoh_connections: 'Tracing connections',
  zoh_user_path: 'Analyzing reading path',
  zoh_recommend_next: 'Finding recommendations',
  zoh_push_card: 'Creating insight',
  zoh_push_prompt_card: 'Creating prompt',
  zoh_annotate_fragment: 'Adding annotation',
  zoh_surface_in_feed: 'Surfacing content',
};

const TOOL_COLORS = {
  zoh_read_content: '#5b9eff',
  zoh_browse_feed: '#7b6eff',
  zoh_feed_overview: '#7b6eff',
  zoh_probe: '#a78bfa',
  zoh_similar: '#34d399',
  zoh_connections: '#34d399',
  zoh_user_path: '#fbbf24',
  zoh_recommend_next: '#fbbf24',
  zoh_push_card: '#f472b6',
  zoh_push_prompt_card: '#f472b6',
  zoh_annotate_fragment: '#5b9eff',
  zoh_surface_in_feed: '#34d399',
};

const AgentThinking = ({ thinkingState, onDismiss }) => {
  const stepsEndRef = useRef(null);

  // Auto-scroll to latest step
  useEffect(() => {
    if (stepsEndRef.current) {
      const container = stepsEndRef.current.closest('.agent-thinking-steps');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [thinkingState.steps.length]);

  if (!thinkingState || !thinkingState.status) return null;

  const { status, steps, doneData } = thinkingState;
  const isDone = status === 'done';
  const isError = status === 'error';
  const outputType = doneData?.output_type;

  // Determine done message and icon based on what the agent did
  const getDoneInfo = () => {
    if (isError) return { message: doneData?.message || 'Something went wrong', icon: null };
    if (!isDone) return { message: null, icon: null };
    switch (outputType) {
      case 'silence': return { message: 'Nothing interesting right now', icon: '—' };
      case 'annotation': return { message: 'Added a note to your feed', icon: '✦' };
      case 'card': return { message: 'Preparing insight...', icon: '◆' };
      case 'prompt': return { message: 'Got a question for you...', icon: '?' };
      case 'response': return { message: 'Preparing response...', icon: '◆' };
      default: return { message: 'Done', icon: null };
    }
  };

  const isLoadingResult = isDone && (outputType === 'card' || outputType === 'prompt' || outputType === 'response');

  // Group steps: pair tool_call with its following tool_result
  const groupedSteps = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.type === 'tool_call') {
      const next = steps[i + 1];
      const result = next && next.type === 'tool_result' && next.tool === step.tool ? next : null;
      groupedSteps.push({ call: step, result });
      if (result) i++;
    }
  }

  const doneInfo = getDoneInfo();
  const doneMessage = doneInfo.message;
  const roundCount = doneData?.rounds || 0;
  const toolCount = doneData?.tool_calls || 0;

  return (
    <div className="fragment-card agent-thinking-card">
      <div className={`agent-thinking ${isDone ? 'agent-thinking-done' : ''} ${isError ? 'agent-thinking-error' : ''}`}>
        {/* Header */}
        <div className="agent-thinking-header">
          <div className="agent-thinking-header-left">
            <span className="agent-thinking-badge">ZOH</span>
            {!isDone && !isError && (
              <span className="agent-thinking-dots">
                <span /><span /><span />
              </span>
            )}
            <span className="agent-thinking-label">
              {isError ? 'Error' : isDone ? 'Done' : 'Thinking...'}
            </span>
          </div>
          <button className="agent-thinking-dismiss" onClick={onDismiss} aria-label="Dismiss">
            &times;
          </button>
        </div>

        {/* Steps */}
        <div className="agent-thinking-steps">
          {groupedSteps.length === 0 && !isDone && !isError && (
            <div className="agent-thinking-waiting">
              Analyzing your reading patterns...
            </div>
          )}

          {groupedSteps.map((group, i) => {
            const color = TOOL_COLORS[group.call.tool] || '#5b9eff';
            const label = TOOL_LABELS[group.call.tool] || group.call.description;
            const isLast = i === groupedSteps.length - 1;
            const isActive = isLast && !isDone && !isError && !group.result;

            return (
              <div key={i} className={`agent-thinking-step ${group.result ? 'completed' : ''}`}>
                <span className="agent-thinking-step-dot" style={{ background: color }} />
                <div className="agent-thinking-step-content">
                  <span className="agent-thinking-step-tool" style={{ color }}>
                    {label}
                  </span>
                  {group.call.description && group.call.description !== label && (
                    <span className="agent-thinking-step-desc">{group.call.description}</span>
                  )}
                  {group.result?.summary && (
                    <span className="agent-thinking-step-result">{group.result.summary}</span>
                  )}
                </div>
                {isActive && (
                  <span className="agent-thinking-step-spinner" style={{ borderTopColor: color }} />
                )}
              </div>
            );
          })}

          {/* Done message */}
          {(isDone || isError) && doneMessage && (
            <div className={`agent-thinking-done-msg ${isError ? 'error' : ''} ${isLoadingResult ? 'loading-result' : ''}`}>
              <div className="agent-thinking-done-row">
                {doneInfo.icon && <span className="agent-thinking-done-icon">{doneInfo.icon}</span>}
                <span>{doneMessage}</span>
              </div>
              {isDone && toolCount > 0 && (
                <span className="agent-thinking-stats">
                  {toolCount} tool{toolCount !== 1 ? 's' : ''} used
                  {roundCount > 1 ? ` across ${roundCount} rounds` : ''}
                </span>
              )}
              {isLoadingResult && (
                <div className="agent-thinking-shimmer" />
              )}
            </div>
          )}

          <div ref={stepsEndRef} />
        </div>
      </div>
    </div>
  );
};

export default AgentThinking;
