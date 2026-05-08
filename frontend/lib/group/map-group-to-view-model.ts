/**
 * Adapter from API payloads to presentational models.
 * Hub: `mapGroupHomeToHubViewModel` in `api-adapters` + `hub-selectors`.
 * Detail: `mapGroupDetailFromApi` below.
 */

export { mapGroupHomeToHubViewModel } from "@/lib/group/api-adapters";
export { buildGroupDetailViewModel as mapGroupDetailFromApi, type MapViewModelInput } from "@/lib/group/selectors";
