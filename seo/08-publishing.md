# 公開の手順（自サイト + note）

## なぜ自サイトを先に立てるのか

先方は「スクリーンショットやデータで20記事を確認できた方のみ」と言っている。
ここで出せるデータの質が、他の応募者との差になる。

noteだけで公開すると、note.com のドメイン所有権がないため **Search Console のデータが取れない**。
出せるのは記事URLと検索結果のスクショまで。

自分のドメイン（Vercelの無料サブドメインでも可）で公開すれば、Search Console を接続できる。
表示回数・クリック・平均掲載順位・クエリ別データまで提出できるようになる。

同じ原稿を note にも出す（二次配信）。note はドメインが強いので、指名KWでは
note 記事のほうが先に順位が付くこともある。両方に出して、両方のURLを報告に載せる。

---

## 1. 記事を書く

`seo/drafts/` に Markdown で書く。ファイル名は `{記事番号}-{スラッグ}.md`。
先頭のフロントマターにタイトル・ディスクリプション・スラッグを書く（既存の3本を参照）。

事実が確定していない箇所は `{{要確認: ...}}` と書いておく。
**この記法が残っている記事は、ビルド時に自動で除外される**ので、うっかり未確認のまま
公開する事故が起きない。

## 2. ビルドする

```bash
python3 tools/build.py --list   # 各記事の状態を確認
python3 tools/build.py          # site/ に HTML を生成
```

生成されるもの：

- `site/{スラッグ}/index.html` — 記事ページ（title / description / canonical / OGP /
  Article構造化データ / FAQPage構造化データを自動付与）
- `site/index.html` — 記事一覧
- `site/sitemap.xml` — サイトマップ
- `site/robots.txt`

CTAリンク（`#cta-line-top` / `#cta-line-bottom`）は、`seo/site-config.json` の
`line_url` に、記事ごとの `utm_content` を付けた形へ自動で置換される。
どの記事からLINE登録が発生したかが後から分かる。

ローカル確認：

```bash
python3 -m http.server 8000 --directory site
# http://localhost:8000/ を開く
```

## 3. 公開設定（最初の1回だけ）

`seo/site-config.json` を実際の値に書き換える。

| キー | 入れる値 |
| --- | --- |
| `site_name` | サイト名 |
| `base_url` | 公開後のURL（例 `https://xxx.vercel.app`） |
| `author` | 自分の名前 or ハンドル |
| `line_url` | 先方からもらうLINE友だち追加URL |

`base_url` と `line_url` が `example` のままだと、canonical とCTAが正しく出ない。
**1本目を公開する前に必ず差し替える。**

## 4. Vercelへデプロイ

`vercel.json` を置いてあるので、リポジトリを連携すれば `site/` がそのまま配信される
（ビルドコマンドなし・静的配信）。手順は `deploy-skills` スキルの DEPLOY-GUIDE.md に従う。

注意：`site/` は生成物だがリポジトリにコミットする運用にしている
（Vercel側でビルドを走らせないぶん、公開が確実で速い）。
記事を書いたら `python3 tools/build.py` を実行してから commit する。

## 5. Search Console を接続

1. Search Console で「URLプレフィックス」プロパティを作成し、公開URLを入力
2. HTMLファイル所有権確認を選び、ダウンロードされた `googleXXXX.html` を
   `site/` 直下に置いてデプロイ（`tools/build.py` は `site/` を作り直すので、
   このファイルは `seo/verification/` に保管し、ビルド後にコピーする運用にする）
3. 確認完了後、サイトマップ `https://{ドメイン}/sitemap.xml` を送信
4. 記事を公開するたびに「URL検査」からインデックス登録をリクエスト

**これを1本目の公開と同時にやっておくこと。** 後から接続すると、それ以前のデータは取れない。

## 6. note へ二次配信

- 同じ本文を note に貼る（Markdownの見出し・箇条書きはおおむねそのまま反映される）
- note 側の記事末に、自サイトの該当記事へのリンクを置く
- canonical は設定できないので、**完全に同じ本文にはせず**、導入文と締めを書き換える
- note のハッシュタグに指名KWを入れておく

## 7. 公開記録をつける

公開したら、その場で `04-report-template.md` §2 の表に1行追加する。

- 記事番号／タイトル／自サイトURL／note URL／主KW／公開日

あとからまとめようとすると必ず抜ける。20本だと特に。
スクリーンショットも公開直後ではなく、**公開の1週間後**に撮る
（インデックスされて順位が付いてからでないと証跡にならない）。
