"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, BarChart3, Edit3, MessageSquare, Zap, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type AnalyticsData = {
    totalVisitors: number;
    dailyVisitors: { date: string; visitors: number }[];
    isConfigured: boolean;
};

export default function DashboardPage() {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const res = await fetch('/api/analytics');
                if (res.ok) {
                    const data = await res.json();
                    setAnalytics(data);
                }
            } catch (err) {
                console.error("Failed to fetch analytics:", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchAnalytics();
    }, []);

    const formatXAxisDate = (dateStr: any) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
                    <p className="text-neutral-500">Here's what's happening with your organic growth.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Link href="/audit"><Button variant="outline" className="flex-1 sm:flex-none">Run Technical Audit</Button></Link>
                    <Link href="/content/plan"><Button className="bg-indigo-600 hover:bg-indigo-700 flex-1 sm:flex-none">Generate Plan <Zap className="ml-2 h-4 w-4" /></Button></Link>
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Visitors (30d)"
                    value={isLoading ? "..." : analytics?.isConfigured ? analytics.totalVisitors.toLocaleString() : "--"}
                    trend={analytics?.isConfigured ? "+ Live from GA4" : "Needs Setup"}
                    icon={<BarChart3 className="h-5 w-5 text-indigo-500" />}
                />
                <MetricCard title="AI Mentions" value="--" trend="Scanning..." icon={<Zap className="h-5 w-5 text-amber-500" />} />
                <MetricCard title="Keywords Ranked" value="--" trend="Waiting for data" icon={<ArrowUpRight className="h-5 w-5 text-green-500" />} />
                <MetricCard title="Backlinks Built" value="0" trend="0" icon={<ArrowUpRight className="h-5 w-5 text-blue-500" />} />
            </div>

            {/* Charts & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-sm">
                <div className="lg:col-span-2 space-y-8">
                    <Card className="shadow-sm h-[400px] flex flex-col">
                        <CardHeader>
                            <CardTitle>Daily Traffic (Last 30 Days)</CardTitle>
                            <CardDescription>Pulled directly from Google Analytics 4.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 pl-0 pr-4 pb-4">
                            {isLoading ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
                                </div>
                            ) : analytics && !analytics.isConfigured ? (
                                <div className="h-full flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg m-4 mt-0">
                                    <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
                                    <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Google Analytics Not Connected</h3>
                                    <p className="text-sm text-neutral-500 max-w-sm mb-4">Connect your GA4 account to view live traffic data.</p>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href="/settings/integrations">Connect in Settings</Link>
                                    </Button>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics?.dailyVisitors || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={formatXAxisDate}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#6b7280', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#6b7280', fontSize: 12 }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f3f4f6' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                            labelFormatter={formatXAxisDate}
                                        />
                                        <Bar dataKey="visitors" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} name="Visitors" />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Link href="/content/plan" className="flex items-center gap-3 p-3 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 transition">
                                <div className="w-10 h-10 rounded bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600">
                                    <Edit3 className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">Next 30-Day Content Plan</h4>
                                    <p className="text-xs text-neutral-500">Generate your upcoming articles</p>
                                </div>
                            </Link>

                            <Link href="/reddit" className="flex items-center gap-3 p-3 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 transition">
                                <div className="w-10 h-10 rounded bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600">
                                    <MessageSquare className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">View Reddit Opportunities</h4>
                                    <p className="text-xs text-neutral-500">0 new active threads found</p>
                                </div>
                            </Link>

                            <Link href="/cms" className="flex items-center gap-3 p-3 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 transition">
                                <div className="w-10 h-10 rounded bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600">
                                    <Zap className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">Connect CMS</h4>
                                    <p className="text-xs text-neutral-500">Enable automatic publishing</p>
                                </div>
                            </Link>

                        </CardContent>
                    </Card>

                    <Card className="shadow-sm bg-indigo-600 text-white border-transparent">
                        <CardHeader>
                            <CardTitle className="text-xl">Upgrade to Unlimited</CardTitle>
                            <CardDescription className="text-indigo-100">Unlock fully automated backlink acquisition.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="secondary" className="w-full">Upgrade Plan</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, trend, icon }: { title: string, value: string | number, trend: string, icon: React.ReactNode }) {
    const isPositive = trend.startsWith('+');
    const isNegative = trend.startsWith('-');
    return (
        <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className={`text-xs mt-1 font-medium ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-neutral-500'}`}>
                    {trend}
                </p>
            </CardContent>
        </Card>
    );
}
