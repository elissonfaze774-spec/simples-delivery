import { useState, useEffect } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
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
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate('/loja')}
            className="rounded-full text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">
              Acesso administrativo
            </p>
            <h1 className="text-lg font-bold text-slate-900">Login Admin</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-5xl items-center gap-8 px-4 py-10 md:grid-cols-2">
        <div className="hidden md:block">
          <div className="max-w-md">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <ShieldCheck className="h-7 w-7" />
            </div>

            <h2 className="mt-6 text-3xl font-bold text-slate-900">
              Entre para gerenciar sua loja
            </h2>

            <p className="mt-3 text-base text-slate-500">
              Acompanhe pedidos, organize produtos, ajuste cupons e mantenha sua operação em dia.
            </p>
          </div>
        </div>

        <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <p className="text-sm text-slate-500">Bem-vindo de volta</p>
            <h2 className="text-2xl font-bold text-slate-900">Entrar no painel</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className="mt-2 h-12 rounded-2xl"
              />
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                className="mt-2 h-12 rounded-2xl"
              />
            </div>

            <Button
              type="submit"
              className="h-12 w-full rounded-2xl bg-red-500 hover:bg-red-600"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}