// app/(app)/reports/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { PurchaseRequest, User } from "@prisma/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { format, startOfYear, isSameYear } from "date-fns";
import { Loader2, TrendingUp, DollarSign, FileText, PieChart as PieChartIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Type Definition
type RequestWithDetails = PurchaseRequest & {
  user: User;
};

// Colors for Charts
const COLORS = ['#f97316', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6']; // Orange, Blue, Green, Red, Purple

export default function Reports() {
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/purchase-requests")
      .then((res) => res.json())
      .then((data) => setRequests(data))
      .catch((err) => console.error("Error fetching data:", err))
      .finally(() => setLoading(false));
  }, []);

  // --- Data Aggregation Logic ---

  // 1. Summary Stats
  const stats = useMemo(() => {
    const totalRequests = requests.length;
    // Filter out rejected/cancelled for spending calculation
    const validRequests = requests.filter(r => !['rejected', 'cancelled'].includes(r.status.toLowerCase()));
    const totalSpend = validRequests.reduce((acc, r) => acc + Number(r.totalAmount || 0), 0);
    const avgRequestValue = totalRequests > 0 ? totalSpend / validRequests.length : 0;

    return { totalRequests, totalSpend, avgRequestValue };
  }, [requests]);

  // 2. Monthly Spending (This Year)
  const monthlySpendingData = useMemo(() => {
    const currentYear = new Date();
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    
    // Initialize map
    const dataMap: Record<string, number> = {};
    months.forEach(m => dataMap[m] = 0);

    requests.forEach(r => {
      const date = new Date(r.createdAt);
      if (isSameYear(date, currentYear) && !['rejected', 'cancelled'].includes(r.status.toLowerCase())) {
        const monthName = format(date, "MMM");
        dataMap[monthName] += Number(r.totalAmount || 0);
      }
    });

    return months.map(month => ({
      name: month,
      amount: dataMap[month]
    }));
  }, [requests]);

  // 3. Status Distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach(r => {
      const status = r.status.charAt(0).toUpperCase() + r.status.slice(1); // Capitalize
      counts[status] = (counts[status] || 0) + 1;
    });

    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    }));
  }, [requests]);

  // 4. Top Requesters (by Spend)
  const topRequestersData = useMemo(() => {
    const requesterMap: Record<string, number> = {};
    
    requests.forEach(r => {
      if (!['rejected', 'cancelled'].includes(r.status.toLowerCase())) {
        const name = r.user?.name || r.requesterName || "Unknown";
        requesterMap[name] = (requesterMap[name] || 0) + Number(r.totalAmount || 0);
      }
    });

    return Object.entries(requesterMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Top 5
  }, [requests]);

  // --- Helper Component for Stats ---
  const StatCard = ({ title, value, icon: Icon, subtext }: any) => (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-foreground">{value}</h3>
          {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
        <div className="p-3 bg-orange-50 rounded-full text-orange-600">
          <Icon className="w-6 h-6" />
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 pb-10 font-sans">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Insight into purchasing activities and spending.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Total Spend (YTD)" 
          value={`฿${stats.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          subtext="Valid requests only"
        />
        <StatCard 
          title="Total Requests" 
          value={stats.totalRequests} 
          icon={FileText}
          subtext="All time"
        />
        <StatCard 
          title="Avg. Request Value" 
          value={`฿${stats.avgRequestValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={TrendingUp}
          subtext="Per approved request"
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Spending Chart */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Monthly Spending</CardTitle>
            <CardDescription>Total approved spending per month (Current Year)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySpendingData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(value) => `฿${value/1000}k`} />
                  <Tooltip 
                    formatter={(value: number) => `฿${value.toLocaleString()}`}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Request Status</CardTitle>
            <CardDescription>Distribution of request statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Spenders Bar Chart */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Top Spenders</CardTitle>
          <CardDescription>Users with the highest total approved request value</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={topRequestersData} margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0"/>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fill: '#334155'}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(value: number) => `฿${value.toLocaleString()}`} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={32}>
                    {topRequestersData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#f97316' : '#94a3b8'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}