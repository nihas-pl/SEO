"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronRight, Plus, Users, Zap } from "lucide-react";
import Link from "next/link";

const clients: any[] = [];

export default function AgencyPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Agency Overview</h1>
                    <p className="text-neutral-500">Manage your client workspaces, billing, and team members.</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="mr-2 h-4 w-4" /> Add New Client
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">Active Clients</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">0</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">Total Articles Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">0</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">Links Earned</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">0</div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-indigo-800 dark:text-indigo-400">Total MRR Impact</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">$0</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Client Workspaces</CardTitle>
                    <CardDescription>All workspaces managed under your agency account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Client / Workspace</TableHead>
                                <TableHead>Domain</TableHead>
                                <TableHead>Subscription</TableHead>
                                <TableHead className="text-right">Articles Published</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clients.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-neutral-500">
                                        No clients added yet. Click 'Add New Client' to create a workspace.
                                    </TableCell>
                                </TableRow>
                            ) : clients.map((client) => (
                                <TableRow key={client.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                                                <Building2 className="w-4 h-4 text-neutral-500" />
                                            </div>
                                            {client.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-neutral-500">{client.domain}</TableCell>
                                    <TableCell><Badge variant="outline">{client.plan}</Badge></TableCell>
                                    <TableCell className="text-right font-medium">{client.articles}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={client.status === 'Active' ? 'default' : 'secondary'} className={client.status === 'Active' ? 'bg-green-500' : ''}>
                                            {client.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">Switch <ChevronRight className="w-4 h-4 ml-1" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
