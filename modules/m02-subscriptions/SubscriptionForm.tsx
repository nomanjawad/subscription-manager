"use client";

// m02-subscriptions — create/edit form posting straight to the server actions.
// The card dropdown is m01-cards' public CardPicker component.
import Link from "next/link";
import type { CardRow, SubscriptionOverviewRow } from "@/lib/types";
import { CardPicker } from "@/modules/m01-cards/CardPicker";
import { createSubscription, updateSubscription } from "./actions";

interface SubscriptionFormProps {
  cards: CardRow[];
  subscription?: SubscriptionOverviewRow;
}

const labelClass =
  "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1";
const inputClass =
  "w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600";

export function SubscriptionForm({ cards, subscription }: SubscriptionFormProps) {
  const isEdit = subscription !== undefined;
  const action = isEdit
    ? updateSubscription.bind(null, subscription.id)
    : createSubscription;

  return (
    <form
      action={action}
      className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">
          {isEdit
            ? `Edit subscription — ${subscription.platform}`
            : "Add subscription"}
        </h2>
        {isEdit && (
          <Link
            href="/subscriptions"
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            Cancel editing
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="platform" className={labelClass}>
            Platform <span className="text-red-500">*</span>
          </label>
          <input
            id="platform"
            name="platform"
            type="text"
            required
            defaultValue={subscription?.platform ?? ""}
            placeholder="e.g. Google Workspace"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="product" className={labelClass}>
            Product
          </label>
          <input
            id="product"
            name="product"
            type="text"
            defaultValue={subscription?.product ?? ""}
            placeholder="e.g. Business Standard"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="order_number" className={labelClass}>
            Order number
          </label>
          <input
            id="order_number"
            name="order_number"
            type="text"
            defaultValue={subscription?.order_number ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="amount" className={labelClass}>
            Amount <span className="text-red-500">*</span>
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            required
            min="0.01"
            step="0.01"
            defaultValue={subscription?.amount ?? ""}
            placeholder="0.00"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="currency" className={labelClass}>
            Currency
          </label>
          <input
            id="currency"
            name="currency"
            type="text"
            maxLength={3}
            defaultValue={subscription?.currency ?? "USD"}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="billing_cycle" className={labelClass}>
            Billing cycle
          </label>
          <select
            id="billing_cycle"
            name="billing_cycle"
            defaultValue={subscription?.billing_cycle ?? "monthly"}
            className={inputClass}
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div>
          <label htmlFor="next_renewal_date" className={labelClass}>
            Next renewal date <span className="text-red-500">*</span>
          </label>
          <input
            id="next_renewal_date"
            name="next_renewal_date"
            type="date"
            required
            defaultValue={subscription?.next_renewal_date ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>
            Card
            <span className="mt-1 block font-normal">
              <CardPicker
                cards={cards}
                name="card_id"
                defaultValue={subscription?.card_id}
              />
            </span>
          </label>
        </div>

        <div>
          <label htmlFor="account_email" className={labelClass}>
            Account email
          </label>
          <input
            id="account_email"
            name="account_email"
            type="email"
            defaultValue={subscription?.account_email ?? ""}
            placeholder="billing@company.com"
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label htmlFor="notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={subscription?.notes ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-5">
        <button
          type="submit"
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-white transition-colors"
        >
          {isEdit ? "Save changes" : "Add subscription"}
        </button>
      </div>
    </form>
  );
}
