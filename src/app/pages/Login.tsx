import { useState, useEffect } from 'react';
import { ShieldCheck, LogIn, MessageCircle, Bike } from 'lucide-react';
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

function getRedirectByRole(role?: 'admin' | 'super-admin' | 'delivery-driver') {
  if (role === 'super-admin') return '/super-admin';
  if (role === 'delivery-driver') return '/driver';
  return '/admin';
}

export function Login() {
  const navigate = useNavigate();
  const { login, user, authLoading } = useAuth();
  const { reloadStoreData } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const whatsappLink =
    'https://wa.me/5582987227433?text=Ol%C3%A1%21%20Tenho%20interesse%20em%20obter%20acesso%20ao%20seu%20SaaS.%20Pode%20me%20passar%20mais%20informa%C3%A7%C3%B5es%3F';

  useEffect(() => {
    if (authLoading || !user) return;
    navigate(getRedirectByRole(user.role), { replace: true });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const normalizedEmail = normalizeEmailValue(email);
      const appUser = await login(normalizedEmail, password);

      if (!appUser) {
        toast.error('Email, senha ou vínculo de acesso estão incorretos.');
        return;
      }

      await reloadStoreData();

      toast.success('Login realizado com sucesso!');
      navigate(getRedirectByRole(appUser.role), { replace: true });
    } catch (error) {
      console.error('Erro no login:', error);
      toast.error('Erro ao fazer login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGetAccess = () => {
    window.open(whatsappLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,0,51,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(255,0,51,0.10),_transparent_28%),linear-gradient(180deg,_#050505_0%,_#090909_45%,_#0d0607_100%)] text-white">
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-red-400">
              Acesso ao sistema
            </p>
            <h1 className="text-lg font-black text-white sm:text-xl">
              Login Simples Delivery
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-10 px-4 py-10 md:grid-cols-2">
        <div className="hidden md:block">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-red-300">
              <ShieldCheck className="h-4 w-4" />
              Painel do sistema
            </div>

            <h2 className="text-4xl font-black uppercase leading-tight text-white">
              Entre para gerenciar sua operação
            </h2>

            <p className="mt-5 max-w-lg text-lg leading-8 text-zinc-400">
              Admins, super admins e entregadores acessam por aqui com um visual
              premium no tema avermelhado do seu SaaS.
            </p>

            <div className="mt-8 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Admin</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Pedidos, produtos, cupons, configurações e gestão da loja.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Super Admin</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Controle geral da estrutura do SaaS.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2">
                  <Bike className="h-4 w-4 text-red-400" />
                  <p className="text-sm font-semibold text-white">Entregador</p>
                </div>
                <p className="mt-1 text-sm text-zinc-400">
                  Acesso restrito somente à área de entregas.
                </p>
              </div>
            </div>
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
                Entrar no sistema
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Use seu email e senha para acessar sua área no Simples Delivery.
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

              <Button
                type="button"
                onClick={handleGetAccess}
                className="h-14 w-full rounded-2xl border border-red-500/20 bg-white/5 text-base font-bold text-white transition hover:bg-red-500/10"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Obter acesso
              </Button>
            </form>

            <div className="mt-6 rounded-2xl border border-red-500/10 bg-red-500/5 p-4">
              <p className="text-xs leading-6 text-zinc-400">
                Admins e entregadores acessam com login individual. Se ainda não
                tem acesso, clique em <span className="font-semibold text-white">Obter acesso</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}