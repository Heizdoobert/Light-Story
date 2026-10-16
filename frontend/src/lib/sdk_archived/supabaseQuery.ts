// src/lib/sdk/supabaseQuery.ts
"use client";

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { createClient } from "../supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Generic hook to fetch data with Supabase using TanStack Query.
 * @param key Query key array (e.g., ['users', userId])
 * @param fetcher Function that receives a Supabase client and returns a promise of data.
 * @param options Optional React Query options.
 */
export function useSupabaseQuery<TData>(
  key: any[],
  fetcher: (client: SupabaseClient) => Promise<TData>,
  options?: UseQueryOptions<TData, Error>
) {
  const supabase = createClient();
  return useQuery<TData, Error>(
    key,
    () => fetcher(supabase),
    options
  );
}

/**
 * Generic hook to perform a mutation (insert / update / delete) with Supabase.
 * @param key Invalidation key to remove/refresh after success.
 * @param mutator Function that receives a Supabase client and returns a promise.
 * @param options Optional React Query mutation options.
 */
export function useSupabaseMutation<TData, TVariables = void>(
  invalidateKey: any[],
  mutator: (client: SupabaseClient, variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, Error, TVariables>
) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  return useMutation<TData, Error, TVariables>(
    (variables) => mutator(supabase, variables),
    {
      ...options,
      onSuccess: (data, vars, ctx) => {
        queryClient.invalidateQueries(invalidateKey);
        if (options?.onSuccess) options.onSuccess(data, vars, ctx);
      },
    }
  );
}
