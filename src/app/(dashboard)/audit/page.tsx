"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, ChevronRight, Gauge, RefreshCw, ShieldAlert, Globe, History } from "lucide-react";
import { scanSingleUrl, discoverUrls, getAuditTargetUrl, saveAuditResults, getLatestAudit } from "@/server/services/audit";
import { Input } from "@/components/ui/input";
import { useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function TechnicalAuditPage() {
    const [isScanning, setIsScanning] = useState(false);
    const [scanScore, setScanScore] = useState<number | null>(null);
    const [issues, setIssues] = useState<any[]>([]);
    const [targetUrl, setTargetUrl] = useState("");
    const [scannedUrls, setScannedUrls] = useState<{ url: string, score: number | null }[]>([]);
    const [currentScanningUrl, setCurrentScanningUrl] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
    const [lastScanDate, setLastScanDate] = useState<string | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    useEffect(() => {
        getAuditTargetUrl().then(url => {
            if (url) setTargetUrl(url);
        });

        // Load latest audit from database on mount to persist data
        getLatestAudit().then(audit => {
            if (audit) {
                setScanScore(audit.summaryScore);
                setIssues(audit.issues);

                const date = new Date(audit.createdAt);
                setLastScanDate(date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }));
            }
            setIsLoadingHistory(false);
        });
    }, []);

    const runAudit = async () => {
        setIsScanning(true);
        setScanScore(null);
        setIssues([]);
        setScannedUrls([]);
        setLastScanDate("Just now");
        setStatusMessage("Discovering pages on the website...");

        // Step 1: Auto-discover real URLs from the website
        const urlsToScan = await discoverUrls(targetUrl);
        setStatusMessage(`Found ${urlsToScan.length} pages. Starting audit...`);

        // Initialize the scanning list with discovered URLs
        setScannedUrls(urlsToScan.map(u => ({ url: u, score: null })));

        let allIssues: any[] = [];
        let totalScore = 0;
        let successfulScans = 0;

        try {
            for (let i = 0; i < urlsToScan.length; i++) {
                const url = urlsToScan[i];
                setCurrentScanningUrl(url);
                try {
                    const result = await scanSingleUrl(url);
                    allIssues = [...allIssues, ...result.issues];
                    setIssues(allIssues);

                    totalScore += result.score;
                    successfulScans++;

                    // Update this specific URL's score
                    setScannedUrls(prev => prev.map((item, index) =>
                        index === i ? { ...item, score: result.score } : item
                    ));
                } catch (err) {
                    console.error("Failed scanning", url, err);
                    setScannedUrls(prev => prev.map((item, index) =>
                        index === i ? { ...item, score: 0 } : item
                    ));
                }
            }
            if (successfulScans > 0) {
                const finalScore = Math.round(totalScore / successfulScans);
                setScanScore(finalScore);

                // Save to Database so it persists!
                setStatusMessage("Saving results to database...");
                await saveAuditResults(finalScore, allIssues);
            }
        } catch (error) {
            console.error("Audit failed", error);
        } finally {
            setCurrentScanningUrl(null);
            setIsScanning(false);
            setStatusMessage(null);
        }
    };

    const criticalCount = issues.filter(i => i.severity === 'HIGH').length;
    const warningCount = issues.filter(i => i.severity === 'MEDIUM').length;

    if (isLoadingHistory) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-neutral-500">
                    <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
                    <p className="text-sm font-medium animate-pulse">Loading previous audit report...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Technical SEO Audit</h1>
                    <p className="text-neutral-500">Ensure your site remains perfectly readable by Googlebots and LLM web crawlers.</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                        <Input
                            value={targetUrl}
                            readOnly
                            className="pl-9 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-500"
                            placeholder="Loading workspace domain..."
                        />
                    </div>
                    <Button onClick={runAudit} disabled={isScanning || !targetUrl} className="bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap">
                        {isScanning ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Gauge className="mr-2 h-4 w-4" />}
                        {isScanning ? "Scanning..." : "Run Audit"}
                    </Button>
                </div>
            </div>

            {statusMessage && isScanning && (
                <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg px-4 py-2.5">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {statusMessage}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-sm md:col-span-1 bg-neutral-900 text-white border-transparent relative">
                    {lastScanDate && !isScanning && (
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-800/50 px-2.5 py-1 rounded-full border border-neutral-700">
                            <History className="w-3 h-3" />
                            {lastScanDate}
                        </div>
                    )}
                    <CardHeader>
                        <CardTitle>Global Health Score</CardTitle>
                        <CardDescription className="text-neutral-400">Calculated across scanned pages</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center p-6 pb-8">
                        <div className="relative flex items-center justify-center w-32 h-32">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
                                <circle cx="64" cy="64" r="56" stroke="#4ade80" strokeWidth="12" fill="none"
                                    strokeDasharray="351.85"
                                    strokeDashoffset={scanScore !== null ? 351.85 - (351.85 * (scanScore / 100)) : 351.85}
                                    className="transition-all duration-1000 ease-out" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-4xl font-bold">{scanScore !== null ? scanScore : '--'}</span>
                                <span className="text-xs text-neutral-400">/ 100</span>
                            </div>
                        </div>
                        <p className={`mt-4 text-sm font-medium ${scanScore && scanScore > 80 ? 'text-green-400' : scanScore && scanScore > 50 ? 'text-amber-400' : 'text-neutral-400'}`}>
                            {scanScore === null ? "Ready to scan" : scanScore > 80 ? 'Good condition' : 'Needs improvement'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm md:col-span-2">
                    <CardHeader>
                        <CardTitle>Audit Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b pb-4">
                                <div className="flex items-center gap-3">
                                    <ShieldAlert className="w-5 h-5 text-red-500" />
                                    <div>
                                        <h4 className="font-semibold text-sm">Critical Issues (High)</h4>
                                        <p className="text-xs text-neutral-500">Requires immediate attention</p>
                                    </div>
                                </div>
                                <div className="text-xl font-bold text-red-500">{scanScore === null ? '-' : criticalCount}</div>
                            </div>
                            <div className="flex items-center justify-between border-b pb-4">
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-500" />
                                    <div>
                                        <h4 className="font-semibold text-sm">Warnings (Medium)</h4>
                                        <p className="text-xs text-neutral-500">Should be fixed soon</p>
                                    </div>
                                </div>
                                <div className="text-xl font-bold text-amber-500">{scanScore === null ? '-' : warningCount}</div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <div>
                                        <h4 className="font-semibold text-sm">Passed Checks</h4>
                                        <p className="text-xs text-neutral-500">Pages passing all basic LLM heuristics</p>
                                    </div>
                                </div>
                                <div className="text-xl font-bold text-green-500">{scanScore === null ? '-' : 'Multiple'}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {scannedUrls.length > 0 && (
                <div className="border rounded-lg bg-white dark:bg-neutral-900 shadow-sm p-4 text-sm mt-8">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-indigo-500" /> Scanning Progress
                    </h3>
                    <div className="space-y-1">
                        {scannedUrls.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between py-3 border-b last:border-0 dark:border-neutral-800">
                                <div className="flex items-center gap-3">
                                    {item.score !== null ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    ) : currentScanningUrl === item.url ? (
                                        <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border-2 border-neutral-200 dark:border-neutral-700" />
                                    )}
                                    <span className={`font-medium ${item.score === null && currentScanningUrl !== item.url ? 'text-neutral-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                                        {item.url}
                                    </span>
                                </div>
                                <div className="font-medium text-right">
                                    {item.score !== null ? (
                                        <span className={item.score > 80 ? 'text-green-600' : item.score > 50 ? 'text-amber-600' : 'text-red-600'}>
                                            Score: {item.score} / 100
                                        </span>
                                    ) : currentScanningUrl === item.url ? (
                                        <span className="text-indigo-400">Scanning real-time...</span>
                                    ) : (
                                        <span className="text-neutral-400">Waiting in queue</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-8">
                <h2 className="text-xl font-bold mb-4">Detected Issues</h2>
                <div className="border rounded-lg bg-white dark:bg-neutral-900 shadow-sm overflow-hidden text-sm">
                    {issues.length === 0 ? (
                        <div className="p-8 text-center text-neutral-500">
                            {scanScore === null ? "Run an audit to see detected issues." : "Great job! No major issues detected on the scanned pages."}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-neutral-50/50 dark:bg-neutral-900/50">
                                <TableRow>
                                    <TableHead className="w-[10%]">Severity</TableHead>
                                    <TableHead className="w-[30%]">Issue Type</TableHead>
                                    <TableHead className="w-[30%]">Affected URL</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {issues.map((issue, i) => (
                                    <TableRow key={i}>
                                        <TableCell>
                                            <Badge variant={
                                                issue.severity === 'HIGH' ? 'destructive' :
                                                    issue.severity === 'MEDIUM' ? 'secondary' : 'outline'
                                            } className={issue.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : ''}>
                                                {issue.severity}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-semibold mb-0.5">{issue.type}</p>
                                            <p className="text-xs text-neutral-500">{issue.description}</p>
                                        </TableCell>
                                        <TableCell className="text-neutral-500 text-xs font-mono">{issue.url}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="h-8" onClick={() => setSelectedIssue(issue)}>View Details <ChevronRight className="w-4 h-4 ml-1" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>

            {/* Issue Details Dialog */}
            <Dialog open={!!selectedIssue} onOpenChange={(open) => !open && setSelectedIssue(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedIssue?.severity === 'HIGH' ? (
                                <ShieldAlert className="w-5 h-5 text-red-500" />
                            ) : selectedIssue?.severity === 'MEDIUM' ? (
                                <AlertCircle className="w-5 h-5 text-amber-500" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-blue-500" />
                            )}
                            Issue Details
                        </DialogTitle>
                        <DialogDescription>
                            Review the details of this detected issue.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedIssue && (
                        <div className="space-y-4 py-4">
                            <div>
                                <h4 className="font-semibold text-sm mb-1 text-neutral-900 dark:text-neutral-100">Issue Type</h4>
                                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{selectedIssue.type}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-1 text-neutral-900 dark:text-neutral-100">Severity</h4>
                                <Badge variant={
                                    selectedIssue.severity === 'HIGH' ? 'destructive' :
                                        selectedIssue.severity === 'MEDIUM' ? 'secondary' : 'outline'
                                } className={selectedIssue.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : ''}>
                                    {selectedIssue.severity}
                                </Badge>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-1 text-neutral-900 dark:text-neutral-100">Affected URL</h4>
                                <p className="text-sm text-neutral-500 font-mono break-all">{selectedIssue.url}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-1 text-neutral-900 dark:text-neutral-100">Description</h4>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                    {selectedIssue.description}
                                </p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
