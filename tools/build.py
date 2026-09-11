#!/usr/bin/env python3
"""seo/drafts/*.md から静的な記事サイトを生成する。

依存ライブラリなし。Markdownはこの案件で使う範囲だけをサポートする。

使い方:
    python3 tools/build.py              # {{要確認}} が残る記事はスキップ
    python3 tools/build.py --allow-todo # 確認前の記事もプレビュー用に出力
    python3 tools/build.py --list       # 各記事の状態だけ表示
"""

import html
import json
import re
import shutil
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DRAFTS = ROOT / "seo" / "drafts"
OUT = ROOT / "site"
CONFIG = ROOT / "seo" / "site-config.json"

TODO_RE = re.compile(r"\{\{要確認[^}]*\}\}")
COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)


# ---------------------------------------------------------------- front matter

def split_front_matter(text):
    lines = text.split("\n")
    if lines and lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                meta = {}
                for line in lines[1:i]:
                    if ":" in line:
                        k, v = line.split(":", 1)
                        meta[k.strip()] = v.strip()
                return meta, "\n".join(lines[i + 1:])
    return {}, text


# ------------------------------------------------------------------- inline md

def inline(text):
    out = html.escape(text)
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    out = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", out)

    def link(m):
        label, href = m.group(1), m.group(2)
        rel = ' rel="noopener"' if href.startswith("http") else ""
        target = ' target="_blank"' if href.startswith("http") else ""
        return f'<a href="{href}"{target}{rel}>{label}</a>'

    return re.sub(r"\[([^\]]+)\]\(([^)]+)\)", link, out)


# -------------------------------------------------------------------- block md

def render(md):
    """Markdownのサブセットを HTML へ。戻り値は (html, h1, faq)。"""
    md = COMMENT_RE.sub("", md)
    lines = md.split("\n")
    out, faq = [], []
    h1 = None
    i = 0

    def flush_list(tag, items):
        out.append(f"<{tag}>")
        out.extend(f"<li>{inline(x)}</li>" for x in items)
        out.append(f"</{tag}>")

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        # 見出し
        m = re.match(r"^(#{1,4})\s+(.*)$", stripped)
        if m:
            level, text = len(m.group(1)), m.group(2)
            if level == 1 and h1 is None:
                h1 = text
                i += 1
                continue
            slug = re.sub(r"[^\w一-龥ぁ-んァ-ヶー]+", "-", text).strip("-")[:40]
            out.append(f'<h{level} id="{html.escape(slug)}">{inline(text)}</h{level}>')
            i += 1
            continue

        # テーブル
        if stripped.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s\-:|]+\|$", lines[i + 1].strip()):
            header = [c.strip() for c in stripped.strip("|").split("|")]
            i += 2
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            out.append('<div class="table-wrap"><table><thead><tr>')
            out.extend(f"<th>{inline(c)}</th>" for c in header)
            out.append("</tr></thead><tbody>")
            for row in rows:
                out.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in row) + "</tr>")
            out.append("</tbody></table></div>")
            continue

        # 引用（CTAブロックにも使っている）
        if stripped.startswith(">"):
            buf = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                buf.append(lines[i].strip().lstrip(">").strip())
                i += 1
            body = "<br>".join(inline(b) for b in buf if b)
            cls = "callout cta" if "cta-line" in " ".join(buf) else "callout"
            out.append(f'<blockquote class="{cls}">{body}</blockquote>')
            continue

        # 箇条書き
        if re.match(r"^[-*]\s+", stripped):
            items = []
            while i < len(lines) and re.match(r"^[-*]\s+", lines[i].strip()):
                items.append(re.sub(r"^[-*]\s+", "", lines[i].strip()))
                i += 1
            flush_list("ul", items)
            continue

        if re.match(r"^\d+[.)]\s+", stripped):
            items = []
            while i < len(lines) and re.match(r"^\d+[.)]\s+", lines[i].strip()):
                items.append(re.sub(r"^\d+[.)]\s+", "", lines[i].strip()))
                i += 1
            flush_list("ol", items)
            continue

        # 段落（FAQのQ&Aもここで拾う）
        buf = []
        while i < len(lines) and lines[i].strip() and not re.match(r"^([-*]\s|\d+[.)]\s|#{1,4}\s|\||>)", lines[i].strip()):
            buf.append(lines[i].strip())
            i += 1
        text = " ".join(buf)
        q = re.match(r"^\*\*Q\.\s*(.+?)\*\*\s*(.*)$", text)
        if q:
            question, answer = q.group(1).strip(), q.group(2).strip()
            if answer and "要確認" not in answer:
                faq.append((question, answer))
            out.append(f'<p class="faq-q">{inline("Q. " + question)}</p>')
            if answer:
                out.append(f'<p class="faq-a">{inline(answer)}</p>')
            continue
        out.append(f"<p>{inline(text)}</p>")

    return "\n".join(out), h1, faq


# ------------------------------------------------------------------- templates

def page(cfg, *, title, description, canonical, body, jsonld, breadcrumb=""):
    ld = "\n".join(
        f'<script type="application/ld+json">{json.dumps(d, ensure_ascii=False)}</script>'
        for d in jsonld
    )
    return f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(description)}">
<link rel="canonical" href="{html.escape(canonical)}">
<meta property="og:type" content="article">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(description)}">
<meta property="og:url" content="{html.escape(canonical)}">
<link rel="stylesheet" href="/assets/style.css">
{ld}
</head>
<body>
<header class="site-header">
  <a class="site-title" href="/">{html.escape(cfg['site_name'])}</a>
</header>
<main>
{breadcrumb}
{body}
</main>
<footer class="site-footer">
  <p>{html.escape(cfg['site_name'])}</p>
</footer>
</body>
</html>
"""


STYLE = """:root{--bg:#ffffff;--text:#1f2933;--muted:#5b6773;--line:#e4e8ec;--accent:#1d4ed8;--accent-soft:#eff4ff;--cta:#ea580c}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:"Hiragino Sans","Yu Gothic","Meiryo",system-ui,sans-serif;line-height:1.9;font-size:16px}
.site-header{border-bottom:1px solid var(--line);padding:16px 20px}
.site-title{color:var(--text);text-decoration:none;font-weight:700;font-size:1.05rem}
main{width:min(100%,720px);margin:0 auto;padding:28px 20px 64px}
h1{font-size:1.7rem;line-height:1.5;margin:.2em 0 .8em}
h2{font-size:1.3rem;margin:2.2em 0 .7em;padding-top:.6em;border-top:2px solid var(--line)}
h3{font-size:1.08rem;margin:1.8em 0 .5em;color:#0f172a}
p{margin:0 0 1.1em}
ul,ol{margin:0 0 1.3em;padding-left:1.4em}
li{margin-bottom:.45em}
a{color:var(--accent)}
code{background:#f4f6f8;padding:.1em .35em;border-radius:3px;font-size:.92em}
.table-wrap{overflow-x:auto;margin:0 0 1.5em}
table{border-collapse:collapse;width:100%;font-size:.93rem}
th,td{border:1px solid var(--line);padding:9px 11px;text-align:left;vertical-align:top}
th{background:#f7f9fb;font-weight:600;white-space:nowrap}
blockquote.callout{margin:0 0 1.5em;padding:14px 18px;background:var(--accent-soft);border-left:4px solid var(--accent);border-radius:0 6px 6px 0}
blockquote.cta{background:#fff5ed;border-left-color:var(--cta)}
blockquote.cta a{display:inline-block;margin-top:.5em;background:var(--cta);color:#fff;text-decoration:none;padding:11px 26px;border-radius:999px;font-weight:700}
.faq-q{font-weight:700;margin-bottom:.3em}
.faq-a{margin-bottom:1.5em;color:var(--muted)}
.lede{color:var(--muted)}
.meta{color:var(--muted);font-size:.87rem;margin-bottom:1.5em}
.todo{background:#fff3cd;border:1px solid #e0b400;padding:2px 6px;border-radius:3px;font-size:.86em}
.card-list{list-style:none;padding:0}
.card-list li{border:1px solid var(--line);border-radius:8px;padding:16px 18px;margin-bottom:12px}
.card-list a{font-weight:700;text-decoration:none;font-size:1.02rem}
.card-list p{margin:.4em 0 0;color:var(--muted);font-size:.92rem}
.site-footer{border-top:1px solid var(--line);padding:20px;color:var(--muted);font-size:.85rem;text-align:center}
@media(prefers-color-scheme:dark){
:root{--bg:#12161a;--text:#e6eaee;--muted:#9aa5b1;--line:#2a323a;--accent:#7aa2ff;--accent-soft:#1b2536}
th{background:#1a2128}
code{background:#1c232a}
blockquote.cta{background:#2a1d14}
.todo{background:#4a3a00;border-color:#8a6d00;color:#ffe9a3}
}
"""


# ------------------------------------------------------------------------ main

def main():
    allow_todo = "--allow-todo" in sys.argv
    list_only = "--list" in sys.argv
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    today = date.today().isoformat()

    articles, skipped = [], []
    for path in sorted(DRAFTS.glob("*.md")):
        meta, body_md = split_front_matter(path.read_text(encoding="utf-8"))
        slug = meta.get("スラッグ", "/" + path.stem + "/")
        title = meta.get("タイトル", path.stem)
        todos = len(TODO_RE.findall(body_md))
        record = {"path": path, "meta": meta, "md": body_md, "slug": slug,
                  "title": title, "todos": todos}
        if todos and not allow_todo:
            skipped.append(record)
        else:
            articles.append(record)

    if list_only:
        for r in articles + skipped:
            state = "OK" if not r["todos"] else f"要確認 {r['todos']}件"
            print(f"[{state:>10}] {r['slug']:<40} {r['title']}")
        print(f"\n公開可能 {len(articles)} 本 / 要確認 {len(skipped)} 本 / 合計 20本中 "
              f"{len(articles) + len(skipped)} 本着手")
        return

    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "assets").mkdir(parents=True)
    (OUT / "assets" / "style.css").write_text(STYLE, encoding="utf-8")

    base = cfg["base_url"].rstrip("/")
    for art in articles:
        md = art["md"]
        utm = f"utm_source=seo&utm_medium=article&utm_content={art['path'].stem}"
        sep = "&" if "?" in cfg["line_url"] else "?"
        line = f"{cfg['line_url']}{sep}{utm}"
        md = TODO_RE.sub(lambda m: f"`{m.group(0)}`", md)

        body, h1, faq = render(md)
        body = body.replace("#cta-line-top", line).replace("#cta-line-bottom", line)
        canonical = base + art["slug"]
        desc = art["meta"].get("ディスクリプション", cfg["site_description"])

        jsonld = [{
            "@context": "https://schema.org", "@type": "Article",
            "headline": h1 or art["title"], "description": desc,
            "datePublished": today, "dateModified": today,
            "mainEntityOfPage": canonical,
            "author": {"@type": "Person", "name": cfg.get("author") or cfg["site_name"]},
            "publisher": {"@type": "Organization", "name": cfg["site_name"]},
        }]
        if faq:
            jsonld.append({
                "@context": "https://schema.org", "@type": "FAQPage",
                "mainEntity": [
                    {"@type": "Question", "name": q,
                     "acceptedAnswer": {"@type": "Answer", "text": a}}
                    for q, a in faq
                ],
            })

        crumb = ('<nav class="meta"><a href="/">'
                 + html.escape(cfg["site_name"]) + "</a> ／ この記事</nav>")
        head = f"<h1>{inline(h1 or art['title'])}</h1>"
        dest = OUT / art["slug"].strip("/") / "index.html"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(page(cfg, title=art["title"], description=desc,
                             canonical=canonical, body=head + "\n" + body,
                             jsonld=jsonld, breadcrumb=crumb), encoding="utf-8")

    cards = ['<h1>' + html.escape(cfg["site_name"]) + "</h1>",
             f'<p class="lede">{html.escape(cfg["site_description"])}</p>',
             '<ul class="card-list">']
    for art in articles:
        d = art["meta"].get("ディスクリプション", "")[:90]
        cards.append(f'<li><a href="{art["slug"]}">{html.escape(art["title"])}</a>'
                     f"<p>{html.escape(d)}…</p></li>")
    cards.append("</ul>")
    (OUT / "index.html").write_text(
        page(cfg, title=cfg["site_name"], description=cfg["site_description"],
             canonical=base + "/", body="\n".join(cards),
             jsonld=[{"@context": "https://schema.org", "@type": "WebSite",
                      "name": cfg["site_name"], "url": base + "/"}]),
        encoding="utf-8")

    urls = "".join(
        f"<url><loc>{base + a['slug']}</loc><lastmod>{today}</lastmod></url>"
        for a in articles
    )
    (OUT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"<url><loc>{base}/</loc><lastmod>{today}</lastmod></url>{urls}</urlset>",
        encoding="utf-8")
    (OUT / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\nSitemap: {base}/sitemap.xml\n", encoding="utf-8")

    print(f"生成: {len(articles)} 本 -> site/")
    for a in articles:
        print(f"  {a['slug']}")
    if skipped:
        print(f"\nスキップ（{{{{要確認}}}} が残っている）: {len(skipped)} 本")
        for a in skipped:
            print(f"  {a['slug']}  要確認 {a['todos']} 件")
        print("プレビューしたい場合は --allow-todo を付ける。")


if __name__ == "__main__":
    main()
