import { useState, useEffect } from 'react';
import { ArrowLeft, ShieldCheck, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

function normalizeEmailValue(email: string) {
  return email.trim().toLowerCase();
}

export function Login() {
  const navigate = useNavigate();
  const { login, user, authLoading } = useAuth();
  const { reloadStoreData } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;

    navigate(user.role === 'super-admin' ? '/super-admin' : '/admin', { replace: true });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const normalizedEmail = normalizeEmailValue(email);
      const appUser = await login(normalizedEmail, password);

      if (!appUser) {
        toast.error('Email, senha ou vínculo da loja estão incorretos.');
        return;
      }

      await reloadStoreData();

      toast.success('Login realizado com sucesso!');
      navigate(appUser.role === 'super-admin' ? '/super-admin' : '/admin', {
        replace: true,
      });
    } catch (error) {
      console.error('Erro no login:', error);
      toast.error('Erro ao fazer login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,0,51,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(255,0,51,0.10),_transparent_28%),linear-gradient(180deg,_#050505_0%,_#090909_45%,_#0d0607_100%)] text-white">
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate('/loja')}
            className="rounded-full border border-red-500/20 bg-black/40 text-zinc-300 hover:bg-red-500/10 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-red-400">
              Acesso administrativo
            </p>
            <h1 className="text-lg font-black text-white sm:text-xl">Login Admin</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-10 px-4 py-10 md:grid-cols-2">
        <div className="hidden md:block">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-red-300">
              <ShieldCheck className="h-4 w-4" />
              Painel admin
            </div>

            <h2 className="text-4xl font-black uppercase leading-tight text-white">
              Entre para gerenciar sua loja
            </h2>

            <p className="mt-5 max-w-lg text-lg leading-8 text-zinc-400">
              Acompanhe pedidos, organize produtos, ajuste cupons e mantenha sua
              operação em dia com o mesmo visual premium do painel do seu SaaS.
            </p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="rounded-[2rem] border border-red-500/20 bg-black/55 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-8">
            <div className="mb-6">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400">
                <ShieldCheck className="h-7 w-7" />
              </div>

              <p className="text-sm text-zinc-400">Bem-vindo de volta</p>
              <h2 className="mt-1 text-3xl font-black text-white">
                Entrar no painel
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Use seu email e senha para acessar a área administrativa da sua loja.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-zinc-200">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="mt-2 h-14 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-red-500"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-zinc-200">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="******"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="mt-2 h-14 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-red-500"
                />
              </div>

              <Button
                type="submit"
                className="h-14 w-full rounded-2xl border-0 bg-[#ff1f3d] text-base font-bold text-white shadow-[0_10px_30px_rgba(255,31,61,0.30)] transition hover:bg-[#ff324e] disabled:opacity-70"
                disabled={isSubmitting}
              >
                <LogIn className="mr-2 h-5 w-5" />
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-6 rounded-2xl border border-red-500/10 bg-red-500/5 p-4">
              <p className="text-xs leading-6 text-zinc-400">
                Acesso restrito ao administrador da loja. Faça login para gerenciar
                pedidos, produtos, categorias e desempenho da operação.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}