"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, CheckCircle2, Link as LinkIcon, ShieldAlert, RefreshCw, X, Check } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function BacklinksPage() {
    const [inboundOpportunities, setInboundOpportunities] = useState<any[]>([]);
    const [outboundOpportunities, setOutboundOpportunities] = useState<any[]>([]);
    const [activeLinks, setActiveLinks] = useState<any[]>([]);
    const [stats, setStats] = useState({ linksEarned: 0, pendingApprovals: 0, outboundRequests: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/backlinks');
            if (res.ok) {
                const data = await res.json();
                setInboundOpportunities(data.inboundOpportunities || []);
                setOutboundOpportunities(data.outboundOpportunities || []);
                setActiveLinks(data.activeLinks || []);
                setStats(data.stats || { linksEarned: 0, pendingApprovals: 0, outboundRequests: 0 });
            }
        } catch (error) {
            console.error("Failed to fetch backlink data", error);
            toast.error("Failed to load Backlink Network");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleScanNetwork = async () => {
        setIsScanning(true);
        toast.info("Scanning partner network for matching articles...");

        try {
            const res = await fetch('/api/backlinks', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                toast.success(data.message || "Found new backlink opportunities!");
                fetchData(); // Reload tables
            } else {
                toast.error("Network scan failed.");
            }
        } catch (error) {
            toast.error("Error communicating with partner network.");
        } finally {
            setIsScanning(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            const res = await fetch('/api/backlinks/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ opportunityId: id })
            });

            if (res.ok) {
                toast.success("Backlink Approved! Automatically added to partner queue.");
                fetchData(); // Move from pending to active
            } else {
                toast.error("Failed to approve backlink.");
            }
        } catch (error) {
            toast.error("Error approving backlink.");
        }
    };

    const handleReject = async (id: string) => {
        try {
            const res = await fetch('/api/backlinks/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ opportunityId: id })
            });

            if (res.ok) {
                toast.success("Opportunity rejected.");
                fetchData(); // Remove from pending
            } else {
                toast.error("Failed to reject opportunity.");
            }
        } catch (error) {
            toast.error("Error rejecting opportunity.");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Backlink Exchange Network</h1>
                    <p className="text-neutral-500">High-quality, contextual backlinks automatically inserted into relevant partner blogs.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Guidelines</Button>
                    <Button onClick={handleScanNetwork} disabled={isScanning} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                        {isScanning ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                        {isScanning ? "Scanning..." : "Scan for Partners"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-indigo-600 text-white shadow-lg border-transparent">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium text-indigo-100">Domain Rating Impact</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">DR 14 <span className="text-indigo-300 text-xl">→ DR {14 + Math.floor(stats.linksEarned / 2)}</span></div>
                        <p className="text-indigo-200 text-xs mt-2">Estimated authority growth</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-indigo-100 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-900/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium text-indigo-800 dark:text-indigo-300">Links Earned</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats.linksEarned}</div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-amber-100 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-900/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium text-amber-800 dark:text-amber-300">Action Required</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-600">{stats.pendingApprovals}</div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium text-neutral-500">Awaiting Partners</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-neutral-700 dark:text-neutral-300">{stats.outboundRequests}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4 text-sm mt-8">
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-xl font-bold text-amber-600 dark:text-amber-500">Inbound Requests (Action Required)</h2>
                    {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-neutral-400 ml-2" />}
                </div>
                <p className="text-neutral-500 text-sm -mt-3 mb-2">Partner blogs have found contextual targets in your articles to link to. You must approve these.</p>

                <Card className="shadow-sm border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-900/10">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[20%]">Your Article (Host)</TableHead>
                                    <TableHead className="w-[20%]">Requested Anchor Text</TableHead>
                                    <TableHead className="w-[40%]">Partner Target (Destination)</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!isLoading && inboundOpportunities.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-neutral-500">
                                            No inbound requests right now.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    inboundOpportunities.map((opp) => (
                                        <TableRow key={opp.id}>
                                            <TableCell className="font-semibold text-neutral-900 dark:text-neutral-100 align-top pt-4">
                                                {opp.sourceArticle?.title || "Blog Post"}
                                            </TableCell>
                                            <TableCell className="align-top pt-4">
                                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-200 border-none">"{opp.proposedAnchor}"</Badge>
                                            </TableCell>
                                            <TableCell className="align-top pt-4">
                                                <div className="space-y-1">
                                                    <p className="font-medium">{opp.targetArticle?.title || "Home Page"}</p>
                                                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                                                        <span>{opp.targetArticle?.workspace?.domain || "partner-site.com"}</span>
                                                        <span className="text-amber-600 font-semibold">{opp.relevanceScore}% Match</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right align-top pt-4">
                                                <div className="flex justify-end gap-2">
                                                    <Button onClick={() => handleApprove(opp.id)} size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-sm">
                                                        <Check className="w-4 h-4 mr-1" /> Approve
                                                    </Button>
                                                    <Button onClick={() => handleReject(opp.id)} size="sm" variant="ghost" className="text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                        <X className="w-4 h-4 mr-1" /> Reject
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4 text-sm mt-8">
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-xl font-bold">Outbound Requests (Awaiting Partner)</h2>
                    {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-neutral-400 ml-2" />}
                </div>
                <p className="text-neutral-500 text-sm -mt-3 mb-2">You requested these links on partner sites. The partner must authorize the HTML insertion.</p>

                <Card className="shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[20%]">Your Article (Destination)</TableHead>
                                    <TableHead className="w-[20%]">Proposed Anchor</TableHead>
                                    <TableHead className="w-[40%]">Partner Article (Host)</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!isLoading && outboundOpportunities.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-neutral-500">
                                            No outbound requests. Click 'Scan Network' to find partners.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    outboundOpportunities.map((opp) => (
                                        <TableRow key={opp.id}>
                                            <TableCell className="font-semibold text-neutral-900 dark:text-neutral-100 align-top pt-4">
                                                {opp.targetArticle?.title || "Home Page"}
                                            </TableCell>
                                            <TableCell className="align-top pt-4">
                                                <Badge variant="outline">"{opp.proposedAnchor}"</Badge>
                                            </TableCell>
                                            <TableCell className="align-top pt-4">
                                                <div className="space-y-1">
                                                    <p className="font-medium text-neutral-600">{opp.sourceArticle?.title || "Blog Post"}</p>
                                                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                                                        <span>{opp.sourceArticle?.workspace?.domain || "partner-site.com"}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right align-top pt-4">
                                                <Badge variant="secondary" className="bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                                                    Pending
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4 text-sm mt-12 pb-8">
                <h2 className="text-xl font-bold mb-4">Active Links Built</h2>
                <div className="border rounded-lg bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-neutral-50/50 dark:bg-neutral-900/50">
                            <TableRow>
                                <TableHead className="w-[30%]">Your Target Article</TableHead>
                                <TableHead className="w-[25%]">Anchor Text</TableHead>
                                <TableHead className="w-[30%]">Live Partner Source</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!isLoading && activeLinks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-neutral-500">
                                        No active backlinks built yet. Approve opportunities above to grow your domain authority.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                activeLinks.map((link) => (
                                    <TableRow key={link.id}>
                                        <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">
                                            {link.targetArticle?.title || "Home Page"}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-indigo-600 dark:text-indigo-400 font-medium">"{link.anchorText}"</span>
                                        </TableCell>
                                        <TableCell className="text-neutral-600">
                                            {link.sourceArticle?.workspace?.domain || "partner-site.com"} / {link.sourceArticle?.targetKeyword || "blog"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none">
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Live
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
