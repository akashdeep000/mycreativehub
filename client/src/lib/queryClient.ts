import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
): Promise<Response> {
  const headers: Record<string, string> = {
    ...options?.headers,
  };
  
  const method = options?.method || 'GET';
  
  // Add JWT token from localStorage if available
  const token = localStorage.getItem('authToken');
  console.log("Frontend API - Token check:", {
    tokenExists: !!token,
    tokenLength: token?.length || 0,
    tokenPreview: token?.substring(0, 30) + "..." || "none",
    url: url,
    method: method
  });
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    console.log("Frontend API - Authorization header added");
  } else {
    console.log("Frontend API - No token found in localStorage");
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: options?.body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // Add JWT token from localStorage if available
    const token = localStorage.getItem('authToken');
    console.log("Frontend Query - Token check:", {
      tokenExists: !!token,
      tokenLength: token?.length || 0,
      tokenPreview: token?.substring(0, 30) + "..." || "none",
      url: queryKey[0] as string
    });
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      console.log("Frontend Query - Authorization header added");
    } else {
      console.log("Frontend Query - No token found in localStorage");
    }
    
    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
