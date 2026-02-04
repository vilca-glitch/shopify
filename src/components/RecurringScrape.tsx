import { Card, CardHeader, CardContent } from './ui/Card';
import { AgentForm } from './AgentForm';
import { AgentList } from './AgentList';

export function RecurringScrape() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Create New Agent</h2>
        </CardHeader>
        <CardContent>
          <AgentForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Active Agents</h2>
        </CardHeader>
        <CardContent>
          <AgentList />
        </CardContent>
      </Card>
    </div>
  );
}
