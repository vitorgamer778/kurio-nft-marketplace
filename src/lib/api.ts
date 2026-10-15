import axios from "axios";
import { QueryClient } from "@tanstack/react-query";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: (count, error) =>
        count < 1 &&
        (!axios.isAxiosError(error) ||
          !error.response ||
          error.response.status >= 500),
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});
export const http = axios.create({ baseURL: "/api", timeout: 10_000 });
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("kurio.token");
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});
http.interceptors.response.use(
  (r) => r,
  (error) => {
    if (
      error.response?.status === 401 &&
      localStorage.getItem("kurio.token") &&
      error.config?.headers?.Authorization ===
        "Bearer " + localStorage.getItem("kurio.token")
    ) {
      localStorage.removeItem("kurio.token");
      window.dispatchEvent(new Event("kurio.sessionExpired"));
    }
    return Promise.reject(error);
  },
);
export const get = async <T>(path: string, signal?: AbortSignal) =>
  (await http.get<T>(path, { signal })).data;
export const post = async <T>(
  path: string,
  data?: unknown,
  headers?: Record<string, string>,
) => (await http.post<T>(path, data, { headers })).data;
export const put = async <T>(path: string, data: unknown) =>
  (await http.put<T>(path, data)).data;
export const patch = async <T>(path: string, data: unknown) =>
  (await http.patch<T>(path, data)).data;
export function message(error: unknown) {
  return axios.isAxiosError(error)
    ? error.response?.data?.message ||
        "Não foi possível conectar. Verifique a conexão e tente novamente."
    : error instanceof Error
      ? error.message
      : "Não foi possível concluir a operação.";
}
export const refresh = () => queryClient.invalidateQueries();
