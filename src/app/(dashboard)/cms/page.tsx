"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Globe, RefreshCw, Server, Zap } from "lucide-react";

export default function CMSPage() {
    const [isTesting, setIsTesting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const testConnection = () => {
        setIsTesting(true);
        setTimeout(() => {
            setIsTesting(false);
            setIsConnected(true);
        }, 2000);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">CMS Connection</h1>
                <p className="text-neutral-500">Connect your website to enable AutoRank.ai's autopilot publishing.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className={`border-2 ${isConnected ? 'border-green-500 dark:border-green-500/50' : 'border-indigo-600'}`}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div className="w-12 h-12 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-600 flex items-center justify-center mb-4">
                                <Globe className="w-6 h-6" />
                            </div>
                            {isConnected && <Badge className="bg-green-500">Connected</Badge>}
                        </div>
                        <CardTitle>WordPress</CardTitle>
                        <CardDescription>Connect via Application Passwords API.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="wp-url">Site URL</Label>
                            <Input id="wp-url" placeholder="https://example.com" disabled={isConnected} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="wp-user">Username</Label>
                            <Input id="wp-user" placeholder="admin" disabled={isConnected} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="wp-pass">Application Password</Label>
                            <Input id="wp-pass" type="password" placeholder="xxxx xxxx xxxx xxxx" disabled={isConnected} />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={() => setIsConnected(false)} disabled={!isConnected}>Disconnect</Button>
                        <Button onClick={testConnection} disabled={isTesting || isConnected} className="bg-indigo-600 hover:bg-indigo-700">
                            {isTesting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isConnected ? "Connection Verified" : "Connect & Verify"}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Other CMS Options */}
                <div className="space-y-4">
                    <CMSOptionCard title="Webflow" icon={<LayoutIcon />} disabled />
                    <CMSOptionCard title="Shopify Blog" icon={<Server className="w-5 h-5" />} disabled />
                    <CMSOptionCard title="Custom API (Webhook)" icon={<Zap className="w-5 h-5" />} disabled />
                </div>
            </div>

            {isConnected && (
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <CardHeader>
                        <CardTitle className="text-green-800 dark:text-green-400">Autopilot is Ready</CardTitle>
                        <CardDescription className="text-green-700 dark:text-green-500">
                            Articles will now automatically sync to your WordPress drafts or be published directly based on your settings.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <label className="flex items-center gap-3 bg-white dark:bg-neutral-900 p-4 rounded-md border shadow-sm cursor-pointer">
                            <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" defaultChecked />
                            <div>
                                <p className="font-medium text-sm">Publish directly to live (Auto-publish)</p>
                                <p className="text-xs text-neutral-500">Uncheck to send articles as drafts for manual review.</p>
                            </div>
                        </label>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function CMSOptionCard({ title, icon, disabled }: { title: string, icon: React.ReactNode, disabled?: boolean }) {
    return (
        <Card className={`opacity-${disabled ? '60' : '100'} shadow-sm`}>
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600">
                        {icon}
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">{title}</h3>
                    </div>
                </div>
                <Badge variant={disabled ? "outline" : "secondary"}>{disabled ? "Coming Soon" : "Available"}</Badge>
            </CardContent>
        </Card>
    );
}

function LayoutIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><line x1="3" x2="21" y1="9" y2="9" /><line x1="9" x2="9" y1="21" y2="9" /></svg>;
}
