"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail, AlertTriangle, Zap } from "lucide-react";

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");
    const verified = searchParams.get("verified");

    if (verified === "true") {
        return (
            <Card className="shadow-xl border-0 shadow-neutral-200/50 dark:shadow-neutral-900/50">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 mb-4">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-2xl">Email Verified!</CardTitle>
                    <CardDescription>Your email has been successfully verified.</CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-center pt-2">
                    <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Link href="/content/plan">Go to Dashboard</Link>
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    if (error) {
        const errorMessages: Record<string, string> = {
            "missing-token": "No verification token was provided.",
            "invalid-token": "This verification link is invalid or has already been used.",
            "expired-token": "This verification link has expired. Please request a new one.",
            "server-error": "Something went wrong. Please try again.",
        };

        return (
            <Card className="shadow-xl border-0 shadow-neutral-200/50 dark:shadow-neutral-900/50">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 mb-4">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-2xl">Verification Failed</CardTitle>
                    <CardDescription>{errorMessages[error] || "An unknown error occurred."}</CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-center gap-3 pt-2">
                    <Button asChild variant="outline">
                        <Link href="/login">Back to Login</Link>
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    // Default: "Check your email" screen after registration
    return (
        <Card className="shadow-xl border-0 shadow-neutral-200/50 dark:shadow-neutral-900/50">
            <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 mb-4">
                    <Mail className="w-8 h-8" />
                </div>
                <CardTitle className="text-2xl">Check your email</CardTitle>
                <CardDescription>
                    We&apos;ve sent a verification link to your email address. Click the link to activate your account.
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <p className="text-sm text-neutral-500">
                    Didn&apos;t receive the email? Check your spam folder or try signing in — you can resend the verification from there.
                </p>
            </CardContent>
            <CardFooter className="flex justify-center gap-3 pt-2">
                <Button asChild variant="outline">
                    <Link href="/login">Go to Login</Link>
                </Button>
                <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Link href="/content/plan">Continue to Dashboard</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function VerifyEmailPage() {
    return (
        <>
            <div className="flex justify-center mb-8">
                <Link href="/" className="flex items-center gap-2">
                    <Zap className="h-8 w-8 text-indigo-600" />
                    <span className="text-2xl font-bold tracking-tight">AutoRank.ai</span>
                </Link>
            </div>
            <Suspense fallback={null}>
                <VerifyEmailContent />
            </Suspense>
        </>
    );
}
