import { useState, useEffect, useMemo } from 'react';
import { BadgePercent, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../contexts/StoreContext';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Coupon } from '../../types';
import { toast } from 'sonner';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminEmptyState } from '../../components/admin/AdminEmptyState';

export function AdminCoupons() {
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();
  const {
    isLoaded,
    stores,
    getStore,
    getStoreByAdminEmail,
    getStoreCoupons,
    addCoupon,
    updateCoupon,
    deleteCoupon,
  } = useStore();

  const [open, setOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponActive, setCouponActive] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [savingCoupon, setSavingCoupon] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    setAuthChecked(true);

    if (!user || user.role !== 'admin') {
      navigate('/login', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const resolvedStore = useMemo(() => {
    if (!user || user.role !== 'admin') return undefined;

    const directStore = user.storeId ? getStore(user.storeId) : undefined;
    if (directStore) return directStore;

    const byEmail = getStoreByAdminEmail(user.email);
    if (byEmail) return byEmail;

    if (isLoaded && stores.length === 1) return stores[0];

    return undefined;
  }, [user, getStore, getStoreByAdminEmail, isLoaded, stores]);

  const coupons = resolvedStore ? getStoreCoupons(resolvedStore.id) : [];

  if (authLoading || !authChecked || !isLoaded) {
    return <div className="p-6">Carregando cupons...</div>;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (!resolvedStore) {
    return <div className="p-6">Loja não encontrada.</div>;
  }

  const normalizeCouponActive = (coupon: any) =>
    Boolean(coupon?.active ?? coupon?.is_active ?? coupon?.isActive);

  const activeCoupons = coupons.filter((coupon) => normalizeCouponActive(coupon)).length;

  const resetForm = () => {
    setEditingCoupon(null);
    setCouponActive(true);
    setCouponCode('');
    setCouponDiscount('');
  };

  const openCreateModal = () => {
    resetForm();
    setOpen(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCouponCode(String((coupon as any).code || '').toUpperCase());
    setCouponDiscount(String((coupon as any).discount ?? ''));
    setCouponActive(normalizeCouponActive(coupon));
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (savingCoupon) return;

    const code = couponCode.trim().toUpperCase();
    const discount = Number(couponDiscount);

    if (!code) {
      toast.error('Informe o código do cupom.');
      return;
    }

    if (!discount || discount < 1 || discount > 100) {
      toast.error('Informe um desconto válido entre 1 e 100.');
      return;
    }

    const duplicatedCoupon = coupons.find((coupon) => {
      const sameCode = String((coupon as any).code || '').trim().toUpperCase() === code;
      const sameId = String((coupon as any).id) === String(editingCoupon?.id || '');
      return sameCode && !sameId;
    });

    if (duplicatedCoupon) {
      toast.error('Já existe um cupom com esse código.');
      return;
    }

    const couponData = {
      code,
      discount,
      active: couponActive,
      storeId: resolvedStore.id,
    };

    setSavingCoupon(true);

    try {
      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, couponData);
        toast.success('Cupom atualizado com sucesso!');
      } else {
        await addCoupon(couponData as Coupon);
        toast.success('Cupom criado com sucesso!');
      }

      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar cupom:', error);
      toast.error(error?.message || 'Não foi possível salvar o cupom.');
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este cupom?')) return;

    try {
      await deleteCoupon(id);
      toast.success('Cupom excluído com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir cupom:', error);
      toast.error(error?.message || 'Não foi possível excluir o cupom.');
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    const currentActive = normalizeCouponActive(coupon);

    try {
      await updateCoupon(coupon.id, { active: !currentActive });
      toast.success(!currentActive ? 'Cupom ativado.' : 'Cupom desativado.');
    } catch (error: any) {
      console.error('Erro ao atualizar status do cupom:', error);
      toast.error(error?.message || 'Não foi possível alterar o status do cupom.');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);

    if (!newOpen) {
      resetForm();
    }
  };

  return (
    <AdminShell
      title="Cupons"
      subtitle="Crie e gerencie descontos da sua loja"
      storeName={resolvedStore.name}
      stats={[
        { label: 'Cupons', value: coupons.length, helper: 'Campanhas cadastradas' },
        { label: 'Ativos', value: activeCoupons, helper: 'Disponíveis no checkout' },
      ]}
      actions={
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" className="rounded-full bg-red-500 hover:bg-red-600">
              <Plus className="mr-2 h-4 w-4" />
              Novo cupom
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCoupon ? 'Editar cupom' : 'Novo cupom'}</DialogTitle>
              <DialogDescription>
                {editingCoupon
                  ? 'Atualize os detalhes do cupom.'
                  : 'Crie um cupom para ativar promoções na sua loja.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="code">Código do cupom</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="DESCONTO20"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  style={{ textTransform: 'uppercase' }}
                  required
                />
              </div>

              <div>
                <Label htmlFor="discount">Desconto (%)</Label>
                <Input
                  id="discount"
                  name="discount"
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  placeholder="20"
                  value={couponDiscount}
                  onChange={(e) => setCouponDiscount(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">Cupom ativo</p>
                  <p className="text-sm text-slate-500">
                    Defina se ele já pode ser usado no checkout.
                  </p>
                </div>
                <Switch checked={couponActive} onCheckedChange={setCouponActive} />
              </div>

              <Button
                type="submit"
                disabled={savingCoupon}
                className="w-full bg-red-500 hover:bg-red-600"
              >
                {savingCoupon
                  ? 'Salvando...'
                  : editingCoupon
                  ? 'Salvar alterações'
                  : 'Criar cupom'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-6">
        <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-500">Descontos e campanhas</p>
              <h2 className="text-2xl font-bold text-slate-900">Gerencie seus cupons</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ative promoções para aumentar conversão e ticket médio.
              </p>
            </div>

            <Button
              type="button"
              className="rounded-full bg-red-500 hover:bg-red-600"
              onClick={openCreateModal}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo cupom
            </Button>
          </div>
        </Card>

        {coupons.length === 0 ? (
          <AdminEmptyState
            icon={Tag}
            title="Nenhum cupom criado"
            description="Crie campanhas para aumentar conversão, ticket médio e recorrência de pedidos."
            actionLabel="Criar primeiro cupom"
            onAction={openCreateModal}
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {coupons.map((coupon) => {
              const isActive = normalizeCouponActive(coupon);

              return (
                <Card
                  key={coupon.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                        <BadgePercent className="h-6 w-6" />
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{coupon.code}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {Number((coupon as any).discount || 0)}% de desconto
                        </p>
                      </div>
                    </div>

                    <div
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isActive ? 'Ativo' : 'Inativo'}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => handleToggleActive(coupon)}
                      />
                      <span className="text-sm text-slate-600">
                        Permitir uso no checkout
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="rounded-full"
                        onClick={() => openEditModal(coupon)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="rounded-full"
                        onClick={() => handleDelete(coupon.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}