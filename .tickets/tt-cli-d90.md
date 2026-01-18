---
id: tt-cli-d90
status: open
deps: []
links: []
created: 2025-12-15T07:49:38.329014613-08:00
type: feature
priority: 3
---
# Add attachment support

Add ability to upload and manage file attachments on tasks. The API supports images, files, recordings, and videos but CLI has no attachment functionality.

## Design

## Current State
TickTick API supports attachments:
- Images
- Files (up to 20MB for premium, 10MB for free)
- Recordings
- Videos
- Up to 20 attachments per task (premium)

CLI cannot upload, view, or manage attachments.

## Requirements
1. Upload attachments to tasks
2. List attachments on a task
3. Download attachments
4. Delete attachments
5. View attachment info (name, size, type, URL)

## Implementation Approach

### Upload Attachments
```bash
ticktick task attach:add <TASK_ID> <FILE_PATH>
ticktick task attach:add <TASK_ID> <FILE1> <FILE2> <FILE3>
ticktick task add "Review document" --attach report.pdf
```

### List Attachments
```bash
ticktick task attach:list <TASK_ID>
# Output:
# 1. report.pdf (2.3 MB) - uploaded 2025-12-15
# 2. screenshot.png (450 KB) - uploaded 2025-12-14
```

### Download Attachments
```bash
ticktick task attach:download <TASK_ID> <ATTACHMENT_ID> [OUTPUT_PATH]
ticktick task attach:download <TASK_ID> --all  # Download all
```

### Delete Attachments
```bash
ticktick task attach:delete <TASK_ID> <ATTACHMENT_ID>
```

### View in Task Details
```
Task: Review document
Attachments (2):
  📎 report.pdf (2.3 MB)
  📎 screenshot.png (450 KB)
```

## API Considerations
1. Upload endpoint for attachments
2. Attachment URLs (may be temporary/signed URLs)
3. File size limits (10MB free, 20MB premium)
4. Daily upload limits (1/day free, 99/day premium)
5. Supported file types

## Challenges for CLI
- No direct file picker UI
- Recordings/voice notes not applicable
- Need to handle binary uploads
- May need multipart form data
- Download URLs might expire

## Alternative: View Only
If upload is complex, start with view-only:
- List attachments
- Show download URLs
- User can download via browser/wget

## Testing
- Upload text file
- Upload image
- Upload large file (test size limits)
- Download attachment
- Delete attachment
- Test with task that has multiple attachments
- Verify free vs premium limits

## Acceptance Criteria

- Can upload file attachments to tasks
- Can list attachments on a task
- Can download attachments
- Can delete attachments
- Attachments display in task details
- Respects file size and count limits
- Compatible with TickTick app attachments


