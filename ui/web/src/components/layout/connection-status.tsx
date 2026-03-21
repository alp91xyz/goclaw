import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/use-auth-store";
import { useTenants } from "@/hooks/use-tenants";
import { cn } from "@/lib/utils";

export function ConnectionStatus({ collapsed }: { collapsed?: boolean }) {
  const { t } = useTranslation("common");
  const { t: tt } = useTranslation("tenants");
  const connected = useAuthStore((s) => s.connected);
  const { currentTenantName, currentTenantSlug, isCrossTenant, tenants } = useTenants();

  const showTenant = connected && (isCrossTenant || (currentTenantName && currentTenantSlug !== "master"));
  const tenantLabel = isCrossTenant ? tt("allTenants") : currentTenantName;

  return (
    <div className="flex flex-col gap-1 overflow-hidden">
      <div className="flex items-center gap-2 text-xs text-muted-foreground overflow-hidden">
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            connected ? "bg-green-500" : "bg-red-500",
          )}
        />
        {!collapsed && (
          <span className="truncate">{connected ? t("connected") : t("disconnected")}</span>
        )}
      </div>
      {!collapsed && showTenant && (
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className={cn(
            "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium truncate",
            isCrossTenant
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-muted text-muted-foreground",
          )}>
            {tenantLabel}
          </span>
          {!isCrossTenant && tenants.length > 1 && (
            <span className="text-xs text-muted-foreground shrink-0">+{tenants.length - 1}</span>
          )}
        </div>
      )}
    </div>
  );
}
