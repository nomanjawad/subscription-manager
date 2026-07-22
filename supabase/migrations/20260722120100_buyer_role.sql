-- Migration #7: add the 'buyer' role
-- ---------------------------------------------------------------------------
-- A third login role. Buyers are the central purchasers: they see the
-- company-wide approved-request queue, mark requests purchased (which creates
-- the subscription, stamped with their name), and can use the create-
-- subscription form. They cannot approve/reject (that stays with team
-- leads/admins) and cannot see teams/users/cards/analytics.
--
-- ALTER TYPE ... ADD VALUE must be committed before the new label can be used,
-- so this lives in its own migration file — nothing here references 'buyer'.

alter type public.user_role add value if not exists 'buyer';
