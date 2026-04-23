"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Check,
  IndianRupee,
} from "lucide-react";

interface Props {
  brandId: string;
}

interface FormState {
  name: string;
  description: string;
  price: string;
  discountPrice: string;
  inStock: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  price: "",
  discountPrice: "",
  inStock: true,
};

export default function ProductsClient({ brandId }: Props) {
  const utils = trpc.useUtils();

  const { data: products, isLoading } = trpc.product.list.useQuery();

  const createMutation = trpc.product.create.useMutation({
    onSuccess: () => {
      utils.product.list.invalidate();
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const updateMutation = trpc.product.update.useMutation({
    onSuccess: () => {
      utils.product.list.invalidate();
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
  });

  const deleteMutation = trpc.product.delete.useMutation({
    onSuccess: () => {
      utils.product.list.invalidate();
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(product: NonNullable<typeof products>[number]) {
    setShowForm(false);
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description ?? "",
      price: String(product.price),
      discountPrice: product.discountPrice != null ? String(product.discountPrice) : "",
      inStock: product.inStock,
    });
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: parseFloat(form.price),
      discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : undefined,
      inStock: form.inStock,
    };

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteMutation.mutateAsync({ id });
    setDeletingId(null);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between mb-8"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-5 h-5 text-[#25D366]" />
            <h1 className="text-2xl font-bold">Products</h1>
          </div>
          <p className="text-[#8b8b9a] text-sm">
            Manage your product catalogue for WhatsApp selling
          </p>
        </div>
        <Button variant="primary" onClick={openAdd} disabled={showForm}>
          <Plus className="w-4 h-4" />
          Add Product
        </Button>
      </motion.div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-[#141416] border border-white/[0.08] rounded-2xl p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold">New Product</h2>
              <button
                onClick={cancelForm}
                className="text-[#555562] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ProductForm
              form={form}
              setForm={setForm}
              onSubmit={handleSubmit}
              onCancel={cancelForm}
              isSaving={isSaving}
              submitLabel="Add Product"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#25D366]" />
          <p className="text-sm text-[#8b8b9a]">Loading products…</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && products && products.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-20">
          <Package className="w-10 h-10 text-[#555562] mb-3" />
          <p className="text-[#8b8b9a] font-medium">No products yet.</p>
          <p className="text-xs text-[#555562] mt-1 text-center max-w-xs">
            Add your first product to start selling via WhatsApp.
          </p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && products && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.10] transition-colors"
            >
              {/* Edit inline form */}
              {editingId === product.id ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm">Edit Product</h3>
                    <button
                      onClick={cancelForm}
                      className="text-[#555562] hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <ProductForm
                    form={form}
                    setForm={setForm}
                    onSubmit={handleSubmit}
                    onCancel={cancelForm}
                    isSaving={isSaving}
                    submitLabel="Save Changes"
                  />
                </>
              ) : (
                <>
                  {/* Product info */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-sm leading-snug flex-1">
                      {product.name}
                    </h3>
                    <Badge variant={product.inStock ? "green" : "outline"}>
                      {product.inStock ? "In Stock" : "Out of Stock"}
                    </Badge>
                  </div>

                  {product.description && (
                    <p className="text-xs text-[#8b8b9a] mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {/* Price */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex items-center gap-0.5 font-bold text-white">
                      <IndianRupee className="w-3.5 h-3.5" />
                      {product.discountPrice != null
                        ? product.discountPrice.toLocaleString("en-IN")
                        : product.price.toLocaleString("en-IN")}
                    </span>
                    {product.discountPrice != null && (
                      <span className="text-xs text-[#555562] line-through flex items-center gap-0.5">
                        <IndianRupee className="w-3 h-3" />
                        {product.price.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(product)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] text-[#8b8b9a] hover:text-white hover:bg-white/[0.08] transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-500/[0.08] text-red-400 hover:bg-red-500/[0.15] transition-colors disabled:opacity-50"
                    >
                      {deletingId === product.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      Delete
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Reusable form ─────────────────────────────────────────────────────────────

interface ProductFormProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSaving: boolean;
  submitLabel: string;
}

function ProductForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  isSaving,
  submitLabel,
}: ProductFormProps) {
  const inputClass =
    "w-full bg-[#1a1a1d] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#25D366]/40 transition-colors placeholder:text-[#555562]";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[#8b8b9a] mb-1.5">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          required
          className={inputClass}
          placeholder="e.g. Classic T-Shirt"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#8b8b9a] mb-1.5">
          Description
        </label>
        <textarea
          rows={2}
          className={inputClass + " resize-none"}
          placeholder="Short product description…"
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#8b8b9a] mb-1.5">
            Price (₹) <span className="text-red-400">*</span>
          </label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            placeholder="999"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#8b8b9a] mb-1.5">
            Discount Price (₹)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            placeholder="799"
            value={form.discountPrice}
            onChange={(e) =>
              setForm((f) => ({ ...f, discountPrice: e.target.value }))
            }
          />
        </div>
      </div>

      {/* In Stock toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">In Stock</span>
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, inStock: !f.inStock }))}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            form.inStock ? "bg-[#25D366]" : "bg-white/[0.10]"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              form.inStock ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" variant="primary" disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
