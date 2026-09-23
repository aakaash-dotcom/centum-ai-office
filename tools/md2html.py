"""
md2html.py — tiny, dependency-free Markdown -> HTML converter for the office app.
Owner lane: QA/CENTUM
Run:         imported by build_office_data.py / serve_office.py
Inputs:      markdown text
Outputs:     HTML string (safe: everything is escaped before tags are added)
Ledger:      none
Known issues: supports the subset the office actually writes - headings, bold/italic,
              inline code, fenced code blocks, tables, ordered/unordered lists with one
              level of nesting, task checkboxes, blockquotes, horizontal rules, links.
              Not a full CommonMark parser; do not use for arbitrary user markdown.
Techniques used: OFFICE.md §5.8 (knowledge lives in the repo, not in a session)
Built: 2026-09-23 by Manager
"""
from __future__ import annotations

import html
import re

_INLINE_CODE = re.compile(r"`([^`]+)`")
_BOLD = re.compile(r"\*\*([^*]+)\*\*")
_ITALIC = re.compile(r"(?<![\*\w])\*([^*\n]+)\*(?![\*\w])")
_LINK = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")
_HR = re.compile(r"^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$")
_HEADING = re.compile(r"^(#{1,6})\s+(.*)$")
_LIST_OL = re.compile(r"^(\s*)(\d+)[.)]\s+(.*)$")
_LIST_UL = re.compile(r"^(\s*)[-*+]\s+(.*)$")
_CHECKBOX = re.compile(r"^\[( |x|X)\]\s*(.*)$")
_TABLE_SEP = re.compile(r"^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$")


def _inline(text: str) -> str:
    """Escape then re-apply the inline markdown we support."""
    out = html.escape(text, quote=False)
    out = _INLINE_CODE.sub(lambda m: f"<code>{m.group(1)}</code>", out)
    out = _BOLD.sub(lambda m: f"<strong>{m.group(1)}</strong>", out)
    out = _ITALIC.sub(lambda m: f"<em>{m.group(1)}</em>", out)
    out = _LINK.sub(
        lambda m: f'<a href="{html.escape(m.group(2), quote=True)}" target="_blank" rel="noopener">{m.group(1)}</a>',
        out,
    )
    return out


def _split_row(line: str) -> list[str]:
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|"):
        line = line[:-1]
    return [c.strip() for c in line.split("|")]


def convert(md: str) -> str:
    """Convert markdown to HTML. Line-based, tolerant of the office's document style."""
    lines = md.replace("\r\n", "\n").split("\n")
    out: list[str] = []
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i]

        # --- fenced code block -------------------------------------------------
        if line.strip().startswith("```"):
            lang = line.strip()[3:].strip()
            buf: list[str] = []
            i += 1
            while i < n and not lines[i].strip().startswith("```"):
                buf.append(lines[i])
                i += 1
            i += 1  # consume closing fence
            cls = f' class="lang-{html.escape(lang)}"' if lang else ""
            out.append(f"<pre><code{cls}>{html.escape(chr(10).join(buf))}</code></pre>")
            continue

        # --- table ------------------------------------------------------------
        if "|" in line and i + 1 < n and _TABLE_SEP.match(lines[i + 1]) and "|" in lines[i + 1]:
            head = _split_row(line)
            i += 2
            body: list[list[str]] = []
            while i < n and "|" in lines[i] and lines[i].strip():
                body.append(_split_row(lines[i]))
                i += 1
            t = ['<div class="tw"><table>', "<thead><tr>"]
            t += [f"<th>{_inline(c)}</th>" for c in head]
            t.append("</tr></thead><tbody>")
            for row in body:
                t.append("<tr>")
                for c in row:
                    t.append(f"<td>{_inline(c)}</td>")
                t.append("</tr>")
            t.append("</tbody></table></div>")
            out.append("".join(t))
            continue

        # --- heading ----------------------------------------------------------
        m = _HEADING.match(line)
        if m:
            lvl = len(m.group(1))
            out.append(f"<h{lvl}>{_inline(m.group(2).strip())}</h{lvl}>")
            i += 1
            continue

        # --- horizontal rule --------------------------------------------------
        if _HR.match(line):
            out.append("<hr>")
            i += 1
            continue

        # --- blockquote -------------------------------------------------------
        if line.lstrip().startswith(">"):
            buf = []
            while i < n and lines[i].lstrip().startswith(">"):
                buf.append(lines[i].lstrip()[1:].strip())
                i += 1
            out.append(f"<blockquote>{convert(chr(10).join(buf))}</blockquote>")
            continue

        # --- lists ------------------------------------------------------------
        if _LIST_UL.match(line) or _LIST_OL.match(line):
            ordered = bool(_LIST_OL.match(line))
            tag = "ol" if ordered else "ul"
            items: list[tuple[int, str]] = []
            while i < n:
                cur = lines[i]
                m_ol, m_ul = _LIST_OL.match(cur), _LIST_UL.match(cur)
                if m_ol:
                    items.append((len(m_ol.group(1)), m_ol.group(3)))
                elif m_ul:
                    items.append((len(m_ul.group(1)), m_ul.group(2)))
                elif cur.startswith(("  ", "\t")) and cur.strip() and items:
                    items[-1] = (items[-1][0], items[-1][1] + " " + cur.strip())
                else:
                    break
                i += 1
            base = min(ind for ind, _ in items)
            # one level of nesting: deeper indent opens a nested list
            out.append(f"<{tag}>")
            depth = 0
            for ind, text in items:
                nested = 1 if ind - base >= 2 else 0
                while depth < nested:
                    out.append("<ul class='nested'>")
                    depth += 1
                while depth > nested:
                    out.append("</ul>")
                    depth -= 1
                cb = _CHECKBOX.match(text)
                if cb:
                    done = cb.group(1).lower() == "x"
                    mark = "☑" if done else "☐"
                    out.append(f'<li class="task {"done" if done else ""}">{mark} {_inline(cb.group(2))}</li>')
                else:
                    out.append(f"<li>{_inline(text)}</li>")
            while depth > 0:
                out.append("</ul>")
                depth -= 1
            out.append(f"</{tag}>")
            continue

        # --- blank ------------------------------------------------------------
        if not line.strip():
            i += 1
            continue

        # --- paragraph --------------------------------------------------------
        buf = [line.strip()]
        i += 1
        while i < n and lines[i].strip() and not _HEADING.match(lines[i]) and not _HR.match(lines[i]):
            if lines[i].lstrip().startswith(("```", ">", "|")) or _LIST_UL.match(lines[i]) or _LIST_OL.match(lines[i]):
                break
            buf.append(lines[i].strip())
            i += 1
        out.append(f"<p>{_inline(' '.join(buf))}</p>")

    return "\n".join(out)


def strip_markdown(md: str, limit: int = 0) -> str:
    """Plain-text version (for cards and search)."""
    text = re.sub(r"```.*?```", " ", md, flags=re.S)
    text = re.sub(r"[|>#*`_]", " ", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"\s+", " ", text).strip()
    if limit and len(text) > limit:
        text = text[: limit - 1].rstrip() + "…"
    return text
