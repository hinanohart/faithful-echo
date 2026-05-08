# faithful-echo

> LLM が user の元の言い回しから "婉曲化 / 言い換え / hedge 挿入 / 数値丸め"
> したかどうかを検出する Claude Code agent + CLI。

LLM がユーザーの言葉を書き換えるとき (要約 / 言い直し / 復唱 / バグ報告の
「整理」など)、よく以下 7 種類のドリフトが起きます。

| ID | ドリフト                       | 例 (source → rendered)                                                               |
| -- | ----------------------------- | ------------------------------------------------------------------------------------ |
| P1 | entity drift (固有名詞置換)   | `Postgres` → `database`、`Alice` → `someone`                                         |
| P2 | numeric drift (数値丸め)      | `73.4 seconds` → `about 70 seconds`、`3.11` → `3`                                    |
| P3 | quantifier drop (強調語消失)  | `absolutely required` → `required`、`絶対` → ∅                                       |
| P4 | hedge insertion (婉曲挿入)    | `it is required` → `it might be required`、∅ → `おそらく`                              |
| P5 | abstraction (抽象化)          | `Python` → `programming language`、`Postgres` → `database`                           |
| P6 | subject swap (主語入替)       | `I deployed it` → `the user deployed it`                                             |
| P7 | tone smoothing (語気弱化)     | `must read` → `should consider reading`、`禁止` → `推奨`、`Stop!` → `Please stop.`   |

`faithful-echo` はこの 7 種をひたすら決定論的に検出します。**修正もファクト
チェックもしません**。検出するだけ。判断 (どれを許容してどれは戻すか) は
人間 (あるいは別レイヤーの judge agent) の仕事です。

---

## 30 秒インストール

```bash
git clone https://github.com/hinanohart/faithful-echo.git
cd faithful-echo
npm install
npm run build
```

`dist/cli.js` ができれば完了 (Node ≥ 20)。

Claude Code agent としても使うには `agents/faithful-echo.md` を
`~/.claude/agents/` にコピーしてください。

---

## CLI

```bash
node dist/cli.js check \
  --source   元のテキスト.txt    \
  --rendered LLM出力.txt          \
  --task     verbatim_quote      \
  --format   pretty
```

| フラグ                    | デフォルト       | 補足                                                                                         |
| ------------------------- | --------------- | -------------------------------------------------------------------------------------------- |
| `-s, --source <path>`     | (必須)          | 元のテキスト。`-` で stdin から読む。                                                          |
| `-r, --rendered <path>`   | (必須)          | LLM レンダリング後。`-` で stdin (どちらか片方のみ)。                                          |
| `-t, --task <kind>`       | `verbatim_quote`| `verbatim_quote` / `paraphrase` / `summarize` / `translate`。                                |
| `-l, --lang <code>`       | `auto`          | `auto` / `ja` / `en`。                                                                        |
| `-f, --format <fmt>`      | `pretty`        | `pretty` (人間向け) または `json` (strict JSON)。                                              |
| `-d, --dictionaries <d>`  | 同梱            | プロジェクト固有の辞書を使うときに。                                                             |

終了コード: 0 = no hit / info のみ、1 = warn あり、2 = error あり (P2)。

---

## task が rule を mute する関係

| task              | P1 | P2 | P3 | P4 | P5 | P6 | P7 |
| ----------------- | -- | -- | -- | -- | -- | -- | -- |
| `verbatim_quote`  | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `paraphrase`      | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `summarize`       | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| `translate`       | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |

---

## 制限事項

- **heuristic** であり semantic ではありません。同義語置換 / 語順変化 /
  深い意味解析は対象外。
- 辞書はわざと小さくしてあります (`very` 等の borderline は false
  positive を増やすので外しています)。`--dictionaries` で差し替え可能。
- 日本語と英語のみ。他言語では P1/P2/P4 のみ実用的。
- ファクトチェックではありません。P2 は「数値が変わったか」を見るだけで
  「元の数値が正しかったか」は見ません。
- 書き換えはしません。修正したいときは report を LLM に投げ直してください。

---

## ライセンス

[Apache-2.0](LICENSE)
