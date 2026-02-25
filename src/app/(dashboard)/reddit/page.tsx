"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, ExternalLink, ThumbsUp, Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function RedditAgentPage() {
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [stats, setStats] = useState({ newLeads24h: 0, totalReplied: 0, estimatedClicks: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/reddit/opportunities');
            if (res.ok) {
                const data = await res.json();
                setOpportunities(data.opportunities || []);
                setStats(data.stats || { newLeads24h: 0, totalReplied: 0, estimatedClicks: 0 });
            }
        } catch (error) {
            console.error("Failed to fetch reddit data", error);
            toast.error("Failed to load Reddit opportunities");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefreshScan = async () => {
        setIsScanning(true);
        toast.info("Scanning recent Reddit threads... This takes a few seconds as OpenAI evaluates them.");

        try {
            const res = await fetch('/api/reddit/scan', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                toast.success(data.message || "Scan complete!");
                fetchData(); // Reload the table
            } else {
                toast.error("The Reddit scan failed.");
            }
        } catch (error) {
            toast.error("Network error while scanning.");
        } finally {
            setIsScanning(false);
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const res = await fetch('/api/reddit/opportunities', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus })
            });

            if (res.ok) {
                toast.success(`Marked as ${newStatus}`);
                fetchData(); // Refresh UI to show the new state
            } else {
                toast.error("Failed to update status.");
            }
        } catch (error) {
            toast.error("Error updating status.");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reddit AI Agent</h1>
                    <p className="text-neutral-500">We scan Reddit 24/7 for high-intent conversations where you should pitch your product.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Settings</Button>
                    <Button onClick={handleRefreshScan} disabled={isScanning} className="bg-orange-600 hover:bg-orange-700 text-white">
                        {isScanning ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isScanning ? "Scanning..." : "Refresh Scan"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-sm border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-900/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-400">High-Intent Threads Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-600">{stats.newLeads24h}</div>
                        <p className="text-orange-600/80 text-xs mt-1 font-medium">In the last 24 hours</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">Threads Replied To</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.totalReplied}</div>
                        <p className="text-neutral-500 text-xs mt-1 font-medium">All time</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">Estimated Clicks Generated</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.estimatedClicks}</div>
                        <p className="text-neutral-400 text-xs mt-1 font-medium">Avg ~14 clicks per reply</p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">Latest Opportunities</h2>
                    {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-neutral-400 ml-2" />}
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {!isLoading && opportunities.length === 0 ? (
                        <Card className="shadow-sm border-dashed border-2 py-12 bg-transparent text-center">
                            <CardContent className="flex flex-col items-center">
                                <MessageSquare className="w-12 h-12 text-neutral-300 mb-4" />
                                <h3 className="font-semibold text-neutral-600">No Reddit threads found yet.</h3>
                                <p className="text-neutral-400 text-sm mt-2 max-w-sm">
                                    Click 'Refresh Scan' to start searching for highly relevant discussions matching your keywords.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        opportunities.filter(opp => opp.status !== 'IGNORED').map((opp) => (
                            <Card key={opp.id} className={`shadow-sm transition-opacity ${opp.status === 'DONE' ? 'opacity-60 bg-neutral-50 dark:bg-neutral-900 border-green-200 dark:border-green-900' : ''}`}>
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row justify-between gap-6">
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-900/20">{opp.subreddit}</Badge>
                                                <span className="text-xs font-semibold text-green-600">{opp.relevanceScore}% Match Score</span>
                                                {opp.status === 'DONE' && <Badge className="bg-green-500 hover:bg-green-600">Replied</Badge>}
                                            </div>
                                            <h3 className="text-lg font-bold leading-tight">{opp.title}</h3>

                                            {opp.status !== 'DONE' && (
                                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-md border border-indigo-100 dark:border-indigo-800/50 mt-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">AI Suggested Reply Strategy:</p>
                                                    </div>
                                                    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                                                        {opp.snippet || "Provide a helpful, organic response related to your niche without sounding like a spam bot."}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2 justify-start md:min-w-[140px]">
                                            <Link href={opp.threadUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                                                <Button variant="outline" className="w-full justify-start">
                                                    <ExternalLink className="w-4 h-4 mr-2" /> Open on Reddit
                                                </Button>
                                            </Link>

                                            {opp.status !== 'DONE' && (
                                                <>
                                                    <Button onClick={() => updateStatus(opp.id, 'DONE')} className="w-full justify-start bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                                                        <Check className="w-4 h-4 mr-2" /> Mark as Done
                                                    </Button>
                                                    <Button onClick={() => updateStatus(opp.id, 'IGNORED')} variant="ghost" className="w-full justify-start text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                        <X className="w-4 h-4 mr-2" /> Ignore Thread
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )))}
                </div>
            </div>
        </div>
    );
}
