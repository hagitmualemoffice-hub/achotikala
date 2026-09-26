import { useEffect } from "react";
import { useLang } from "./LanguageContext";
import { heToEn } from "./dictionary";

/**
 * Runtime translation overlay.
 *
 * Strategy:
 *  - When `lang === "en"`, walk every Text node in the body and, if its
 *    trimmed content matches a key in the dictionary, replace it with the
 *    English value while preserving leading/trailing whitespace.
 *  - The original Hebrew is stored in a WeakMap so we can restore it when
 *    the user switches back to "he".
 *  - A MutationObserver catches React re-renders and newly inserted nodes.
 *
 * We deliberately skip:
 *  - <script>, <style>, contenteditable elements
 *  - <input>, <textarea>, <select> (their values are user-controlled)
 *  - any node with [data-i18n-skip]
 */
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "SELECT", "CODE", "PRE"]);

const originals = new WeakMap<Text, string>();

const shouldSkipParent = (el: Element | null): boolean => {
  let cur: Element | null = el;
  while (cur) {
    if (SKIP_TAGS.has(cur.tagName)) return true;
    if (cur.hasAttribute && cur.hasAttribute("data-i18n-skip")) return true;
    cur = cur.parentElement;
  }
  return false;
};

const translateNode = (node: Text, toEnglish: boolean) => {
  const parent = node.parentElement;
  if (!parent || shouldSkipParent(parent)) return;

  const raw = node.nodeValue ?? "";
  const trimmed = raw.trim();
  if (!trimmed) return;

  if (toEnglish) {
    const stored = originals.get(node);
    const sourceText = stored ?? raw;
    const sourceTrim = sourceText.trim();
    const en = heToEn[sourceTrim];
    if (en && en !== sourceTrim) {
      if (!stored) originals.set(node, sourceText);
      // preserve leading/trailing whitespace
      const lead = sourceText.match(/^\s*/)?.[0] ?? "";
      const tail = sourceText.match(/\s*$/)?.[0] ?? "";
      const next = lead + en + tail;
      if (node.nodeValue !== next) node.nodeValue = next;
    }
  } else {
    const stored = originals.get(node);
    if (stored !== undefined && node.nodeValue !== stored) {
      node.nodeValue = stored;
      originals.delete(node);
    }
  }
};

const walkAndTranslate = (root: Node, toEnglish: boolean) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const t = (n as Text).nodeValue;
      if (!t || !t.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];
  let cur = walker.nextNode();
  while (cur) {
    nodes.push(cur as Text);
    cur = walker.nextNode();
  }
  for (const n of nodes) translateNode(n, toEnglish);
};

const flipDirAttributes = (toEnglish: boolean) => {
  const els = document.querySelectorAll<HTMLElement>("[dir]");
  els.forEach((el) => {
    if (el.hasAttribute("data-i18n-skip")) return;
    if (toEnglish) {
      if (!el.hasAttribute("data-orig-dir")) {
        el.setAttribute("data-orig-dir", el.getAttribute("dir") || "");
      }
      if (el.getAttribute("dir") !== "ltr") el.setAttribute("dir", "ltr");
    } else {
      const orig = el.getAttribute("data-orig-dir");
      if (orig !== null) {
        if (orig) el.setAttribute("dir", orig);
        else el.removeAttribute("dir");
        el.removeAttribute("data-orig-dir");
      }
    }
  });
};

const TranslationOverlay = () => {
  const { lang } = useLang();

  useEffect(() => {
    const toEnglish = lang === "en";
    walkAndTranslate(document.body, toEnglish);
    flipDirAttributes(toEnglish);

    const observer = new MutationObserver((mutations) => {
      let hasNewDir = false;
      for (const m of mutations) {
        if (m.type === "characterData") {
          const t = m.target as Text;
          if (toEnglish) originals.delete(t);
          translateNode(t, toEnglish);
        } else if (m.type === "childList") {
          m.addedNodes.forEach((n) => {
            if (n.nodeType === Node.TEXT_NODE) {
              translateNode(n as Text, toEnglish);
            } else if (n.nodeType === Node.ELEMENT_NODE) {
              walkAndTranslate(n, toEnglish);
              if ((n as Element).querySelector?.("[dir]") || (n as Element).hasAttribute?.("dir")) {
                hasNewDir = true;
              }
            }
          });
        } else if (m.type === "attributes" && m.attributeName === "dir") {
          hasNewDir = true;
        }
      }
      if (hasNewDir) flipDirAttributes(toEnglish);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["dir"],
    });

    return () => observer.disconnect();
  }, [lang]);

  return null;
};

export default TranslationOverlay;
