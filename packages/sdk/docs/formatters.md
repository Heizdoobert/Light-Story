# Formatters & Helpers

The SDK includes lightweight, zero-dependency formatting helpers with Vietnamese (`vi`) and English (`en`) localization.

```typescript
import {
  formatCompactNumber,
  formatRelativeTime,
  formatBytes,
  slugify,
  formatChapterTitle,
  formatChapterNumber,
} from '@light-story/sdk';

// Number abbreviation
formatCompactNumber(1250);          // "1.3K" (en)
formatCompactNumber(1250, 'vi');     // "1,3K" (vi)
formatCompactNumber(1500000);       // "1.5M"

// Relative timestamp formatting
formatRelativeTime(new Date(Date.now() - 3600000));                 // "1 hour ago"
formatRelativeTime(new Date(Date.now() - 3600000), { locale: 'vi' }); // "1 giờ trước"

// Byte formatting
formatBytes(1024);                  // "1 KB"
formatBytes(15728640);              // "15 MB"

// URL Slugification (handles Vietnamese diacritics)
slugify('Đấu La Đại Lục: Khởi Đầu Mới'); // "dau-la-dai-luc-khoi-dau-moi"

// Chapter title and number formatting
formatChapterTitle(10, 'Hồi Kết', { locale: 'vi' }); // "Chương 10: Hồi Kết"
formatChapterNumber(10, { locale: 'vi' });             // "Chương 10"
```
