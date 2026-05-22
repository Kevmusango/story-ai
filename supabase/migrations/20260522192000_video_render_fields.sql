alter table public.videos
  add column if not exists final_video_url text,
  add column if not exists render_status text not null default 'not_started',
  add column if not exists render_error text,
  add column if not exists rendered_at timestamp with time zone;

create index if not exists videos_render_status_idx on public.videos(render_status);
