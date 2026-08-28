import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3333/api",
});

// Anexa o token do admin (se existir) em toda requisicao
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("fc_admin_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Se o token expirar/for invalido, limpa a sessao local
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("fc_admin_token");
      localStorage.removeItem("fc_admin_user");
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || "Ocorreu um erro inesperado.";
  }
  return "Ocorreu um erro inesperado.";
}
