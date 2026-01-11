# Jebakumar's New Tab Homepage

Simple local homepage designed for use as a Chrome new-tab page. Create a file URL or add it to Chrome's new tab override via an extension.

Features:
- Welcome header with your name
- Card grid showing sites with favicon (via Google's favicon service)
- Add URL modal, stores links in localStorage
- Responsive, minimal CSS/JS

Usage:
1. Open `index.html` in your browser (or serve it locally).
2. Click "Add URL" to add a site. You can omit `https://` — it will be added automatically.
3. To use as your Chrome new tab, install a third-party extension that allows setting a local HTML file as the new tab, or host the file and set that URL.

Keyboard tip: press the `N` key to quickly open the Add URL dialog.

Tip: you can provide a **Name** when adding a URL — it will be shown as the card title (otherwise the domain is used).

Categories: you can optionally assign a **Category** when adding a URL (e.g., Work, Social). Links are grouped by category on the page. Use the **filter bar** at the top to quickly show one category or All.

Category colors: each category gets an auto-assigned color (you can change it in the Manage Categories view) and a colored badge appears next to the category name and on each card.

Manage categories: click **Manage Categories** in the filter bar to rename, delete, or create categories. You can add a **Name**, **Icon** (emoji or character), and **Color** for each category. Deleting a category will prompt: press OK to delete links in that category, or Cancel to move those links to "Uncategorized".

Context menu: right-click a card to open a context menu with **Edit** and **Delete** actions (this replaces the inline edit/delete icons).
