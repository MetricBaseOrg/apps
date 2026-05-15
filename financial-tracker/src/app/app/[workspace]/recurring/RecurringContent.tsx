"use client";
import { useState } from "react";
import { Eyebrow } from '@/components/mb/Eyebrow';
import { GoldButton } from '@/components/mb/GoldButton';
import { postDueRules, deleteRecurringRule } from '@/server/actions/recurring';
import Link from 'next/link';
import { RecurringRuleForm } from './RecurringRuleForm';

type Rule = {
  id: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: string;
  currency: string;
  memo?: string | null;
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  startDate: Date;
  endDate?: Date | null;
  finAccountId: string;
  counterAccountId?: string | null;
  categoryId?: string | null;
  finAccount: {
    id: string;
    name: string;
    currency: string;
    createdAt: Date;
    type: string;
    openingBalance: string;
    archivedAt: Date | null;
    workspaceId: string;
  };
  nextRunDate: Date;
};

type Account = { id: string; name: string; currency: string };
type Category = { id: string; name: string; kind: 'INCOME' | 'EXPENSE' };

interface Props {
  rules: Rule[];
  dueRulesCount: number;
  slug: string;
  accounts: Account[];
  categories: Category[];
}

export function RecurringContent({
  rules,
  dueRulesCount,
  slug,
  accounts,
  categories,
}: Props) {
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  return (
    <main className="flex-1 px-4 sm:px-6 py-8 max-w-4xl mx-auto w-full">
      <div className="flex flex-col gap-8">
        <Link
          href={`/app/${slug}/transactions`}
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-2 hover:text-gold transition-colors self-start"
        >
          ← Back to transactions
        </Link>

        <header>
          <Eyebrow>Recurring transactions</Eyebrow>
          <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-white mt-2">
            Manage recurring rules
          </h1>
        </header>

        {dueRulesCount > 0 && (
          <form
            action={async () => {
              'use server';
              await postDueRules(slug);
            }}
            className="mb-card p-6 flex gap-4 items-center"
          >
            <div className="flex-1">
              <p className="text-white font-mono text-sm">
                {dueRulesCount} recurring rule{dueRulesCount === 1 ? '' : 's'} due
              </p>
              <p className="text-gray-3 text-xs mt-1">
                Post materialized transactions for rules past their next run date
              </p>
            </div>
            <GoldButton type="submit" variant="primary">
              Post due
            </GoldButton>
          </form>
        )}

        {!editingRuleId && (
          <RecurringRuleForm
            slug={slug}
            accounts={accounts}
            categories={categories}
          />
        )}

        {rules.length === 0 ? (
          <div className="mb-card p-6 text-center">
            <p className="text-gray-2">No recurring rules yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {editingRuleId && (() => {
              const rule = rules.find((r) => r.id === editingRuleId);
              if (!rule) return null;
              return (
                <RecurringRuleForm
                  slug={slug}
                  accounts={accounts}
                  categories={categories}
                  rule={{
                    id: rule.id,
                    type: rule.type,
                    amount: rule.amount,
                    currency: rule.currency,
                    memo: rule.memo,
                    freq: rule.freq,
                    interval: rule.interval,
                    startDate: rule.startDate,
                    endDate: rule.endDate,
                    finAccountId: rule.finAccountId,
                    counterAccountId: rule.counterAccountId,
                    categoryId: rule.categoryId,
                  }}
                  onSuccess={() => setEditingRuleId(null)}
                  onCancel={() => setEditingRuleId(null)}
                />
              );
            })()}
            <div className="mb-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
                      Account
                    </th>
                    <th className="text-left px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
                      Type
                    </th>
                    <th className="text-right px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
                      Amount
                    </th>
                    <th className="text-left px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
                      Frequency
                    </th>
                    <th className="text-left px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
                      Next run
                    </th>
                    <th className="text-right px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rules
                    .filter((r) => r.id !== editingRuleId)
                    .map((rule) => (
                      <tr
                        key={rule.id}
                        className="border-b border-line last:border-b-0 hover:bg-[var(--color-bg-hover)] transition-colors"
                      >
                        <td className="px-6 py-3 text-white">
                          {rule.finAccount.name}
                        </td>
                        <td className="px-6 py-3 text-gray-2">{rule.type}</td>
                        <td className="px-6 py-3 text-right text-white font-mono text-xs">
                          {rule.amount} {rule.currency}
                        </td>
                        <td className="px-6 py-3 text-gray-2">
                          Every {rule.interval} {rule.freq.toLowerCase()}
                          {rule.interval > 1 ? 's' : ''}
                        </td>
                        <td className="px-6 py-3 text-gray-2 text-xs">
                          {rule.nextRunDate.toISOString().slice(0, 10)}
                        </td>
                        <td className="px-6 py-3 text-right flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingRuleId(rule.id)}
                            className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold hover:text-white transition-colors"
                          >
                            Edit
                          </button>
                          <form
                            action={async () => {
                              'use server';
                              await deleteRecurringRule(slug, rule.id);
                            }}
                            className="inline"
                            onSubmit={(e) => {
                              if (
                                !confirm(
                                  'Are you sure you want to delete this rule?',
                                )
                              ) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <button
                              type="submit"
                              className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-down)] hover:text-white transition-colors"
                            >
                              Delete
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
