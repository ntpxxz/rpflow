import Card from "@/components/Card";

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Total Requests">
          <p className="text-3xl font-bold">125</p>
          <p className="text-gray-500">Pending: 20 | Approved: 90 | Rejected: 15</p>
        </Card>
        <Card title="Pending Approvals">
          <p className="text-3xl font-bold">20</p>
        </Card>
        <Card title="Monthly Spend">
          <p className="text-3xl font-bold">$12,450</p>
        </Card>
      </div>
    </div>
  );
}
