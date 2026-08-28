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
  password: string;
}

export async function registerRequest(registerData: RegisterData) {
  const { data } = await api.post<{ user: User }>("/auth/register", registerData);
  return data;
}

export async function beginDiscordLinkRequest() {
  const { data } = await api.post<{ authorizationUrl: string }>("/auth/discord/begin");
  return data;
}

export async function meRequest() {
  const { data } = await api.get<{ user: User }>("/auth/me");
  return data;
}