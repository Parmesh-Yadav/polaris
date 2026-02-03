import { Extension } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { angular } from "@codemirror/lang-angular";
import { go } from "@codemirror/lang-go";
import { markdown } from "@codemirror/lang-markdown";
import { php } from "@codemirror/lang-php";
import { rust } from "@codemirror/lang-rust";
import { sql } from "@codemirror/lang-sql";

export const getLanguageExtension = (filename: string): Extension => {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
      return javascript();
    case "jsx":
      return javascript({ jsx: true });
    case "ts":
      return javascript({ typescript: true });
    case "tsx":
      return javascript({ typescript: true, jsx: true });
    case "py":
      return python();
    case "java":
      return java();
    case "cpp":
    case "cc":
    case "cxx":
    case "c":
      return cpp();
    case "html":
    case "htm":
      return html();
    case "css":
      return css();
    case "json":
      return json();
    case "xml":
      return xml();
    case "ng":
      return angular();
    case "go":
      return go();
    case "md":
    case "markdown":
      return markdown();
    case "php":
      return php();
    case "rs":
      return rust();
    case "sql":
      return sql();
    default:
      return [];
  }
};
