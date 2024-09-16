import { addSidebarItem, removeSidebarItem } from '../util/sidebar.js';
import { showModal, modalCancelButton, modalCompleteButton } from '../util/modals.js';
import { filterPostElements } from '../util/interface.js';
import { apiFetch } from '../util/tumblr_helpers.js';
import { dom } from '../util/dom.js';
import { userBlogNames } from '../util/user.js';
import { onNewPosts } from '../util/mutations.js';
import { timelineObject } from '../util/react_props.js';
import { getPreferences } from '../util/preferences.js';

const HIDDEN_CLASS = 'xkit-true-blocklist-filtered';
const gatherStatusElement = dom('span');
const OFFICIAL_BLOCKLIST_STORAGE_KEY = 'true_blocklist.official_blocklist';
let blockedCount;

const gatherBlocks = async function (blogName) {
  let resource = `/v2/blog/${blogName}/blocks`;
  const blocklist = new Set();

  while (resource) {
    const { response } = await apiFetch(resource);
    const { blockedTumblelogs } = response;

    blockedTumblelogs.forEach(({ name }) => blocklist.add(name));

    gatherStatusElement.textContent = `Found ${blockedCount + blocklist.size} blocked blogs...`;
    resource = response.links?.next?.href;
  }

  blockedCount += blocklist.size;
  gatherStatusElement.textContent = `Found ${blockedCount} blocked blogs.`;
  return blocklist;
};

const processPosts = postElements => filterPostElements(postElements).forEach(async postElement => {
  const { blog: { name }, trail, rebloggedFromName } = await timelineObject(postElement);

  // TODO: Move the fetching up to the top level and pass the data down.
  const { [OFFICIAL_BLOCKLIST_STORAGE_KEY]: blocklist = new Set() } = await browser.storage.local.get(OFFICIAL_BLOCKLIST_STORAGE_KEY);
  const { softBlocklist } = await getPreferences('true_blocklist');

  parseSoftBlocklist(softBlocklist).forEach(softBlockedBlogName => blocklist.add(softBlockedBlogName));

  if (blocklist.has(name) || blocklist.has(rebloggedFromName) || trail.some(({ blog: { name } }) => blocklist.has(name))) {
    postElement.classList.add(HIDDEN_CLASS);
  }
});

const parseSoftBlocklist = softBlocklist => (
  softBlocklist.split(',').map(blogName => blogName.trim())
);

const updateBlocks = async function () {
  gatherStatusElement.textContent = 'Gathering blocks...';
  const blocklist = new Set();
  const userBlocklists = await Promise.all(
    userBlogNames.map(userBlogName => gatherBlocks(userBlogName))
  );

  userBlocklists.forEach(userBlocklist => {
    userBlocklist.forEach(blockedBlogName => blocklist.add(blockedBlogName));
  });

  await browser.storage.local.set({ [OFFICIAL_BLOCKLIST_STORAGE_KEY]: blocklist });

  // TODO: Refresher should be a separate function.
  onNewPosts.removeListener(processPosts);
  onNewPosts.addListener(processPosts);

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
    dom('small', null, null, ['Do not navigate away from this page, otherwise the process will be interrupted.\n\n']),
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
  $(`.${HIDDEN_CLASS}`).removeClass(HIDDEN_CLASS);
  onNewPosts.removeListener(processPosts);
  removeSidebarItem(sidebarOptions.id);
  await browser.storage.local.remove(OFFICIAL_BLOCKLIST_STORAGE_KEY);
};

export const stylesheet = true;
