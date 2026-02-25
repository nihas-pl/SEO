"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, MoreVertical, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { getArticles } from "@/server/services/content-engine";

export default function ArticlesPage() {
    const [articles, setArticles] = useState<any[]>([]);

    useEffect(() => {
        const loadArticles = async () => {
            try {
                const dbArticles = await getArticles();
                setArticles(dbArticles);
            } catch (error) {
                console.error("Failed to fetch articles", error);
            }
        };
        loadArticles();
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">All Articles</h1>
                    <p className="text-neutral-500">Manage everything generated and published.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
                        <Input type="text" placeholder="Search articles..." className="pl-9 w-[250px]" />
                    </div>
                </div>
            </div>

            <div className="border rounded-lg bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-neutral-50/50 dark:bg-neutral-900/50">
                        <TableRow>
                            <TableHead className="w-[40%]">Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Language</TableHead>
                            <TableHead>Target Keyword</TableHead>
                            <TableHead className="text-right">Organic Clicks</TableHead>
                            <TableHead className="text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {articles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-neutral-500">
                                    No articles published yet. Generate some from the Content Plan.
                                </TableCell>
                            </TableRow>
                        ) : articles.map((article) => (
                            <TableRow key={article.id}>
                                <TableCell className="font-medium">
                                    {article.title}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={article.status === 'Published' ? 'default' : article.status === 'Scheduled' ? 'secondary' : 'outline'} className={article.status === 'Published' ? 'bg-green-500 hover:bg-green-600' : ''}>
                                        {article.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <span className="uppercase text-xs font-semibold px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded">{article.language}</span>
                                </TableCell>
                                <TableCell className="text-neutral-500">{article.targetKeyword || "N/A"}</TableCell>
                                <TableCell className="text-right font-semibold">{article.clicks || "0"}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {article.status === 'Published' && (
                                            <Button variant="ghost" size="icon" title="View Live"><ExternalLink className="h-4 w-4 text-neutral-500" /></Button>
                                        )}
                                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4 text-neutral-500" /></Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
