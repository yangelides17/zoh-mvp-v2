/**
 * useAgentThinking Hook
 *
 * Manages real-time streaming state from the agent trigger SSE endpoint.
 * Tracks tool calls, results, and outputs as they arrive, providing
 * state for the AgentThinking overlay on feed cards.
 */

import { useState, useCallback, useRef } from 'react';
import { streamAgentTrigger } from '../services/api';

const INITIAL_STATE = {
  fragmentId: null,
  status: null, // 'thinking' | 'done' | 'error'
  steps: [],
  output: null,
  doneData: null,
};

export default function useAgentThinking() {
  const [thinkingState, setThinkingState] = useState(INITIAL_STATE);
  const cancelRef = useRef(null);

  const startThinking = useCallback((triggerType, fragmentId, affinity, engagement) => {
    // Cancel any previous stream
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }

    // Initialize state
    setThinkingState({
      fragmentId,
      status: 'thinking',
      steps: [],
      output: null,
      doneData: null,
    });

    const onEvent = (eventType, data) => {
      switch (eventType) {
        case 'thinking_start':
          // Already set above
          break;

        case 'tool_call':
          setThinkingState(prev => ({
            ...prev,
            steps: [...prev.steps, {
              type: 'tool_call',
              tool: data.tool,
              description: data.description,
              round: data.round,
            }],
          }));
          break;

        case 'tool_result':
          setThinkingState(prev => ({
            ...prev,
            steps: [...prev.steps, {
              type: 'tool_result',
              tool: data.tool,
              summary: data.summary,
              round: data.round,
            }],
          }));
          break;

        case 'output':
          setThinkingState(prev => ({
            ...prev,
            output: data,
          }));
          break;

        case 'done':
          setThinkingState(prev => ({
            ...prev,
            status: 'done',
            doneData: data,
          }));
          cancelRef.current = null;
          break;

        case 'error':
          setThinkingState(prev => ({
            ...prev,
            status: 'error',
            doneData: { message: data.message || 'Agent error' },
          }));
          cancelRef.current = null;
          break;

        default:
          break;
      }
    };

    const { cancel } = streamAgentTrigger(triggerType, fragmentId, affinity, engagement, onEvent);
    cancelRef.current = cancel;
  }, []);

  // Hide overlay but don't cancel server-side agent
  const dismiss = useCallback(() => {
    setThinkingState(INITIAL_STATE);
    // Don't call cancelRef.current — let the agent finish on the server
  }, []);

  // Full reset (also cancels stream)
  const clear = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }
    setThinkingState(INITIAL_STATE);
  }, []);

  return { thinkingState, startThinking, dismiss, clear };
}
