"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/contexts/UserContext";
import { Progress } from "@/components/ui/progress";

interface SectionData {
  title: string;
  content: string;
}

export default function Home() {
  const { user } = useUser();
  const [prompt, setPrompt] = useState("Refactor my resume based on the pasted job description");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<Record<string, SectionData>>({});
  const [progress, setProgress] = useState({ current: 0, total: 0, message: "" });
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateResume = async () => {
    if (!prompt.trim() || !jobDescription.trim()) {
      setError("Please fill in both prompt and job description");
      return;
    }

    if (!user?.id) {
      setError("User not authenticated");
      return;
    }

    setLoading(true);
    setError(null);
    setSections({});
    setProgress({ current: 0, total: 0, message: "Starting..." });

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          job_description: jobDescription,
          user_id: user.id,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === "progress") {
                setProgress({
                  current: data.current || 0,
                  total: data.total || 0,
                  message: data.message || "",
                });
              } else if (data.type === "section") {
                setSections((prev) => ({
                  ...prev,
                  [data.section]: {
                    title: data.title,
                    content: data.content,
                  },
                }));
                setProgress({
                  current: data.progress?.current || 0,
                  total: data.progress?.total || 0,
                  message: `Completed: ${data.title}`,
                });
              } else if (data.type === "section_error") {
                setError(`Error in ${data.title}: ${data.error}`);
                // Continue processing other sections
              } else if (data.type === "complete") {
                setProgress({
                  current: data.total,
                  total: data.total,
                  message: "Resume generation completed!",
                });
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Generation cancelled");
      } else {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const cancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen justify-center bg-white font-sans dark:bg-[#212121] p-8">
      <main className="w-full max-w-4xl">
        <Card className="dark:bg-[#212121] bg-white border-0 shadow-none">

          <CardContent className="space-y-6">
            {/* Prompt Input */}
            <div className="space-y-2">
              <label htmlFor="prompt" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Prompt
              </label>
              <Textarea
                id="prompt"
                placeholder="Enter your prompt here..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
                className="min-h-10 bg-[#F9F9F9] dark:bg-[#303030] dark:text-white dark:border-0 mt-2"
              />
              <p className="text-muted-foreground text-sm">
                Enter instructions or details for resume generation.
              </p>
            </div>

            {/* Job Description Input */}
            <div className="space-y-2">
              <label htmlFor="job-description" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Job Description
              </label>
              <Textarea
                id="job-description"
                placeholder="Enter job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={loading}
                className="min-h-64 resize-none bg-[#F9F9F9] dark:bg-[#303030] dark:text-white dark:border-0 mt-2"
              />
            </div>

            {/* Generate Button */}
            <div className="flex gap-2">
              <Button 
                onClick={generateResume} 
                disabled={loading || !prompt.trim() || !jobDescription.trim()}
                className="flex-1 dark:bg-secondary dark:text-secondary-foreground hover:dark:text-white"
              >
                {loading ? "Generating..." : "Generate Resume"}
              </Button>
              {loading && (
                <Button 
                  onClick={cancelGeneration}
                  variant="outline"
                  className="dark:bg-[#303030] dark:text-white"
                >
                  Cancel
                </Button>
              )}
            </div>

            {/* Progress Bar */}
            {loading && progress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                  <span>{progress.message}</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <Progress 
                  value={(progress.current / progress.total) * 100} 
                  className="h-2"
                />
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 rounded-lg border border-red-500">
                <div className="text-red-600 dark:text-red-400 font-medium">
                  ✗ Error
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                  Failed to generate resume please try again.
                </div>
              </div>
            )}

            {/* Sections Display */}
            {Object.keys(sections).length > 0 && (
              <div className="mt-6 space-y-4">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Generated Resume Sections
                </label>
                {Object.entries(sections).map(([sectionKey, sectionData]) => (
                  <div key={sectionKey} className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-[#F9F9F9] dark:bg-[#303030]">
                    <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                      {sectionData.title}
                    </h3>
                    <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                      {sectionData.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
