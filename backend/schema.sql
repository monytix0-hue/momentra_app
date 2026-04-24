-- Momentra backend schema for Firebase-authenticated API.
-- Compatible with PostgreSQL (including Supabase).

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
create table if not exists public.app_users (
    -- Identity
    firebase_uid text primary key,
    email text,
    phone_number text,

    -- Profile
    display_name text,
    photo_url text,
    upi_or_phone text,
    primary_use text,
    primary_focus text,
    default_currency text,
    organization_name text,
    setup_completed boolean not null default false,

    -- Timestamps
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    last_sign_in_at timestamptz
);

alter table public.app_users
    add column if not exists primary_focus text;

alter table public.app_users
    add column if not exists default_currency text;

alter table public.app_users
    add column if not exists organization_name text;

alter table public.app_users
    add column if not exists setup_completed boolean not null default false;

-- ---------------------------------------------------------------------------
-- Personal Moments
-- ---------------------------------------------------------------------------
create table if not exists public.personal_moments (
    -- Identity + ownership
    moment_id text primary key,
    firebase_uid text not null references public.app_users(firebase_uid) on delete cascade,

    -- Core details
    title text not null,
    moment_type text not null,
    duration_type text not null,
    status text not null default 'active',
    description text,

    -- Financial + timeline
    target_amount numeric(12, 2),
    start_date date,
    end_date date,
    saving_mode text,

    -- Tracking payloads
    milestones_json jsonb not null default '[]'::jsonb,

    -- Rules
    is_private_moment boolean not null default true,
    weekly_reminders boolean not null default true,
    milestone_alerts boolean not null default true,
    low_velocity_warning boolean not null default false,
    auto_archive_on_complete boolean not null default true,

    -- Notification channels
    notify_via_push boolean not null default true,
    notify_via_whatsapp boolean not null default false,
    notify_via_email boolean not null default true,

    -- Timestamps
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_personal_moments_firebase_uid
    on public.personal_moments(firebase_uid);

create index if not exists idx_personal_moments_created_at
    on public.personal_moments(created_at desc);

-- ---------------------------------------------------------------------------
-- Personal Finance (Home / Accounts / Transactions / Monthly Budget)
-- ---------------------------------------------------------------------------
create table if not exists public.personal_accounts (
    account_id text primary key,
    firebase_uid text not null references public.app_users(firebase_uid) on delete cascade,
    name text not null,
    account_type text not null default 'cash',
    icon_emoji text,
    color_hex text,
    balance numeric(12, 2) not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_personal_accounts_uid
    on public.personal_accounts(firebase_uid);

create table if not exists public.personal_budgets (
    budget_id text primary key,
    firebase_uid text not null references public.app_users(firebase_uid) on delete cascade,
    month_key text not null, -- YYYY-MM
    cap_amount numeric(12, 2) not null default 0,
    spent_amount numeric(12, 2) not null default 0,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_personal_budgets_uid_month
    on public.personal_budgets(firebase_uid, month_key);

create table if not exists public.personal_transactions (
    transaction_id text primary key,
    firebase_uid text not null references public.app_users(firebase_uid) on delete cascade,
    account_id text references public.personal_accounts(account_id) on delete set null,
    account_name text,
    kind text not null, -- expense | income
    category text not null,
    subcategory_id text,
    subcategory_label text,
    title text not null,
    amount numeric(12, 2) not null,
    note text,
    txn_date date not null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_personal_transactions_uid_date
    on public.personal_transactions(firebase_uid, txn_date desc);

create index if not exists idx_personal_transactions_uid_kind
    on public.personal_transactions(firebase_uid, kind);

create table if not exists public.personal_categories (
    category_id text primary key,
    firebase_uid text not null references public.app_users(firebase_uid) on delete cascade,
    kind text not null, -- expense | income
    name text not null,
    icon_emoji text,
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_personal_categories_uid_kind
    on public.personal_categories(firebase_uid, kind, sort_order);

create table if not exists public.personal_subcategories (
    subcategory_id text primary key,
    category_id text not null references public.personal_categories(category_id) on delete cascade,
    firebase_uid text not null references public.app_users(firebase_uid) on delete cascade,
    name text not null,
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_personal_subcategories_category
    on public.personal_subcategories(category_id, sort_order);

-- ---------------------------------------------------------------------------
-- Business Budgets
-- ---------------------------------------------------------------------------
create table if not exists public.business_budgets (
    budget_id text primary key,
    owner_uid text not null references public.app_users(firebase_uid) on delete cascade,
    budget_name text not null,
    budget_type text not null,
    total_budget numeric(12, 2),
    budget_period text not null default 'Monthly',
    department text not null default 'Marketing',
    approval_threshold numeric(12, 2),
    spending_policies_json jsonb not null default '{}'::jsonb,
    spent_amount numeric(12, 2) not null default 0,
    expenses_blocked boolean not null default false,
    status text not null default 'active',
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

-- Existing deployments: add column if missing (Postgres 11+)
alter table public.business_budgets
    add column if not exists spent_amount numeric(12, 2) not null default 0;

alter table public.business_budgets
    add column if not exists expenses_blocked boolean not null default false;

alter table public.business_budgets
    add column if not exists reminder_prefs_json jsonb not null default '{}'::jsonb;

alter table public.business_budgets
    add column if not exists join_token text;

create unique index if not exists uq_business_budgets_join_token
    on public.business_budgets (join_token)
    where join_token is not null;

create table if not exists public.business_budget_audit_events (
    event_id text primary key,
    budget_id text not null,
    actor_uid text not null,
    action text not null,
    payload_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_business_budget_audit_budget_id
    on public.business_budget_audit_events(budget_id);

create table if not exists public.business_budget_members (
    member_id text primary key,
    budget_id text not null references public.business_budgets(budget_id) on delete cascade,
    firebase_uid text,
    email text,
    initials text,
    display_name text not null,
    role text not null default 'employee',
    spend_limit text,
    is_added boolean not null default true,
    invite_status text not null default 'pending',
    invited_at timestamptz,
    joined_at timestamptz,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_business_budgets_owner_uid
    on public.business_budgets(owner_uid);

create index if not exists idx_business_budget_members_budget_id
    on public.business_budget_members(budget_id);

create index if not exists idx_business_budget_members_firebase_uid
    on public.business_budget_members(firebase_uid);

create table if not exists public.business_budget_vendors (
    vendor_id text primary key,
    budget_id text not null references public.business_budgets(budget_id) on delete cascade,
    vendor_name text not null,
    created_by_uid text,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_business_budget_vendors_budget_id
    on public.business_budget_vendors(budget_id);

alter table public.business_budget_members
    add column if not exists firebase_uid text;

alter table public.business_budget_members
    add column if not exists email text;

alter table public.business_budget_members
    add column if not exists invite_status text not null default 'pending';

alter table public.business_budget_members
    add column if not exists joined_at timestamptz;

alter table public.business_budget_members
    add column if not exists invite_token text;

create unique index if not exists uq_business_budget_members_invite_token
    on public.business_budget_members (invite_token)
    where invite_token is not null;

create table if not exists public.business_budget_categories (
    category_id text primary key,
    budget_id text not null references public.business_budgets(budget_id) on delete cascade,
    name text not null,
    allocated_amount numeric(12, 2) not null default 0,
    spent_amount numeric(12, 2) not null default 0,
    sort_order integer not null default 0
);

create index if not exists idx_business_budget_categories_budget_id
    on public.business_budget_categories(budget_id);

-- ---------------------------------------------------------------------------
-- Business category catalog (global templates + per-budget mappings/customizations)
-- ---------------------------------------------------------------------------
create table if not exists public.business_category_templates (
    template_category_id text primary key,
    entry_kind text not null, -- expense | purchase
    name text not null,
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists uq_business_category_templates_kind_name
    on public.business_category_templates(entry_kind, lower(name));

create index if not exists idx_business_category_templates_kind_order
    on public.business_category_templates(entry_kind, sort_order, template_category_id);

create table if not exists public.business_category_template_subcategories (
    template_subcategory_id text primary key,
    template_category_id text not null references public.business_category_templates(template_category_id) on delete cascade,
    name text not null,
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists uq_business_template_subcategories_name
    on public.business_category_template_subcategories(template_category_id, lower(name));

create index if not exists idx_business_template_subcategories_order
    on public.business_category_template_subcategories(template_category_id, sort_order, template_subcategory_id);

create table if not exists public.business_budget_category_mappings (
    mapping_id text primary key,
    budget_id text not null references public.business_budgets(budget_id) on delete cascade,
    entry_kind text not null, -- expense | purchase
    template_category_id text not null references public.business_category_templates(template_category_id) on delete restrict,
    budget_category_id text not null references public.business_budget_categories(category_id) on delete cascade,
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists uq_business_budget_catalog_mapping
    on public.business_budget_category_mappings(budget_id, entry_kind, template_category_id);

create index if not exists idx_business_budget_catalog_lookup
    on public.business_budget_category_mappings(budget_id, entry_kind, sort_order, mapping_id);

create table if not exists public.business_budget_subcategories (
    budget_subcategory_id text primary key,
    budget_id text not null references public.business_budgets(budget_id) on delete cascade,
    entry_kind text not null, -- expense | purchase
    template_category_id text not null references public.business_category_templates(template_category_id) on delete cascade,
    name text not null,
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists uq_business_budget_subcategories_name
    on public.business_budget_subcategories(budget_id, entry_kind, template_category_id, lower(name));

create index if not exists idx_business_budget_subcategories_lookup
    on public.business_budget_subcategories(budget_id, entry_kind, template_category_id, sort_order, budget_subcategory_id);

-- Existing deployments may already have these tables without timestamp defaults.
-- Normalize columns + defaults so seed inserts never fail with NULL timestamps.
alter table public.business_category_templates
    add column if not exists created_at timestamptz;
alter table public.business_category_templates
    add column if not exists updated_at timestamptz;
alter table public.business_category_templates
    add column if not exists sort_order integer not null default 0;
alter table public.business_category_templates
    add column if not exists is_active boolean not null default true;
alter table public.business_category_templates
    alter column created_at set default timezone('utc', now());
alter table public.business_category_templates
    alter column updated_at set default timezone('utc', now());
update public.business_category_templates
set created_at = coalesce(created_at, timezone('utc', now())),
    updated_at = coalesce(updated_at, timezone('utc', now()));
alter table public.business_category_templates
    alter column created_at set not null;
alter table public.business_category_templates
    alter column updated_at set not null;

alter table public.business_category_template_subcategories
    add column if not exists created_at timestamptz;
alter table public.business_category_template_subcategories
    add column if not exists updated_at timestamptz;
alter table public.business_category_template_subcategories
    add column if not exists sort_order integer not null default 0;
alter table public.business_category_template_subcategories
    add column if not exists is_active boolean not null default true;
alter table public.business_category_template_subcategories
    alter column created_at set default timezone('utc', now());
alter table public.business_category_template_subcategories
    alter column updated_at set default timezone('utc', now());
update public.business_category_template_subcategories
set created_at = coalesce(created_at, timezone('utc', now())),
    updated_at = coalesce(updated_at, timezone('utc', now()));
alter table public.business_category_template_subcategories
    alter column created_at set not null;
alter table public.business_category_template_subcategories
    alter column updated_at set not null;

alter table public.business_budget_category_mappings
    add column if not exists created_at timestamptz;
alter table public.business_budget_category_mappings
    add column if not exists updated_at timestamptz;
alter table public.business_budget_category_mappings
    add column if not exists sort_order integer not null default 0;
alter table public.business_budget_category_mappings
    add column if not exists is_active boolean not null default true;
alter table public.business_budget_category_mappings
    alter column created_at set default timezone('utc', now());
alter table public.business_budget_category_mappings
    alter column updated_at set default timezone('utc', now());
update public.business_budget_category_mappings
set created_at = coalesce(created_at, timezone('utc', now())),
    updated_at = coalesce(updated_at, timezone('utc', now()));
alter table public.business_budget_category_mappings
    alter column created_at set not null;
alter table public.business_budget_category_mappings
    alter column updated_at set not null;

alter table public.business_budget_subcategories
    add column if not exists created_at timestamptz;
alter table public.business_budget_subcategories
    add column if not exists updated_at timestamptz;
alter table public.business_budget_subcategories
    add column if not exists sort_order integer not null default 0;
alter table public.business_budget_subcategories
    add column if not exists is_active boolean not null default true;
alter table public.business_budget_subcategories
    alter column created_at set default timezone('utc', now());
alter table public.business_budget_subcategories
    alter column updated_at set default timezone('utc', now());
update public.business_budget_subcategories
set created_at = coalesce(created_at, timezone('utc', now())),
    updated_at = coalesce(updated_at, timezone('utc', now()));
alter table public.business_budget_subcategories
    alter column created_at set not null;
alter table public.business_budget_subcategories
    alter column updated_at set not null;

-- Seed global template categories
insert into public.business_category_templates (template_category_id, entry_kind, name, sort_order, is_active)
values
    ('tmpl_exp_operations', 'expense', 'Operations', 0, true),
    ('tmpl_exp_marketing', 'expense', 'Marketing', 1, true),
    ('tmpl_exp_payroll', 'expense', 'Payroll', 2, true),
    ('tmpl_exp_logistics', 'expense', 'Logistics', 3, true),
    ('tmpl_pur_raw_materials', 'purchase', 'Raw Materials', 0, true),
    ('tmpl_pur_inventory_stock', 'purchase', 'Inventory Stock', 1, true),
    ('tmpl_pur_packaging_purchase', 'purchase', 'Packaging Purchase', 2, true),
    ('tmpl_pur_equipment_purchase', 'purchase', 'Equipment Purchase', 3, true)
on conflict (template_category_id) do nothing;

-- Seed global template subcategories (matches current Android/iOS maps)
insert into public.business_category_template_subcategories (template_subcategory_id, template_category_id, name, sort_order, is_active)
values
    ('tmpl_exp_operations_rent', 'tmpl_exp_operations', 'Rent', 0, true),
    ('tmpl_exp_operations_utilities', 'tmpl_exp_operations', 'Utilities', 1, true),
    ('tmpl_exp_operations_maintenance', 'tmpl_exp_operations', 'Maintenance', 2, true),
    ('tmpl_exp_operations_office_supplies', 'tmpl_exp_operations', 'Office Supplies', 3, true),
    ('tmpl_exp_marketing_digital_ads', 'tmpl_exp_marketing', 'Digital Ads', 0, true),
    ('tmpl_exp_marketing_print_ads', 'tmpl_exp_marketing', 'Print Ads', 1, true),
    ('tmpl_exp_marketing_promotions', 'tmpl_exp_marketing', 'Promotions', 2, true),
    ('tmpl_exp_marketing_branding', 'tmpl_exp_marketing', 'Branding', 3, true),
    ('tmpl_exp_payroll_salaries', 'tmpl_exp_payroll', 'Salaries', 0, true),
    ('tmpl_exp_payroll_contractors', 'tmpl_exp_payroll', 'Contractors', 1, true),
    ('tmpl_exp_payroll_bonuses', 'tmpl_exp_payroll', 'Bonuses', 2, true),
    ('tmpl_exp_payroll_staff_welfare', 'tmpl_exp_payroll', 'Staff Welfare', 3, true),
    ('tmpl_exp_logistics_fuel', 'tmpl_exp_logistics', 'Fuel', 0, true),
    ('tmpl_exp_logistics_transport', 'tmpl_exp_logistics', 'Transport', 1, true),
    ('tmpl_exp_logistics_delivery', 'tmpl_exp_logistics', 'Delivery', 2, true),
    ('tmpl_exp_logistics_packaging', 'tmpl_exp_logistics', 'Packaging', 3, true),
    ('tmpl_pur_raw_materials_seeds', 'tmpl_pur_raw_materials', 'Seeds', 0, true),
    ('tmpl_pur_raw_materials_oil_cakes', 'tmpl_pur_raw_materials', 'Oil Cakes', 1, true),
    ('tmpl_pur_raw_materials_ingredients', 'tmpl_pur_raw_materials', 'Ingredients', 2, true),
    ('tmpl_pur_raw_materials_bulk_inputs', 'tmpl_pur_raw_materials', 'Bulk Inputs', 3, true),
    ('tmpl_pur_inventory_stock_finished_goods', 'tmpl_pur_inventory_stock', 'Finished Goods', 0, true),
    ('tmpl_pur_inventory_stock_retail_stock', 'tmpl_pur_inventory_stock', 'Retail Stock', 1, true),
    ('tmpl_pur_inventory_stock_wholesale_stock', 'tmpl_pur_inventory_stock', 'Wholesale Stock', 2, true),
    ('tmpl_pur_packaging_purchase_bottles', 'tmpl_pur_packaging_purchase', 'Bottles', 0, true),
    ('tmpl_pur_packaging_purchase_labels', 'tmpl_pur_packaging_purchase', 'Labels', 1, true),
    ('tmpl_pur_packaging_purchase_boxes', 'tmpl_pur_packaging_purchase', 'Boxes', 2, true),
    ('tmpl_pur_packaging_purchase_pouches', 'tmpl_pur_packaging_purchase', 'Pouches', 3, true),
    ('tmpl_pur_equipment_purchase_machinery', 'tmpl_pur_equipment_purchase', 'Machinery', 0, true),
    ('tmpl_pur_equipment_purchase_tools', 'tmpl_pur_equipment_purchase', 'Tools', 1, true),
    ('tmpl_pur_equipment_purchase_spare_parts', 'tmpl_pur_equipment_purchase', 'Spare Parts', 2, true),
    ('tmpl_pur_equipment_purchase_appliances', 'tmpl_pur_equipment_purchase', 'Appliances', 3, true)
on conflict (template_subcategory_id) do nothing;

create table if not exists public.business_budget_approvals (
    approval_id text primary key,
    budget_id text not null references public.business_budgets(budget_id) on delete cascade,
    title text not null,
    requester_name text not null,
    amount numeric(12, 2) not null,
    submitter_uid text,
    department text,
    category_id text,
    subcategory_label text,
    entry_kind text not null default 'expense',
    paid_mode text,
    purchase_payment_status text,
    quantity numeric(12, 3),
    unit text,
    price_per_unit numeric(12, 3),
    total_amount numeric(12, 2),
    paid_amount numeric(12, 2),
    vendor_balance_amount numeric(12, 2),
    payment_splits_json jsonb,
    vendor_name text,
    invoice_number text,
    expense_or_purchase text not null default 'expense',
    payment_mode text,
    due_date date,
    gstin text,
    tax_amount numeric(12, 2),
    approver_uid text,
    receipt_path text,
    receipt_mime text,
    receipt_name text,
    receipt_attached boolean not null default false,
    receipt_verified boolean not null default false,
    receipt_followup_requested boolean not null default false,
    status text not null default 'pending',
    created_at timestamptz not null default timezone('utc', now()),
    resolved_at timestamptz
);

create index if not exists idx_business_budget_approvals_budget_id
    on public.business_budget_approvals(budget_id);

create index if not exists idx_business_budget_approvals_status
    on public.business_budget_approvals(status);

alter table public.business_budget_approvals
    add column if not exists category_id text;

alter table public.business_budget_approvals
    add column if not exists subcategory_label text;

alter table public.business_budget_approvals
    add column if not exists receipt_attached boolean not null default false;

alter table public.business_budget_approvals
    add column if not exists receipt_verified boolean not null default false;

alter table public.business_budget_approvals
    add column if not exists receipt_followup_requested boolean not null default false;

alter table public.business_budget_approvals
    add column if not exists resolved_at timestamptz;

alter table public.business_budget_approvals
    add column if not exists submitter_uid text;

alter table public.business_budget_approvals
    add column if not exists vendor_name text;

alter table public.business_budget_approvals
    add column if not exists invoice_number text;

alter table public.business_budget_approvals
    add column if not exists expense_or_purchase text not null default 'expense';

alter table public.business_budget_approvals
    add column if not exists payment_mode text;

alter table public.business_budget_approvals
    add column if not exists entry_kind text not null default 'expense';

alter table public.business_budget_approvals
    add column if not exists paid_mode text;

alter table public.business_budget_approvals
    add column if not exists purchase_payment_status text;

alter table public.business_budget_approvals
    add column if not exists quantity numeric(12, 3);

alter table public.business_budget_approvals
    add column if not exists unit text;

alter table public.business_budget_approvals
    add column if not exists price_per_unit numeric(12, 3);

alter table public.business_budget_approvals
    add column if not exists total_amount numeric(12, 2);

alter table public.business_budget_approvals
    add column if not exists paid_amount numeric(12, 2);

alter table public.business_budget_approvals
    add column if not exists vendor_balance_amount numeric(12, 2);

alter table public.business_budget_approvals
    add column if not exists payment_splits_json jsonb;

alter table public.business_budget_approvals
    add column if not exists due_date date;

alter table public.business_budget_approvals
    add column if not exists gstin text;

alter table public.business_budget_approvals
    add column if not exists tax_amount numeric(12, 2);

alter table public.business_budget_approvals
    add column if not exists approver_uid text;

alter table public.business_budget_approvals
    add column if not exists receipt_path text;

alter table public.business_budget_approvals
    add column if not exists receipt_mime text;

alter table public.business_budget_approvals
    add column if not exists receipt_name text;

-- ---------------------------------------------------------------------------
-- Group Moments
-- ---------------------------------------------------------------------------
create table if not exists public.group_moments (
    moment_id text primary key,
    owner_uid text not null references public.app_users(firebase_uid) on delete cascade,
    title text not null,
    moment_type text not null,
    target_amount numeric(12, 2),
    destination text,
    trip_start_date date,
    trip_end_date date,
    split_mode text not null default 'equal',
    contribution_due_date date,
    send_payment_reminders boolean not null default true,
    auto_notify_on_contribution boolean not null default true,
    allow_partial_payments boolean not null default true,
    require_receipt_for_expenses boolean not null default false,
    require_organiser_approval boolean not null default false,
    join_token text not null unique,
    status text not null default 'active',
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Group Moment Members
-- ---------------------------------------------------------------------------
create table if not exists public.group_moment_members (
    member_id text primary key,
    moment_id text not null references public.group_moments(moment_id) on delete cascade,
    firebase_uid text references public.app_users(firebase_uid) on delete set null,
    display_name text,
    email text,
    role text not null default 'member',
    status text not null default 'invited',
    joined_at timestamptz,
    created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Group Moment Invites
-- ---------------------------------------------------------------------------
create table if not exists public.group_moment_invites (
    invite_id text primary key,
    moment_id text not null references public.group_moments(moment_id) on delete cascade,
    email text not null,
    invite_token text not null unique,
    status text not null default 'pending',
    resend_count integer not null default 0,
    sent_at timestamptz,
    joined_at timestamptz,
    last_error text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Group Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_group_moments_owner_uid
    on public.group_moments(owner_uid);

create index if not exists idx_group_moment_members_moment_id
    on public.group_moment_members(moment_id);

create index if not exists idx_group_moment_invites_moment_id
    on public.group_moment_invites(moment_id);

create index if not exists idx_group_moment_invites_status
    on public.group_moment_invites(status);

-- ---------------------------------------------------------------------------
-- Group budget categories (caps per spending category for the trip)
-- ---------------------------------------------------------------------------
create table if not exists public.group_budget_categories (
    category_id text primary key,
    moment_id text not null references public.group_moments(moment_id) on delete cascade,
    category_key text not null,
    display_name text not null,
    cap_amount numeric(12, 2) not null default 0,
    sort_order integer not null default 0,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_group_budget_categories_moment_id
    on public.group_budget_categories(moment_id);

-- ---------------------------------------------------------------------------
-- Group expenses
-- ---------------------------------------------------------------------------
create table if not exists public.group_expenses (
    expense_id text primary key,
    moment_id text not null references public.group_moments(moment_id) on delete cascade,
    category_key text not null,
    subcategory text,
    title text not null,
    amount numeric(12, 2) not null,
    expense_date date not null,
    paid_by_member_id text references public.group_moment_members(member_id) on delete set null,
    receipt_path text,
    receipt_mime text,
    receipt_notes text,
    split_mode text not null default 'equal',
    splits_json text,
    status text not null default 'approved',
    created_by_uid text not null,
    created_at timestamptz not null default timezone('utc', now())
);

alter table public.group_expenses add column if not exists split_mode text not null default 'equal';
alter table public.group_expenses add column if not exists splits_json text;

create index if not exists idx_group_expenses_moment_id
    on public.group_expenses(moment_id);

create index if not exists idx_group_expenses_category
    on public.group_expenses(moment_id, category_key);

-- ---------------------------------------------------------------------------
-- Member contributions toward the group fund (raised amount)
-- ---------------------------------------------------------------------------
create table if not exists public.group_contributions (
    contribution_id text primary key,
    moment_id text not null references public.group_moments(moment_id) on delete cascade,
    member_id text not null references public.group_moment_members(member_id) on delete cascade,
    amount numeric(12, 2) not null,
    note text,
    created_by_uid text not null,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_group_contributions_moment_id
    on public.group_contributions(moment_id);

create index if not exists idx_group_contributions_member_id
    on public.group_contributions(member_id);

-- ---------------------------------------------------------------------------
-- Group activity log (audit / alerts feed)
-- ---------------------------------------------------------------------------
create table if not exists public.group_activity_events (
    activity_id text primary key,
    moment_id text not null references public.group_moments(moment_id) on delete cascade,
    event_type text not null,
    title text not null,
    detail text,
    actor_uid text,
    actor_name text,
    meta_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_group_activity_moment_id
    on public.group_activity_events(moment_id);

create index if not exists idx_group_activity_created_at
    on public.group_activity_events(moment_id, created_at desc);

alter table public.group_moments
    add column if not exists milestones_json jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- v1 API: health history, signal resolution, guidance read state
-- ---------------------------------------------------------------------------
-- scope_type: group | personal | business (raw moment/budget id in moment_id, no g_/p_/b_ prefix)
create table if not exists public.moment_health_snapshots (
    snapshot_id text primary key,
    scope_type text not null,
    moment_id text not null,
    composite_score numeric(5, 2) not null default 0,
    health_state text not null default 'ON_TRACK',
    trend text,
    payload_json jsonb not null default '{}'::jsonb,
    calculated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_moment_health_scope_moment
    on public.moment_health_snapshots(scope_type, moment_id, calculated_at desc);

create table if not exists public.v1_signal_resolutions (
    resolution_id text primary key,
    firebase_uid text not null,
    signal_fingerprint text not null,
    resolved_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists uq_v1_signal_resolution_user_fp
    on public.v1_signal_resolutions(firebase_uid, signal_fingerprint);

create table if not exists public.v1_guidance_reads (
    read_id text primary key,
    firebase_uid text not null,
    guidance_fingerprint text not null,
    read_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists uq_v1_guidance_read_user_fp
    on public.v1_guidance_reads(firebase_uid, guidance_fingerprint);
