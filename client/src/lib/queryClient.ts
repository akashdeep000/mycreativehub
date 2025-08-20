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
  
  // Add Content-Type header for POST/PATCH/PUT requests with body
  if (options?.body && ['POST', 'PATCH', 'PUT'].includes(method.toUpperCase())) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add JWT token from localStorage if available
  const token = localStorage.getItem('token'); // Changed from 'authToken' to 'token' to match login.tsx
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
  
  // Return the raw response object for mutations to handle
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // Construct URL from query key array
    // For arrays like ["/api/inspiration-boards", "10", "images"], join them properly
    const url = typeof queryKey[0] === 'string' && queryKey[0].startsWith('/') 
      ? queryKey.join('/')
      : queryKey[0] as string;
    
    // Add JWT token from localStorage if available
    const token = localStorage.getItem('token'); // Changed from 'authToken' to 'token' to match login.tsx
    console.log("Frontend Query - Token check:", {
      tokenExists: !!token,
      tokenLength: token?.length || 0,
      tokenPreview: token?.substring(0, 30) + "..." || "none",
      url: url,
      fullQueryKey: queryKey
    });
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      console.log("Frontend Query - Authorization header added");
    } else {
      console.log("Frontend Query - No token found in localStorage");
    }
    
    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && (res.status === 401 || res.status === 403)) {
      // Clear token on 403 (access denied) as well as 401
      if (res.status === 403) {
        localStorage.removeItem('token');
      }
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
