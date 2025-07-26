import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { useEffect } from "react";

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: (failureCount, error) => {
      // Retry once on network errors, but not on 401/403 errors
      if (error && 'status' in error && (error.status === 401 || error.status === 403)) {
        return false;
      }
      return failureCount < 1;
    },
    retryOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Check for stored token on mount and refetch if needed
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user && !isLoading) {
      refetch();
    }
  }, [user, isLoading, refetch]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
