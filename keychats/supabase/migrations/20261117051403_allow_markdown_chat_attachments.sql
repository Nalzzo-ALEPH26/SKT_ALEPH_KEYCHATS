-- Permit Markdown uploads while keeping the existing private bucket and size limit.
update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'text/markdown')
where id = 'chat-attachments'
  and allowed_mime_types is not null
  and not ('text/markdown' = any(allowed_mime_types));
