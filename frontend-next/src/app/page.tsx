"use client";

import { useState } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testBackend = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/test/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data.success === true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setResult(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black p-8">
      <main className="w-full max-w-xl">
        {/* Card */}
        <Card className="dark:bg-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image
                className="dark:invert"
                src="/next.svg"
                alt="Next.js Logo"
                width={40}
                height={40}
              />
              Backend Connection Test
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <p className="text-zinc-600 dark:text-zinc-400">
              Click the button below to test the connection to the Django backend.
            </p>

            {/* Test Button */}
            <Button 
              onClick={testBackend} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Testing..." : "Test Backend Connection"}
            </Button>

            {/* Result Display */}
            {result !== null && (
              <div className="p-4 rounded-lg border">
                {result ? (
                  <div className="text-green-600 dark:text-green-400 font-medium">
                    ✓ Backend responded successfully! Response: true
                  </div>
                ) : (
                  <div className="text-red-600 dark:text-red-400 font-medium">
                    ✗ Backend connection failed
                  </div>
                )}
                {error && (
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                    Error: {error}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
