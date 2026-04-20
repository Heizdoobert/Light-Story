# Light Story RLS Policy Matrix (MVP)

## Role Matrix
- anonymous: read-only published stories and their chapters.
- user: profile self-management, personal likes.
- employee: story and chapter management.
- admin: employee permissions + site settings management.
- superadmin: full admin permissions + role assignment via private RPC.

## RLS Coverage
- profiles: own row select/update, staff can read broader profile set.
- stories: public read for published states; staff full write.
- chapters: public read through story visibility; staff full write.
- site_settings: public read; admin/superadmin write.
- story_likes: users manage only their own like records.

## Security Decisions
- No authorization based on mutable `raw_user_meta_data` roles.
- Privileged role mutation is isolated in `app_private.set_user_role`.
- UPDATE operations include corresponding SELECT policy support.
