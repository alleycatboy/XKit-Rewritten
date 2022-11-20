import { addSidebarItem, removeSidebarItem } from '../util/sidebar.js';
import { showModal, modalCancelButton, modalCompleteButton } from '../util/modals.js';
import { keyToCss } from '../util/css_map.js';
import { buildStyle, filterPostElements } from '../util/interface.js';
import { apiFetch } from '../util/tumblr_helpers.js';
import { dom } from '../util/dom.js';
import { primaryBlogName, userBlogNames } from '../util/user.js';
import { onNewPosts } from '../util/mutations.js';
import { timelineObject } from '../util/react_props.js';

const hiddenClass = 'xkit-true-blocklist-filtered';
const reblogSelector = keyToCss('reblog');
const gatherStatusElement = dom('span');
const OFFICIAL_BLOCKLIST_STORAGE_KEY = 'true_blocklist.official_blocklist';

const gatherBlocks = async function (blogName) {
  // let resource = `/v2/blog/${blogName}/blocks`;

  // const { response } = await apiFetch(resource);
  // const { blockedTumblelogs } = response;
  // const blockedBlockNames = blockedTumblelogs.map(({ name }) => name);

  // return blockedBlockNames;
  
  let resource = `/v2/blog/${blogName}/blocks`;
  const blockedBlockNames = [];
  
  while (resource) {
    const { response } = await apiFetch(resource);
    const { blockedTumblelogs } = response;
    blockedBlockNames.concat(blockedTumblelogs.map(({ name }) => name));  
    gatherStatusElement.textContent = `Found ${blockedBlockNames.length} blocked blogs...`;
    resource = response.links?.next?.href;
  }

  console.log(blockedBlockNames);
  gatherStatusElement.textContent = `Found ${blockedBlockNames.length} blocked blogs.`;
  return blockedBlockNames;
};

const processPosts = postElements => filterPostElements(postElements).forEach(async postElement => {
  const { blog: { name }, trail, rebloggedFromName } = await timelineObject(postElement);
  console.log(timelineObject(postElement))
  const { [OFFICIAL_BLOCKLIST_STORAGE_KEY]: officialBlocklist = [] } = await browser.storage.local.get(OFFICIAL_BLOCKLIST_STORAGE_KEY)

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
  console.log(primaryBlogName);

  const blockedBlogNames = (await Promise.all(
    userBlogNames.map(userBlogName => gatherBlocks(userBlogName))  
  )).flat();

  console.log(blockedBlogNames);
  await browser.storage.local.set({ [OFFICIAL_BLOCKLIST_STORAGE_KEY]: blockedBlogNames });
  console.log(browser.storage.local.get(OFFICIAL_BLOCKLIST_STORAGE_KEY));
};

const modalWorkingOptions = {
  title: 'Truly blocking your blocks...',
  message: [
    dom('small', null, null, ['Do not navigate away from this page, or the process will be interrupted.\n\n']),
    gatherStatusElement,
  ]
};

const modalConfirmButton = dom(
  'button',
  { class: 'red' },
  {
    click () {
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

  // const { [OFFICIAL_BLOCKLIST_STORAGE_KEY]: officialBlocklist = [] } = await browser.storage.local.get(OFFICIAL_BLOCKLIST_STORAGE_KEY)
  // blockList = officialBlocklist;
  // onNewPosts.addListener(processPosts);
};

export const clean = async function () {
  removeSidebarItem(sidebarOptions.id);
};

export const stylesheet = true;