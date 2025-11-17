"use client";

import { useState } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface User {
  id: number;
  username: string;
  email: string;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);

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

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsers([]);
    setUsersError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setUsersLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black p-8">
      <main className="w-full max-w-4xl space-y-6">
        {/* Backend Connection Test Card */}
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

        {/* Show Users Card */}
        <Card className="dark:bg-zinc-900">
          <CardHeader>
            <CardTitle>Users Management</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <p className="text-zinc-600 dark:text-zinc-400">
              Click the button below to fetch and display all users from the database.
            </p>

            {/* Show Users Button */}
            <Button 
              onClick={fetchUsers} 
              disabled={usersLoading}
              className="w-full"
              variant="outline"
            >
              {usersLoading ? "Loading Users..." : "Show Users"}
            </Button>

            {/* Users Error Display */}
            {usersError && (
              <div className="p-4 rounded-lg border border-red-500">
                <div className="text-red-600 dark:text-red-400 font-medium">
                  ✗ Error fetching users
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                  {usersError}
                </div>
              </div>
            )}

            {/* Users Table Display */}
            {users.length > 0 && (
              <div className="rounded-lg border dark:text-white">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-lg">
                    Users ({users.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="dark:text-white">ID</TableHead>
                        <TableHead className="dark:text-white">Username</TableHead>
                        <TableHead className="dark:text-white">Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.id}</TableCell>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.email || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!usersLoading && users.length === 0 && !usersError && (
              <div className="p-4 rounded-lg border border-dashed text-center text-zinc-500 dark:text-zinc-400">
                No users loaded. Click "Show Users" to fetch users from the database.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
