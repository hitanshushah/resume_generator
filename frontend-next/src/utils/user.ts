import { useUserStore, User } from '@/store/userStore';

export type { User };

export interface UserInput {
  username: string;
  email: string;
  name?: string | null;
}

export async function getOrCreateUser(userInput: UserInput): Promise<User> {
  const store = useUserStore.getState();
  if (store.isAuthenticated && store.user) {
    if (store.user.email === userInput.email.trim()) {
      return store.user;
    }
  }

  if (!userInput.username || !userInput.email) {
    throw new Error("Username and email are required");
  }

  const username = userInput.username.trim();
  const email = userInput.email.trim();
  const name = userInput.name?.trim() || null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch("/api/users/check-or-create", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        email,
        name,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorMessage = `HTTP error! status: ${res.status}`;
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
      }
      throw new Error(errorMessage);
    }

    const data = await res.json();
    
    if (!data.id || !data.username || !data.email) {
      throw new Error("Invalid response from server");
    }

    const user: User = {
      id: data.id,
      username: data.username,
      email: data.email,
      name: data.name || null,
      profile_photo: data.profile_photo || null,
      created: data.created || false,
    };

    useUserStore.getState().setUser(user);

    return user;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Request timeout - please try again");
      }
      throw error;
    }
    throw new Error("Failed to get or create user");
  }
}

export function getUserFromStore(): UserInput | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const store = useUserStore.getState();
    if (!store.isAuthenticated || !store.user) {
      return null;
    }

    return {
      username: store.user.username,
      email: store.user.email,
      name: store.user.name,
    };
  } catch (error) {
    console.error("Error getting user from store:", error);
    return null;
  }
}

