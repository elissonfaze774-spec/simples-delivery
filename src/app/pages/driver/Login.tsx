import { FormEvent, useEffect, useState } from 'react';
import { Bike, Eye, EyeOff, Loader2, Lock, LogIn, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

export default function DriverLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;

      if (session?.user) {
        const { data: driver, error: driverError } = await supabase
          .from('drivers')
          .select('id, active')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (driverError) throw driverError;

        if (driver && driver.active !== false) {
          navigate('/driver/dashboard', { replace: true });
          return;
        }
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setCheckingSession(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error('Preencha email e senha.');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      const user = data.user;

      if (!user) {
        throw new Error('Usuário não encontrado.');
      }

      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (driverError) throw driverError;

      if (!driver) {
        await supabase.auth.signOut();
        toast.error('Esse login não está vinculado a um entregador.');
        return;
      }

      if (driver.active === false) {
        await supabase.auth.signOut();
        toast.error('Entregador desativado.');
        return;
      }

      toast.success('Login realizado com sucesso.');
      navigate('/driver/dashboard', { replace: true });
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Erro ao entrar.');
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#0b0b10] text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-zinc-300 backdrop-blur">
            <Loader2 className="h-5 w-5 animate-spin text-red-400" />
            Verificando sessão...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b10] text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="hidden lg:flex lg:flex-col lg:justify-between bg-gradient-to-br from-[#2a0f14] via-[#140b0d] to-[#0b0b10] p-10">
          <div className="inline-flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
            <div className="rounded-xl bg-red-500/10 p-2 text-red-300">
              <Bike className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Simples Delivery</p>
              <h1 className="text-lg font-bold text-white">Painel do Entregador</h1>
            </div>
          </div>

          <div className="max-w-lg">
            <h2 className="text-4xl font-bold leading-tight">
              Acesse sua área de entregas com rapidez e segurança.
            </h2>
            <p className="mt-4 text-base text-zinc-300">
              Visualize pedidos, assuma entregas e conclua corridas direto no painel.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-sm text-zinc-400">Controle rápido</p>
              <h3 className="mt-2 text-xl font-semibold">Pedidos em tempo real</h3>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-sm text-zinc-400">Fluxo simples</p>
              <h3 className="mt-2 text-xl font-semibold">Assuma e finalize entregas</h3>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <Card className="w-full max-w-md rounded-[32px] border border-white/10 bg-[#111118] p-6 text-white shadow-2xl shadow-black/20 sm:p-8">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-300">
                <Bike className="h-8 w-8" />
              </div>

              <h2 className="text-2xl font-bold">Login do Entregador</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Entre com o email e senha cadastrados no sistema.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="driver-email" className="text-zinc-200">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="driver-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="h-12 rounded-2xl border-white/10 bg-[#181820] pl-10 text-white placeholder:text-zinc-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="driver-password" className="text-zinc-200">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="driver-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="h-12 rounded-2xl border-white/10 bg-[#181820] pl-10 pr-12 text-white placeholder:text-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-2xl bg-red-600 text-white hover:bg-red-500"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                Entrar
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}