import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import i18next from "i18next";
import { useWs } from "@/hooks/use-ws";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/stores/use-toast-store";
import { Methods } from "@/api/protocol";
import type { TenantData } from "@/types/tenant";

export function useTenantsAdmin() {
  const ws = useWs();
  const queryClient = useQueryClient();

  const { data: tenants = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.tenants.all,
    queryFn: async () => {
      const res = await ws.call<{ tenants: TenantData[] }>(Methods.TENANTS_LIST);
      return res?.tenants ?? [];
    },
    staleTime: 30_000,
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all }),
    [queryClient],
  );

  const createTenant = useCallback(
    async (data: { name: string; slug: string }) => {
      try {
        const res = await ws.call<TenantData>(Methods.TENANTS_CREATE, data);
        await invalidate();
        toast.success(i18next.t("tenants:createTenant"), i18next.t("tenants:name") + ": " + data.name);
        return res;
      } catch (err) {
        toast.error(i18next.t("tenants:createTenant"), err instanceof Error ? err.message : "");
        throw err;
      }
    },
    [ws, invalidate],
  );

  return { tenants, loading, refresh: invalidate, createTenant };
}
