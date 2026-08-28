import { api } from "./client";
import { User } from "../types";

export async function loginRequest(identifier: string, password: string) {
  const { data } = await api.post<{ token: string; user: User }>("/auth/login", {
    identifier,
    password,
  });
  return data;
}

export interface RegisterData {
  username: string;
  email: string;
  discordId: string;
  password: string;
}

export async function registerRequest(registerData: RegisterData) {
  const { data } = await api.post<{ user: User }>("/auth/register", registerData);
  return data;
}