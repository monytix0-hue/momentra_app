"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  fetchBusinessCostCenters,
  fetchBusinessControlSummary,
  fetchBusinessDashboard,
  fetchBusinessInsights,
  fetchBusinessRecommendations,
  fetchBusinessSpends,
  fetchBusinessToday,
  fetchBusinessUnits,
  fetchBusinessVendors,
  fetchBusinessWorkspace,
  fetchBusinessWorkspaces,
  type BusinessCostCenter,
  type BusinessControlSummary,
  type BusinessDashboard,
  type BusinessInsights,
  type BusinessRecommendation,
  type BusinessSpend,
  type BusinessToday,
  type BusinessUnit,
  type BusinessVendor,
  type BusinessWorkspace,
} from "@/lib/api/business";
import { buildWorkspaceBusinessDashboardModel } from "@/lib/business/selectors";
import type { WorkspaceBusinessDashboardModel } from "@/lib/business/types";

export type WorkspaceBusinessDataState = {
  loading: boolean;
  error: string | null;
  workspaces: BusinessWorkspace[];
  workspace: BusinessWorkspace | null;
  dashboard: BusinessDashboard | null;
  today: BusinessToday | null;
  control: BusinessControlSummary | null;
  insights: BusinessInsights | null;
  recommendations: BusinessRecommendation[];
  spends: BusinessSpend[];
  units: BusinessUnit[];
  vendors: BusinessVendor[];
  costCenters: BusinessCostCenter[];
  viewModel: WorkspaceBusinessDashboardModel | null;
};

const initial: WorkspaceBusinessDataState = {
  loading: true,
  error: null,
  workspaces: [],
  workspace: null,
  dashboard: null,
  today: null,
  control: null,
  insights: null,
  recommendations: [],
  spends: [],
  units: [],
  vendors: [],
  costCenters: [],
  viewModel: null,
};

export function useWorkspaceBusinessData(workspaceId: string) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<WorkspaceBusinessDataState>(initial);

  const load = useCallback(async () => {
    if (!user) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const token = await user.getIdToken();
      const [workspaces, workspace, dashboard, today, control, insights, recommendations, spends, units, vendors, costCenters] =
        await Promise.all([
          fetchBusinessWorkspaces(token, true),
          fetchBusinessWorkspace(token, workspaceId),
          fetchBusinessDashboard(token, workspaceId),
          fetchBusinessToday(token, workspaceId),
          fetchBusinessControlSummary(token, workspaceId),
          fetchBusinessInsights(token, workspaceId),
          fetchBusinessRecommendations(token, workspaceId),
          fetchBusinessSpends(token, workspaceId),
          fetchBusinessUnits(token, workspaceId),
          fetchBusinessVendors(token, workspaceId),
          fetchBusinessCostCenters(token, workspaceId),
        ]);

      const viewModel = buildWorkspaceBusinessDashboardModel({
        workspace,
        dashboard,
        control,
        today,
        insights,
        recommendations,
        vendors,
      });

      setState({
        loading: false,
        error: null,
        workspaces,
        workspace,
        dashboard,
        today,
        control,
        insights,
        recommendations,
        spends,
        units,
        vendors,
        costCenters,
        viewModel,
      });
    } catch (e) {
      setState({
        ...initial,
        loading: false,
        error: e instanceof Error ? e.message : "Could not load this workspace",
      });
    }
  }, [user, workspaceId]);

  useEffect(() => {
    if (authLoading || !user) return;
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [authLoading, user, load]);

  const loading = authLoading || (user ? state.loading : false);

  return { ...state, loading, reload: load, authLoading, user };
}
