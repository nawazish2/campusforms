-- The notice board sorts by creation date, which means the freshest form
-- wins — but the warden's "fill this one first" is a decision, not a
-- timestamp. `pinned` is that decision: organizers pin a form and it floats
-- to the top of /browse until they unpin it.
--
-- No new table and no new policy: the existing "owners update their own
-- forms" policy already covers the column.

alter table forms add column pinned boolean not null default false;
