import { api } from "./client";
import { Admin } from "../types";

export async function loginRequest(username: string, password: string) {
  const { data } = await api.post<{ token: string; admin: Admin }>("/auth/login", {
    username,
    password,
  });
  return data;
}
