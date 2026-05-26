# 設計文件：Favicon、OG 分享圖、拖曳選軌道

**日期**：2026-05-26  
**狀態**：已通過

---

## 範圍

1. 加入可愛的 Favicon（Thomas 臉孔）
2. 加入 LINE / Facebook 分享預覽圖（OG 標籤 + og-banner.png）
3. 工具列按鈕支援拖曳選軌道（手指/滑鼠滑過即切換）
4. 關卡模式格子支援拖曳放多格軌道（修正拖曳意外清除已填格的問題）

不在範圍：重構其他遊戲邏輯、新增軌道類型。

---

## 1. Favicon

### 方式
在 `index.html` `<head>` 加入 SVG data URI favicon，不需要外部檔案：

```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>...</svg>">
<link rel="apple-touch-icon" href="og-banner.png">
```

### 設計
- 32×32 SVG，藍色 Thomas 臉孔（延伸自遊戲內 SVG）
- 白色眼睛、橙色微笑鼻子、圓角矩形頭部

---

## 2. OG 分享圖（LINE / Facebook）

### Meta 標籤（index.html）
```html
<meta property="og:type"        content="website">
<meta property="og:title"       content="湯瑪士火車樂園 🚂">
<meta property="og:description" content="幫湯瑪士鋪好鐵軌，讓他出發！">
<meta property="og:image"       content="https://thomas-train.pages.dev/og-banner.png">
<meta property="og:url"         content="https://thomas-train.pages.dev">
<meta name="twitter:card"       content="summary_large_image">
```

### og-banner.png 生成
- 新增 `generate-og-banner.html`：用 Canvas 繪製 1200×630 橫幅，載入後自動觸發下載
- 設計元素：藍天漸層背景、草地、Thomas 臉孔（大）、軌道、遊戲標題文字
- 使用者執行一次，將產出的 `og-banner.png` 放入專案根目錄後部署

### 理由
LINE 和 Facebook 對 SVG og:image 支援不穩定，需 PNG。  
使用 canvas 在 HTML 生成，不需要 Node.js 或外部工具。

---

## 3A. 工具列拖曳選軌道

### 現況
工具列按鈕只有 `click` + `touchstart` handler，手指/滑鼠需精確點擊才能切換工具。

### 修改（app.js）
在 `#track-tools` 加入：
- `touchmove`：用 `document.elementFromPoint(touch.clientX, touch.clientY)` 偵測手指下方的 `.tool-btn`，若與目前選中工具不同則切換
- `mousedown` on `#track-tools` → 設 `isToolbarDragging = true`
- `mousemove` on `document`（當 `isToolbarDragging`）→ 同樣用 `elementFromPoint` 切換
- `mouseup` on `document` → 清除 `isToolbarDragging`

### 不衝突保證
- 工具列 touchmove 用 `e.stopPropagation()` 防止冒泡到 canvas
- canvas 的 `isDrawing` flag 不受影響（canvas mousedown 才設定）
- 原有的單擊選擇行為完整保留

---

## 3B. 格子拖曳放多格軌道（關卡模式）

### 現況問題
`onLevelCellClick` 當格子已填且工具相同時會刪除（切換功能），拖曳時會意外清除剛放好的格子。

### 修改（app.js）
加入 `isDragging` flag：
- `mousedown` / `touchstart` on canvas → `isDragging = false`
- `mousemove` / `touchmove` on canvas（當 `isDrawing`）→ `isDragging = true`
- `onLevelCellClick(row, col, fromDrag)` 加一個 `fromDrag` 參數
  - 只有 `fromDrag === false`（純點擊）時才執行清除邏輯
  - 拖曳時只做「放置」，不做「清除」

### 自由模式
自由模式不受影響（已可正常拖曳放格）。

---

## 檔案異動摘要

| 檔案 | 動作 |
|------|------|
| `index.html` | 加 favicon link、OG meta 標籤 |
| `app.js` | 工具列拖曳、格子拖曳修正 |
| `generate-og-banner.html` | 新增（產生 og-banner.png 用） |
| `og-banner.png` | 新增（手動執行 generate 後放入） |

---

## 測試條件

- [ ] 瀏覽器 tab 顯示 Thomas 圖示
- [ ] 手機瀏覽器書籤 icon 正確
- [ ] LINE 貼上連結後顯示 1200×630 預覽圖和標題
- [ ] Facebook 分享後顯示正確縮圖
- [ ] 工具列單擊選軌道仍可正常使用
- [ ] 工具列手指左右滑動可切換選中工具
- [ ] 關卡模式拖曳可連續填多個缺口格
- [ ] 關卡模式單擊已填格可清除（拖曳過不會清除）
