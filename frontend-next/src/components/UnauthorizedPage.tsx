"use client";

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="text-center space-y-4 p-8">
        <h1 className="text-4xl font-bold text-foreground">Access Denied</h1>
        <p className="text-lg text-muted-foreground">
          You are not authenticated. Please log in to access this application.
        </p>
        <button
          onClick={() => {
            const loginUrl = process.env.NEXT_PUBLIC_LOGIN_URL || '/login';
            window.location.href = loginUrl;
          }}
          className="mt-4 rounded bg-gray-600 px-4 py-2 text-white"
        >
          Log In
        </button>
      </div>
    </div>
  );
}

