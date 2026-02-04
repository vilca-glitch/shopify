import { useState } from 'react';
import { useUpdateAgent } from '../hooks/useUpdateAgent';
import { useDeleteAgent } from '../hooks/useDeleteAgent';
import type { DayOfWeek, RecurringAgent } from '../lib/types';

interface AgentListItemProps {
  agent: RecurringAgent;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const DAY_NAMES: Record<DayOfWeek, string> = {
  0: 'Sundays',
  1: 'Mondays',
  2: 'Tuesdays',
  3: 'Wednesdays',
  4: 'Thursdays',
  5: 'Fridays',
  6: 'Saturdays',
};

function getScheduleLabel(runDay: DayOfWeek): string {
  return `${DAY_NAMES[runDay]} at 12pm EST`;
}

export function AgentListItem({ agent }: AgentListItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { updateAgent, isUpdating } = useUpdateAgent();
  const { deleteAgent, isDeleting } = useDeleteAgent();

  const isActive = agent.status === 'active';
  const isPaused = agent.status === 'paused';
  const isStopped = agent.status === 'stopped';

  const handleStop = () => {
    updateAgent({ id: agent.id, status: 'stopped' });
  };

  const handleResume = () => {
    updateAgent({ id: agent.id, status: 'active' });
  };

  const handleDeleteClick = () => {
    if (confirmDelete) {
      deleteAgent(agent.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div className="py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">{agent.app_slug}</span>
            {isActive && (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                Active
              </span>
            )}
            {isPaused && (
              <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                Paused
              </span>
            )}
            {isStopped && (
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                Stopped
              </span>
            )}
          </div>

          <div className="text-sm text-gray-500">
            {getScheduleLabel(agent.run_day)}
            {agent.last_run_at && (
              <>
                <span className="mx-2">|</span>
                <span>Last: {formatDate(agent.last_run_at)}</span>
              </>
            )}
          </div>

          {agent.last_run_status === 'failed' && agent.last_run_message && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Last run failed: {agent.last_run_message}</span>
            </div>
          )}

          {agent.last_run_status === 'success' && agent.last_reviews_pushed > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-green-600">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{agent.last_reviews_pushed} new reviews pushed</span>
            </div>
          )}

          {agent.last_run_status === 'success' && agent.last_reviews_pushed === 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>No new reviews found</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(isActive || isPaused) && (
            <button
              onClick={handleStop}
              disabled={isUpdating}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Stop
            </button>
          )}

          {isStopped && (
            <button
              onClick={handleResume}
              disabled={isUpdating}
              className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Resume
            </button>
          )}

          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
              confirmDelete
                ? 'text-red-600 bg-red-100 hover:bg-red-200'
                : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {isDeleting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : confirmDelete ? (
              'Confirm?'
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
