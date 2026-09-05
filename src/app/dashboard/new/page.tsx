'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { FormBuilder } from '@/components/form-builder';
import { DashboardHeader } from '@/components/dashboard-header';
import { CategoryBadge } from '@/components/category-badge';
import { AnonymousBadge } from '@/components/anonymous-badge';
import { FilterChip } from '@/components/ui/filter-chip';
import { cn } from '@/lib/utils';
import { CATEGORY_LIST } from '@/lib/constants';
import { blankForm } from '@/lib/factories';
import { FORM_TEMPLATES, templateToForm } from '@/lib/templates';
import type { FormCategory, FormDefinition } from '@/lib/types';

/**
 * Starting point for new forms: pick a ready-made template for the job
 * (hostel complaint, mess poll, hackathon signup…) or start blank.
 */
export default function NewFormPage() {
  const [form, setForm] = useState<FormDefinition | null>(null);
  const [category, setCategory] = useState<FormCategory | 'all'>('all');

  if (form) {
    return <FormBuilder mode="create" initial={form} />;
  }

  const visible =
    category === 'all'
      ? FORM_TEMPLATES
      : FORM_TEMPLATES.filter((t) => t.category === category);

  return (
    <div className="min-h-svh">
      <DashboardHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/50 transition hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Your forms
        </Link>

        <div className="mt-4 max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ballpoint-700">
            New form
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            What kind of form is this?
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/55">
            Start from a ready template for the job — hostel complaint, mess
            poll, hackathon signup — then tweak the questions. Everything stays
            editable in the builder.
          </p>
        </div>

        {/* Category filter */}
        <div className="mt-7 flex flex-wrap items-center gap-1.5">
          <FilterChip active={category === 'all'} onClick={() => setCategory('all')}>
            All
          </FilterChip>
          {CATEGORY_LIST.map((c) => (
            <FilterChip
              key={c.key}
              active={category === c.key}
              onClick={() => setCategory(category === c.key ? 'all' : c.key)}
              icon={c.icon}
            >
              {c.label}
            </FilterChip>
          ))}
        </div>

        {/* Templates */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Blank form — always first */}
          <button
            type="button"
            onClick={() => setForm(blankForm())}
            className="group flex min-h-44 flex-col rounded-2xl border border-dashed border-ink/20 bg-card/60 p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-ballpoint-400 hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-ballpoint-500/40"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-ink/[0.05] text-ink/60 transition group-hover:bg-ballpoint-50 group-hover:text-ballpoint-700">
              <Plus className="size-5" aria-hidden />
            </span>
            <span className="mt-4 font-display text-base font-bold tracking-tight">Blank form</span>
            <span className="mt-1.5 text-[13px] leading-relaxed text-ink/50">
              Nine question types, no presets — build it your way.
            </span>
          </button>

          {visible.map((t) => {
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setForm(templateToForm(t))}
                className="group flex min-h-44 flex-col rounded-2xl border border-ink/[0.08] bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-ballpoint-300 hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-ballpoint-500/40"
              >
                <div className="flex items-center gap-2">
                  <CategoryBadge category={t.category} />
                  {t.anonymous ? <AnonymousBadge /> : null}
                  <span
                    className={cn(
                      'ml-auto grid size-8 place-items-center rounded-lg text-ink/30 transition-all',
                      'group-hover:bg-ballpoint-600 group-hover:text-white'
                    )}
                    aria-hidden
                  >
                    <ArrowRight className="size-4" />
                  </span>
                </div>
                <span className="mt-3.5 block font-display text-[16px] font-bold leading-snug tracking-tight group-hover:text-ballpoint-800">
                  {t.title}
                </span>
                <span className="mt-1.5 text-[13px] leading-relaxed text-ink/50">{t.blurb}</span>
                <span className="mt-auto pt-3 font-mono text-[11px] text-ink/40">
                  {t.questions.length} questions
                </span>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
