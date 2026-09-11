-- Add optional subculture metadata to the character catalog.
-- Existing characters remain valid without an invented classification.

alter table public."Characters"
  add column if not exists subculture text;

alter table public."Characters"
  drop constraint if exists characters_subculture_not_blank;

alter table public."Characters"
  add constraint characters_subculture_not_blank
  check (subculture is null or length(trim(subculture)) > 0);
