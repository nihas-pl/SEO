"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Globe, Database, BarChart, Link as LinkIcon, CheckCircle2, ArrowRight, Zap } from "lucide-react";

export default function OnboardingFlow() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1 State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [url, setUrl] = useState("");
    const [industry, setIndustry] = useState("");

    // Step 2 State
    const [cmsType, setCmsType] = useState<"wordpress" | "webflow">("wordpress");
    const [cmsUrl, setCmsUrl] = useState("");
    const [cmsApiUser, setCmsApiUser] = useState("");
    const [cmsApiKey, setCmsApiKey] = useState("");
    const [isConnectingCms, setIsConnectingCms] = useState(false);

    // Step 4 State
    const [optInNetwork, setOptInNetwork] = useState(true);
    const [isFinishing, setIsFinishing] = useState(false);

    const steps = [
        { id: 1, title: "Website Analysis", description: "Enter your domain to generate your Content Plan", icon: <Globe className="w-5 h-5" /> },
        { id: 2, title: "CMS Connection", description: "Automate publishing to your site", icon: <Database className="w-5 h-5" /> },
        { id: 3, title: "Analytics tracking", description: "Connect Google Analytics", icon: <BarChart className="w-5 h-5" /> },
        { id: 4, title: "Backlink Network", description: "Join the Partner Exchange", icon: <LinkIcon className="w-5 h-5" /> },
    ];

    const handleStep1Submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAnalyzing(true);
        try {
            const res = await fetch("/api/onboarding/step1", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, industry })
            });
            if (res.ok) {
                setCurrentStep(2);
            } else {
                alert("Failed to analyze website.");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleStep2Submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsConnectingCms(true);
        // Simulate CMS connection
        setTimeout(() => {
            setIsConnectingCms(false);
            setCurrentStep(3);
        }, 1500);
    };

    const skipStep = (nextStep: number) => {
        setCurrentStep(nextStep);
    };

    const handleFinish = async () => {
        setIsFinishing(true);
        try {
            await fetch("/api/onboarding/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ networkOptIn: optInNetwork })
            });
            router.push("/dashboard");
        } catch (error) {
            console.error(error);
        } finally {
            setIsFinishing(false);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8 grid md:grid-cols-[300px_1fr] gap-12 items-start mt-8">

            {/* Left Nav / Vertical Stepper */}
            <div className="hidden md:block sticky top-24">
                <nav className="space-y-8">
                    {steps.map((step, index) => {
                        const isCompleted = currentStep > step.id;
                        const isActive = currentStep === step.id;
                        const isPending = currentStep < step.id;

                        return (
                            <div key={step.id} className="relative">
                                {index !== steps.length - 1 && (
                                    <div className={`absolute top-8 left-[19px] w-[2px] h-[calc(100%+16px)] ${isCompleted ? 'bg-indigo-600' : 'bg-neutral-200 dark:bg-neutral-800'}`} />
                                )}
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 z-10 bg-white dark:bg-neutral-950 transition-colors ${isCompleted ? "border-indigo-600 bg-indigo-600 text-white" :
                                        isActive ? "border-indigo-600 text-indigo-600" :
                                            "border-neutral-200 text-neutral-400 dark:border-neutral-800"
                                        }`}>
                                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
                                    </div>
                                    <div>
                                        <h3 className={`font-semibold text-base ${isActive ? 'text-indigo-600 tracking-tight' : isCompleted ? 'text-neutral-900 dark:text-white' : 'text-neutral-500'}`}>
                                            {step.title}
                                        </h3>
                                        <p className="text-sm text-neutral-500 mt-0.5">{step.description}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </nav>
            </div>

            {/* Right Content Area */}
            <div className="w-full max-w-xl">
                {currentStep === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold tracking-tight mb-2">Configure Workspace</h2>
                            <p className="text-neutral-500 text-lg">Enter your domain and we'll analyze it to generate your first 30-day SEO plan.</p>
                        </div>

                        <form onSubmit={handleStep1Submit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="url">Website URL</Label>
                                <Input
                                    id="url"
                                    type="url"
                                    placeholder="https://example.com"
                                    required
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="industry">Target Keyword / Industry (Optional)</Label>
                                <Input
                                    id="industry"
                                    placeholder="e.g. Accounting Software, B2B SaaS"
                                    value={industry}
                                    onChange={(e) => setIndustry(e.target.value)}
                                    className="h-12"
                                />
                                <p className="text-sm text-neutral-500">Helps the AI generate more relevant content topics.</p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 text-base bg-indigo-600 hover:bg-indigo-700 mt-4"
                                disabled={isAnalyzing || !url}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Running Analysis & Generating Plan...
                                    </>
                                ) : (
                                    <>Start Analysis <ArrowRight className="ml-2 h-5 w-5" /></>
                                )}
                            </Button>
                        </form>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold tracking-tight mb-2">Connect your CMS</h2>
                            <p className="text-neutral-500 text-lg">AutoRank needs access to your CMS so it can automatically publish articles and inject contextual backlinks.</p>
                        </div>

                        <form onSubmit={handleStep2Submit} className="space-y-6">
                            <div className="flex gap-4 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setCmsType("wordpress")}
                                    className={`flex-1 py-3 text-sm font-semibold rounded-md transition-all ${cmsType === "wordpress" ? "bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-white" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"}`}
                                >
                                    WordPress
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCmsType("webflow")}
                                    className={`flex-1 py-3 text-sm font-semibold rounded-md transition-all ${cmsType === "webflow" ? "bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-white" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"}`}
                                >
                                    Webflow
                                </button>
                            </div>

                            <Card className="shadow-none bg-neutral-50/50 dark:bg-neutral-900/20">
                                <CardContent className="pt-6 space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="cmsUrl">CMS URL</Label>
                                        <Input
                                            id="cmsUrl"
                                            placeholder={cmsType === "wordpress" ? "https://example.com/wp-json" : "api.webflow.com/v2/sites/..."}
                                            value={cmsUrl}
                                            onChange={(e) => setCmsUrl(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="apiUser">API Username (Optional)</Label>
                                        <Input
                                            id="apiUser"
                                            placeholder="admin"
                                            value={cmsApiUser}
                                            onChange={(e) => setCmsApiUser(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="apiKey">API Key / App Password</Label>
                                        <Input
                                            id="apiKey"
                                            type="password"
                                            value={cmsApiKey}
                                            onChange={(e) => setCmsApiKey(e.target.value)}
                                            required
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex gap-4 pt-4">
                                <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => skipStep(3)}>
                                    Skip for now
                                </Button>
                                <Button type="submit" className="h-12 flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={isConnectingCms || !cmsUrl || !cmsApiKey}>
                                    {isConnectingCms ? <Loader2 className="w-5 h-5 animate-spin" /> : "Connect CMS"}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold tracking-tight mb-2">Prove the Value</h2>
                            <p className="text-neutral-500 text-lg">Connect Google Analytics so we can track how much traffic the AI is driving to your site in the main dashboard.</p>
                        </div>

                        <div className="p-8 border rounded-xl bg-white dark:bg-neutral-900 text-center space-y-6">
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto text-blue-600">
                                <BarChart className="w-8 h-8" />
                            </div>

                            <div>
                                <h3 className="text-lg font-bold mb-2">Google Analytics 4</h3>
                                <p className="text-neutral-500 text-sm max-w-md mx-auto">AutoRank only requests read-only access to view traffic data for your dashboard widgets.</p>
                            </div>

                            <Button onClick={() => { /* Real OAuth flow */ skipStep(4) }} className="w-full max-w-sm h-12 bg-white text-neutral-900 border hover:bg-neutral-50 shadow-sm">
                                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Sign In with Google
                            </Button>
                        </div>

                        <div className="flex gap-4 pt-8">
                            <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => skipStep(4)}>
                                Skip for now
                            </Button>
                        </div>
                    </div>
                )}

                {currentStep === 4 && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold tracking-tight mb-2">Backlink Exchange Network</h2>
                            <p className="text-neutral-500 text-lg">Opt-in to allow the platform to automatically negotiate and exchange contextual backlinks with other high-quality partners to boost your DR.</p>
                        </div>

                        <div className="p-1 border rounded-xl bg-white dark:bg-neutral-900 shadow-sm relative overflow-hidden group">
                            <div className={`absolute inset-0 bg-indigo-50/50 dark:bg-indigo-900/10 transition-opacity ${optInNetwork ? 'opacity-100' : 'opacity-0'}`} />

                            <label className="flex items-start gap-4 p-5 cursor-pointer relative z-10 w-full">
                                <div className="mt-1">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 text-indigo-600 rounded border-neutral-300 focus:ring-indigo-600"
                                        checked={optInNetwork}
                                        onChange={(e) => setOptInNetwork(e.target.checked)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-lg">Join the AutoRank Network</h4>
                                    <p className="text-neutral-500 text-sm mt-1 mb-4">By joining, you agree to host relevant links on your articles in exchange for outbound links on partner sites. You have full approval control over inbound links.</p>

                                    <div className="flex gap-2">
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                            Recommended
                                        </span>
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                                            +25% Average DR Growth
                                        </span>
                                    </div>
                                </div>
                            </label>
                        </div>

                        <div className="mt-10 pt-6 border-t">
                            <Button
                                onClick={handleFinish}
                                className="w-full h-14 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-lg"
                                disabled={isFinishing}
                            >
                                {isFinishing ? (
                                    <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Finalizing Setup...</>
                                ) : (
                                    <>Complete Onboarding <ArrowRight className="ml-2 w-6 h-6" /></>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
