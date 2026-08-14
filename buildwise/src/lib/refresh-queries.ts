import { useQueryClient, type QueryKey } from "@tanstack/react-query";

export function useRefreshQueries() {
  const queryClient = useQueryClient();

  return (...queryKeys: QueryKey[]) =>
    Promise.all(
      queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}
