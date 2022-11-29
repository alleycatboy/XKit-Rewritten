import { buildStyle } from '../../util/interface.js';

const BLOG_POST_BODY_SELECTOR = '[style*="--blog-title-color"]';

const styleElement = buildStyle(`
  ${BLOG_POST_BODY_SELECTOR} {
    --black: inherit !important;
    --white: inherit !important;
    --white-on-dark: inherit !important;
    --navy: inherit !important;
    --red: inherit !important;
    --orange: inherit !important;
    --yellow: inherit !important;
    --green: inherit !important;
    --blue: inherit !important;
    --purple: inherit !important;
    --pink: inherit !important;
    --accent: inherit !important;
    --secondary-accent: inherit !important;
    --follow: inherit !important;
    --override-posts--color-primary-link: inherit !important;
  }
`);

export const main = async () => document.head.append(styleElement);

export const clean = async () => styleElement.remove();
