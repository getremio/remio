export const MARKDOWN_COPY_TAG_ATTRIBUTE = "data-remio-markdown-tag";
export const MARKDOWN_COPY_IGNORE_ATTRIBUTE = "data-remio-markdown-ignore";
export const MARKDOWN_COPY_LIST_MARKER_ATTRIBUTE = "data-remio-markdown-list-marker";
export const MARKDOWN_COPY_UNWRAP_ATTRIBUTE = "data-remio-markdown-unwrap";
/** A link Remio recognized in the reply text, as opposed to one the Markdown wrote. */
export const MARKDOWN_COPY_RECOGNIZED_LINK_ATTRIBUTE = "data-remio-markdown-recognized-link";
export const MARKDOWN_COPY_LIST_START_ATTRIBUTE = "data-remio-markdown-list-start";
export const MARKDOWN_COPY_LANGUAGE_ATTRIBUTE = "data-remio-markdown-language";
export const MARKDOWN_COPY_FENCE_SOURCE_ATTRIBUTE = "data-remio-markdown-fence-source";
export const MARKDOWN_COPY_ALIGN_ATTRIBUTE = "data-remio-markdown-align";
export const MARKDOWN_COPY_SRC_ATTRIBUTE = "data-remio-markdown-src";
export const MARKDOWN_COPY_ALT_ATTRIBUTE = "data-remio-markdown-alt";
/** Set by the Markdown library's web admonition renderer on the box and on its generated title. */
export const MARKDOWN_ADMONITION_TYPE_ATTRIBUTE = "data-enrm-admonition-type";
export const MARKDOWN_ADMONITION_TITLE_ATTRIBUTE = "data-enrm-admonition-title";

/**
 * Trailing line breaks, with any indentation that followed the last one.
 *
 * Both ways of copying code strip these, for the same reason: pasting a trailing
 * newline into a terminal runs the last line. A fence body always ends in one, and
 * ends in several when the author left blank lines before the closing fence; a
 * selection picks one up whenever it overshoots the end of a rendered line.
 */
export const TRAILING_CODE_LINE_BREAKS = /(\r?\n[ \t]*)+$/;

export const markdownCopyDataSet = {
  code: { remioMarkdownTag: "code" },
  pre: { remioMarkdownTag: "pre" },
  ignore: { remioMarkdownIgnore: "true" },
} as const;

export function markdownCopyCodeBlockDataSet(language: string | null | undefined) {
  const fenceLanguage = language?.trim().split(/\s+/)[0];
  return {
    ...markdownCopyDataSet.pre,
    ...(fenceLanguage ? { remioMarkdownLanguage: fenceLanguage } : {}),
  } as const;
}

export const MARKDOWN_COPY_IMAGE_SOURCES_ATTRIBUTE = "data-remio-markdown-image-sources";
export function markdownCopyImageSourcesDataSet(sources: Record<string, string>) {
  return { remioMarkdownImageSources: JSON.stringify(sources) };
}
