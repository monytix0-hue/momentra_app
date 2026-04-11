-- Extended transaction categories: Income, Loans, Investments, Insurance, Assets

insert into public.personal_transaction_categories (slug, label, sort_order)
values
  ('income',      'Income',      1),
  ('loans',       'Loans',       85),
  ('investments', 'Investments', 87),
  ('insurance',   'Insurance',   89),
  ('assets',      'Assets',      91)
on conflict (slug) do nothing;

insert into public.personal_transaction_subcategories (category_id, slug, label, sort_order)
select c.category_id, v.slug, v.label, v.ord
from public.personal_transaction_categories c
inner join (
  values
    -- Income
    ('income', 'salary',          'Salary',            10),
    ('income', 'freelance',       'Freelance',          20),
    ('income', 'business',        'Business revenue',   30),
    ('income', 'investment_gain', 'Investment returns', 40),
    ('income', 'rental',          'Rental income',      50),
    ('income', 'bonus',           'Bonus & incentives', 60),
    ('income', 'other_income',    'Other income',       70),
    -- Loans
    ('loans', 'home_loan',      'Home loan EMI',    10),
    ('loans', 'personal_loan',  'Personal loan',    20),
    ('loans', 'vehicle_loan',   'Vehicle loan',     30),
    ('loans', 'credit_card',    'Credit card',      40),
    ('loans', 'education_loan', 'Education loan',   50),
    -- Investments
    ('investments', 'stocks',   'Stocks',          10),
    ('investments', 'mf',       'Mutual funds',    20),
    ('investments', 'fd',       'Fixed deposit',   30),
    ('investments', 'crypto',   'Crypto',          40),
    ('investments', 'ppf_epf',  'PPF / EPF',       50),
    ('investments', 're',       'Real estate',     60),
    -- Insurance
    ('insurance', 'life',     'Life insurance',   10),
    ('insurance', 'health',   'Health insurance', 20),
    ('insurance', 'vehicle',  'Vehicle insurance',30),
    ('insurance', 'home_ins', 'Home insurance',   40),
    -- Assets
    ('assets', 'property',   'Property',    10),
    ('assets', 'vehicle',    'Vehicle',     20),
    ('assets', 'jewelry',    'Jewelry',     30),
    ('assets', 'equipment',  'Equipment',   40),
    ('assets', 'other_asset','Other assets',50)
) as v(cat_slug, slug, label, ord) on c.slug = v.cat_slug
on conflict (category_id, slug) do nothing;
