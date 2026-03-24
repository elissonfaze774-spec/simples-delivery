import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

export function AdminDrivers() {
  const { user } = useAuth();

  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  async function loadDrivers() {
    const { data } = await supabase
      .from('drivers')
      .select('*')
      .eq('store_id', user?.storeId);

    setDrivers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (user?.storeId) {
      loadDrivers();
    }
  }, [user]);

  async function createDriver() {
    try {
      if (!name || !email || !phone) {
        toast.error('Preencha tudo');
        return;
      }

      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email,
          password: '123456',
        });

      if (authError) throw authError;

      const userId = authData.user?.id;

      if (!userId) {
        throw new Error('Erro ao criar usuário');
      }

      await supabase.from('drivers').insert({
        user_id: userId,
        store_id: user?.storeId,
        name,
        phone,
      });

      toast.success('Entregador criado!');
      setName('');
      setEmail('');
      setPhone('');
      loadDrivers();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function deleteDriver(id: string) {
    await supabase.from('drivers').delete().eq('id', id);
    loadDrivers();
  }

  return (
    <div className="p-6 space-y-6 text-white bg-[#0b0b10] min-h-screen">
      <h1 className="text-2xl font-bold">Entregadores</h1>

      <Card className="p-4 space-y-3 bg-[#111] border border-white/10">
        <h2 className="font-semibold">Novo entregador</h2>

        <Input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} />
        <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <Input placeholder="Telefone" value={phone} onChange={e => setPhone(e.target.value)} />

        <Button onClick={createDriver} className="bg-red-600">
          <Plus className="mr-2 h-4 w-4" />
          Criar entregador
        </Button>
      </Card>

      <div className="grid gap-4">
        {loading ? (
          <p>Carregando...</p>
        ) : drivers.length === 0 ? (
          <p>Nenhum entregador</p>
        ) : (
          drivers.map(d => (
            <Card key={d.id} className="p-4 flex justify-between items-center bg-[#111] border border-white/10">
              <div>
                <p className="font-semibold">{d.name}</p>
                <p className="text-sm opacity-70">{d.phone}</p>
              </div>

              <Button
                variant="destructive"
                onClick={() => deleteDriver(d.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}