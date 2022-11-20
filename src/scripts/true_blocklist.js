import { addSidebarItem, removeSidebarItem } from '../util/sidebar.js';
import { showModal, modalCancelButton, modalCompleteButton } from '../util/modals.js';
import { keyToCss } from '../util/css_map.js';
import { filterPostElements } from '../util/interface.js';
import { apiFetch } from '../util/tumblr_helpers.js';
import { dom } from '../util/dom.js';
import { userBlogNames } from '../util/user.js';
import { onNewPosts } from '../util/mutations.js';
import { timelineObject } from '../util/react_props.js';

const hiddenClass = 'xkit-true-blocklist-filtered';
const reblogSelector = keyToCss('reblog');
const gatherStatusElement = dom('span');
const OFFICIAL_BLOCKLIST_STORAGE_KEY = 'true_blocklist.official_blocklist';
let blockedCount;

const gatherBlocks = async function (blogName) {
  let resource = `/v2/blog/${blogName}/blocks`;
  let blockedBlogNames = [];

  while (resource) {
    const { response } = await apiFetch(resource);
    const { blockedTumblelogs } = response;
    blockedBlogNames = blockedBlogNames.concat(blockedTumblelogs.map(({ name }) => name));
    gatherStatusElement.textContent = `Found ${blockedCount + blockedBlogNames.length} blocked blogs...`;
    resource = response.links?.next?.href;
  }

  blockedCount += blockedBlogNames.length;
  gatherStatusElement.textContent = `Found ${blockedCount} blocked blogs.`;
  return blockedBlogNames;
};

const processPosts = postElements => filterPostElements(postElements).forEach(async postElement => {
  const { blog: { name }, trail, rebloggedFromName } = await timelineObject(postElement);
  const { [OFFICIAL_BLOCKLIST_STORAGE_KEY]: officialBlocklist = [] } = await browser.storage.local.get(OFFICIAL_BLOCKLIST_STORAGE_KEY);

  const customBlocklist = [];
  const blocklist = [...officialBlocklist, ...customBlocklist];

  if (blocklist.includes(name) || blocklist.includes(rebloggedFromName)) {
    postElement.classList.add(hiddenClass);
    return;
  }

  const reblogs = postElement.querySelectorAll(reblogSelector);
  trail.forEach((trailItem, i) => {
    if (blocklist.includes(trailItem.blog?.name)) {
      reblogs[i].classList.add(hiddenClass);
    }
  });
});

const updateBlocks = async function () {
  gatherStatusElement.textContent = 'Gathering blocks...';
  const blockedBlogNames = (await Promise.all(
    userBlogNames.map(userBlogName => gatherBlocks(userBlogName))
  )).flat();

  await browser.storage.local.set({ [OFFICIAL_BLOCKLIST_STORAGE_KEY]: blockedBlogNames });

  showModal({
    title: 'All done!',
    message: [
      `Truly blocked ${blockedCount} blogs!\n`
    ],
    buttons: [
      modalCompleteButton
    ]
  });
};

const modalWorkingOptions = {
  title: 'Truly blocking your blocks...',
  message: [
    dom('small', null, null, ['Do not navigate away from this page, or the process will be interrupted.\n\n']),
    gatherStatusElement
  ]
};

const modalConfirmButton = dom(
  'button',
  { class: 'red' },
  {
    click () {
      blockedCount = 0;
      gatherStatusElement.textContent = '';
      showModal(modalWorkingOptions);
      updateBlocks();
    }
  },
  ['Truly block my blocks']
);

const modalPromptOptions = {
  title: 'Truly block your blocked blogs?',
  message: [
    'This may take a while if you have a lot of blocked blogs.'
  ],
  buttons: [
    modalCancelButton,
    modalConfirmButton
  ]
};

const sidebarOptions = {
  id: 'true-blocklist',
  title: 'Update true blocklist',
  rows: [
    {
      label: 'Truly block your blocked blogs',
      onclick: () => showModal(modalPromptOptions),
      carrot: true
    }
  ]
};

export const main = async function () {
  onNewPosts.addListener(processPosts);
  addSidebarItem(sidebarOptions);
};

export const clean = async function () {
  removeSidebarItem(sidebarOptions.id);
};

export const stylesheet = true;
