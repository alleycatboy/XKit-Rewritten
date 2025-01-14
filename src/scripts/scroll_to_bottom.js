import { keyToClasses, keyToCss } from '../util/css_map.js';
import { translate } from '../util/language_data.js';
import { pageModifications } from '../util/mutations.js';
import { blogViewSelector, buildStyle } from '../util/interface.js';

const scrollToBottomButtonId = 'xkit-scroll-to-bottom-button';
$(`[id="${scrollToBottomButtonId}"]`).remove();
const activeClass = 'xkit-scroll-to-bottom-active';

const loaderSelector = `
${keyToCss('timeline', 'blogRows')} > ${keyToCss('loader')},
${keyToCss('notifications')} + ${keyToCss('loader')}
`;
const knightRiderLoaderSelector = `:is(${loaderSelector}) > ${keyToCss('knightRiderLoader')}`;

let scrollToBottomButton;
let active = false;

const styleElement = buildStyle(`
${keyToCss('isPeeprShowing')} #${scrollToBottomButtonId} {
  opacity: 0;
  pointer-events: none;
}

.${activeClass} svg use {
  --icon-color-primary: rgb(var(--yellow));
}
`);

const scrollToBottom = () => {
  window.scrollTo({ top: document.documentElement.scrollHeight });
  const loaders = [...document.querySelectorAll(knightRiderLoaderSelector)]
    .filter(element => element.matches(blogViewSelector) === false);

  if (loaders.length === 0) {
    stopScrolling();
  }
};
const observer = new ResizeObserver(scrollToBottom);

const startScrolling = () => {
  observer.observe(document.documentElement);
  active = true;
  scrollToBottomButton.classList.add(activeClass);
  scrollToBottom();
};

const stopScrolling = () => {
  observer.disconnect();
  active = false;
  scrollToBottomButton?.classList.remove(activeClass);
};

const onClick = () => active ? stopScrolling() : startScrolling();
const onKeyDown = ({ key }) => key === '.' && stopScrolling();

const checkForButtonRemoved = () => {
  const buttonWasRemoved = document.documentElement.contains(scrollToBottomButton) === false;
  if (buttonWasRemoved) {
    if (active) stopScrolling();
    pageModifications.unregister(checkForButtonRemoved);
  }
};

const addButtonToPage = async function ([scrollToTopButton]) {
  if (!scrollToBottomButton) {
    const hiddenClasses = keyToClasses('hidden');

    scrollToBottomButton = scrollToTopButton.cloneNode(true);
    hiddenClasses.forEach(className => scrollToBottomButton.classList.remove(className));
    scrollToBottomButton.removeAttribute('aria-label');
    scrollToBottomButton.style.marginTop = '0.5ch';
    scrollToBottomButton.style.transform = 'rotate(180deg)';
    scrollToBottomButton.addEventListener('click', onClick);
    scrollToBottomButton.id = scrollToBottomButtonId;

    scrollToBottomButton.classList[active ? 'add' : 'remove'](activeClass);
  }

  scrollToTopButton.after(scrollToBottomButton);
  scrollToTopButton.addEventListener('click', stopScrolling);
  document.documentElement.addEventListener('keydown', onKeyDown);
  pageModifications.register('*', checkForButtonRemoved);
};

export const main = async function () {
  pageModifications.register(`button[aria-label="${translate('Scroll to top')}"]`, addButtonToPage);
  document.head.append(styleElement);
};

export const clean = async function () {
  pageModifications.unregister(addButtonToPage);
  pageModifications.unregister(checkForButtonRemoved);
  stopScrolling();
  scrollToBottomButton?.remove();
  styleElement.remove();
};
