import { useState } from "react";
import { Link } from "wouter";
import { useListPlayers, useAddPlayer, useDeletePlayer, getListPlayersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Trash2, ArrowLeft, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ADMIN_KEY_REQUIRED = "stenersadmin2";

const addPlayerSchema = z.object({
  username: z.string().min(1, "Username required").max(32, "Too long"),
});

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key === ADMIN_KEY_REQUIRED) {
      sessionStorage.setItem("adminKey", ADMIN_KEY_REQUIRED);
      onLogin();
    } else {
      setError("Wrong key, try again");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link href="/">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to tier list
          </button>
        </Link>

        <h1
          className="font-display text-4xl mb-1 leading-none"
          style={{ letterSpacing: "0.04em", color: "hsl(var(--foreground))" }}
        >
          Admin Access
        </h1>
        <p className="text-muted-foreground text-sm mb-8">Enter the access key to continue</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="Access key"
            value={key}
            onChange={(e) => { setKey(e.target.value); setError(""); }}
            autoFocus
            className="w-full h-12 px-4 rounded-lg text-sm font-medium transition-colors outline-none"
            style={{
              background: "hsl(var(--card))",
              border: error ? "1.5px solid hsl(var(--destructive))" : "1.5px solid hsl(var(--border))",
              color: "hsl(var(--foreground))",
            }}
            onFocus={(e) => {
              if (!error) e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.6)";
            }}
            onBlur={(e) => {
              if (!error) e.currentTarget.style.borderColor = "hsl(var(--border))";
            }}
          />
          {error && <p className="text-xs font-medium" style={{ color: "hsl(var(--destructive))" }}>{error}</p>}
          <button
            type="submit"
            className="h-12 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-80"
            style={{ background: "hsl(var(--primary))", color: "#fff" }}
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem("adminKey") === ADMIN_KEY_REQUIRED);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useListPlayers({ query: { enabled: isAdmin } });
  const players = Array.isArray(data) ? data : [];
  const addPlayer = useAddPlayer();
  const deletePlayer = useDeletePlayer();

  const form = useForm<z.infer<typeof addPlayerSchema>>({
    resolver: zodResolver(addPlayerSchema),
    defaultValues: { username: "" },
  });

  if (!isAdmin) return <AdminLogin onLogin={() => setIsAdmin(true)} />;

  const handleLogout = () => {
    sessionStorage.removeItem("adminKey");
    setIsAdmin(false);
  };

  const onSubmitAdd = ({ username }: z.infer<typeof addPlayerSchema>) => {
    addPlayer.mutate(
      { data: { username, adminKey: ADMIN_KEY_REQUIRED } },
      {
        onSuccess: () => {
          toast({ description: `${username} added to the roster` });
          form.reset();
          queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
        },
        onError: (err) => {
          toast({ description: err.error || "Failed to add player", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = (id: number, username: string) => {
    if (!window.confirm(`Remove ${username} from the roster?`)) return;
    deletePlayer.mutate(
      { id },
      {
        request: { headers: { "x-admin-key": ADMIN_KEY_REQUIRED } },
        onSuccess: () => {
          toast({ description: `${username} removed` });
          queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });
        },
        onError: (err) => {
          toast({ description: err.error || "Failed to remove player", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Tier List
              </button>
            </Link>
            <div className="w-px h-4 bg-border" />
            <span
              className="font-display text-xl leading-none"
              style={{ letterSpacing: "0.06em" }}
            >
              Admin Console
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Add Player */}
        <div className="md:col-span-1">
          <div
            className="rounded-xl p-6 sticky top-24"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <h2 className="text-sm font-semibold text-foreground mb-5">Add Player</h2>
            <form onSubmit={form.handleSubmit(onSubmitAdd)} className="flex flex-col gap-3">
              <div>
                <input
                  placeholder="Minecraft username"
                  {...form.register("username")}
                  className="w-full h-10 px-3 rounded-lg text-sm font-medium outline-none transition-colors"
                  style={{
                    background: "hsl(var(--background))",
                    border: "1.5px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.6)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(var(--border))")}
                />
                {form.formState.errors.username && (
                  <p className="text-xs mt-1" style={{ color: "hsl(var(--destructive))" }}>
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={addPlayer.isPending}
                className="h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "hsl(var(--primary))", color: "#fff" }}
              >
                {addPlayer.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add to roster
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Player Roster */}
        <div className="md:col-span-2">
          <div
            className="rounded-xl p-6"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-foreground">
                Roster
                <span className="ml-2 text-muted-foreground font-normal text-xs">
                  {players.length} player{players.length !== 1 ? "s" : ""}
                </span>
              </h2>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : players.length === 0 ? (
              <div
                className="text-center py-12 text-sm text-muted-foreground rounded-lg"
                style={{ border: "1.5px dashed hsl(var(--border))" }}
              >
                No players yet — add one
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                    style={{ background: "transparent" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "hsl(var(--background))")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                  >
                    <img
                      src={`https://mc-heads.net/avatar/${player.username}/40`}
                      alt={player.username}
                      className="w-9 h-9 rounded-md flex-shrink-0"
                      style={{ imageRendering: "pixelated" }}
                    />
                    <span className="text-sm font-medium flex-1 truncate">{player.username}</span>
                    <button
                      onClick={() => handleDelete(player.id, player.username)}
                      disabled={deletePlayer.isPending}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded transition-all"
                      style={{ color: "hsl(var(--muted-foreground))" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "hsl(var(--destructive))";
                        (e.currentTarget as HTMLElement).style.background = "hsl(var(--destructive) / 0.1)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground))";
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
