import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/externalClient";

/** Reads a demo-database table through the data client. */
export function useTable<T = any>(name: string) {
  return useQuery<T[]>({
    queryKey: [name],
    queryFn: async () => ((await (supabase as any).from(name).select("*")).data as T[]) ?? [],
  });
}

/** Invalidates a list of tables after a write so every screen stays in sync. */
export function useRefresh() {
  const qc = useQueryClient();
  return (...tables: string[]) => tables.forEach((t) => qc.invalidateQueries({ queryKey: [t] }));
}
