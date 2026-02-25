"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, LineChart, MessageSquare, Sparkles, RefreshCw, Plus, AlertCircle } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner";

export default function AISearchVisibilityPage() {
    const [prompts, setPrompts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);

    // Form state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newPrompt, setNewPrompt] = useState("");
    const [targetBrand, setTargetBrand] = useState("");
    const [category, setCategory] = useState("");

    const fetchPrompts = async () => {
        try {
            const res = await fetch('/api/ai-search/prompts');
            if (res.ok) {
                const data = await res.json();
                setPrompts(data.prompts || []);
            }
        } catch (error) {
            console.error("Failed to load prompts", error);
            toast.error("Could not load your AI tracked prompts.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPrompts();
    }, []);

    const handleAddPrompt = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/ai-search/prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: newPrompt, category })
            });

            if (res.ok) {
                toast.success("Prompt added to tracking list.");
                setNewPrompt("");
                setCategory("");
                setIsDialogOpen(false);
                fetchPrompts();
            } else {
                toast.error("Failed to add prompt.");
            }
        } catch (error) {
            toast.error("An error occurred.");
        }
    };

    const handleRunScan = async () => {
        setIsScanning(true);
        toast.info("Sending queries to AI models... This may take a minute.");
        try {
            const res = await fetch('/api/ai-search/run-evaluations', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                toast.success(data.message || "Manual scan complete!");
                fetchPrompts(); // Refresh the table with new scores
            } else {
                toast.error("Failed to run the AI evaluations.");
            }
        } catch (error) {
            toast.error("An error occurred while scanning.");
        } finally {
            setIsScanning(false);
        }
    };

    // Calculate overall Score
    const totalEvals = prompts.filter(p => p.evaluations && p.evaluations.length > 0).length;
    const positiveEvals = prompts.filter(p => p.evaluations?.[0]?.mentionedBrand).length;
    const overallScore = totalEvals > 0 ? Math.round((positiveEvals / totalEvals) * 100) : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">AI Search Visibility</h1>
                    <p className="text-neutral-500">Track how often leading LLMs recommend your brand for high-intent queries.</p>
                </div>
                <Button onClick={handleRunScan} disabled={isScanning || prompts.length === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                    {isScanning ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {isScanning ? "Scanning AI Models..." : "Run Manual Scan"}
                </Button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">Overall AI Share of Voice</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-indigo-600">{totalEvals > 0 ? `${overallScore}%` : '--'}</div>
                        <p className="text-neutral-500 text-xs mt-1 font-medium">{totalEvals > 0 ? `Based on ${totalEvals} prompts` : 'Gathering data...'}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">ChatGPT (GPT-4o)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalEvals > 0 ? `${overallScore}%` : '--'}</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">Claude 3 (Opus)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-neutral-300">N/A</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">Perplexity AI</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-neutral-300">N/A</div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Insights Layer */}
            {overallScore === 0 && totalEvals > 0 ? (
                <Card className="shadow-sm bg-neutral-900 text-white mt-8 border-transparent">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-red-300 font-semibold mb-2">
                            <AlertCircle className="w-5 h-5" /> Low Visibility Detected
                        </div>
                        <CardTitle className="text-xl">AI Models are missing your brand.</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-neutral-400 text-sm mb-4">
                            Our scan shows that ChatGPT is not recommending your target brand when users ask these questions. Consider updating your website's messaging or building more authoritative backlinks to improve LLM context.
                        </p>
                    </CardContent>
                </Card>
            ) : totalEvals === 0 ? (
                <Card className="shadow-sm bg-neutral-900 text-white mt-8 border-transparent">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-indigo-300 font-semibold mb-2">
                            <Sparkles className="w-5 h-5" /> Waiting for Data
                        </div>
                        <CardTitle className="text-xl">Your AI recommendations will appear here.</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-neutral-400 text-sm mb-4">
                            We need to gather at least 1 round of LLM prompt analytics before generating targeted optimization strategies. Click "Run Manual Scan" above once you add some prompts.
                        </p>
                    </CardContent>
                </Card>
            ) : null}

            {/* Monitored Prompts */}
            <div className="pt-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Monitored User Prompts</h2>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" /> Add Prompt</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <form onSubmit={handleAddPrompt}>
                                <DialogHeader>
                                    <DialogTitle>Track a Search Prompt</DialogTitle>
                                    <DialogDescription>
                                        What question would your potential customers ask ChatGPT? We'll track it to see if you show up.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="prompt">The Prompt</Label>
                                        <Input
                                            id="prompt"
                                            placeholder="e.g. What is the best accounting software?"
                                            value={newPrompt}
                                            onChange={(e) => setNewPrompt(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="category">Category (Optional)</Label>
                                        <Input
                                            id="category"
                                            placeholder="e.g. Competitor Analysis"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit">Start Tracking</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                </div>

                <div className="border rounded-lg bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-neutral-50/50 dark:bg-neutral-900/50">
                            <TableRow>
                                <TableHead className="w-[40%]">Prompt Tracked</TableHead>
                                <TableHead>Target Brand</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Latest Visibility Score</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-neutral-500">
                                        <RefreshCw className="h-5 w-5 animate-spin mx-auto text-neutral-400" />
                                    </TableCell>
                                </TableRow>
                            ) : prompts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-neutral-500">
                                        No prompts monitored yet. Click 'Add Prompt' to start tracking LLM recommendations.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                prompts.map((prompt) => {
                                    const latestEval = prompt.evaluations?.[0];
                                    return (
                                        <TableRow key={prompt.id}>
                                            <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">
                                                "{prompt.prompt}"
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{prompt.targetBrand}</Badge>
                                            </TableCell>
                                            <TableCell className="text-neutral-500">
                                                {prompt.category || 'General'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {latestEval ? (
                                                    latestEval.mentionedBrand ? (
                                                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none">100% Visibility</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border-none">0% Visibility</Badge>
                                                    )
                                                ) : (
                                                    <span className="text-sm text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-full">Pending Scan</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
