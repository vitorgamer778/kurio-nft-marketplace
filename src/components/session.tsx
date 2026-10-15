import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { get, post, queryClient } from "../lib/api";
import type { Session, User } from "../lib/contracts";
type Context = {
  user: User | null;
  login: (token: string, user: User, expires: number) => void;
  logout: () => Promise<void>;
  notify: (text: string) => void;
  notice: string;
};
const SessionContext = createContext<Context>(null!);
export const useSession = () => useContext(SessionContext);
export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter(),
    [token, setToken] = useState(localStorage.getItem("kurio.token")),
    [notice, notify] = useState("");
  const session = useQuery({
    queryKey: ["session", token],
    queryFn: ({ signal }) => get<Session>("/session", signal),
    enabled: !!token,
    retry: false,
    refetchInterval: 30_000,
  });
  useEffect(() => {
    const expired = () => {
      setToken(null);
      queryClient.clear();
      notify("Sua sessão expirou. Entre novamente para retomar.");
      const href = router.state.location.href;
      router.navigate({ to: "/login", search: { redirect: href } });
    };
    window.addEventListener("kurio.sessionExpired", expired);
    return () => window.removeEventListener("kurio.sessionExpired", expired);
  }, [router]);
  const login = (next: string, user: User, expires: number) => {
    queryClient.clear();
    localStorage.setItem("kurio.token", next);
    queryClient.setQueryData(["session", next], { user, expires });
    setToken(next);
  };
  const logout = async () => {
    await post("/session/logout");
    localStorage.removeItem("kurio.token");
    setToken(null);
    queryClient.clear();
    notify("Você saiu da sua conta.");
    await router.navigate({ to: "/" });
  };
  return (
    <SessionContext.Provider
      value={{
        user: session.data?.user ?? null,
        login,
        logout,
        notify,
        notice,
      }}
    >
      {children}
      <div className="notice" role="status" aria-live="polite">
        {notice && (
          <>
            <span>{notice}</span>
            <button aria-label="Fechar aviso" onClick={() => notify("")}>
              ×
            </button>
          </>
        )}
      </div>
    </SessionContext.Provider>
  );
}
