import { useState } from "react";

export default function useAuth() {
  const [user, setUser] = useState(null);

  async function login(username, password) {
    if (username === "admin" && password === "admin1") {
      setUser({ name: "Admin" });
      return { ok: true };
    }
    return { ok: false, error: "Credenciales inválidas" };
  }

  function logout() { setUser(null); }

  return { user, login, logout };
}
