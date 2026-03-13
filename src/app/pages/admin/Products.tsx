import { Card } from '../../components/ui/card';
import { useState, useEffect, useMemo } from 'react';
import {
  FolderPlus,
  ImageIcon,
  Package2,
  Pencil,
  Plus,
  Trash2,
  Crown,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../contexts/StoreContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Product, Category } from '../../types';
import { toast } from 'sonner';
import { AdminShell } from '../../components/admin/AdminShell';
import { AdminEmptyState } from '../../components/admin/AdminEmptyState';

type UpgradeModalState = {
  open: boolean;
  title: string;
  description: string;
  currentPlan: string;
  suggestedPlans: string[];
};

const SALES_WHATSAPP = '5582987227433';

function getHumanPlanName(plan?: string | null) {
  const normalized = String(plan || '').trim().toLowerCase();

  if (normalized === 'premium') return 'Premium';
  if (normalized === 'pro') return 'Pro';
  return 'Simples';
}

function getSuggestedPlans(plan?: string | null) {
  const normalized = String(plan || '').trim().toLowerCase();

  if (normalized === 'pro') return ['Premium'];
  if (normalized === 'premium') return [];
  return ['Pro', 'Premium'];
}

function openUpgradeWhatsApp(params: {
  storeName?: string;
  currentPlan?: string;
  reason?: string;
}) {
  const storeName = String(params.storeName || 'Minha loja').trim();
  const currentPlan = String(params.currentPlan || 'Simples').trim();
  const reason = String(params.reason || 'Atingi o limite do meu plano.').trim();

  const message = [
    'Olá! Tudo bem?',
    '',
    'Sou administrador de uma loja na plataforma e gostaria de solicitar um upgrade de plano.',
    '',
    `Loja: ${storeName}`,
    `Plano atual: ${currentPlan}`,
    `Motivo: ${reason}`,
    '',
    'Poderia me enviar as opções disponíveis para upgrade?',
    '',
    'Obrigado!',
  ].join('\n');

  const url = `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function AdminProducts() {
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();
  const {
    isLoaded,
    stores,
    getStore,
    getStoreByAdminEmail,
    getStoreProducts,
    getStoreCategories,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useStore();

  const [openProduct, setOpenProduct] = useState(false);
  const [openCategory, setOpenCategory] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('none');
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<UpgradeModalState>({
    open: false,
    title: '',
    description: '',
    currentPlan: '',
    suggestedPlans: [],
  });

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
  }, [user, isLoaded, stores, getStore, getStoreByAdminEmail]);

  const products = resolvedStore ? getStoreProducts(resolvedStore.id) : [];
  const categories = resolvedStore ? getStoreCategories(resolvedStore.id) : [];
  const currentPlanName = getHumanPlanName((resolvedStore as any)?.plan);

  if (authLoading || !authChecked || !isLoaded) {
    return <div className="p-6">Carregando catálogo...</div>;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (!resolvedStore) {
    return <div className="p-6">Loja não encontrada.</div>;
  }

  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));

  const openUpgradeModalFromError = (message: string) => {
    const planName = getHumanPlanName((resolvedStore as any)?.plan);
    const suggestedPlans = getSuggestedPlans((resolvedStore as any)?.plan);

    setUpgradeModal({
      open: true,
      title: 'Limite do plano atingido',
      description: message,
      currentPlan: planName,
      suggestedPlans,
    });
  };

  const handleSubmitProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (savingProduct) return;

    if (!isLoaded || !resolvedStore) {
      toast.error('Dados da loja ainda estão sendo carregados. Aguarde e tente novamente.');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get('name') || '').trim();
    const priceRaw = String(formData.get('price') || '').trim();
    const image = String(formData.get('image') || '').trim();

    if (!name) {
      toast.error('Informe o nome do produto.');
      return;
    }

    if (!priceRaw || Number.isNaN(Number(priceRaw))) {
      toast.error('Informe um preço válido.');
      return;
    }

    if (!image) {
      toast.error('Informe a URL da imagem.');
      return;
    }

    setSavingProduct(true);

    try {
      const productData = {
        name,
        price: Number(priceRaw),
        image,
        categoryId: selectedCategoryId === 'none' ? undefined : selectedCategoryId,
        storeId: resolvedStore.id,
        available: true,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        toast.success('Produto atualizado com sucesso!');
      } else {
        await addProduct({
          id: `product-${Date.now()}`,
          ...productData,
        });
        toast.success('Produto adicionado com sucesso!');
      }

      setOpenProduct(false);
      setEditingProduct(null);
      setSelectedCategoryId('none');
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);

      const message = error?.message || 'Não foi possível salvar o produto.';

      if (
        String(message).toLowerCase().includes('limite') &&
        String(message).toLowerCase().includes('produto')
      ) {
        toast.error('Limite de produtos atingido', {
          description: message,
        });

        setOpenProduct(false);
        openUpgradeModalFromError(message);
        return;
      }

      toast.error(message);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleSubmitCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (savingCategory) return;

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get('name') || '').trim();

    if (!name) {
      toast.error('Informe o nome da categoria.');
      return;
    }

    setSavingCategory(true);

    try {
      const categoryData = {
        name,
        storeId: resolvedStore.id,
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryData);
        toast.success('Categoria atualizada com sucesso!');
      } else {
        await addCategory({
          id: `category-${Date.now()}`,
          ...categoryData,
          order: categories.length + 1,
        });
        toast.success('Categoria criada com sucesso!');
      }

      setOpenCategory(false);
      setEditingCategory(null);
    } catch (error: any) {
      console.error('Erro ao salvar categoria:', error);

      const message = error?.message || 'Não foi possível salvar a categoria.';

      if (
        String(message).toLowerCase().includes('limite') &&
        String(message).toLowerCase().includes('categoria')
      ) {
        toast.error('Limite de categorias atingido', {
          description: message,
        });

        setOpenCategory(false);
        openUpgradeModalFromError(message);
        return;
      }

      toast.error(message);
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Deseja realmente excluir este produto?')) return;

    try {
      await deleteProduct(id);
      toast.success('Produto excluído com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir produto:', error);
      toast.error(error?.message || 'Não foi possível excluir o produto.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta categoria? Os produtos dela ficarão sem categoria.'))
      return;

    try {
      await deleteCategory(id);
      toast.success('Categoria excluída com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir categoria:', error);
      toast.error(error?.message || 'Não foi possível excluir a categoria.');
    }
  };

  const handleOpenChangeProduct = (open: boolean) => {
    setOpenProduct(open);

    if (!open) {
      setEditingProduct(null);
      setSelectedCategoryId('none');
    }
  };

  const handleOpenChangeCategory = (open: boolean) => {
    setOpenCategory(open);

    if (!open) {
      setEditingCategory(null);
    }
  };

  return (
    <AdminShell
      title="Produtos"
      subtitle="Gerencie seu cardápio com clareza"
      storeName={resolvedStore.name}
      stats={[
        { label: 'Produtos', value: products.length, helper: 'Itens cadastrados' },
        { label: 'Categorias', value: categories.length, helper: 'Organização do cardápio' },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Dialog open={openProduct} onOpenChange={handleOpenChangeProduct}>
            <DialogTrigger asChild>
              <Button type="button" className="rounded-full bg-red-500 hover:bg-red-600">
                <Plus className="mr-2 h-4 w-4" />
                Novo produto
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Editar produto' : 'Novo produto'}</DialogTitle>
                <DialogDescription>
                  {editingProduct
                    ? 'Atualize os dados do produto.'
                    : 'Cadastre um novo item no seu cardápio.'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmitProduct} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingProduct?.name || ''}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="price">Preço</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingProduct?.price ?? ''}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="image">Imagem (URL)</Label>
                  <Input
                    id="image"
                    name="image"
                    type="url"
                    defaultValue={editingProduct?.image || ''}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="categoryId">Categoria</Label>
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem categoria</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={savingProduct}
                  className="w-full bg-red-500 hover:bg-red-600"
                >
                  {savingProduct
                    ? 'Salvando...'
                    : editingProduct
                      ? 'Salvar alterações'
                      : 'Criar produto'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={openCategory} onOpenChange={handleOpenChangeCategory}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" className="rounded-full">
                <FolderPlus className="mr-2 h-4 w-4" />
                Nova categoria
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
                <DialogDescription>
                  {editingCategory
                    ? 'Atualize a categoria.'
                    : 'Crie uma categoria para organizar melhor o cardápio.'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmitCategory} className="space-y-4">
                <div>
                  <Label htmlFor="category-name">Nome</Label>
                  <Input
                    id="category-name"
                    name="name"
                    defaultValue={editingCategory?.name || ''}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={savingCategory}
                  className="w-full bg-red-500 hover:bg-red-600"
                >
                  {savingCategory
                    ? 'Salvando...'
                    : editingCategory
                      ? 'Salvar alterações'
                      : 'Criar categoria'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="space-y-6">
        <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-500">Catálogo</p>
              <h2 className="text-2xl font-bold text-slate-900">Produtos e categorias</h2>
              <p className="mt-1 text-sm text-slate-500">
                Organize o cardápio da sua loja de forma simples.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="rounded-full bg-red-500 hover:bg-red-600"
                onClick={() => setOpenProduct(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo produto
              </Button>

              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setOpenCategory(true)}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Nova categoria
              </Button>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-red-100 bg-gradient-to-r from-red-50 via-white to-red-50 p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
                <ShoppingBag className="h-5 w-5 text-red-500" />
              </div>

              <div>
                <p className="text-sm font-medium text-red-500">Plano atual</p>
                <h3 className="text-xl font-bold text-slate-900">{currentPlanName}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Se atingir o limite de produtos, o sistema bloqueia novos cadastros e exibe
                  upgrade.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="rounded-full border-red-200 text-red-600 hover:bg-red-50"
              onClick={() =>
                openUpgradeWhatsApp({
                  storeName: resolvedStore.name,
                  currentPlan: currentPlanName,
                  reason:
                    'Quero conhecer as opções de upgrade para ampliar o catálogo da minha loja.',
                })
              }
            >
              Ver planos
            </Button>
          </div>
        </Card>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="rounded-full bg-slate-100 p-1">
            <TabsTrigger value="products" className="rounded-full">
              Produtos
            </TabsTrigger>
            <TabsTrigger value="categories" className="rounded-full">
              Categorias
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            {products.length === 0 ? (
              <AdminEmptyState
                icon={Package2}
                title="Seu catálogo está vazio"
                description="Adicione produtos para começar a receber pedidos."
                actionLabel="Adicionar primeiro produto"
                onAction={() => setOpenProduct(true)}
              />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {products.map((product) => (
                  <Card
                    key={product.id}
                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-slate-400" />
                          )}
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{product.name}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {product.categoryId
                              ? categoryMap.get(product.categoryId) || 'Sem categoria'
                              : 'Sem categoria'}
                          </p>
                          <p className="mt-2 text-lg font-bold text-red-500">
                            R$ {product.price.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="rounded-full"
                          onClick={() => {
                            setEditingProduct(product);
                            setSelectedCategoryId(product.categoryId || 'none');
                            setOpenProduct(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="rounded-full"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            {categories.length === 0 ? (
              <AdminEmptyState
                icon={FolderPlus}
                title="Nenhuma categoria criada"
                description="Crie categorias para organizar melhor seu cardápio."
                actionLabel="Criar categoria"
                onAction={() => setOpenCategory(true)}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {categories.map((category) => (
                  <Card
                    key={category.id}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{category.name}</h3>
                        <p className="mt-2 text-sm text-slate-500">
                          {products.filter((product) => product.categoryId === category.id).length}{' '}
                          produtos
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="rounded-full"
                          onClick={() => {
                            setEditingCategory(category);
                            setOpenCategory(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="rounded-full"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={upgradeModal.open}
        onOpenChange={(open) =>
          setUpgradeModal((prev) => ({
            ...prev,
            open,
          }))
        }
      >
        <DialogContent className="border-red-100 bg-white sm:max-w-[560px]">
          <DialogHeader>
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <Crown className="h-7 w-7 text-red-500" />
            </div>

            <DialogTitle className="text-2xl font-bold text-slate-900">
              {upgradeModal.title}
            </DialogTitle>

            <DialogDescription className="mt-2 text-sm leading-6 text-slate-600">
              {upgradeModal.description}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Plano atual</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{upgradeModal.currentPlan}</p>
            </div>

            {upgradeModal.suggestedPlans.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {upgradeModal.suggestedPlans.map((plan) => (
                  <div
                    key={plan}
                    className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-4"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-semibold text-red-500">
                        Upgrade recomendado
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">{plan}</h3>

                    <p className="mt-2 text-sm text-slate-600">
                      Libere mais espaço para crescer sem bloqueios no catálogo.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() =>
                openUpgradeWhatsApp({
                  storeName: resolvedStore.name,
                  currentPlan: upgradeModal.currentPlan || currentPlanName,
                  reason:
                    upgradeModal.description ||
                    'Atingi o limite do meu plano e preciso ampliar minha capacidade.',
                })
              }
              className="h-11 flex-1 rounded-xl bg-red-500 text-white hover:bg-red-600"
            >
              Fazer upgrade agora
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                setUpgradeModal((prev) => ({
                  ...prev,
                  open: false,
                }))
              }
              className="h-11 flex-1 rounded-xl border-slate-200"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}