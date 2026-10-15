import { useState } from "react";
import {
  Link,
  useNavigate,
  useSearch,
  useRouterState,
} from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { post, message } from "../lib/api";
import type { User } from "../lib/contracts";
import { useSession } from "../components/session";
import { Dialog } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Field, Password } from "../components/common";
import { Home } from "./home";
export function Auth() {
  const register = useRouterState().location.pathname === "/register",
    navigate = useNavigate(),
    search = useSearch({ strict: false }) as { redirect?: string },
    { login, notify } = useSession(),
    [error, setError] = useState(""),
    [info, setInfo] = useState("");
  const mutation = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      password: string;
      confirm: string;
    }) => {
      if (register) {
        if (data.password !== data.confirm)
          throw new Error("As senhas não coincidem.");
        await post("/session/register", data);
      }
      return post<{ token: string; user: User; expires: number }>(
        "/session/login",
        data,
      );
    },
    onSuccess: (r) => {
      login(r.token, r.user, r.expires);
      notify(
        register
          ? "Perfil criado. Bem-vindo à Kurio."
          : "Você entrou na sua conta.",
      );
      const target =
        search.redirect?.startsWith("/") && !search.redirect.startsWith("//")
          ? search.redirect
          : "/";
      navigate({ to: target });
    },
    onError: (e) => setError(message(e)),
  });
  return (
    <>
      <div className="auth-backdrop" inert>
        <Home />
      </div>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) navigate({ to: "/" });
        }}
        title={register ? "Criar perfil de colecionador" : "Entrar"}
        className="auth-dialog"
      >
        <div className="auth-logo">KURIO</div>
        <div className="auth-tabs">
          <Link
            to="/login"
            search={{ redirect: search.redirect }}
            className={!register ? "active" : ""}
          >
            Entrar
          </Link>
          <span>|</span>
          <Link
            to="/register"
            search={{ redirect: search.redirect }}
            className={register ? "active" : ""}
          >
            Criar conta
          </Link>
        </div>
        <p className="auth-intro">
          Entre para gerenciar sua carteira, coleção e perfil de criador.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            const f = new FormData(e.currentTarget);
            mutation.mutate({
              name: String(f.get("name") || ""),
              email: String(f.get("email")),
              password: String(f.get("password")),
              confirm: String(f.get("confirm") || ""),
            });
          }}
        >
          {register && (
            <Field
              label="Nome de usuário"
              name="name"
              required
              minLength={2}
              autoComplete="nickname"
            />
          )}
          <Field
            label="E-mail"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="contato@email.com"
          />
          <Password label="Senha" name="password" />
          {register && <Password label="Confirmar senha" name="confirm" />}
          {!register && (
            <button
              type="button"
              className="forgot"
              onClick={() =>
                setInfo(
                  "A recuperação por e-mail está fora do escopo. Use a conta fictícia colecionador@kurio.test com a senha Kurio123!, ou restaure os cenários de demonstração.",
                )
              }
            >
              Esqueceu a senha?
            </button>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <Button className="full" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Aguarde…"
              : register
                ? "Criar perfil"
                : "Entrar"}
          </Button>
        </form>
        <div className="social-auth">
          <p>Ou continue com</p>
          <Button
            variant="outline"
            onClick={() =>
              setInfo(
                "Login social não está integrado. Use e-mail e senha da conta fictícia.",
              )
            }
          >
            🌐 Continuar com Google
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              setInfo(
                "Login social não está integrado. Use e-mail e senha da conta fictícia.",
              )
            }
          >
            f Continuar com Facebook
          </Button>
        </div>
        <p className="auth-bottom">
          {register ? (
            <Link to="/login" search={{ redirect: search.redirect }}>
              Já tem uma conta? Entre
            </Link>
          ) : (
            <Link to="/register" search={{ redirect: search.redirect }}>
              Novo na Kurio? Crie uma conta
            </Link>
          )}
        </p>
        <Dialog
          open={!!info}
          onOpenChange={() => setInfo("")}
          title="Acesso à demonstração"
        >
          <p>{info}</p>
        </Dialog>
      </Dialog>
    </>
  );
}
