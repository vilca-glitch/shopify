import { useRecurringAgents } from '../hooks/useRecurringAgents';
import { AgentListItem } from './AgentListItem';

export function AgentList() {
  const { data: agents, isLoading, error } = useRecurringAgents();

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <div className="inline-flex items-center gap-2 text-gray-500">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading agents...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-600">Failed to load agents: {error.message}</p>
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="text-gray-400 mb-3">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-gray-500">No active agents yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {agents.map((agent) => (
        <AgentListItem key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
