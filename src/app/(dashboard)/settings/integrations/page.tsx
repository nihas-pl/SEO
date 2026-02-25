"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, RefreshCw, BarChart3, ArrowRight } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import Link from "next/link";
import { toast } from "sonner";

export default function IntegrationsPage() {
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);
    const [isConfigured, setIsConfigured] = useState(false);
    const [missingPropertyId, setMissingPropertyId] = useState(false);
    const [properties, setProperties] = useState<{ id: string, name: string, accountName: string }[]>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);

    // Check URL for OAuth return states
    const successParam = searchParams.get('success');
    const errorParam = searchParams.get('error');

    const fetchProperties = async () => {
        try {
            const res = await fetch('/api/integrations/google/properties');
            if (res.ok) {
                const data = await res.json();
                setProperties(data.properties || []);
            }
        } catch (err) {
            console.error("Failed to load GA4 properties:", err);
            toast.error("Could not load your websites from Google.");
        }
    };

    const checkIntegrationStatus = async () => {
        try {
            const res = await fetch('/api/analytics');
            if (res.ok) {
                const data = await res.json();
                setIsConfigured(data.isConfigured);

                if (data.isConfigured && data.missingPropertyId) {
                    setMissingPropertyId(true);
                    await fetchProperties();
                } else {
                    setMissingPropertyId(false);
                }
            }
        } catch (err) {
            console.error("Failed to check integration status", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkIntegrationStatus();
    }, []);

    const handleConnectGoogle = () => {
        // Redirect to our backend OAuth initialization route
        window.location.href = "/api/integrations/google";
    };

    const handleSaveProperty = async () => {
        if (!selectedPropertyId) return;
        setIsSaving(true);

        const selectedProp = properties.find(p => p.id === selectedPropertyId);

        try {
            const res = await fetch('/api/integrations/google/select-property', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: selectedPropertyId,
                    propertyName: selectedProp?.name || 'Unknown Website'
                })
            });

            if (res.ok) {
                toast.success("Website saved successfully!");
                setMissingPropertyId(false);
            } else {
                toast.error("Failed to save the website selection.");
            }
        } catch (err) {
            toast.error("An error occurred while saving.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
                <p className="text-neutral-500">Connect AutoRank to your external tools and analytics platforms.</p>
            </div>

            {successParam === 'google_connected' && (
                <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-4 rounded-md flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5" />
                    <div>
                        <strong className="block font-semibold">Connection Successful</strong>
                        Google Analytics has been securely linked to your workspace. Please select a website below to finish setup.
                    </div>
                </div>
            )}

            {errorParam && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 p-4 rounded-md flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <div>
                        <strong className="block font-semibold">Connection Failed</strong>
                        {errorParam === 'oauth_failed' && "There was a secure error communicating with Google. Please try again."}
                        {errorParam === 'no_code' && "The authorization request was cancelled or incomplete."}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Google Analytics Integration Card */}
                <Card className="shadow-sm border-neutral-200 dark:border-neutral-800 h-full flex flex-col">
                    <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                            <div className="w-12 h-12 rounded bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center text-amber-500 mb-4">
                                <BarChart3 className="w-6 h-6" />
                            </div>
                            {isLoading ? (
                                <RefreshCw className="h-5 w-5 text-neutral-400 animate-spin" />
                            ) : isConfigured && !missingPropertyId ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Connected
                                </span>
                            ) : isConfigured && missingPropertyId ? (
                                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-800/50">
                                    Setup required
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 rounded-full border border-neutral-200 dark:border-neutral-700">
                                    Not Connected
                                </span>
                            )}
                        </div>
                        <CardTitle className="text-xl">Google Analytics (GA4)</CardTitle>
                        <CardDescription className="text-sm mt-1">
                            Pull live organic traffic, visitor counts, and search performance directly onto your AutoRank dashboard.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="mt-auto pt-4 border-t border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex flex-col justify-between gap-4">
                        {isConfigured && missingPropertyId ? (
                            <div className="space-y-3 w-full">
                                <label className="text-sm font-medium">Select a Website to Track</label>
                                <div className="flex gap-2 w-full">
                                    <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                                        <SelectTrigger className="flex-1 bg-white dark:bg-neutral-950">
                                            <SelectValue placeholder={properties.length > 0 ? "Select property..." : "Loading websites..."} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {properties.map((prop) => (
                                                <SelectItem key={prop.id} value={prop.id}>
                                                    {prop.name} <span className="text-neutral-400 ml-1">({prop.accountName})</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleSaveProperty} disabled={!selectedPropertyId || isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                                        {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Save'}
                                    </Button>
                                </div>
                            </div>
                        ) : isConfigured && !missingPropertyId ? (
                            <div className="flex items-center justify-between w-full">
                                <div className="text-sm text-neutral-500">
                                    Traffic syncing daily
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button onClick={() => { setMissingPropertyId(true); fetchProperties(); }} variant="ghost" size="sm" className="text-neutral-500 hover:text-neutral-900">
                                        Change Website
                                    </Button>
                                    <Button asChild variant="default" size="sm" className="bg-neutral-800 hover:bg-neutral-900 text-white">
                                        <Link href="/dashboard">View Dashboard <ArrowRight className="ml-2 w-4 h-4" /></Link>
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between w-full">
                                <div className="text-sm text-neutral-500 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    Connect your account
                                </div>
                                <Button onClick={handleConnectGoogle} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    Connect GA4 Data
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
